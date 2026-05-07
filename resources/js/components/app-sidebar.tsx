import { Link, router, usePage } from '@inertiajs/react';
import {
    BookOpen,
    BriefcaseBusiness,
    FileText,
    FolderOpen,
    LockKeyhole,
    PanelLeftClose,
    PanelLeftOpen,
    Search,
    UserRound,
    X,
} from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { KnowledgeBaseIcon } from '@/features/knowledge-base/components/knowledge-base-icon';
import { KnowledgeBaseSidebarTree } from '@/features/knowledge-base/components/knowledge-base-sidebar-tree';
import type {
    KnowledgeBaseSearchItem,
    KnowledgeBaseSearchResults,
    KnowledgeBaseSidebarData,
} from '@/features/knowledge-base/types';
import type { Auth, NavItem } from '@/types';

type SharedProps = {
    auth: Auth;
    knowledgeBaseSidebar: KnowledgeBaseSidebarData | null;
};

type SearchPreviewResponse = {
    query: string;
    results: KnowledgeBaseSearchResults;
};

function SidebarSearchPreviewItem({
    item,
    onSelect,
}: {
    item: KnowledgeBaseSearchItem;
    onSelect: () => void;
}) {
    const isCategory = item.type === 'category';

    return (
        <Link
            href={item.href}
            className="sidebar-search-preview__item"
            onClick={onSelect}
        >
            <span className="sidebar-search-preview__item-icon">
                {item.icon || item.icon_image_url ? (
                    <KnowledgeBaseIcon
                        icon={item.icon ?? ''}
                        imageUrl={item.icon_image_url ?? null}
                        className="sidebar-search-preview__item-emoji"
                        imageClassName="sidebar-search-preview__item-image"
                    />
                ) : isCategory ? (
                    <FolderOpen className="size-3.5" />
                ) : (
                    <FileText className="size-3.5" />
                )}
            </span>

            <span className="sidebar-search-preview__item-body">
                <span className="sidebar-search-preview__item-topline">
                    <span className="sidebar-search-preview__item-type">
                        {isCategory ? 'Раздел' : 'Статья'}
                    </span>
                    <span className="sidebar-search-preview__item-meta">
                        {item.meta}
                    </span>
                </span>
                <span className="sidebar-search-preview__item-title">
                    {item.title}
                </span>
            </span>
        </Link>
    );
}

function CompactSidebarTooltip({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>{children}</TooltipTrigger>
            <TooltipContent
                side="right"
                align="center"
                sideOffset={12}
            >
                {label}
            </TooltipContent>
        </Tooltip>
    );
}

export function AppSidebar() {
    const page = usePage<SharedProps>();
    const { auth, knowledgeBaseSidebar } = page.props;
    const { state, toggleSidebar, isMobile, setOpenMobile } = useSidebar();
    const isCollapsed = !isMobile && state === 'collapsed';
    const searchWrapRef = useRef<HTMLDivElement | null>(null);
    const currentPath = useMemo(
        () => new URL(page.url, 'http://localhost').pathname,
        [page.url],
    );

    const searchHref =
        auth.user.role === 'admin'
            ? '/admin/knowledge-base/search'
            : '/employee/knowledge-base/search';
    const previewHref =
        auth.user.role === 'admin'
            ? '/admin/knowledge-base/search/preview'
            : '/employee/knowledge-base/search/preview';

    const currentSearchQuery = useMemo(() => {
        const currentUrl = new URL(page.url, 'http://localhost');

        return currentUrl.pathname === searchHref
            ? (currentUrl.searchParams.get('q') ?? '')
            : '';
    }, [page.url, searchHref]);

    const [knowledgeSearch, setKnowledgeSearch] = useState(currentSearchQuery);
    const [previewResults, setPreviewResults] =
        useState<KnowledgeBaseSearchResults>({
            categories: [],
            articles: [],
            total: 0,
        });
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    useEffect(() => {
        setKnowledgeSearch(currentSearchQuery);
    }, [currentSearchQuery]);

    useEffect(() => {
        setIsPreviewOpen(false);
    }, [page.url]);

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (!searchWrapRef.current?.contains(event.target as Node)) {
                setIsPreviewOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsPreviewOpen(false);
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
            document.removeEventListener('keydown', handleEscape);
        };
    }, []);

    useEffect(() => {
        const query = knowledgeSearch.trim();

        if (query === '') {
            setPreviewResults({ categories: [], articles: [], total: 0 });
            setIsPreviewLoading(false);
            setIsPreviewOpen(false);
            return;
        }

        if (isMobile) {
            setIsPreviewLoading(false);
            setIsPreviewOpen(false);
            return;
        }

        const controller = new AbortController();
        const timeout = window.setTimeout(async () => {
            setIsPreviewLoading(true);

            try {
                const response = await fetch(
                    `${previewHref}?q=${encodeURIComponent(query)}`,
                    {
                        headers: {
                            Accept: 'application/json',
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                        credentials: 'same-origin',
                        signal: controller.signal,
                    },
                );

                if (!response.ok) {
                    throw new Error(
                        `Preview request failed: ${response.status}`,
                    );
                }

                const payload =
                    (await response.json()) as SearchPreviewResponse;

                setPreviewResults(payload.results);

                if (searchWrapRef.current?.contains(document.activeElement)) {
                    setIsPreviewOpen(true);
                }
            } catch {
                if (!controller.signal.aborted) {
                    setPreviewResults({
                        categories: [],
                        articles: [],
                        total: 0,
                    });
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsPreviewLoading(false);
                }
            }
        }, 180);

        return () => {
            controller.abort();
            window.clearTimeout(timeout);
        };
    }, [isMobile, knowledgeSearch, previewHref]);

    const homeHref =
        auth.user.role === 'admin'
            ? '/admin/knowledge-base'
            : '/employee/knowledge-base';

    const submitKnowledgeSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const query = knowledgeSearch.trim();
        setIsPreviewOpen(false);

        if (query === '') {
            router.visit(
                knowledgeBaseSidebar?.home_href ??
                    searchHref.replace('/search', ''),
            );
            return;
        }

        router.get(
            searchHref,
            { q: query },
            {
                preserveState: true,
                preserveScroll: false,
            },
        );

        if (isMobile) {
            setOpenMobile(false);
        }
    };

    const closePreview = () => {
        setIsPreviewOpen(false);

        if (isMobile) {
            setOpenMobile(false);
        }
    };

    const clearSearch = () => {
        setKnowledgeSearch('');
        setPreviewResults({ categories: [], articles: [], total: 0 });
        setIsPreviewOpen(false);
    };

    const mainNavItems: NavItem[] =
        auth.user.role === 'admin'
            ? [
                  {
                      title: 'Сотрудники',
                      href: '/admin/employees',
                      icon: BriefcaseBusiness,
                      matchPrefix: true,
                  },
                  {
                      title: 'Права доступа',
                      href: '/admin/access',
                      icon: LockKeyhole,
                      matchPrefix: true,
                  },
                  {
                      title: 'База знаний',
                      href: '/admin/knowledge-base',
                      icon: BookOpen,
                      matchPrefix: true,
                  },
              ]
            : [
                  {
                      title: 'Мой профиль',
                      href: '/employee/profile',
                      icon: UserRound,
                      matchPrefix: true,
                  },
                  {
                      title: 'База знаний',
                      href: '/employee/knowledge-base',
                      icon: BookOpen,
                      matchPrefix: true,
                  },
              ];

    const compactKnowledgeNodes = knowledgeBaseSidebar?.nodes ?? [];
    const stopTextInputPointerPropagation = (event: {
        stopPropagation: () => void;
    }) => {
        event.stopPropagation();
    };

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader className="sidebar-panel__header">
                <button
                    type="button"
                    onClick={toggleSidebar}
                    className="sidebar-panel__toggle"
                    aria-label={
                        isMobile
                            ? 'Закрыть меню'
                            : isCollapsed
                              ? 'Развернуть меню'
                              : 'Свернуть меню'
                    }
                    title={
                        isMobile
                            ? 'Закрыть меню'
                            : isCollapsed
                              ? 'Развернуть меню'
                              : 'Свернуть меню'
                    }
                >
                    {isMobile ? (
                        <PanelLeftClose className="size-4" />
                    ) : isCollapsed ? (
                        <PanelLeftOpen className="size-4" />
                    ) : (
                        <PanelLeftClose className="size-4" />
                    )}
                </button>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            asChild
                            className="sidebar-panel__logo"
                        >
                            <Link
                                href={homeHref}
                                onClick={() => {
                                    if (isMobile) {
                                        setOpenMobile(false);
                                    }
                                }}
                            >
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />

                {knowledgeBaseSidebar ? (
                    isCollapsed ? (
                        <div className="sidebar-panel__compact-actions">
                            <CompactSidebarTooltip label="Поиск">
                                <Link
                                    href={searchHref}
                                    className="sidebar-panel__compact-link"
                                    aria-label="Открыть поиск"
                                    title="Открыть поиск"
                                >
                                    <Search className="size-4" />
                                    <span className="sr-only">
                                        Открыть поиск
                                    </span>
                                </Link>
                            </CompactSidebarTooltip>

                            <div className="sidebar-panel__compact-tree">
                                {compactKnowledgeNodes.map((node) => {
                                    const nodePath = new URL(
                                        node.href,
                                        'http://localhost',
                                    ).pathname;
                                    const isActive =
                                        currentPath === nodePath ||
                                        currentPath.startsWith(`${nodePath}/`);

                                    return (
                                        <CompactSidebarTooltip
                                            key={node.id}
                                            label={node.name}
                                        >
                                            <Link
                                                href={node.href}
                                                className={`sidebar-panel__compact-node ${
                                                    isActive ? 'is-active' : ''
                                                }`}
                                                aria-label={node.name}
                                                onClick={() => {
                                                    if (isMobile) {
                                                        setOpenMobile(false);
                                                    }
                                                }}
                                            >
                                                <KnowledgeBaseIcon
                                                    icon={node.icon ?? ''}
                                                    imageUrl={
                                                        node.icon_image_url ??
                                                        null
                                                    }
                                                    className="sidebar-panel__compact-node-emoji"
                                                    imageClassName="sidebar-panel__compact-node-image"
                                                />
                                                <span className="sr-only">
                                                    {node.name}
                                                </span>
                                            </Link>
                                        </CompactSidebarTooltip>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="sidebar-panel__sections">
                            <div className="sidebar-panel__section-label">
                                Разделы
                            </div>

                            <div
                                ref={searchWrapRef}
                                className="sidebar-panel__search-wrap"
                            >
                                <form
                                    className="sidebar-panel__search"
                                    onSubmit={submitKnowledgeSearch}
                                >
                                    <Search className="sidebar-panel__search-icon-svg size-3.5" />
                                    <input
                                        type="text"
                                        value={knowledgeSearch}
                                        onMouseDownCapture={
                                            stopTextInputPointerPropagation
                                        }
                                        onPointerDownCapture={
                                            stopTextInputPointerPropagation
                                        }
                                        onChange={(event) =>
                                            setKnowledgeSearch(
                                                event.target.value,
                                            )
                                        }
                                        onFocus={() => {
                                            if (isMobile) {
                                                const query =
                                                    knowledgeSearch.trim();

                                                router.get(
                                                    searchHref,
                                                    query === ''
                                                        ? {}
                                                        : { q: query },
                                                    {
                                                        preserveState: true,
                                                        preserveScroll: false,
                                                    },
                                                );
                                                setOpenMobile(false);
                                                return;
                                            }

                                            if (knowledgeSearch.trim() !== '') {
                                                setIsPreviewOpen(true);
                                            }
                                        }}
                                        placeholder="Поиск..."
                                        inputMode="search"
                                        autoComplete="off"
                                        className="sidebar-panel__search-input"
                                    />
                                    {knowledgeSearch.trim() !== '' ? (
                                        <button
                                            type="button"
                                            className="sidebar-panel__search-clear"
                                            onClick={clearSearch}
                                            aria-label="Очистить поиск"
                                        >
                                            <X className="size-3.5" />
                                        </button>
                                    ) : null}
                                </form>

                                <div
                                    className={`sidebar-search-preview ${
                                        isPreviewOpen &&
                                        knowledgeSearch.trim() !== ''
                                            ? 'is-open'
                                            : ''
                                    }`}
                                >
                                    {isPreviewLoading ? (
                                        <div className="sidebar-search-preview__state">
                                            Ищем совпадения...
                                        </div>
                                    ) : previewResults.total > 0 ? (
                                        <>
                                            {previewResults.categories.length >
                                            0 ? (
                                                <div className="sidebar-search-preview__section">
                                                    <div className="sidebar-search-preview__title">
                                                        Разделы
                                                    </div>
                                                    <div className="sidebar-search-preview__list">
                                                        {previewResults.categories.map(
                                                            (item) => (
                                                                <SidebarSearchPreviewItem
                                                                    key={`category-${item.id}`}
                                                                    item={item}
                                                                    onSelect={
                                                                        closePreview
                                                                    }
                                                                />
                                                            ),
                                                        )}
                                                    </div>
                                                </div>
                                            ) : null}

                                            {previewResults.articles.length >
                                            0 ? (
                                                <div className="sidebar-search-preview__section">
                                                    <div className="sidebar-search-preview__title">
                                                        Статьи и материалы
                                                    </div>
                                                    <div className="sidebar-search-preview__list">
                                                        {previewResults.articles.map(
                                                            (item) => (
                                                                <SidebarSearchPreviewItem
                                                                    key={`article-${item.id}`}
                                                                    item={item}
                                                                    onSelect={
                                                                        closePreview
                                                                    }
                                                                />
                                                            ),
                                                        )}
                                                    </div>
                                                </div>
                                            ) : null}

                                            <div className="sidebar-search-preview__footer">
                                                <button
                                                    type="button"
                                                    className="sidebar-search-preview__all"
                                                    onClick={() => {
                                                        const query =
                                                            knowledgeSearch.trim();

                                                        if (query === '') {
                                                            return;
                                                        }

                                                        setIsPreviewOpen(false);
                                                        router.get(
                                                            searchHref,
                                                            { q: query },
                                                            {
                                                                preserveState: true,
                                                                preserveScroll: false,
                                                            },
                                                        );

                                                        if (isMobile) {
                                                            setOpenMobile(
                                                                false,
                                                            );
                                                        }
                                                    }}
                                                >
                                                    Открыть полный поиск
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="sidebar-search-preview__state">
                                            Ничего не найдено. Нажмите Enter для
                                            полного поиска.
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="sidebar-panel__tree">
                                <KnowledgeBaseSidebarTree
                                    nodes={knowledgeBaseSidebar.nodes}
                                    canManage={auth.user.role === 'admin'}
                                />

                                {auth.user.role === 'admin' ? (
                                    <Link
                                        href={`${knowledgeBaseSidebar.home_href}?create=1`}
                                        className="sidebar-panel__new"
                                        onClick={() => {
                                            if (isMobile) {
                                                setOpenMobile(false);
                                            }
                                        }}
                                    >
                                        + Новая категория
                                    </Link>
                                ) : null}
                            </div>
                        </div>
                    )
                ) : null}
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
