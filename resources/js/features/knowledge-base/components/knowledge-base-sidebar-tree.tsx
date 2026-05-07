import { Link, router, usePage } from '@inertiajs/react';
import { createPortal } from 'react-dom';
import {
    ChevronRight,
    FilePlus2,
    FolderPlus,
    PencilLine,
    SmilePlus,
    Trash2,
} from 'lucide-react';
import {
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type DragEvent,
} from 'react';
import { toast } from 'sonner';
import { ConfirmModal } from '@/components/confirm-modal';
import { useSidebar } from '@/components/ui/sidebar';
import { PlannedFeatureTooltip } from '@/components/planned-feature-tooltip';
import { KnowledgeBaseArticleFormModal } from '@/features/knowledge-base/components/knowledge-base-article-form-modal';
import { KnowledgeBaseCategoryFormModal } from '@/features/knowledge-base/components/knowledge-base-category-form-modal';
import { KnowledgeBaseIcon } from '@/features/knowledge-base/components/knowledge-base-icon';
import { KnowledgeBaseIconPicker } from '@/features/knowledge-base/components/knowledge-base-icon-picker';
import type {
    KnowledgeBaseArticleFormPayload,
    KnowledgeBaseCategoryFormPayload,
    KnowledgeBaseSidebarData,
    KnowledgeBaseSidebarNode,
} from '@/features/knowledge-base/types';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn } from '@/lib/utils';

type SharedProps = {
    knowledgeBaseSidebar: KnowledgeBaseSidebarData | null;
};

type SidebarDragPayload = {
    id: number;
    slug: string;
    parent_id: number | null;
};

type SidebarDropPosition = 'before' | 'after' | 'inside';

type SidebarDropTarget = {
    targetId: number;
    position: SidebarDropPosition;
};

const SIDEBAR_CATEGORY_DRAG_MIME = 'application/x-dsart-kb-category';

function nodeContainsId(node: KnowledgeBaseSidebarNode, id: number): boolean {
    return (
        node.id === id ||
        node.children.some((child) => nodeContainsId(child, id))
    );
}

function findNodeById(
    nodes: KnowledgeBaseSidebarNode[],
    id: number,
): KnowledgeBaseSidebarNode | null {
    for (const node of nodes) {
        if (node.id === id) {
            return node;
        }

        const child = findNodeById(node.children, id);

        if (child) {
            return child;
        }
    }

    return null;
}

function findSiblingsByParent(
    nodes: KnowledgeBaseSidebarNode[],
    parentId: number | null,
): KnowledgeBaseSidebarNode[] {
    if (parentId === null) {
        return nodes;
    }

    return findNodeById(nodes, parentId)?.children ?? [];
}

function insertIdNearTarget(
    siblings: KnowledgeBaseSidebarNode[],
    draggedId: number,
    targetId: number,
    position: Exclude<SidebarDropPosition, 'inside'>,
) {
    const orderedIds = siblings
        .map((item) => item.id)
        .filter((id) => id !== draggedId);
    const targetIndex = orderedIds.indexOf(targetId);
    const insertIndex =
        targetIndex === -1
            ? orderedIds.length
            : position === 'before'
              ? targetIndex
              : targetIndex + 1;

    orderedIds.splice(insertIndex, 0, draggedId);

    return orderedIds;
}

function resolveSidebarDropPosition(
    event: DragEvent<HTMLElement>,
): SidebarDropPosition {
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetY = event.clientY - rect.top;

    if (offsetY < rect.height * 0.28) {
        return 'before';
    }

    if (offsetY > rect.height * 0.72) {
        return 'after';
    }

    return 'inside';
}

function nodeContainsCurrentUrl(
    node: KnowledgeBaseSidebarNode,
    currentUrl: string,
): boolean {
    if (currentUrl.startsWith(node.href)) {
        return true;
    }

    return node.children.some((child) =>
        nodeContainsCurrentUrl(child, currentUrl),
    );
}

function toFormPayload(
    node: KnowledgeBaseSidebarNode,
    returnTo: string,
    overrides: Partial<KnowledgeBaseCategoryFormPayload> = {},
): KnowledgeBaseCategoryFormPayload {
    return {
        name: node.name,
        icon: node.icon,
        icon_image_url: node.icon_image_url ?? '',
        icon_upload: null,
        clear_icon_image: false,
        cover_url: node.cover_url ?? '',
        cover: null,
        cover_position_x: 50,
        cover_position_y: 50,
        cover_zoom_percent: 100,
        cover_height_px: 220,
        clear_cover: false,
        parent_id: node.parent_id,
        is_visible_to_employees: node.is_visible_to_employees,
        return_to: returnTo,
        ...overrides,
    };
}

function SidebarCategoryMenu({
    open,
    anchorEl,
    canDelete,
    onRename,
    onChangeIcon,
    onAddChild,
    onAddArticle,
    onDelete,
    onClose,
}: {
    open: boolean;
    anchorEl: HTMLElement | null;
    canDelete: boolean;
    onRename: () => void;
    onChangeIcon: () => void;
    onAddChild: () => void;
    onAddArticle: () => void;
    onDelete: () => void;
    onClose: () => void;
}) {
    const panelRef = useRef<HTMLDivElement | null>(null);
    const [position, setPosition] = useState({ top: 0, left: 0 });

    useEffect(() => {
        if (!open) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as Node | null;

            if (
                panelRef.current?.contains(target) ||
                anchorEl?.contains(target)
            ) {
                return;
            }

            onClose();
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('mousedown', handlePointerDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('mousedown', handlePointerDown);
        };
    }, [anchorEl, onClose, open]);

    useLayoutEffect(() => {
        if (!open || !anchorEl) {
            return;
        }

        const rect = anchorEl.getBoundingClientRect();
        const width = 206;
        const viewportPadding = 12;
        const left = Math.min(
            rect.right - width,
            window.innerWidth - width - viewportPadding,
        );

        setPosition({
            top: rect.bottom + 8,
            left: Math.max(viewportPadding, left),
        });
    }, [anchorEl, open]);

    if (!open || !anchorEl) {
        return null;
    }

    return createPortal(
        <div
            ref={panelRef}
            className="kb-tree-menu"
            style={{
                top: `${position.top}px`,
                left: `${position.left}px`,
            }}
        >
            <button
                type="button"
                className="kb-tree-menu__item"
                onClick={() => {
                    onRename();
                    onClose();
                }}
            >
                <PencilLine className="size-4" />
                Переименовать
            </button>

            <button
                type="button"
                className="kb-tree-menu__item"
                onClick={() => {
                    onChangeIcon();
                    onClose();
                }}
            >
                <SmilePlus className="size-4" />
                Сменить иконку
            </button>

            <button
                type="button"
                className="kb-tree-menu__item"
                onClick={() => {
                    onAddChild();
                    onClose();
                }}
            >
                <FolderPlus className="size-4" />
                Добавить подраздел
            </button>

            <button
                type="button"
                className="kb-tree-menu__item"
                onClick={() => {
                    onAddArticle();
                    onClose();
                }}
            >
                <FilePlus2 className="size-4" />
                Создать статью
            </button>

            <div className="kb-tree-menu__separator" />

            {canDelete ? (
                <button
                    type="button"
                    className="kb-tree-menu__item kb-tree-menu__item--danger"
                    onClick={() => {
                        onDelete();
                        onClose();
                    }}
                >
                    <Trash2 className="size-4" />
                    Удалить раздел
                </button>
            ) : (
                <PlannedFeatureTooltip
                    feature={{
                        status: 'Ограничение',
                        phase: 'Удаление раздела',
                        note: 'Удаление доступно только для пустого раздела без вложенных подразделов и статей.',
                    }}
                    side="right"
                >
                    <button
                        type="button"
                        disabled
                        className="kb-tree-menu__item kb-tree-menu__item--danger is-disabled"
                    >
                        <Trash2 className="size-4" />
                        Удалить раздел
                    </button>
                </PlannedFeatureTooltip>
            )}
        </div>,
        document.body,
    );
}

function KnowledgeBaseSidebarTreeNode({
    node,
    rootNodes,
    depth = 0,
    canManage = false,
    dragPayload,
    dropTarget,
    onDragStart,
    onDragEnd,
    onDragOverNode,
    onDragLeaveNode,
    onDropNode,
}: {
    node: KnowledgeBaseSidebarNode;
    rootNodes: KnowledgeBaseSidebarNode[];
    depth?: number;
    canManage?: boolean;
    dragPayload: SidebarDragPayload | null;
    dropTarget: SidebarDropTarget | null;
    onDragStart: (
        node: KnowledgeBaseSidebarNode,
        event: DragEvent<HTMLElement>,
    ) => void;
    onDragEnd: () => void;
    onDragOverNode: (
        node: KnowledgeBaseSidebarNode,
        position: SidebarDropPosition,
        event: DragEvent<HTMLElement>,
    ) => void;
    onDragLeaveNode: (
        node: KnowledgeBaseSidebarNode,
        event: DragEvent<HTMLElement>,
    ) => void;
    onDropNode: (
        node: KnowledgeBaseSidebarNode,
        position: SidebarDropPosition,
        event: DragEvent<HTMLElement>,
    ) => void;
}) {
    const { currentUrl } = useCurrentUrl();
    const { knowledgeBaseSidebar } = usePage<SharedProps>().props;
    const { isMobile, setOpenMobile } = useSidebar();
    const isTouchLike = useMemo(
        () =>
            typeof window !== 'undefined' &&
            window.matchMedia('(hover: none)').matches,
        [],
    );
    const containsCurrentUrl = useMemo(
        () => nodeContainsCurrentUrl(node, currentUrl),
        [currentUrl, node],
    );
    const [isOpen, setIsOpen] = useState(containsCurrentUrl);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isCreateArticleOpen, setIsCreateArticleOpen] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [nameDraft, setNameDraft] = useState(node.name);
    const moreButtonRef = useRef<HTMLButtonElement | null>(null);
    const titleInputRef = useRef<HTMLInputElement | null>(null);
    const iconFileRef = useRef<HTMLInputElement | null>(null);

    const isActive = currentUrl.startsWith(node.href);
    const hasChildren = node.children.length > 0;
    const draggedNode = dragPayload
        ? findNodeById(rootNodes, dragPayload.id)
        : null;
    const isInvalidDropTarget = Boolean(
        draggedNode &&
        (draggedNode.id === node.id || nodeContainsId(draggedNode, node.id)),
    );
    const homeHref = knowledgeBaseSidebar?.home_href ?? '/admin/knowledge-base';
    const returnTo = currentUrl || homeHref;
    const deleteReturnTo = currentUrl === node.href ? homeHref : returnTo;

    useEffect(() => {
        if (containsCurrentUrl) {
            setIsOpen(true);
        }
    }, [containsCurrentUrl]);

    useEffect(() => {
        setNameDraft(node.name);
        setIsRenaming(false);
    }, [node.name]);

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

    const editDefaults = useMemo(
        () => toFormPayload(node, returnTo),
        [node, returnTo],
    );
    const createDefaults = useMemo(
        () =>
            toFormPayload(node, returnTo, {
                name: '',
                icon: '',
                icon_image_url: '',
                parent_id: node.id,
                cover_url: '',
                is_visible_to_employees: node.is_visible_to_employees,
            }),
        [node, returnTo],
    );
    const createArticleDefaults = useMemo<KnowledgeBaseArticleFormPayload>(
        () => ({
            knowledge_category_id: node.id,
            title: '',
            icon: '',
            icon_image_url: '',
            icon_upload: null,
            clear_icon_image: false,
            summary: '',
            content: '',
            blocks: '',
            cover: null,
            cover_url: '',
            cover_position_x: 50,
            cover_position_y: 50,
            cover_zoom_percent: 100,
            cover_height_px: 220,
            clear_cover: false,
            is_published: true,
            scheduled_publish_at: null,
            tags: [],
            access_level: 'inherit',
            return_to: returnTo,
        }),
        [node.id, returnTo],
    );

    const quickUpdate = (
        overrides: Partial<KnowledgeBaseCategoryFormPayload>,
    ) => {
        router.put(
            `/admin/knowledge-base/categories/${node.slug}`,
            {
                ...editDefaults,
                ...overrides,
            },
            {
                preserveScroll: true,
                preserveState: false,
                forceFormData: true,
            },
        );
    };

    const submitRename = () => {
        const normalized = nameDraft.trim();

        if (!normalized) {
            setNameDraft(node.name);
            setIsRenaming(false);
            return;
        }

        if (normalized !== node.name) {
            quickUpdate({
                name: normalized,
                return_to: isActive ? '' : returnTo,
            });
        }

        setIsRenaming(false);
    };

    const confirmDelete = () => {
        setIsDeleting(true);

        router.delete(`/admin/knowledge-base/categories/${node.slug}`, {
            data: {
                return_to: deleteReturnTo,
            },
            preserveScroll: true,
            preserveState: true,
            onFinish: () => {
                setIsDeleting(false);
                setIsDeleteConfirmOpen(false);
            },
            onSuccess: () => router.reload(),
        });
    };

    return (
        <div
            className={cn(
                'kb-sidebar__node',
                `kb-sidebar__node--depth-${depth}`,
            )}
        >
            <div
                className={cn(
                    'kb-sidebar__row',
                    isActive && 'is-active',
                    canManage && 'is-draggable',
                    dragPayload?.id === node.id && 'is-dragging',
                    dropTarget?.targetId === node.id &&
                        !isInvalidDropTarget &&
                        `is-drop-${dropTarget.position}`,
                )}
                draggable={
                    canManage && !isRenaming && !isMobile && !isTouchLike
                }
                onDragStart={(event) => {
                    if (!canManage || isRenaming) {
                        return;
                    }

                    onDragStart(node, event);
                }}
                onDragEnd={onDragEnd}
                onDragOver={(event) => {
                    if (!canManage || !dragPayload || isInvalidDropTarget) {
                        return;
                    }

                    onDragOverNode(
                        node,
                        resolveSidebarDropPosition(event),
                        event,
                    );
                }}
                onDragLeave={(event) => onDragLeaveNode(node, event)}
                onDrop={(event) => {
                    if (!canManage || !dragPayload || isInvalidDropTarget) {
                        return;
                    }

                    const position = resolveSidebarDropPosition(event);

                    if (position === 'inside') {
                        setIsOpen(true);
                    }

                    onDropNode(node, position, event);
                }}
            >
                <button
                    type="button"
                    onClick={() => hasChildren && setIsOpen((value) => !value)}
                    className={cn(
                        'kb-sidebar__toggle',
                        hasChildren ? 'is-visible' : 'is-leaf',
                        isOpen && hasChildren && 'is-open',
                    )}
                    aria-label={
                        hasChildren
                            ? `Переключить раздел ${node.name}`
                            : undefined
                    }
                >
                    <ChevronRight className="size-3" />
                </button>

                {canManage ? (
                    <button
                        type="button"
                        className="kb-sidebar__icon-button"
                        onClick={() => setIsIconPickerOpen(true)}
                    >
                        <KnowledgeBaseIcon
                            icon={node.icon}
                            imageUrl={node.icon_image_url}
                            className="kb-sidebar__icon"
                            imageClassName="kb-sidebar__icon-image"
                        />
                    </button>
                ) : null}

                {isRenaming ? (
                    <input
                        ref={titleInputRef}
                        value={nameDraft}
                        onChange={(event) => setNameDraft(event.target.value)}
                        onBlur={submitRename}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                event.preventDefault();
                                submitRename();
                            }

                            if (event.key === 'Escape') {
                                event.preventDefault();
                                setNameDraft(node.name);
                                setIsRenaming(false);
                            }
                        }}
                        className="kb-sidebar__title-input"
                    />
                ) : (
                    <Link
                        href={node.href}
                        draggable={false}
                        className="kb-sidebar__link"
                        onClick={() => {
                            if (isMobile) {
                                window.setTimeout(
                                    () => setOpenMobile(false),
                                    0,
                                );
                            }
                        }}
                    >
                        {!canManage ? (
                            <KnowledgeBaseIcon
                                icon={node.icon}
                                imageUrl={node.icon_image_url}
                                className="kb-sidebar__icon"
                                imageClassName="kb-sidebar__icon-image"
                            />
                        ) : null}
                        <span
                            className="kb-sidebar__label"
                            onDoubleClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                setIsRenaming(true);
                            }}
                        >
                            {node.name}
                        </span>
                    </Link>
                )}

                {canManage ? (
                    <>
                        <button
                            type="button"
                            className="kb-add-btn"
                            title="Добавить подраздел"
                            onClick={() => {
                                setIsCreateOpen(true);
                                setIsOpen(true);
                            }}
                        >
                            +
                        </button>

                        <button
                            ref={moreButtonRef}
                            type="button"
                            className="kb-more-btn"
                            title="Действия"
                            onClick={() => setIsMenuOpen((value) => !value)}
                        >
                            ...
                        </button>
                    </>
                ) : null}
            </div>

            {hasChildren && isOpen ? (
                <div className="kb-sidebar__children">
                    {node.children.map((child) => (
                        <KnowledgeBaseSidebarTreeNode
                            key={child.id}
                            node={child}
                            rootNodes={rootNodes}
                            depth={depth + 1}
                            canManage={canManage}
                            dragPayload={dragPayload}
                            dropTarget={dropTarget}
                            onDragStart={onDragStart}
                            onDragEnd={onDragEnd}
                            onDragOverNode={onDragOverNode}
                            onDragLeaveNode={onDragLeaveNode}
                            onDropNode={onDropNode}
                        />
                    ))}
                </div>
            ) : null}

            {canManage ? (
                <>
                    <SidebarCategoryMenu
                        open={isMenuOpen}
                        anchorEl={moreButtonRef.current}
                        canDelete={node.can_delete}
                        onClose={() => setIsMenuOpen(false)}
                        onRename={() => setIsRenaming(true)}
                        onChangeIcon={() => setIsIconPickerOpen(true)}
                        onAddChild={() => {
                            setIsCreateOpen(true);
                            setIsOpen(true);
                        }}
                        onAddArticle={() => setIsCreateArticleOpen(true)}
                        onDelete={() => setIsDeleteConfirmOpen(true)}
                    />

                    <KnowledgeBaseIconPicker
                        open={isIconPickerOpen}
                        anchorEl={moreButtonRef.current}
                        value={node.icon}
                        onSelect={(icon) =>
                            quickUpdate({
                                icon,
                                clear_icon_image: true,
                                icon_image_url: '',
                            })
                        }
                        onUploadRequest={() => iconFileRef.current?.click()}
                        onClose={() => setIsIconPickerOpen(false)}
                    />

                    <input
                        ref={iconFileRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.gif,.svg"
                        className="hidden"
                        onChange={(event) => {
                            const file = event.target.files?.[0] ?? null;

                            if (file) {
                                quickUpdate({
                                    icon: '',
                                    icon_upload: file,
                                    clear_icon_image: false,
                                });
                            }

                            event.target.value = '';
                        }}
                    />

                    <KnowledgeBaseCategoryFormModal
                        open={isCreateOpen}
                        title="Новый подраздел"
                        description={`Новый подраздел появится внутри раздела «${node.name}».`}
                        submitLabel="Создать подраздел"
                        defaults={createDefaults}
                        submitUrl="/admin/knowledge-base/categories"
                        onCancel={() => setIsCreateOpen(false)}
                        onSuccess={() => {
                            setIsCreateOpen(false);
                            setIsOpen(true);
                        }}
                    />

                    <KnowledgeBaseArticleFormModal
                        open={isCreateArticleOpen}
                        title="Новая статья"
                        description={`Статья появится внутри раздела «${node.name}».`}
                        submitLabel="Создать статью"
                        defaults={createArticleDefaults}
                        submitUrl={`/admin/knowledge-base/categories/${node.slug}/articles`}
                        onCancel={() => setIsCreateArticleOpen(false)}
                        onSuccess={() => {
                            setIsCreateArticleOpen(false);
                            setIsOpen(true);
                        }}
                    />

                    <ConfirmModal
                        open={isDeleteConfirmOpen}
                        title="Удалить раздел"
                        description={`Раздел «${node.name}» будет удален вместе со всеми вложенными материалами без возможности восстановления.`}
                        confirmLabel="Удалить раздел"
                        danger
                        processing={isDeleting}
                        onConfirm={confirmDelete}
                        onCancel={() => setIsDeleteConfirmOpen(false)}
                    />
                </>
            ) : null}
        </div>
    );
}

export function KnowledgeBaseSidebarTree({
    nodes,
    canManage = false,
}: {
    nodes: KnowledgeBaseSidebarNode[];
    canManage?: boolean;
}) {
    const { knowledgeBaseSidebar } = usePage<SharedProps>().props;
    const { currentUrl } = useCurrentUrl();
    const [dragPayload, setDragPayload] = useState<SidebarDragPayload | null>(
        null,
    );
    const [dropTarget, setDropTarget] = useState<SidebarDropTarget | null>(
        null,
    );
    const homeHref = knowledgeBaseSidebar?.home_href ?? '/admin/knowledge-base';
    const returnTo = currentUrl || homeHref;

    const handleDragStart = (
        node: KnowledgeBaseSidebarNode,
        event: DragEvent<HTMLElement>,
    ) => {
        const payload = {
            id: node.id,
            slug: node.slug,
            parent_id: node.parent_id,
        };

        setDragPayload(payload);
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData(
            SIDEBAR_CATEGORY_DRAG_MIME,
            JSON.stringify(payload),
        );
        event.dataTransfer.setData('text/plain', node.name);
    };

    const handleDragEnd = () => {
        setDragPayload(null);
        setDropTarget(null);
    };

    const handleDragOverNode = (
        node: KnowledgeBaseSidebarNode,
        position: SidebarDropPosition,
        event: DragEvent<HTMLElement>,
    ) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setDropTarget((current) => {
            if (
                current?.targetId === node.id &&
                current.position === position
            ) {
                return current;
            }

            return { targetId: node.id, position };
        });
    };

    const handleDragLeaveNode = (
        node: KnowledgeBaseSidebarNode,
        event: DragEvent<HTMLElement>,
    ) => {
        const nextTarget = event.relatedTarget as Node | null;

        if (nextTarget && event.currentTarget.contains(nextTarget)) {
            return;
        }

        setDropTarget((current) =>
            current?.targetId === node.id ? null : current,
        );
    };

    const handleDropNode = (
        node: KnowledgeBaseSidebarNode,
        position: SidebarDropPosition,
        event: DragEvent<HTMLElement>,
    ) => {
        event.preventDefault();
        event.stopPropagation();

        const payload = dragPayload;
        const draggedNode = payload ? findNodeById(nodes, payload.id) : null;

        setDragPayload(null);
        setDropTarget(null);

        if (!payload || !draggedNode) {
            return;
        }

        if (payload.id === node.id || nodeContainsId(draggedNode, node.id)) {
            toast.error('Нельзя переместить раздел внутрь самого себя.');
            return;
        }

        const parentId = position === 'inside' ? node.id : node.parent_id;
        const orderedCategoryIds =
            position === 'inside'
                ? [
                      ...node.children
                          .map((child) => child.id)
                          .filter((id) => id !== payload.id),
                      payload.id,
                  ]
                : insertIdNearTarget(
                      findSiblingsByParent(nodes, parentId),
                      payload.id,
                      node.id,
                      position,
                  );

        router.patch(
            `/admin/knowledge-base/categories/${payload.slug}/place`,
            {
                parent_id: parentId,
                ordered_category_ids: orderedCategoryIds,
                return_to: returnTo,
            },
            {
                preserveScroll: true,
                preserveState: false,
                onError: () => {
                    toast.error('Не удалось изменить порядок разделов.');
                },
            },
        );
    };

    return (
        <div className="kb-sidebar">
            {nodes.map((node) => (
                <KnowledgeBaseSidebarTreeNode
                    key={node.id}
                    node={node}
                    rootNodes={nodes}
                    canManage={canManage}
                    dragPayload={dragPayload}
                    dropTarget={dropTarget}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragOverNode={handleDragOverNode}
                    onDragLeaveNode={handleDragLeaveNode}
                    onDropNode={handleDropNode}
                />
            ))}
        </div>
    );
}
