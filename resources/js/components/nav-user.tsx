import { Link, usePage } from '@inertiajs/react';
import { Moon, Sun } from 'lucide-react';
import { SidebarMenu, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';
import { UserInfo } from '@/components/user-info';
import { useAppearance } from '@/hooks/use-appearance';
import { logout } from '@/routes';
import { edit as editProfile } from '@/routes/profile';
import type { Auth } from '@/types';

export function NavUser() {
    const { auth } = usePage<{ auth: Auth }>().props;
    const { isMobile, setOpenMobile } = useSidebar();
    const { resolvedAppearance, updateAppearance } = useAppearance();

    if (!auth.user) {
        return null;
    }

    const isDark = resolvedAppearance === 'dark';
    const roleLabel = auth.user.role === 'admin' ? 'Руководитель' : 'Сотрудник';

    return (
        <SidebarMenu className="gap-2">
            <SidebarMenuItem>
                <button
                    type="button"
                    className="theme-toggle-row"
                    onClick={() => updateAppearance(isDark ? 'light' : 'dark')}
                    aria-label={isDark ? 'Включить светлую тему' : 'Включить темную тему'}
                >
                    {isDark ? (
                        <Moon className="theme-toggle-row__icon size-3.5" />
                    ) : (
                        <Sun className="theme-toggle-row__icon size-3.5" />
                    )}
                    <span className="theme-toggle-label">{isDark ? 'Темная тема' : 'Светлая тема'}</span>
                    <span className={`theme-toggle-switch ${isDark ? 'dark' : ''}`} aria-hidden="true">
                        <span className="theme-toggle-thumb" />
                    </span>
                </button>
            </SidebarMenuItem>

            <SidebarMenuItem className="sidebar-user">
                <Link
                    href={editProfile()}
                    prefetch
                    className="sidebar-user__profile"
                    aria-label="Редактировать профиль"
                    onClick={() => {
                        if (isMobile) {
                            setOpenMobile(false);
                        }
                    }}
                >
                    <UserInfo user={auth.user} subtitle={roleLabel} compact />
                </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <Link
                    href={logout()}
                    as="button"
                    className="sidebar-user__logout"
                    data-test="logout-button"
                    onClick={() => {
                        if (isMobile) {
                            setOpenMobile(false);
                        }
                    }}
                >
                    Выйти
                </Link>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
