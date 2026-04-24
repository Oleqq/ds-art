import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import type { User } from '@/types';
import type { CSSProperties } from 'react';

const fallbackColors = [
    ['#e8f2ea', '#1e4229'],
    ['#eef0db', '#4a4f1c'],
    ['#f4e9dc', '#6d4217'],
    ['#e5eff7', '#1e4964'],
    ['#f2e8e5', '#743326'],
    ['#ebe7f1', '#4d3d67'],
] as const;

function getFallbackColor(name: string): (typeof fallbackColors)[number] {
    const hash = Array.from(name).reduce(
        (result, symbol) => result + symbol.charCodeAt(0),
        0,
    );

    return fallbackColors[hash % fallbackColors.length];
}

export function UserInfo({
    user,
    showEmail = false,
    subtitle,
    compact = false,
}: {
    user: User;
    showEmail?: boolean;
    subtitle?: string;
    compact?: boolean;
}) {
    const getInitials = useInitials();
    const [fallbackBackground, fallbackColor] = getFallbackColor(user.name);

    return (
        <>
            <Avatar
                className={`${compact ? 'h-[30px] w-[30px]' : 'h-8 w-8'} overflow-hidden rounded-full`}
            >
                <AvatarImage src={user.avatar ?? undefined} alt={user.name} />
                <AvatarFallback
                    className="sidebar-user__avatar-fallback rounded-full text-[11px] font-semibold"
                    style={
                        {
                            '--avatar-fallback-bg': fallbackBackground,
                            '--avatar-fallback-color': fallbackColor,
                        } as CSSProperties
                    }
                >
                    {getInitials(user.name)}
                </AvatarFallback>
            </Avatar>
            <div className="sidebar-user__info grid flex-1 text-left leading-tight">
                <span
                    className={`${compact ? 'text-[13px]' : 'text-sm'} truncate font-medium`}
                >
                    {compact ? user.name.split(' ')[0] : user.name}
                </span>
                {subtitle ? (
                    <span className="truncate text-[11px] text-[var(--text-3)]">
                        {subtitle}
                    </span>
                ) : null}
                {showEmail ? (
                    <span className="truncate text-xs text-muted-foreground">
                        {user.email}
                    </span>
                ) : null}
            </div>
        </>
    );
}
