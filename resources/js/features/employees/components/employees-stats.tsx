export function EmployeesStats({
    total,
    active,
    positions,
}: {
    total: number;
    active: number;
    positions: number;
}) {
    const items = [
        { label: 'Всего', value: total },
        { label: 'Активных', value: active },
        { label: 'Ролей', value: positions },
    ];

    return (
        <div className="stats-strip">
            {items.map((item) => (
                <div key={item.label} className="stats-strip__card">
                    <div className="stats-strip__label">{item.label}</div>
                    <div className="stats-strip__value">{item.value}</div>
                </div>
            ))}
        </div>
    );
}
