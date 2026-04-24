import { Link, router } from '@inertiajs/react';
import {
    ArrowRightLeft,
    Check,
    Copy,
    FolderPlus,
    ImagePlus,
    PencilLine,
    SmilePlus,
    Trash2,
    Upload,
    X,
} from 'lucide-react';
import {
    type CSSProperties,
    type KeyboardEvent,
    type MouseEvent,
    type PointerEvent,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { flushSync } from 'react-dom';
import { ConfirmModal } from '@/components/confirm-modal';
import { KnowledgeBaseArticleMoveModal } from '@/features/knowledge-base/components/knowledge-base-article-move-modal';
import { KnowledgeBaseIcon } from '@/features/knowledge-base/components/knowledge-base-icon';
import { KnowledgeBaseIconPicker } from '@/features/knowledge-base/components/knowledge-base-icon-picker';
import type {
    KnowledgeBaseArticleCard,
    KnowledgeBaseArticleMoveCategory,
    KnowledgeBaseBreadcrumb,
    KnowledgeBaseCategoryCard,
    KnowledgeBaseCategoryRecord,
} from '@/features/knowledge-base/types';
import { cn } from '@/lib/utils';

type DragKind = 'category' | 'article';
type DragItem = { kind: DragKind; id: number };
type SortSession = DragItem & {
    pointerId: number;
    startX: number;
    startY: number;
    isDragging: boolean;
    didReorder: boolean;
    lastTargetId: number | null;
    lastPlacement: SortPlacement | null;
    lastReorderAt: number;
};
type SortPlacement = 'before' | 'after';

type SortableStyle = CSSProperties & {
    '--kb-wiggle-angle'?: string;
    '--kb-wiggle-angle-negative'?: string;
    '--kb-wiggle-shift'?: string;
    '--kb-wiggle-lift'?: string;
    '--kb-wiggle-lift-negative'?: string;
    '--kb-wiggle-duration'?: string;
    '--kb-wiggle-phase'?: string;
};

function formatMaterialsCount(count: number) {
    return `${count} материалов`;
}

function buildArticleBadges(article: KnowledgeBaseArticleCard) {
    const badges: Array<{ label: string; tone: 'default' | 'draft' | 'scheduled' }> = [];

    if (article.scheduled_publish_at) {
        badges.push({ label: 'Запланировано', tone: 'scheduled' });
    } else if (!article.is_published) {
        badges.push({ label: 'Черновик', tone: 'draft' });
    }

    for (const tag of article.tags) {
        badges.push({ label: tag, tone: 'default' });
    }

    const visibleBadges = badges.slice(0, 3);
    const hiddenCount = Math.max(0, badges.length - visibleBadges.length);

    return { visibleBadges, hiddenCount };
}

function isInteractiveElement(target: EventTarget | null) {
    return (
        target instanceof HTMLElement &&
        Boolean(target.closest('a, button, input, textarea, select, [data-kb-no-card-select]'))
    );
}

function handleSelectableKeyDown(event: KeyboardEvent<HTMLElement>, onToggle: () => void) {
    if (isInteractiveElement(event.target)) {
        return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onToggle();
    }
}

function reorderById<T extends { id: number }>(
    items: T[],
    draggedId: number,
    targetId: number,
    placement: SortPlacement = 'before',
) {
    const fromIndex = items.findIndex((item) => item.id === draggedId);
    const toIndex = items.findIndex((item) => item.id === targetId);

    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
        return items;
    }

    const next = [...items];
    const [moved] = next.splice(fromIndex, 1);
    const targetIndexAfterRemoval = next.findIndex((item) => item.id === targetId);
    const insertIndex = placement === 'after' ? targetIndexAfterRemoval + 1 : targetIndexAfterRemoval;
    next.splice(insertIndex, 0, moved);

    return next;
}

function sortableStyle(index: number): SortableStyle {
    const angle = 0.2 + (index % 5) * 0.045;
    const shift = ((index % 4) - 1.5) * 0.18;
    const lift = 0.3 + (index % 3) * 0.12;
    const duration = 1.65 + (index % 5) * 0.11;
    const phase = -((index * 0.23) % 1.2);

    return {
        '--kb-wiggle-angle': `${angle.toFixed(3)}deg`,
        '--kb-wiggle-angle-negative': `${(-angle).toFixed(3)}deg`,
        '--kb-wiggle-shift': `${shift.toFixed(2)}px`,
        '--kb-wiggle-lift': `${lift.toFixed(2)}px`,
        '--kb-wiggle-lift-negative': `${(-lift).toFixed(2)}px`,
        '--kb-wiggle-duration': `${duration.toFixed(2)}s`,
        '--kb-wiggle-phase': `${phase.toFixed(2)}s`,
    };
}

function sortKey(element: HTMLElement) {
    return `${element.dataset.kbSortKind ?? ''}:${element.dataset.kbSortId ?? ''}`;
}

function selectionNoun(categoryCount: number, articleCount: number) {
    if (categoryCount > 0 && articleCount === 0) {
        return categoryCount === 1 ? 'раздел' : 'разделы';
    }

    if (articleCount > 0 && categoryCount === 0) {
        return articleCount === 1 ? 'статья' : 'статьи';
    }

    return categoryCount + articleCount === 1 ? 'элемент' : 'элементы';
}

function selectedMovePhrase(categoryCount: number, articleCount: number) {
    if (categoryCount > 0 && articleCount === 0) {
        return categoryCount === 1 ? 'выбранный раздел' : 'выбранные разделы';
    }

    if (articleCount > 0 && categoryCount === 0) {
        return articleCount === 1 ? 'выбранную статью' : 'выбранные статьи';
    }

    return categoryCount + articleCount === 1 ? 'выбранный элемент' : 'выбранные элементы';
}

function Breadcrumbs({
    breadcrumbs,
    currentLabel,
}: {
    breadcrumbs: KnowledgeBaseBreadcrumb[];
    currentLabel?: string;
}) {
    return (
        <div className="kb-category__breadcrumb">
            {breadcrumbs.map((item) => (
                <span key={item.id} className="contents">
                    <Link href={item.href} className="kb-category__breadcrumb-link">
                        {item.icon_image_url ? (
                            <img
                                src={item.icon_image_url}
                                alt=""
                                className="kb-category__breadcrumb-icon-image"
                            />
                        ) : item.icon ? (
                            <span>{item.icon}</span>
                        ) : null}
                        {item.name}
                    </Link>
                    <span className="kb-category__breadcrumb-sep">/</span>
                </span>
            ))}

            {currentLabel ? (
                <span className="kb-category__breadcrumb-current">{currentLabel}</span>
            ) : null}
        </div>
    );
}

function CategoryTileCard({
    item,
    editMode,
    selected,
    style,
    dragging,
    onToggleSelect,
    onRename,
    onChangeIcon,
    onUploadIcon,
    onDelete,
    onPointerDown,
}: {
    item: KnowledgeBaseCategoryCard;
    editMode: boolean;
    selected: boolean;
    style?: CSSProperties;
    dragging?: boolean;
    onToggleSelect: () => void;
    onRename?: (item: KnowledgeBaseCategoryCard, name: string) => void;
    onChangeIcon?: (item: KnowledgeBaseCategoryCard, icon: string) => void;
    onUploadIcon?: (item: KnowledgeBaseCategoryCard, file: File) => void;
    onDelete?: (item: KnowledgeBaseCategoryCard) => void;
    onPointerDown?: (event: PointerEvent<HTMLElement>) => void;
}) {
    const [isRenaming, setIsRenaming] = useState(false);
    const [nameDraft, setNameDraft] = useState(item.name);
    const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
    const titleInputRef = useRef<HTMLInputElement | null>(null);
    const iconButtonRef = useRef<HTMLButtonElement | null>(null);
    const iconUploadRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        setNameDraft(item.name);
        setIsRenaming(false);
    }, [item.name]);

    useEffect(() => {
        if (!isRenaming) {
            return;
        }

        const focusTimer = window.setTimeout(() => {
            titleInputRef.current?.focus();
            titleInputRef.current?.select();
        }, 0);

        return () => window.clearTimeout(focusTimer);
    }, [isRenaming]);

    const commitRename = () => {
        const normalized = nameDraft.trim();

        if (normalized && normalized !== item.name) {
            onRename?.(item, normalized);
        } else {
            setNameDraft(item.name);
        }

        setIsRenaming(false);
    };

    if (!editMode) {
        return (
            <Link href={item.href} className="kb-card kb-card--category" title={item.name}>
                <KnowledgeBaseIcon
                    icon={item.icon}
                    imageUrl={item.icon_image_url}
                    className="kb-card__icon"
                    imageClassName="kb-card__icon-image"
                />

                <div className="kb-card__title" title={item.name}>
                    {item.name}
                </div>
                <div className="kb-card__meta">{formatMaterialsCount(item.materials_count)}</div>
            </Link>
        );
    }

    const handleCardClick = (event: MouseEvent<HTMLElement>) => {
        if (isInteractiveElement(event.target)) {
            return;
        }

        onToggleSelect();
    };

    return (
        <div
            className={cn(
                'kb-card kb-card--category kb-card--edit-mode',
                selected && 'is-selected',
                dragging && 'is-dragging',
            )}
            style={style}
            data-kb-sort-kind="category"
            data-kb-sort-id={item.id}
            role="button"
            tabIndex={0}
            onClick={handleCardClick}
            onKeyDown={(event) => handleSelectableKeyDown(event, onToggleSelect)}
            onPointerDown={onPointerDown}
        >
            <button
                type="button"
                className={cn('kb-card__selection', selected && 'is-selected')}
                onClick={(event) => {
                    event.stopPropagation();
                    onToggleSelect();
                }}
                aria-label={selected ? 'Снять выбор' : 'Выбрать раздел'}
            >
                <Check className="size-3.5" />
            </button>

            <div className="kb-card__quick-actions">
                <button
                    type="button"
                    className="kb-card__quick-button"
                    onClick={(event) => {
                        event.stopPropagation();
                        setIsRenaming(true);
                    }}
                    title="Переименовать"
                >
                    <PencilLine className="size-3.5" />
                </button>

                <button
                    type="button"
                    className="kb-card__quick-button"
                    onClick={(event) => {
                        event.stopPropagation();
                        setIsIconPickerOpen(true);
                    }}
                    title="Сменить иконку"
                >
                    <SmilePlus className="size-3.5" />
                </button>

                <button
                    type="button"
                    className="kb-card__quick-button"
                    onClick={(event) => {
                        event.stopPropagation();
                        iconUploadRef.current?.click();
                    }}
                    title="Загрузить свою иконку"
                >
                    <Upload className="size-3.5" />
                </button>

                {item.can_delete ? (
                    <button
                        type="button"
                        className="kb-card__quick-button kb-card__quick-button--danger"
                        onClick={(event) => {
                            event.stopPropagation();
                            onDelete?.(item);
                        }}
                        title="Удалить"
                    >
                        <Trash2 className="size-3.5" />
                    </button>
                ) : null}
            </div>

            <button
                ref={iconButtonRef}
                type="button"
                className="kb-card__icon-button"
                onClick={(event) => {
                    event.stopPropagation();
                    setIsIconPickerOpen(true);
                }}
                title="Сменить иконку"
            >
                <KnowledgeBaseIcon
                    icon={item.icon}
                    imageUrl={item.icon_image_url}
                    className="kb-card__icon"
                    imageClassName="kb-card__icon-image"
                />
            </button>

            {isRenaming ? (
                <input
                    ref={titleInputRef}
                    value={nameDraft}
                    onChange={(event) => setNameDraft(event.target.value)}
                    onClick={(event) => event.stopPropagation()}
                    onBlur={commitRename}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            commitRename();
                        }

                        if (event.key === 'Escape') {
                            event.preventDefault();
                            setNameDraft(item.name);
                            setIsRenaming(false);
                        }
                    }}
                    className="kb-card__title-input"
                />
            ) : (
            <button
                type="button"
                className="kb-card__title-button"
                title={item.name}
                    data-kb-editable-text
                    onClick={(event) => {
                        event.stopPropagation();
                    }}
                    onDoubleClick={() => setIsRenaming(true)}
                >
                    {item.name}
                </button>
            )}

            <div className="kb-card__meta">{formatMaterialsCount(item.materials_count)}</div>

            <KnowledgeBaseIconPicker
                open={isIconPickerOpen}
                anchorEl={iconButtonRef.current}
                value={item.icon}
                onSelect={(icon) => onChangeIcon?.(item, icon)}
                onUploadRequest={() => iconUploadRef.current?.click()}
                onClose={() => setIsIconPickerOpen(false)}
            />

            <input
                ref={iconUploadRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.gif,.svg"
                className="hidden"
                onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;

                    if (file) {
                        onUploadIcon?.(item, file);
                    }

                    event.target.value = '';
                }}
            />
        </div>
    );
}

function ArticleTileCard({
    item,
    editMode,
    selected,
    style,
    dragging,
    onToggleSelect,
    onUpdate,
    onDelete,
    onDuplicate,
    onPointerDown,
}: {
    item: KnowledgeBaseArticleCard;
    editMode: boolean;
    selected: boolean;
    style?: CSSProperties;
    dragging?: boolean;
    onToggleSelect: () => void;
    onUpdate?: (
        item: KnowledgeBaseArticleCard,
        payload: { title: string; summary: string },
    ) => void | Promise<void>;
    onDelete?: (item: KnowledgeBaseArticleCard) => void;
    onDuplicate?: (item: KnowledgeBaseArticleCard) => void;
    onPointerDown?: (event: PointerEvent<HTMLElement>) => void;
}) {
    const { visibleBadges, hiddenCount } = buildArticleBadges(item);
    const [editingField, setEditingField] = useState<'title' | 'summary' | null>(null);
    const [titleDraft, setTitleDraft] = useState(item.title);
    const [summaryDraft, setSummaryDraft] = useState(item.summary ?? '');
    const titleInputRef = useRef<HTMLInputElement | null>(null);
    const summaryInputRef = useRef<HTMLTextAreaElement | null>(null);

    useEffect(() => {
        setTitleDraft(item.title);
        setSummaryDraft(item.summary ?? '');
        setEditingField(null);
    }, [item.title, item.summary]);

    useEffect(() => {
        if (editingField === 'title') {
            titleInputRef.current?.focus();
            titleInputRef.current?.select();
        }

        if (editingField === 'summary') {
            summaryInputRef.current?.focus();
            summaryInputRef.current?.select();
        }
    }, [editingField]);

    const commitArticleText = () => {
        const nextTitle = titleDraft.trim();
        const nextSummary = summaryDraft.trim();

        if (!nextTitle) {
            setTitleDraft(item.title);
            setEditingField(null);
            return;
        }

        if (nextTitle !== item.title || nextSummary !== (item.summary ?? '')) {
            void Promise.resolve(onUpdate?.(item, { title: nextTitle, summary: nextSummary }));
        }

        setEditingField(null);
    };

    const body = (
        <>
            <span className="kb-card__icon-wrap" data-kb-no-card-select>
                <KnowledgeBaseIcon
                    icon={item.icon}
                    imageUrl={item.icon_image_url}
                    className="kb-card__icon"
                    imageClassName="kb-card__icon-image"
                />
            </span>

            {editingField === 'title' ? (
                <input
                    ref={titleInputRef}
                    value={titleDraft}
                    onChange={(event) => setTitleDraft(event.target.value)}
                    onClick={(event) => event.stopPropagation()}
                    onPointerDown={(event) => event.stopPropagation()}
                    onBlur={commitArticleText}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            commitArticleText();
                        }

                        if (event.key === 'Escape') {
                            event.preventDefault();
                            setTitleDraft(item.title);
                            setEditingField(null);
                        }
                    }}
                    className="kb-card__title-input"
                    data-kb-no-card-select
                />
            ) : (
                <div
                    className="kb-card__title"
                    title={item.title}
                    data-kb-no-card-select
                    data-kb-editable-text
                    onDoubleClick={() => {
                        if (item.can_update) {
                            setEditingField('title');
                        }
                    }}
                >
                    {item.title}
                </div>
            )}

            {item.summary || editingField === 'summary' ? (
                editingField === 'summary' ? (
                    <textarea
                        ref={summaryInputRef}
                        value={summaryDraft}
                        onChange={(event) => setSummaryDraft(event.target.value)}
                        onClick={(event) => event.stopPropagation()}
                        onPointerDown={(event) => event.stopPropagation()}
                        onBlur={commitArticleText}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                                event.preventDefault();
                                commitArticleText();
                            }

                            if (event.key === 'Escape') {
                                event.preventDefault();
                                setSummaryDraft(item.summary ?? '');
                                setEditingField(null);
                            }
                        }}
                        className="kb-card__summary-input"
                        data-kb-no-card-select
                    />
                ) : (
                    <div
                        className="kb-card__meta kb-card__meta--summary"
                        data-kb-no-card-select
                        data-kb-editable-text
                        onDoubleClick={() => {
                            if (item.can_update) {
                                setEditingField('summary');
                            }
                        }}
                    >
                        {item.summary}
                    </div>
                )
            ) : null}

            {visibleBadges.length > 0 || hiddenCount > 0 ? (
                <div className="kb-card__badges" data-kb-no-card-select>
                    {visibleBadges.map((badge) => (
                        <span
                            key={`${item.id}-${badge.label}`}
                            className={cn(
                                'kb-card__status',
                                badge.tone === 'draft' && 'kb-card__status--draft',
                                badge.tone === 'scheduled' && 'kb-card__status--scheduled',
                            )}
                        >
                            {badge.label}
                        </span>
                    ))}

                    {hiddenCount > 0 ? (
                        <span className="kb-card__status">+{hiddenCount}</span>
                    ) : null}
                </div>
            ) : null}
        </>
    );

    if (!editMode) {
        return (
            <Link href={item.href} className="kb-card kb-card--article" title={item.title}>
                {body}
            </Link>
        );
    }

    const handleCardClick = (event: MouseEvent<HTMLElement>) => {
        if (isInteractiveElement(event.target)) {
            return;
        }

        onToggleSelect();
    };

    return (
        <div
            className={cn(
                'kb-card kb-card--article kb-card--edit-mode',
                selected && 'is-selected',
                dragging && 'is-dragging',
            )}
            style={style}
            data-kb-sort-kind="article"
            data-kb-sort-id={item.id}
            role="button"
            tabIndex={0}
            onClick={handleCardClick}
            onKeyDown={(event) => handleSelectableKeyDown(event, onToggleSelect)}
            onPointerDown={onPointerDown}
        >
            <button
                type="button"
                className={cn('kb-card__selection', selected && 'is-selected')}
                onClick={(event) => {
                    event.stopPropagation();
                    onToggleSelect();
                }}
                aria-label={selected ? 'Снять выбор' : 'Выбрать статью'}
            >
                <Check className="size-3.5" />
            </button>

            <div className="kb-card__quick-actions">
                <button
                    type="button"
                    className="kb-card__quick-button"
                    onClick={(event) => {
                        event.stopPropagation();
                        router.visit(item.href);
                    }}
                    title="Открыть статью"
                >
                    <PencilLine className="size-3.5" />
                </button>

                {item.can_duplicate ? (
                    <button
                        type="button"
                        className="kb-card__quick-button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onDuplicate?.(item);
                        }}
                        title="Дублировать"
                    >
                        <Copy className="size-3.5" />
                    </button>
                ) : null}

                {item.can_delete ? (
                    <button
                        type="button"
                        className="kb-card__quick-button kb-card__quick-button--danger"
                        onClick={(event) => {
                            event.stopPropagation();
                            onDelete?.(item);
                        }}
                        title="Удалить"
                    >
                        <Trash2 className="size-3.5" />
                    </button>
                ) : null}
            </div>

            {body}
        </div>
    );
}

type KnowledgeBaseCategoryViewProps = {
    title: string;
    subtitle: string;
    category: KnowledgeBaseCategoryRecord;
    breadcrumbs: KnowledgeBaseBreadcrumb[];
    moveCategories?: KnowledgeBaseArticleMoveCategory[];
    canManage?: boolean;
    canDelete?: boolean;
    canCreateArticle?: boolean;
    onAddSubcategory?: () => void;
    onCreateArticle?: () => void;
    onRenameCategory?: (name: string) => void;
    onUploadCategoryIcon?: (file: File) => void;
    onUploadCover?: (file: File) => void;
    onChangeIcon?: (icon: string) => void;
    onDeleteCategory?: () => void;
    onRenameSubcategory?: (item: KnowledgeBaseCategoryCard, name: string) => void;
    onChangeSubcategoryIcon?: (item: KnowledgeBaseCategoryCard, icon: string) => void;
    onUploadSubcategoryIcon?: (item: KnowledgeBaseCategoryCard, file: File) => void;
    onDeleteSubcategory?: (item: KnowledgeBaseCategoryCard) => void;
    onUpdateArticleCard?: (
        item: KnowledgeBaseArticleCard,
        payload: { title: string; summary: string },
    ) => void | Promise<void>;
    onDeleteArticle?: (item: KnowledgeBaseArticleCard) => void;
    onDuplicateArticle?: (item: KnowledgeBaseArticleCard) => void;
    onBulkDelete?: (payload: {
        categories: KnowledgeBaseCategoryCard[];
        articles: KnowledgeBaseArticleCard[];
    }) => void | Promise<void>;
    onMoveItems?: (
        payload: {
            categories: KnowledgeBaseCategoryCard[];
            articles: KnowledgeBaseArticleCard[];
        },
        targetCategoryId: number,
    ) => void | Promise<void>;
    onReorderItems?: (payload: { categories: number[]; articles: number[] }) => void | Promise<void>;
};

export function KnowledgeBaseCategoryView({
    title,
    subtitle,
    category,
    breadcrumbs,
    moveCategories = [],
    canManage = false,
    canDelete = false,
    canCreateArticle = false,
    onAddSubcategory,
    onCreateArticle,
    onRenameCategory,
    onUploadCategoryIcon,
    onUploadCover,
    onChangeIcon,
    onDeleteCategory,
    onRenameSubcategory,
    onChangeSubcategoryIcon,
    onUploadSubcategoryIcon,
    onDeleteSubcategory,
    onUpdateArticleCard,
    onDeleteArticle,
    onDuplicateArticle,
    onBulkDelete,
    onMoveItems,
    onReorderItems,
}: KnowledgeBaseCategoryViewProps) {
    const [isTitleEditing, setIsTitleEditing] = useState(false);
    const [titleDraft, setTitleDraft] = useState(category.name);
    const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
    const [isTileEditMode, setIsTileEditMode] = useState(false);
    const [orderedSubcategories, setOrderedSubcategories] = useState(category.subcategories);
    const [orderedArticles, setOrderedArticles] = useState(category.articles);
    const [dragItem, setDragItem] = useState<DragItem | null>(null);
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
    const [selectedArticleIds, setSelectedArticleIds] = useState<number[]>([]);
    const [isMoveOpen, setIsMoveOpen] = useState(false);
    const [isMoving, setIsMoving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<
        | { kind: 'category'; item: KnowledgeBaseCategoryCard }
        | { kind: 'article'; item: KnowledgeBaseArticleCard }
        | { kind: 'selection' }
        | null
    >(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const titleInputRef = useRef<HTMLInputElement | null>(null);
    const categoryIconButtonRef = useRef<HTMLButtonElement | null>(null);
    const categoryIconUploadRef = useRef<HTMLInputElement | null>(null);
    const categoryCoverUploadRef = useRef<HTMLInputElement | null>(null);
    const gridRef = useRef<HTMLDivElement | null>(null);
    const sortSessionRef = useRef<SortSession | null>(null);
    const orderedSubcategoriesRef = useRef(orderedSubcategories);
    const orderedArticlesRef = useRef(orderedArticles);
    const suppressNextCardClickRef = useRef(false);

    useEffect(() => {
        setTitleDraft(category.name);
        setIsTitleEditing(false);
    }, [category.name]);

    useEffect(() => {
        setOrderedSubcategories(category.subcategories);
    }, [category.subcategories]);

    useEffect(() => {
        setOrderedArticles(category.articles);
    }, [category.articles]);

    useEffect(() => {
        orderedSubcategoriesRef.current = orderedSubcategories;
    }, [orderedSubcategories]);

    useEffect(() => {
        orderedArticlesRef.current = orderedArticles;
    }, [orderedArticles]);

    useEffect(() => {
        if (!isTitleEditing) {
            return;
        }

        const focusTimer = window.setTimeout(() => {
            titleInputRef.current?.focus();
            titleInputRef.current?.select();
        }, 0);

        return () => window.clearTimeout(focusTimer);
    }, [isTitleEditing]);

    useEffect(() => {
        if (!isTileEditMode) {
            setSelectedCategoryIds([]);
            setSelectedArticleIds([]);
            setDragItem(null);
            sortSessionRef.current = null;
            document.body.classList.remove('kb-is-sorting');
        }
    }, [isTileEditMode]);

    useEffect(() => {
        return () => {
            document.body.classList.remove('kb-is-sorting');
        };
    }, []);

    const selectedCategories = useMemo(
        () => orderedSubcategories.filter((item) => selectedCategoryIds.includes(item.id)),
        [orderedSubcategories, selectedCategoryIds],
    );
    const selectedArticles = useMemo(
        () => orderedArticles.filter((item) => selectedArticleIds.includes(item.id)),
        [orderedArticles, selectedArticleIds],
    );
    const moveCategoryOptions = useMemo(
        () =>
            moveCategories.map((item) =>
                selectedCategoryIds.includes(item.id) ? { ...item, is_current: true } : item,
            ),
        [moveCategories, selectedCategoryIds],
    );
    const selectedCount = selectedCategories.length + selectedArticles.length;
    const selectedNoun = selectionNoun(selectedCategories.length, selectedArticles.length);
    const selectedMoveLabel = selectedMovePhrase(selectedCategories.length, selectedArticles.length);

    const commitTitle = () => {
        const normalized = titleDraft.trim();

        if (normalized && normalized !== category.name) {
            onRenameCategory?.(normalized);
        } else {
            setTitleDraft(category.name);
        }

        setIsTitleEditing(false);
    };

    const toggleCategorySelection = (id: number) => {
        if (suppressNextCardClickRef.current) {
            suppressNextCardClickRef.current = false;
            return;
        }

        setSelectedCategoryIds((current) =>
            current.includes(id) ? current.filter((currentId) => currentId !== id) : [...current, id],
        );
    };

    const toggleArticleSelection = (id: number) => {
        if (suppressNextCardClickRef.current) {
            suppressNextCardClickRef.current = false;
            return;
        }

        setSelectedArticleIds((current) =>
            current.includes(id) ? current.filter((currentId) => currentId !== id) : [...current, id],
        );
    };

    const persistOrder = (categories = orderedSubcategories, articles = orderedArticles) => {
        return onReorderItems?.({
            categories: categories.map((item) => item.id),
            articles: articles.map((item) => item.id),
        });
    };

    const animateSortableReorder = (update: () => void) => {
        const grid = gridRef.current;

        if (!grid) {
            update();
            return;
        }

        const elements = Array.from(
            grid.querySelectorAll<HTMLElement>('[data-kb-sort-kind][data-kb-sort-id]'),
        );
        const firstRects = new Map(
            elements.map((element) => [sortKey(element), element.getBoundingClientRect()]),
        );

        flushSync(update);

        window.requestAnimationFrame(() => {
            for (const element of elements) {
                const first = firstRects.get(sortKey(element));

                if (!first) {
                    continue;
                }

                const last = element.getBoundingClientRect();
                const deltaX = first.left - last.left;
                const deltaY = first.top - last.top;

                if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) {
                    continue;
                }

                element.animate(
                    [
                        {
                            transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(0.985)`,
                        },
                        { transform: 'translate3d(0, 0, 0) scale(1)' },
                    ],
                    {
                        duration: 260,
                        easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
                    },
                );
            }
        });
    };

    const reorderLive = (kind: DragKind, targetId: number, placement: SortPlacement) => {
        const session = sortSessionRef.current;

        if (!session || session.kind !== kind || session.id === targetId) {
            return;
        }

        if (
            session.lastTargetId === targetId &&
            session.lastPlacement === placement &&
            performance.now() - session.lastReorderAt < 110
        ) {
            return;
        }

        session.lastTargetId = targetId;
        session.lastPlacement = placement;
        session.lastReorderAt = performance.now();

        if (kind === 'category') {
            const current = orderedSubcategoriesRef.current;
            const next = reorderById(current, session.id, targetId, placement);

            if (next !== current) {
                session.didReorder = true;
                orderedSubcategoriesRef.current = next;
                animateSortableReorder(() => setOrderedSubcategories(next));
            }
        } else {
            const current = orderedArticlesRef.current;
            const next = reorderById(current, session.id, targetId, placement);

            if (next !== current) {
                session.didReorder = true;
                orderedArticlesRef.current = next;
                animateSortableReorder(() => setOrderedArticles(next));
            }
        }
    };

    const startPointerSort = (kind: DragKind, id: number, event: PointerEvent<HTMLElement>) => {
        if (event.button !== 0 || isInteractiveElement(event.target)) {
            return;
        }

        event.preventDefault();

        sortSessionRef.current = {
            kind,
            id,
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            isDragging: false,
            didReorder: false,
            lastTargetId: null,
            lastPlacement: null,
            lastReorderAt: 0,
        };

        const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
            const session = sortSessionRef.current;

            if (!session || moveEvent.pointerId !== session.pointerId) {
                return;
            }

            const distance = Math.hypot(
                moveEvent.clientX - session.startX,
                moveEvent.clientY - session.startY,
            );

            if (!session.isDragging && distance < 8) {
                return;
            }

            moveEvent.preventDefault();

            if (!session.isDragging) {
                session.isDragging = true;
                setDragItem({ kind: session.kind, id: session.id });
                document.body.classList.add('kb-is-sorting');
            }

            const grid = gridRef.current;

            if (!grid) {
                return;
            }

            const gridRect = grid.getBoundingClientRect();
            const isInsideGrid =
                moveEvent.clientX >= gridRect.left - 64 &&
                moveEvent.clientX <= gridRect.right + 64 &&
                moveEvent.clientY >= gridRect.top - 64 &&
                moveEvent.clientY <= gridRect.bottom + 64;

            if (!isInsideGrid) {
                return;
            }

            const sortableElements = Array.from(
                grid.querySelectorAll<HTMLElement>(
                    `[data-kb-sort-kind="${session.kind}"][data-kb-sort-id]`,
                ),
            ).filter((element) => Number(element.dataset.kbSortId) !== session.id);

            let nearestTargetId: number | null = null;
            let nearestPlacement: SortPlacement = 'before';
            let nearestDistance = Number.POSITIVE_INFINITY;

            for (const element of sortableElements) {
                const rect = element.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const distance = Math.hypot(moveEvent.clientX - centerX, moveEvent.clientY - centerY);

                if (distance < nearestDistance) {
                    const deltaX = moveEvent.clientX - centerX;
                    const deltaY = moveEvent.clientY - centerY;
                    const useVerticalIntent = Math.abs(deltaY) > rect.height * 0.32;

                    nearestDistance = distance;
                    nearestTargetId = Number(element.dataset.kbSortId);
                    nearestPlacement = useVerticalIntent
                        ? deltaY > 0
                            ? 'after'
                            : 'before'
                        : deltaX > 0
                          ? 'after'
                          : 'before';
                }
            }

            if (nearestTargetId !== null && Number.isFinite(nearestTargetId)) {
                reorderLive(session.kind, nearestTargetId, nearestPlacement);
            }
        };

        const handlePointerEnd = (endEvent: globalThis.PointerEvent) => {
            const session = sortSessionRef.current;

            if (!session || endEvent.pointerId !== session.pointerId) {
                return;
            }

            if (session.isDragging) {
                suppressNextCardClickRef.current = true;
                window.setTimeout(() => {
                    suppressNextCardClickRef.current = false;
                }, 120);
            }

            if (session.didReorder) {
                void Promise.resolve(
                    persistOrder(orderedSubcategoriesRef.current, orderedArticlesRef.current),
                );
            }

            sortSessionRef.current = null;
            setDragItem(null);
            document.body.classList.remove('kb-is-sorting');
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerEnd);
            window.removeEventListener('pointercancel', handlePointerEnd);
        };

        window.addEventListener('pointermove', handlePointerMove, { passive: false });
        window.addEventListener('pointerup', handlePointerEnd);
        window.addEventListener('pointercancel', handlePointerEnd);
    };

    const handleMoveSelection = async (targetCategoryId: number) => {
        if (!selectedCount) {
            return;
        }

        setIsMoving(true);

        try {
            await Promise.resolve(
                onMoveItems?.(
                    {
                        categories: selectedCategories,
                        articles: selectedArticles,
                    },
                    targetCategoryId,
                ),
            );
            setSelectedCategoryIds([]);
            setSelectedArticleIds([]);
            setIsMoveOpen(false);
        } finally {
            setIsMoving(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) {
            return;
        }

        setIsDeleting(true);

        try {
            if (deleteTarget.kind === 'category') {
                await Promise.resolve(onDeleteSubcategory?.(deleteTarget.item));
            } else if (deleteTarget.kind === 'article') {
                await Promise.resolve(onDeleteArticle?.(deleteTarget.item));
            } else if (deleteTarget.kind === 'selection') {
                await Promise.resolve(
                    onBulkDelete?.({
                        categories: selectedCategories,
                        articles: selectedArticles,
                    }),
                );
                setSelectedCategoryIds([]);
                setSelectedArticleIds([]);
            }

            setDeleteTarget(null);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <div className="page-layout kb-category-page flex flex-1 flex-col gap-6">
                <div className="page-layout__header flex flex-col gap-1">
                    <h1 className="page-layout__title">{title}</h1>
                    <p className="page-layout__subtitle">{subtitle}</p>
                </div>

                <div className="kb-category__shell">
                    <Breadcrumbs breadcrumbs={breadcrumbs} />

                    {canManage ? (
                        <button
                            type="button"
                            className="kb-category__cover-button"
                            onClick={() => categoryCoverUploadRef.current?.click()}
                        >
                            {category.cover_url ? (
                                <img src={category.cover_url} alt="" className="kb-category__cover" />
                            ) : (
                                <span className="kb-category__cover-placeholder">
                                    <ImagePlus className="size-4" />
                                    Добавить обложку раздела
                                </span>
                            )}
                        </button>
                    ) : category.cover_url ? (
                        <img src={category.cover_url} alt="" className="kb-category__cover" />
                    ) : null}

                    <input
                        ref={categoryCoverUploadRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.gif,.svg"
                        className="hidden"
                        onChange={(event) => {
                            const file = event.target.files?.[0] ?? null;

                            if (file) {
                                onUploadCover?.(file);
                            }

                            event.target.value = '';
                        }}
                    />

                    {canManage ? (
                        <div className="kb-category__toolbar">
                            <button
                                type="button"
                                className="kb-atb-btn"
                                onClick={() => setIsIconPickerOpen(true)}
                            >
                                <SmilePlus className="size-4" />
                                Сменить иконку
                            </button>

                            <button
                                type="button"
                                onClick={onAddSubcategory}
                                className="kb-atb-btn"
                            >
                                <FolderPlus className="size-4" />
                                Добавить подраздел
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsTileEditMode((value) => !value)}
                                className={cn('kb-atb-btn', isTileEditMode && 'kb-atb-btn--primary')}
                            >
                                {isTileEditMode ? (
                                    <>
                                        <X className="size-4" />
                                        Готово
                                    </>
                                ) : (
                                    <>
                                        <PencilLine className="size-4" />
                                        Управлять контентом
                                    </>
                                )}
                            </button>

                            {canDelete ? (
                                <button
                                    type="button"
                                    onClick={onDeleteCategory}
                                    className="kb-atb-btn kb-atb-btn--danger"
                                >
                                    <Trash2 className="size-4" />
                                    Удалить раздел
                                </button>
                            ) : null}
                        </div>
                    ) : null}

                    <div className="kb-category__header">
                        {canManage ? (
                            <button
                                ref={categoryIconButtonRef}
                                type="button"
                                className="kb-category__icon-button"
                                onClick={() => setIsIconPickerOpen(true)}
                            >
                                {category.icon || category.icon_image_url ? (
                                    <KnowledgeBaseIcon
                                        icon={category.icon}
                                        imageUrl={category.icon_image_url}
                                        className="kb-category__icon"
                                        imageClassName="kb-category__icon-image"
                                    />
                                ) : (
                                    <span className="kb-category__icon-empty">
                                        <SmilePlus className="size-6" />
                                    </span>
                                )}
                            </button>
                        ) : (
                            <KnowledgeBaseIcon
                                icon={category.icon}
                                imageUrl={category.icon_image_url}
                                className="kb-category__icon"
                                imageClassName="kb-category__icon-image"
                            />
                        )}

                        <div className="min-w-0">
                            {canManage && isTitleEditing ? (
                                <input
                                    ref={titleInputRef}
                                    value={titleDraft}
                                    onChange={(event) => setTitleDraft(event.target.value)}
                                    onBlur={commitTitle}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            event.preventDefault();
                                            commitTitle();
                                        }

                                        if (event.key === 'Escape') {
                                            event.preventDefault();
                                            setTitleDraft(category.name);
                                            setIsTitleEditing(false);
                                        }
                                    }}
                                    className="kb-category__title-input"
                                />
                            ) : canManage ? (
                                <button
                                    type="button"
                                    className="kb-category__title-button"
                                    onClick={() => setIsTitleEditing(true)}
                                >
                                    {category.name}
                                </button>
                            ) : (
                                <div className="kb-category__title">{category.name}</div>
                            )}

                            <div className="kb-category__meta">
                                {formatMaterialsCount(category.materials_count)}
                            </div>
                        </div>
                    </div>

                    <KnowledgeBaseIconPicker
                        open={isIconPickerOpen}
                        anchorEl={categoryIconButtonRef.current}
                        value={category.icon}
                        onSelect={(icon) => onChangeIcon?.(icon)}
                        onUploadRequest={() => categoryIconUploadRef.current?.click()}
                        onClose={() => setIsIconPickerOpen(false)}
                    />

                    <input
                        ref={categoryIconUploadRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.gif,.svg"
                        className="hidden"
                        onChange={(event) => {
                            const file = event.target.files?.[0] ?? null;

                            if (file) {
                                onUploadCategoryIcon?.(file);
                            }

                            event.target.value = '';
                        }}
                    />

                    {canManage && isTileEditMode ? (
                        <div className="kb-tile-edit-bar">
                            <div className="kb-tile-edit-bar__title">
                                Редактирование материалов
                            </div>
                            <div className="kb-tile-edit-bar__meta">
                                {selectedCount > 0
                                    ? `Выбрано ${selectedCount}: ${selectedNoun}`
                                    : 'Выберите статьи или разделы для быстрых действий'}
                            </div>

                            <div className="kb-tile-edit-bar__actions">
                                {selectedCount > 0 && moveCategories.length > 0 ? (
                                    <button
                                        type="button"
                                        className="kb-atb-btn"
                                        onClick={() => setIsMoveOpen(true)}
                                    >
                                        <ArrowRightLeft className="size-4" />
                                        Переместить
                                    </button>
                                ) : null}

                                {selectedCount > 0 ? (
                                    <button
                                        type="button"
                                        className="kb-atb-btn kb-atb-btn--danger"
                                        onClick={() => setDeleteTarget({ kind: 'selection' })}
                                    >
                                        <Trash2 className="size-4" />
                                        Удалить выбранное
                                    </button>
                                ) : null}

                                <button
                                    type="button"
                                    className="kb-atb-btn"
                                    onClick={() => {
                                        setSelectedCategoryIds([]);
                                        setSelectedArticleIds([]);
                                    }}
                                >
                                    Снять выбор
                                </button>
                            </div>
                        </div>
                    ) : null}

                    <div ref={gridRef} className="kb-category__grid">
                        {orderedSubcategories.map((item, index) => (
                            <CategoryTileCard
                                key={`subcategory-${item.id}`}
                                item={item}
                                editMode={canManage && isTileEditMode}
                                selected={selectedCategoryIds.includes(item.id)}
                                dragging={dragItem?.kind === 'category' && dragItem.id === item.id}
                                style={sortableStyle(index)}
                                onToggleSelect={() => toggleCategorySelection(item.id)}
                                onRename={onRenameSubcategory}
                                onChangeIcon={onChangeSubcategoryIcon}
                                onUploadIcon={onUploadSubcategoryIcon}
                                onDelete={(target) => setDeleteTarget({ kind: 'category', item: target })}
                                onPointerDown={(event) => startPointerSort('category', item.id, event)}
                            />
                        ))}

                        {orderedArticles.map((item, index) => (
                            <ArticleTileCard
                                key={`article-${item.id}`}
                                item={item}
                                editMode={canManage && isTileEditMode}
                                selected={selectedArticleIds.includes(item.id)}
                                dragging={dragItem?.kind === 'article' && dragItem.id === item.id}
                                style={sortableStyle(orderedSubcategories.length + index)}
                                onToggleSelect={() => toggleArticleSelection(item.id)}
                                onUpdate={onUpdateArticleCard}
                                onDelete={(target) => setDeleteTarget({ kind: 'article', item: target })}
                                onDuplicate={onDuplicateArticle}
                                onPointerDown={(event) => startPointerSort('article', item.id, event)}
                            />
                        ))}

                        {canCreateArticle && !isTileEditMode ? (
                            <button
                                type="button"
                                onClick={onCreateArticle}
                                className="kb-card kb-card--new"
                            >
                                + Новая статья
                            </button>
                        ) : null}
                    </div>

                    {orderedSubcategories.length === 0 &&
                    orderedArticles.length === 0 &&
                    !canCreateArticle ? (
                        <div className="kb-category__empty">
                            В этом разделе пока нет материалов.
                        </div>
                    ) : null}
                </div>
            </div>

            <KnowledgeBaseArticleMoveModal
                open={isMoveOpen}
                categories={moveCategoryOptions}
                articleTitle={selectedNoun}
                title="Переместить выбранное"
                description={`Выберите раздел, куда нужно переместить ${selectedMoveLabel}.`}
                currentLabel="Недоступно"
                processing={isMoving}
                onCancel={() => setIsMoveOpen(false)}
                onSelect={handleMoveSelection}
            />

            <ConfirmModal
                open={deleteTarget !== null}
                title={
                    deleteTarget?.kind === 'selection'
                        ? 'Удалить выбранные материалы'
                        : deleteTarget?.kind === 'category'
                          ? 'Удалить подраздел'
                          : 'Удалить статью'
                }
                description={
                    deleteTarget?.kind === 'selection'
                        ? `Будут удалены ${selectedCategories.length} подразделов и ${selectedArticles.length} статей.`
                        : deleteTarget?.kind === 'category'
                          ? `Раздел «${deleteTarget.item.name}» будет удален без возможности восстановления.`
                          : deleteTarget?.kind === 'article'
                            ? `Статья «${deleteTarget.item.title}» будет удалена без возможности восстановления.`
                            : ''
                }
                confirmLabel={
                    deleteTarget?.kind === 'selection' ? 'Удалить выбранное' : 'Удалить'
                }
                danger
                processing={isDeleting}
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </>
    );
}
