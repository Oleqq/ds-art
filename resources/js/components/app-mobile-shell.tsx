import { Link, usePage } from '@inertiajs/react';
import {
    BookOpen,
    BriefcaseBusiness,
    LockKeyhole,
    Menu,
    Search,
    UserRound,
} from 'lucide-react';
import { useMemo } from 'react';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { useSidebar } from '@/components/ui/sidebar';
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
            return currentUrl === '/admin/employees' ? 'Команда' : 'Сотрудник';
        }

        if (currentUrl.startsWith('/settings')) {
            return 'Настройки';
        }

        return 'Staff Cabinet';
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

    return 'Staff Cabinet';
}

export function AppMobileShell({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItem[];
}) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const { currentUrl, isCurrentOrParentUrl, isCurrentUrl } = useCurrentUrl();
    const { toggleSidebar, setOpenMobile } = useSidebar();

    const title = useMemo(
        () => resolveTitle(currentUrl, auth.user.role, breadcrumbs),
        [auth.user.role, breadcrumbs, currentUrl],
    );

    const isAdmin = auth.user.role === 'admin';
    const searchHref = isAdmin
        ? '/admin/knowledge-base/search'
        : '/employee/knowledge-base/search';

    return (
        <>
            <header className="mobile-shell__header md:hidden">
                <button
                    type="button"
                    onClick={toggleSidebar}
                    className="mobile-shell__header-btn"
                    aria-label="Открыть меню"
                >
                    <Menu className="size-5" />
                </button>

                <div className="mobile-shell__header-title">{title}</div>

                <Link
                    href={searchHref}
                    prefetch
                    className="mobile-shell__header-btn"
                    aria-label="Открыть поиск"
                    onClick={() => setOpenMobile(false)}
                >
                    <Search className="size-5" />
                </Link>
            </header>

            <nav className="mobile-shell__nav md:hidden" aria-label="Мобильная навигация">
                <div className="mobile-shell__nav-items">
                    {isAdmin ? (
                        <>
                            <Link
                                href="/admin/employees"
                                prefetch
                                className={`mobile-shell__nav-item ${
                                    isCurrentOrParentUrl('/admin/employees')
                                        ? 'is-active'
                                        : ''
                                }`}
                                onClick={() => setOpenMobile(false)}
                            >
                                <BriefcaseBusiness className="mobile-shell__nav-icon" />
                                <span className="mobile-shell__nav-label">Команда</span>
                            </Link>

                            <Link
                                href="/admin/knowledge-base"
                                prefetch
                                className={`mobile-shell__nav-item ${
                                    isCurrentOrParentUrl('/admin/knowledge-base') &&
                                    !isCurrentOrParentUrl('/admin/knowledge-base/search')
                                        ? 'is-active'
                                        : ''
                                }`}
                                onClick={() => setOpenMobile(false)}
                            >
                                <BookOpen className="mobile-shell__nav-icon" />
                                <span className="mobile-shell__nav-label">База</span>
                            </Link>

                            <Link
                                href="/admin/access"
                                prefetch
                                className={`mobile-shell__nav-item ${
                                    isCurrentOrParentUrl('/admin/access')
                                        ? 'is-active'
                                        : ''
                                }`}
                                onClick={() => setOpenMobile(false)}
                            >
                                <LockKeyhole className="mobile-shell__nav-icon" />
                                <span className="mobile-shell__nav-label">Доступ</span>
                            </Link>

                            <Link
                                href={searchHref}
                                prefetch
                                className={`mobile-shell__nav-item ${
                                    isCurrentOrParentUrl(searchHref) ? 'is-active' : ''
                                }`}
                                onClick={() => setOpenMobile(false)}
                            >
                                <Search className="mobile-shell__nav-icon" />
                                <span className="mobile-shell__nav-label">Поиск</span>
                            </Link>

                            <button
                                type="button"
                                onClick={toggleSidebar}
                                className="mobile-shell__nav-item"
                                aria-label="Открыть меню"
                            >
                                <Menu className="mobile-shell__nav-icon" />
                                <span className="mobile-shell__nav-label">Меню</span>
                            </button>
                        </>
                    ) : (
                        <>
                            <Link
                                href="/employee/profile"
                                prefetch
                                className={`mobile-shell__nav-item ${
                                    isCurrentUrl('/employee/profile') ? 'is-active' : ''
                                }`}
                                onClick={() => setOpenMobile(false)}
                            >
                                <UserRound className="mobile-shell__nav-icon" />
                                <span className="mobile-shell__nav-label">Профиль</span>
                            </Link>

                            <Link
                                href="/employee/knowledge-base"
                                prefetch
                                className={`mobile-shell__nav-item ${
                                    isCurrentOrParentUrl('/employee/knowledge-base') &&
                                    !isCurrentOrParentUrl('/employee/knowledge-base/search')
                                        ? 'is-active'
                                        : ''
                                }`}
                                onClick={() => setOpenMobile(false)}
                            >
                                <BookOpen className="mobile-shell__nav-icon" />
                                <span className="mobile-shell__nav-label">База</span>
                            </Link>

                            <Link
                                href={searchHref}
                                prefetch
                                className={`mobile-shell__nav-item ${
                                    isCurrentOrParentUrl(searchHref) ? 'is-active' : ''
                                }`}
                                onClick={() => setOpenMobile(false)}
                            >
                                <Search className="mobile-shell__nav-icon" />
                                <span className="mobile-shell__nav-label">Поиск</span>
                            </Link>

                            <button
                                type="button"
                                onClick={toggleSidebar}
                                className="mobile-shell__nav-item"
                                aria-label="Открыть меню"
                            >
                                <Menu className="mobile-shell__nav-icon" />
                                <span className="mobile-shell__nav-label">Меню</span>
                            </button>
                        </>
                    )}
                </div>
            </nav>
        </>
    );
}
