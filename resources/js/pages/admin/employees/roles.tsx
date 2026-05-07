import { Head, Link, router, useForm } from '@inertiajs/react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ConfirmModal } from '@/components/confirm-modal';
import { EmployeeAvatar } from '@/features/employees/components/employee-avatar';
import type { EmployeeRoleStat } from '@/features/employees/types';

type AdminEmployeeRolesPageProps = {
    roles: EmployeeRoleStat[];
    stats: {
        total: number;
    };
};

export default function AdminEmployeeRolesPage({
    roles,
    stats,
}: AdminEmployeeRolesPageProps) {
    const form = useForm({
        name: '',
    });
    const [roleToDelete, setRoleToDelete] = useState<EmployeeRoleStat | null>(
        null,
    );
    const [isDeletingRole, setIsDeletingRole] = useState(false);

    const submit = () => {
        form.post('/admin/employees/roles', {
            preserveScroll: true,
            onSuccess: () => form.reset(),
        });
    };

    const deleteRole = () => {
        if (!roleToDelete) {
            return;
        }

        setIsDeletingRole(true);

        router.delete('/admin/employees/roles', {
            data: { name: roleToDelete.name },
            preserveScroll: true,
            onSuccess: () => setRoleToDelete(null),
            onFinish: () => setIsDeletingRole(false),
        });
    };

    return (
        <>
            <Head title="Роли команды" />

            <div className="page-layout employees-page roles-page flex flex-1 flex-col gap-6">
                <div className="page-layout__header flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1">
                        <Link
                            href="/admin/employees"
                            className="roles-page__back"
                        >
                            <ArrowLeft className="size-4" />
                            К команде
                        </Link>
                        <h1 className="page-layout__title">Роли команды</h1>
                        <p className="page-layout__subtitle">
                            Единый список ролей для формы сотрудников и
                            структуры команды.
                        </p>
                    </div>

                    <div className="roles-page__stats">
                        <div className="roles-page__stat">
                            <span>Всего ролей</span>
                            <strong>{stats.total}</strong>
                        </div>
                    </div>
                </div>

                <section className="roles-page__composer">
                    <div className="roles-page__composer-copy">
                        <div className="roles-page__composer-title">
                            Добавить новую роль
                        </div>
                        <div className="roles-page__composer-text">
                            Новая роль появится в списке и сразу станет
                            доступна в карточке сотрудника.
                        </div>
                    </div>

                    <div className="roles-page__composer-form">
                        <input
                            value={form.data.name}
                            onChange={(event) =>
                                form.setData('name', event.target.value)
                            }
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                    submit();
                                }
                            }}
                            className="form-control h-11 min-w-0 flex-1 px-4"
                            placeholder="Например: Контент-стратег"
                        />
                        <button
                            type="button"
                            onClick={submit}
                            disabled={form.processing}
                            className="kb-atb-btn kb-atb-btn--primary"
                        >
                            <Plus className="size-4" />
                            Добавить роль
                        </button>
                    </div>

                    {form.errors.name ? (
                        <p className="roles-page__error">{form.errors.name}</p>
                    ) : null}
                </section>

                <section className="roles-page__grid">
                    {roles.map((role) => (
                        <article key={role.name} className="role-card">
                            <div className="role-card__head">
                                <div className="role-card__title-row">
                                    <div className="role-card__title">
                                        {role.name}
                                    </div>
                                    {role.can_delete ? (
                                        <button
                                            type="button"
                                            className="role-card__delete"
                                            onClick={() =>
                                                setRoleToDelete(role)
                                            }
                                        >
                                            <Trash2 className="size-4" />
                                            Удалить
                                        </button>
                                    ) : null}
                                </div>
                                <div className="role-card__meta">
                                    {role.employees_count > 0
                                        ? `${role.employees_count} сотрудников`
                                        : 'Пока не используется'}
                                </div>
                            </div>

                            {role.employees.length > 0 ? (
                                <div className="role-card__employees">
                                    {role.employees.map((employee) => (
                                        <Link
                                            key={employee.id}
                                            href={employee.href}
                                            className="role-card__employee"
                                        >
                                            <EmployeeAvatar
                                                name={employee.name}
                                                photoUrl={employee.photo_url}
                                                className="size-10"
                                                fallbackClassName="text-xs"
                                            />
                                            <span className="role-card__employee-copy">
                                                <span className="role-card__employee-name">
                                                    {employee.name}
                                                </span>
                                                <span className="role-card__employee-email">
                                                    {employee.email}
                                                </span>
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="role-card__empty">
                                    Можно назначить эту роль прямо из карточки
                                    сотрудника.
                                </div>
                            )}
                        </article>
                    ))}
                </section>
            </div>

            <ConfirmModal
                open={roleToDelete !== null}
                title={
                    roleToDelete
                        ? `Удалить роль «${roleToDelete.name}»?`
                        : 'Удалить роль?'
                }
                description={
                    roleToDelete?.employees_count
                        ? 'Сотрудники с этой ролью автоматически получат роль «Без роли», чтобы приложение и карточки не ломались.'
                        : 'Роль будет удалена из каталога и исчезнет из формы сотрудника.'
                }
                confirmLabel="Удалить роль"
                danger
                processing={isDeletingRole}
                onCancel={() => {
                    if (!isDeletingRole) {
                        setRoleToDelete(null);
                    }
                }}
                onConfirm={deleteRole}
            />
        </>
    );
}
