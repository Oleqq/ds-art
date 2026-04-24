import { Link, router, usePage } from '@inertiajs/react';
import { createPortal } from 'react-dom';
import { ChevronRight, FolderPlus, PencilLine, SmilePlus, Trash2 } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ConfirmModal } from '@/components/confirm-modal';
import { useSidebar } from '@/components/ui/sidebar';
import { PlannedFeatureTooltip } from '@/components/planned-feature-tooltip';
import { KnowledgeBaseCategoryFormModal } from '@/features/knowledge-base/components/knowledge-base-category-form-modal';
import { KnowledgeBaseIcon } from '@/features/knowledge-base/components/knowledge-base-icon';
import { KnowledgeBaseIconPicker } from '@/features/knowledge-base/components/knowledge-base-icon-picker';
import type {
    KnowledgeBaseCategoryFormPayload,
    KnowledgeBaseSidebarData,
    KnowledgeBaseSidebarNode,
} from '@/features/knowledge-base/types';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn } from '@/lib/utils';

type SharedProps = {
    knowledgeBaseSidebar: KnowledgeBaseSidebarData | null;
};

function nodeContainsCurrentUrl(node: KnowledgeBaseSidebarNode, currentUrl: string): boolean {
    if (currentUrl.startsWith(node.href)) {
        return true;
    }

    return node.children.some((child) => nodeContainsCurrentUrl(child, currentUrl));
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
    onDelete,
    onClose,
}: {
    open: boolean;
    anchorEl: HTMLElement | null;
    canDelete: boolean;
    onRename: () => void;
    onChangeIcon: () => void;
    onAddChild: () => void;
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

            if (panelRef.current?.contains(target) || anchorEl?.contains(target)) {
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
    depth = 0,
    canManage = false,
}: {
    node: KnowledgeBaseSidebarNode;
    depth?: number;
    canManage?: boolean;
}) {
    const { currentUrl } = useCurrentUrl();
    const { knowledgeBaseSidebar } = usePage<SharedProps>().props;
    const { isMobile, setOpenMobile } = useSidebar();
    const containsCurrentUrl = useMemo(
        () => nodeContainsCurrentUrl(node, currentUrl),
        [currentUrl, node],
    );
    const [isOpen, setIsOpen] = useState(containsCurrentUrl);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
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

    const editDefaults = useMemo(() => toFormPayload(node, returnTo), [node, returnTo]);
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

    const quickUpdate = (overrides: Partial<KnowledgeBaseCategoryFormPayload>) => {
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
        <div className={cn('kb-sidebar__node', `kb-sidebar__node--depth-${depth}`)}>
            <div className={cn('kb-sidebar__row', isActive && 'is-active')}>
                <button
                    type="button"
                    onClick={() => hasChildren && setIsOpen((value) => !value)}
                    className={cn(
                        'kb-sidebar__toggle',
                        hasChildren ? 'is-visible' : 'is-leaf',
                        isOpen && hasChildren && 'is-open',
                    )}
                    aria-label={hasChildren ? `Переключить раздел ${node.name}` : undefined}
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
                        className="kb-sidebar__link"
                        onClick={() => {
                            if (isMobile) {
                                setOpenMobile(false);
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
                            depth={depth + 1}
                            canManage={canManage}
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

                    <ConfirmModal
                        open={isDeleteConfirmOpen}
                        title="Удалить раздел"
                        description={`Раздел «${node.name}» будет удален без возможности восстановления.`}
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
    return (
        <div className="kb-sidebar">
            {nodes.map((node) => (
                <KnowledgeBaseSidebarTreeNode
                    key={node.id}
                    node={node}
                    canManage={canManage}
                />
            ))}
        </div>
    );
}
