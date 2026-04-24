import { Head, router } from '@inertiajs/react';
import { Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { EmployeeAvatar } from '@/features/employees/components/employee-avatar';
import { EmployeeFormModal } from '@/features/employees/components/employee-form-modal';
import { EmployeesStats } from '@/features/employees/components/employees-stats';
import { EmployeeStatusBadge } from '@/features/employees/components/employee-status-badge';
import type { EmployeeFormPayload, EmployeeListItem } from '@/features/employees/types';
import { formatJoinedOn, formatTenure } from '@/features/employees/utils';

type AdminEmployeesIndexProps = {
    employees: EmployeeListItem[];
    positions: string[];
    employeeFormDefaults: EmployeeFormPayload;
    stats: {
        total: number;
        active: number;
        positions: number;
    };
};

export default function AdminEmployeesIndex({
    employees,
    positions,
    employeeFormDefaults,
    stats,
}: AdminEmployeesIndexProps) {
    const [query, setQuery] = useState('');
    const [position, setPosition] = useState('');
    const [status, setStatus] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const filteredEmployees = employees.filter((employee) => {
        const normalizedQuery = query.trim().toLowerCase();
        const matchesQuery =
            !normalizedQuery ||
            employee.name.toLowerCase().includes(normalizedQuery) ||
            employee.email.toLowerCase().includes(normalizedQuery);
        const matchesPosition = !position || employee.position === position;
        const matchesStatus = !status || employee.status === status;

        return matchesQuery && matchesPosition && matchesStatus;
    });

    return (
        <>
            <Head title="Команда агентства" />

            <div className="page-layout employees-page flex flex-1 flex-col">
                <div className="page-layout__header flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1">
                        <h1 className="page-layout__title">Команда агентства</h1>
                        <p className="page-layout__subtitle">Внутренняя база сотрудников</p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsCreateOpen(true)}
                        className="button-base--add inline-flex h-10 items-center justify-center gap-2 px-4 text-sm font-medium"
                    >
                        <Plus className="size-4" />
                        Добавить сотрудника
                    </button>
                </div>

                <EmployeesStats total={stats.total} active={stats.active} positions={stats.positions} />

                <div className="filter-bar filter-bar__layout flex flex-col gap-3 p-4 md:flex-row md:items-center">
                    <label className="relative block">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Поиск..."
                            className="form-control h-10 w-full min-w-0 pl-9 pr-3 text-sm outline-none transition"
                        />
                    </label>

                    <select
                        value={position}
                        onChange={(event) => setPosition(event.target.value)}
                        className="form-control h-10 rounded-md px-3 text-sm outline-none transition md:w-[240px]"
                    >
                        <option value="">Все роли</option>
                        {positions.map((item) => (
                            <option key={item} value={item}>
                                {item}
                            </option>
                        ))}
                    </select>

                    <select
                        value={status}
                        onChange={(event) => setStatus(event.target.value)}
                        className="form-control h-10 rounded-md px-3 text-sm outline-none transition md:w-[180px]"
                    >
                        <option value="">Все статусы</option>
                        <option value="active">Активные</option>
                        <option value="inactive">Неактивные</option>
                    </select>
                </div>

                <div className="data-table-shell overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="data-table-shell__head text-left text-xs uppercase tracking-wide text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Сотрудник</th>
                                    <th className="px-4 py-3 font-medium">Роль</th>
                                    <th className="px-4 py-3 font-medium">В команде с</th>
                                    <th className="px-4 py-3 font-medium">Стаж</th>
                                    <th className="px-4 py-3 font-medium">Статус</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEmployees.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                                            По текущим фильтрам сотрудники не найдены.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredEmployees.map((employee) => (
                                        <tr
                                            key={employee.id}
                                            className="data-table-shell__row employee-list__row cursor-pointer transition"
                                            tabIndex={0}
                                            role="link"
                                            aria-label={`Открыть профиль сотрудника ${employee.name}`}
                                            onClick={() => router.visit(`/admin/employees/${employee.id}`)}
                                            onKeyDown={(event) => {
                                                if (event.key === 'Enter' || event.key === ' ') {
                                                    event.preventDefault();
                                                    router.visit(`/admin/employees/${employee.id}`);
                                                }
                                            }}
                                        >
                                            <td className="px-4 py-4">
                                                <div className="employee-list__person flex items-center gap-3">
                                                    <EmployeeAvatar
                                                        name={employee.name}
                                                        photoUrl={employee.photo_url}
                                                        className="size-[34px]"
                                                    />
                                                    <div className="min-w-0">
                                                        <div className="employee-list__name font-medium">{employee.name}</div>
                                                        <div className="employee-list__email truncate">{employee.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">{employee.position}</td>
                                            <td className="px-4 py-4">{formatJoinedOn(employee.joined_on)}</td>
                                            <td className="px-4 py-4">{formatTenure(employee.joined_on)}</td>
                                            <td className="px-4 py-4">
                                                <EmployeeStatusBadge status={employee.status} />
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {isCreateOpen ? (
                <EmployeeFormModal
                    title="Новый сотрудник"
                    submitLabel="Сохранить"
                    positions={positions}
                    employee={employeeFormDefaults}
                    submitUrl="/admin/employees"
                    method="post"
                    onCancel={() => setIsCreateOpen(false)}
                    onSuccess={() => setIsCreateOpen(false)}
                />
            ) : null}
        </>
    );
}
