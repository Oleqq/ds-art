import type { LucideIcon } from 'lucide-react';
import { Monitor, Moon, Sun } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import type { Appearance } from '@/hooks/use-appearance';
import { useAppearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';

export default function AppearanceToggleTab({
    className = '',
    ...props
}: HTMLAttributes<HTMLDivElement>) {
    const { appearance, updateAppearance } = useAppearance();

    const tabs: { value: Appearance; icon: LucideIcon; label: string }[] = [
        { value: 'light', icon: Sun, label: 'Светлая' },
        { value: 'dark', icon: Moon, label: 'Темная' },
        { value: 'system', icon: Monitor, label: 'Системная' },
    ];

    return (
        <div
            className={cn(
                'appearance-toggle-tab',
                className,
            )}
            {...props}
        >
            {tabs.map(({ value, icon: Icon, label }) => (
                <button
                    key={value}
                    type="button"
                    onClick={() => updateAppearance(value)}
                    className={cn(
                        'appearance-toggle-tab__item',
                        appearance === value ? 'is-active' : '',
                    )}
                >
                    <Icon className="appearance-toggle-tab__icon" />
                    <span className="appearance-toggle-tab__label">{label}</span>
                </button>
            ))}
        </div>
    );
}
