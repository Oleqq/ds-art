import { Link, usePage } from '@inertiajs/react';
import {
    BookOpen,
    BriefcaseBusiness,
    LockKeyhole,
    PanelLeft,
    Search,
    Settings2,
    UserRound,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSidebar } from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { edit as editProfile } from '@/routes/profile';
import type { Auth, BreadcrumbItem } from '@/types';

function resolveTitle(
    currentUrl: string,
    role: Auth['user']['role'],
    breadcrumbs: BreadcrumbItem[],
) {
    if (breadcrumbs.length > 0) {
        return breadcrumbs[breadcrumbs.length - 1].title;
    }

    if (role === 'admin') {
        if (currentUrl.startsWith('/admin/access')) {
            return 'Права доступа';
        }

        if (currentUrl.startsWith('/admin/knowledge-base/search')) {
            return 'Поиск';
        }

        if (currentUrl.startsWith('/admin/knowledge-base')) {
            return 'База знаний';
        }

        if (currentUrl.startsWith('/admin/employees')) {
            return currentUrl === '/admin/employees'
                ? 'Команда'
                : 'Сотрудник';
        }

        if (currentUrl.startsWith('/settings')) {
            return 'Настройки';
        }

        return 'DS Art';
    }

    if (currentUrl.startsWith('/employee/knowledge-base/search')) {
        return 'Поиск';
    }

    if (currentUrl.startsWith('/employee/knowledge-base')) {
        return 'База знаний';
    }

    if (currentUrl.startsWith('/employee/profile')) {
        return 'Мой профиль';
    }

    if (currentUrl.startsWith('/settings')) {
        return 'Настройки';
    }

    return 'DS Art';
}

export function AppMobileShell({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItem[];
}) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const { currentUrl, isCurrentOrParentUrl, isCurrentUrl } = useCurrentUrl();
    const { openMobile, setOpenMobile } = useSidebar();
    const [isChromeHidden, setIsChromeHidden] = useState(false);
    const lastScrollYRef = useRef(0);

    const title = useMemo(
        () => resolveTitle(currentUrl, auth.user.role, breadcrumbs),
        [auth.user.role, breadcrumbs, currentUrl],
    );

    const isAdmin = auth.user.role === 'admin';
    const searchHref = isAdmin
        ? '/admin/knowledge-base/search'
        : '/employee/knowledge-base/search';

    useEffect(() => {
        if (openMobile) {
            setIsChromeHidden(false);
            return;
        }

        const handleScroll = () => {
            const nextY = Math.max(
                window.scrollY,
                document.documentElement.scrollTop,
                0,
            );
            const delta = nextY - lastScrollYRef.current;

            if (nextY <= 24) {
                setIsChromeHidden(false);
            } else if (delta > 10) {
                setIsChromeHidden(true);
            } else if (delta < -6) {
                setIsChromeHidden(false);
            }

            lastScrollYRef.current = nextY;
        };

        lastScrollYRef.current = Math.max(
            window.scrollY,
            document.documentElement.scrollTop,
            0,
        );

        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [openMobile]);

    const handleOpenSidebar = (
        event: React.PointerEvent<HTMLButtonElement>,
    ) => {
        event.preventDefault();
        event.stopPropagation();
        window.setTimeout(() => {
            setOpenMobile(true);
        }, 0);
    };

    return (
        <>
            <header
                className={`mobile-shell__header md:hidden ${
                    openMobile ? 'is-hidden-while-sidebar-open' : ''
                } ${isChromeHidden ? 'is-scroll-hidden' : ''}`}
            >
                <button
                    type="button"
                    className="mobile-shell__header-btn mobile-shell__header-btn--menu"
                    aria-label="Открыть меню"
                    onPointerDown={handleOpenSidebar}
                    onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                    }}
                >
                    <PanelLeft className="size-5" />
                </button>

                <div className="mobile-shell__header-title">{title}</div>

                <div className="mobile-shell__header-actions">
                    <Link
                        href={searchHref}
                        className="mobile-shell__header-btn mobile-shell__header-btn--search"
                        aria-label="Открыть поиск"
                        onClick={() => setOpenMobile(false)}
                    >
                        <Search className="size-5" />
                    </Link>
                </div>
            </header>

            <nav
                className={`mobile-shell__nav md:hidden ${
                    openMobile ? 'is-hidden-while-sidebar-open' : ''
                } ${isChromeHidden ? 'is-scroll-hidden' : ''}`}
                aria-label="Мобильная навигация"
            >
                <div className="mobile-shell__nav-items">
                    {isAdmin ? (
                        <>
                            <Link
                                href="/admin/employees"
                                className={`mobile-shell__nav-item ${
                                    isCurrentOrParentUrl('/admin/employees')
                                        ? 'is-active'
                                        : ''
                                }`}
                                onClick={() => setOpenMobile(false)}
                            >
                                <BriefcaseBusiness className="mobile-shell__nav-icon" />
                                <span className="mobile-shell__nav-label">
                                    Команда
                                </span>
                            </Link>

                            <Link
                                href="/admin/access"
                                className={`mobile-shell__nav-item ${
                                    isCurrentOrParentUrl('/admin/access')
                                        ? 'is-active'
                                        : ''
                                }`}
                                onClick={() => setOpenMobile(false)}
                            >
                                <LockKeyhole className="mobile-shell__nav-icon" />
                                <span className="mobile-shell__nav-label">
                                    Доступ
                                </span>
                            </Link>

                            <Link
                                href="/admin/knowledge-base"
                                className={`mobile-shell__nav-item ${
                                    isCurrentOrParentUrl(
                                        '/admin/knowledge-base',
                                    ) &&
                                    !isCurrentOrParentUrl(
                                        '/admin/knowledge-base/search',
                                    )
                                        ? 'is-active'
                                        : ''
                                }`}
                                onClick={() => setOpenMobile(false)}
                            >
                                <BookOpen className="mobile-shell__nav-icon" />
                                <span className="mobile-shell__nav-label">
                                    База
                                </span>
                            </Link>

                            <Link
                                href={searchHref}
                                className={`mobile-shell__nav-item ${
                                    isCurrentOrParentUrl(searchHref)
                                        ? 'is-active'
                                        : ''
                                }`}
                                onClick={() => setOpenMobile(false)}
                            >
                                <Search className="mobile-shell__nav-icon" />
                                <span className="mobile-shell__nav-label">
                                    Поиск
                                </span>
                            </Link>

                            <Link
                                href={editProfile()}
                                className={`mobile-shell__nav-item ${
                                    isCurrentOrParentUrl('/settings')
                                        ? 'is-active'
                                        : ''
                                }`}
                                onClick={() => setOpenMobile(false)}
                            >
                                <Settings2 className="mobile-shell__nav-icon" />
                                <span className="mobile-shell__nav-label">
                                    Профиль
                                </span>
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link
                                href="/employee/profile"
                                className={`mobile-shell__nav-item ${
                                    isCurrentUrl('/employee/profile')
                                        ? 'is-active'
                                        : ''
                                }`}
                                onClick={() => setOpenMobile(false)}
                            >
                                <UserRound className="mobile-shell__nav-icon" />
                                <span className="mobile-shell__nav-label">
                                    Профиль
                                </span>
                            </Link>

                            <Link
                                href="/employee/knowledge-base"
                                className={`mobile-shell__nav-item ${
                                    isCurrentOrParentUrl(
                                        '/employee/knowledge-base',
                                    ) &&
                                    !isCurrentOrParentUrl(
                                        '/employee/knowledge-base/search',
                                    )
                                        ? 'is-active'
                                        : ''
                                }`}
                                onClick={() => setOpenMobile(false)}
                            >
                                <BookOpen className="mobile-shell__nav-icon" />
                                <span className="mobile-shell__nav-label">
                                    База
                                </span>
                            </Link>

                            <Link
                                href={searchHref}
                                className={`mobile-shell__nav-item ${
                                    isCurrentOrParentUrl(searchHref)
                                        ? 'is-active'
                                        : ''
                                }`}
                                onClick={() => setOpenMobile(false)}
                            >
                                <Search className="mobile-shell__nav-icon" />
                                <span className="mobile-shell__nav-label">
                                    Поиск
                                </span>
                            </Link>

                            <Link
                                href={editProfile()}
                                className={`mobile-shell__nav-item ${
                                    isCurrentOrParentUrl('/settings')
                                        ? 'is-active'
                                        : ''
                                }`}
                                onClick={() => setOpenMobile(false)}
                            >
                                <Settings2 className="mobile-shell__nav-icon" />
                                <span className="mobile-shell__nav-label">
                                    Настройки
                                </span>
                            </Link>
                        </>
                    )}
                </div>
            </nav>
        </>
    );
}
