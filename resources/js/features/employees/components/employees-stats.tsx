import { Link } from '@inertiajs/react';
import { Plus } from 'lucide-react';

export function EmployeesStats({
    total,
    active,
    positions,
    rolesHref,
}: {
    total: number;
    active: number;
    positions: number;
    rolesHref?: string;
}) {
    const items = [
        { label: 'Всего', value: total },
        { label: 'Активных', value: active },
        { label: 'Ролей', value: positions, href: rolesHref },
    ];

    return (
        <div className="stats-strip">
            {items.map((item) =>
                item.href ? (
                    <Link
                        key={item.label}
                        href={item.href}
                        className="stats-strip__card stats-strip__card--link"
                    >
                        <div className="stats-strip__label">{item.label}</div>
                        <div className="stats-strip__value">{item.value}</div>
                        <span className="stats-strip__add" aria-hidden="true">
                            <Plus className="size-4" />
                        </span>
                    </Link>
                ) : (
                    <div key={item.label} className="stats-strip__card">
                        <div className="stats-strip__label">{item.label}</div>
                        <div className="stats-strip__value">{item.value}</div>
                    </div>
                ),
            )}
        </div>
    );
}
