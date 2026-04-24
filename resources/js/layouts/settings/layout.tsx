import { Link } from '@inertiajs/react';
import { Palette, ShieldCheck, UserRound } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn, toUrl } from '@/lib/utils';
import { edit as editAppearance } from '@/routes/appearance';
import { edit } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';
import type { NavItem } from '@/types';

const sidebarNavItems: NavItem[] = [
    {
        title: 'Профиль',
        href: edit(),
        icon: UserRound,
    },
    {
        title: 'Безопасность',
        href: editSecurity(),
        icon: ShieldCheck,
    },
    {
        title: 'Внешний вид',
        href: editAppearance(),
        icon: Palette,
    },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentOrParentUrl } = useCurrentUrl();

    return (
        <div className="settings-page">
            <header className="settings-page__header">
                <p className="settings-page__eyebrow">Аккаунт</p>
                <h1>Настройки профиля</h1>
                <p>
                    Личные данные, безопасность и внешний вид рабочего
                    кабинета.
                </p>
            </header>

            <div className="settings-page__body">
                <aside className="settings-page__nav">
                    {sidebarNavItems.map((item, index) => (
                        <Link
                            key={`${toUrl(item.href)}-${index}`}
                            href={item.href}
                            prefetch
                            className={cn('settings-page__nav-link', {
                                'is-active': isCurrentOrParentUrl(item.href),
                            })}
                        >
                            {item.icon ? <item.icon className="size-4" /> : null}
                            <span>{item.title}</span>
                        </Link>
                    ))}
                </aside>

                <section className="settings-page__content">{children}</section>
            </div>
        </div>
    );
}
