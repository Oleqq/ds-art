import { Link } from '@inertiajs/react';
import { Check, PencilLine, Plus, SmilePlus, Trash2, Upload, X } from 'lucide-react';
import {
    type DragEvent,
    type KeyboardEvent,
    type MouseEvent,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { ConfirmModal } from '@/components/confirm-modal';
import { KnowledgeBaseIcon } from '@/features/knowledge-base/components/knowledge-base-icon';
import { KnowledgeBaseIconPicker } from '@/features/knowledge-base/components/knowledge-base-icon-picker';
import type { KnowledgeBaseHomeCategory } from '@/features/knowledge-base/types';
import { cn } from '@/lib/utils';

function formatHomeCardMeta(category: KnowledgeBaseHomeCategory) {
    if (category.subcategories_count > 0 && category.articles_count > 0) {
        return `${category.subcategories_count} разд. ${category.articles_count} ст.`;
    }

    if (category.subcategories_count > 0) {
        return `${category.subcategories_count} разд.`;
    }

    if (category.articles_count > 0) {
        return `${category.articles_count} ст.`;
    }

    return 'Пусто';
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

function reorderById<T extends { id: number }>(items: T[], draggedId: number, targetId: number) {
    const fromIndex = items.findIndex((item) => item.id === draggedId);
    const toIndex = items.findIndex((item) => item.id === targetId);

    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
        return items;
    }

    const next = [...items];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);

    return next;
}

function withViewTransition(update: () => void) {
    const viewTransition = (document as Document & {
        startViewTransition?: (callback: () => void) => void;
    }).startViewTransition;

    if (viewTransition) {
        viewTransition(update);
        return;
    }

    update();
}

function sectionSelectionNoun(count: number) {
    return count === 1 ? 'раздел' : 'разделы';
}

function HomeCategoryCard({
    category,
    editMode,
    selected,
    animationDelay,
    onToggleSelect,
    onRename,
    onChangeIcon,
    onUploadIcon,
    onDelete,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
}: {
    category: KnowledgeBaseHomeCategory;
    editMode: boolean;
    selected: boolean;
    animationDelay: string;
    onToggleSelect: () => void;
    onRename?: (category: KnowledgeBaseHomeCategory, name: string) => void;
    onChangeIcon?: (category: KnowledgeBaseHomeCategory, icon: string) => void;
    onUploadIcon?: (category: KnowledgeBaseHomeCategory, file: File) => void;
    onDelete?: (category: KnowledgeBaseHomeCategory) => void;
    onDragStart?: () => void;
    onDragOver?: (event: DragEvent<HTMLElement>) => void;
    onDrop?: () => void;
    onDragEnd?: () => void;
}) {
    const [isRenaming, setIsRenaming] = useState(false);
    const [nameDraft, setNameDraft] = useState(category.name);
    const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
    const titleInputRef = useRef<HTMLInputElement | null>(null);
    const iconButtonRef = useRef<HTMLButtonElement | null>(null);
    const iconUploadRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        setNameDraft(category.name);
        setIsRenaming(false);
    }, [category.name]);

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

    const visibleTags = category.preview_subcategories.slice(0, 3);
    const hiddenTagsCount = Math.max(0, category.subcategories_count - visibleTags.length);

    const commitRename = () => {
        const normalized = nameDraft.trim();

        if (normalized && normalized !== category.name) {
            onRename?.(category, normalized);
        } else {
            setNameDraft(category.name);
        }

        setIsRenaming(false);
    };

    const detailsBody = (
        <>
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
                            setNameDraft(category.name);
                            setIsRenaming(false);
                        }
                    }}
                    className="kb-card__title-input"
                />
            ) : editMode ? (
                <button
                    type="button"
                    className="kb-card__title-button"
                    title={category.name}
                    onClick={(event) => {
                        event.stopPropagation();
                        setIsRenaming(true);
                    }}
                >
                    {category.name}
                </button>
            ) : (
                <div className="kb-home__card-title" title={category.name}>
                    {category.name}
                </div>
            )}

            <div className="kb-home__card-meta">{formatHomeCardMeta(category)}</div>

            {visibleTags.length > 0 ? (
                <div className="kb-home__card-tags">
                    {visibleTags.map((item) => (
                        <span key={item.id} className="kb-home__card-tag" title={item.name}>
                            <KnowledgeBaseIcon
                                icon={item.icon}
                                imageUrl={item.icon_image_url}
                                className="kb-home__tag-icon"
                                imageClassName="kb-home__tag-icon-image"
                            />
                            <span className="kb-home__card-tag-text">{item.name}</span>
                        </span>
                    ))}

                    {hiddenTagsCount > 0 ? (
                        <span className="kb-home__card-tag kb-home__card-tag--count">
                            +{hiddenTagsCount}
                        </span>
                    ) : null}
                </div>
            ) : null}
        </>
    );

    if (!editMode) {
        return (
            <Link href={category.href} className="kb-home__card" title={category.name}>
                <KnowledgeBaseIcon
                    icon={category.icon}
                    imageUrl={category.icon_image_url}
                    className="kb-home__card-icon"
                    imageClassName="kb-home__card-icon-image"
                />
                {detailsBody}
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
            className={cn('kb-home__card kb-card--edit-mode', selected && 'is-selected')}
            style={{ animationDelay }}
            role="button"
            tabIndex={0}
            draggable
            onClick={handleCardClick}
            onKeyDown={(event) => handleSelectableKeyDown(event, onToggleSelect)}
            onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', `category:${category.id}`);
                onDragStart?.();
            }}
            onDragOver={onDragOver}
            onDrop={(event) => {
                event.preventDefault();
                onDrop?.();
            }}
            onDragEnd={onDragEnd}
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

                {category.can_delete ? (
                    <button
                        type="button"
                        className="kb-card__quick-button kb-card__quick-button--danger"
                        onClick={(event) => {
                            event.stopPropagation();
                            onDelete?.(category);
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
                    icon={category.icon}
                    imageUrl={category.icon_image_url}
                    className="kb-home__card-icon"
                    imageClassName="kb-home__card-icon-image"
                />
            </button>

            {detailsBody}

            <KnowledgeBaseIconPicker
                open={isIconPickerOpen}
                anchorEl={iconButtonRef.current}
                value={category.icon}
                onSelect={(icon) => onChangeIcon?.(category, icon)}
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
                        onUploadIcon?.(category, file);
                    }

                    event.target.value = '';
                }}
            />
        </div>
    );
}

export function KnowledgeBaseHome({
    title,
    subtitle,
    categories,
    canManage = false,
    onCreateCategory,
    onRenameCategory,
    onChangeCategoryIcon,
    onUploadCategoryIcon,
    onDeleteCategory,
    onBulkDeleteCategories,
    onReorderCategories,
}: {
    title: string;
    subtitle: string;
    categories: KnowledgeBaseHomeCategory[];
    canManage?: boolean;
    onCreateCategory?: () => void;
    onRenameCategory?: (category: KnowledgeBaseHomeCategory, name: string) => void | Promise<void>;
    onChangeCategoryIcon?: (category: KnowledgeBaseHomeCategory, icon: string) => void | Promise<void>;
    onUploadCategoryIcon?: (category: KnowledgeBaseHomeCategory, file: File) => void | Promise<void>;
    onDeleteCategory?: (category: KnowledgeBaseHomeCategory) => void | Promise<void>;
    onBulkDeleteCategories?: (categories: KnowledgeBaseHomeCategory[]) => void | Promise<void>;
    onReorderCategories?: (categoryIds: number[]) => void | Promise<void>;
}) {
    const [isTileEditMode, setIsTileEditMode] = useState(false);
    const [orderedCategories, setOrderedCategories] = useState(categories);
    const [draggedId, setDraggedId] = useState<number | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [deleteTarget, setDeleteTarget] = useState<
        | { kind: 'single'; item: KnowledgeBaseHomeCategory }
        | { kind: 'selection' }
        | null
    >(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const selectedCategories = useMemo(
        () => orderedCategories.filter((item) => selectedIds.includes(item.id)),
        [orderedCategories, selectedIds],
    );

    useEffect(() => {
        setOrderedCategories(categories);
    }, [categories]);

    useEffect(() => {
        if (!isTileEditMode) {
            setSelectedIds([]);
            setDraggedId(null);
        }
    }, [isTileEditMode]);

    const toggleSelection = (id: number) => {
        setSelectedIds((current) =>
            current.includes(id) ? current.filter((currentId) => currentId !== id) : [...current, id],
        );
    };

    const handleDragOver = (event: DragEvent<HTMLElement>) => {
        if (!draggedId) {
            return;
        }

        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (targetId: number) => {
        if (!draggedId || draggedId === targetId) {
            return;
        }

        const next = reorderById(orderedCategories, draggedId, targetId);
        withViewTransition(() => setOrderedCategories(next));
        setDraggedId(null);
        void Promise.resolve(onReorderCategories?.(next.map((item) => item.id)));
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) {
            return;
        }

        setIsDeleting(true);

        try {
            if (deleteTarget.kind === 'single') {
                await Promise.resolve(onDeleteCategory?.(deleteTarget.item));
            } else {
                await Promise.resolve(onBulkDeleteCategories?.(selectedCategories));
                setSelectedIds([]);
            }

            setDeleteTarget(null);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <div className="page-layout kb-home-page flex flex-1 flex-col gap-6">
                <div className="page-layout__header flex flex-col items-start gap-4 lg:flex-row lg:items-start">
                    <div className="space-y-1">
                        <h1 className="page-layout__title">{title}</h1>
                        <p className="page-layout__subtitle">{subtitle}</p>
                    </div>

                    {canManage ? (
                        <div className="flex flex-wrap gap-2 lg:ml-auto">
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
                                        Управлять разделами
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={onCreateCategory}
                                className="kb-atb-btn kb-atb-btn--primary"
                            >
                                <Plus className="size-4" />
                                Новый раздел
                            </button>
                        </div>
                    ) : null}
                </div>

                {canManage && isTileEditMode ? (
                    <div className="kb-tile-edit-bar">
                        <div className="kb-tile-edit-bar__title">Редактирование разделов</div>
                        <div className="kb-tile-edit-bar__meta">
                            {selectedCategories.length > 0
                                ? `Выбрано ${selectedCategories.length}: ${sectionSelectionNoun(selectedCategories.length)}`
                                : 'Выберите разделы для быстрых действий'}
                        </div>

                        <div className="kb-tile-edit-bar__actions">
                            {selectedCategories.length > 0 ? (
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
                                onClick={() => setSelectedIds([])}
                            >
                                Снять выбор
                            </button>
                        </div>
                    </div>
                ) : null}

                <div className="kb-home__grid">
                    {orderedCategories.length === 0 ? (
                        <div className="kb-home__empty">
                            Разделы еще не созданы. Создайте первый раздел, чтобы начать наполнять базу знаний.
                        </div>
                    ) : (
                        orderedCategories.map((category, index) => (
                            <HomeCategoryCard
                                key={category.id}
                                category={category}
                                editMode={canManage && isTileEditMode}
                                selected={selectedIds.includes(category.id)}
                                animationDelay={`${(index % 6) * 0.09}s`}
                                onToggleSelect={() => toggleSelection(category.id)}
                                onRename={onRenameCategory}
                                onChangeIcon={onChangeCategoryIcon}
                                onUploadIcon={onUploadCategoryIcon}
                                onDelete={(item) => setDeleteTarget({ kind: 'single', item })}
                                onDragStart={() => setDraggedId(category.id)}
                                onDragOver={handleDragOver}
                                onDrop={() => handleDrop(category.id)}
                                onDragEnd={() => setDraggedId(null)}
                            />
                        ))
                    )}
                </div>
            </div>

            <ConfirmModal
                open={deleteTarget !== null}
                title={deleteTarget?.kind === 'selection' ? 'Удалить выбранные разделы' : 'Удалить раздел'}
                description={
                    deleteTarget?.kind === 'selection'
                        ? `Будут удалены ${selectedCategories.length} выбранных разделов.`
                        : deleteTarget?.kind === 'single'
                          ? `Раздел «${deleteTarget.item.name}» будет удален без возможности восстановления.`
                          : ''
                }
                confirmLabel={deleteTarget?.kind === 'selection' ? 'Удалить выбранное' : 'Удалить'}
                danger
                processing={isDeleting}
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </>
    );
}
