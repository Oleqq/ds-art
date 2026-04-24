import { Link, useForm } from '@inertiajs/react';
import { LoaderCircle, X } from 'lucide-react';
import type { EmployeeFormPayload } from '@/features/employees/types';
import { scheduleDayLabels } from '@/features/employees/utils';

type EmployeeFormModalProps = {
    title: string;
    submitLabel: string;
    positions: string[];
    employee: EmployeeFormPayload;
    submitUrl: string;
    method: 'post' | 'put';
    cancelHref?: string;
    onCancel?: () => void;
    onSuccess?: () => void;
};

function ModalDismiss({
    href,
    onClick,
    className,
    children,
}: {
    href?: string;
    onClick?: () => void;
    className: string;
    children: React.ReactNode;
}) {
    if (href) {
        return (
            <Link href={href} className={className}>
                {children}
            </Link>
        );
    }

    return (
        <button type="button" onClick={onClick} className={className}>
            {children}
        </button>
    );
}

export function EmployeeFormModal({
    title,
    submitLabel,
    positions,
    employee,
    submitUrl,
    method,
    cancelHref,
    onCancel,
    onSuccess,
}: EmployeeFormModalProps) {
    const form = useForm<EmployeeFormPayload>({
        ...employee,
        schedule: {
            days: [...employee.schedule.days],
            start: employee.schedule.start,
            end: employee.schedule.end,
        },
    });

    const saveLabel =
        method === 'post' ? 'Сохраняем сотрудника...' : 'Сохраняем изменения...';

    const submit = () => {
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                onSuccess?.();
            },
        };

        if (method === 'post') {
            form.post(submitUrl, options);

            return;
        }

        form.put(submitUrl, options);
    };

    const toggleDay = (day: number, checked: boolean) => {
        const nextDays = checked
            ? [...form.data.schedule.days, day]
            : form.data.schedule.days.filter((item) => item !== day);

        form.setData('schedule', {
            ...form.data.schedule,
            days: [...new Set(nextDays)].sort((left, right) => left - right),
        });
    };

    return (
        <div className="modal-shell">
            <ModalDismiss
                href={cancelHref}
                onClick={onCancel}
                className="modal-shell__backdrop"
            >
                {' '}
            </ModalDismiss>

            <div className="modal-shell__card">
                <div className="modal-shell__head">
                    <div className="modal-shell__title">{title}</div>
                    <ModalDismiss
                        href={cancelHref}
                        onClick={onCancel}
                        className="modal-shell__close"
                    >
                        <X className="size-4" />
                    </ModalDismiss>
                </div>

                <div className="modal-shell__grid">
                    <div className="form-field">
                        <label htmlFor="employee-name">Имя и фамилия</label>
                        <input
                            id="employee-name"
                            type="text"
                            value={form.data.name}
                            onChange={(event) => form.setData('name', event.target.value)}
                        />
                        {form.errors.name ? (
                            <p className="form-field__error">{form.errors.name}</p>
                        ) : null}
                    </div>

                    <div className="form-field">
                        <label htmlFor="employee-email">Email</label>
                        <input
                            id="employee-email"
                            type="email"
                            value={form.data.email}
                            onChange={(event) => form.setData('email', event.target.value)}
                        />
                        {form.errors.email ? (
                            <p className="form-field__error">{form.errors.email}</p>
                        ) : null}
                    </div>

                    <div className="form-field">
                        <label htmlFor="employee-phone">Телефон</label>
                        <input
                            id="employee-phone"
                            type="tel"
                            value={form.data.phone}
                            onChange={(event) => form.setData('phone', event.target.value)}
                        />
                        {form.errors.phone ? (
                            <p className="form-field__error">{form.errors.phone}</p>
                        ) : null}
                    </div>

                    <div className="form-field">
                        <label htmlFor="employee-position">Роль</label>
                        <input
                            id="employee-position"
                            type="text"
                            list="employee-position-options"
                            value={form.data.position}
                            onChange={(event) =>
                                form.setData('position', event.target.value)
                            }
                            placeholder="Например: Дизайнер, Менеджер проектов"
                        />
                        <datalist id="employee-position-options">
                            {positions.map((position) => (
                                <option key={position} value={position} />
                            ))}
                        </datalist>
                        <div className="text-xs text-muted-foreground">
                            Можно выбрать из списка или ввести новую роль вручную.
                        </div>
                        {form.errors.position ? (
                            <p className="form-field__error">{form.errors.position}</p>
                        ) : null}
                    </div>

                    <div className="form-field">
                        <label htmlFor="employee-joined">Дата вступления</label>
                        <input
                            id="employee-joined"
                            type="date"
                            value={form.data.joined_on}
                            onChange={(event) =>
                                form.setData('joined_on', event.target.value)
                            }
                        />
                        {form.errors.joined_on ? (
                            <p className="form-field__error">
                                {form.errors.joined_on}
                            </p>
                        ) : null}
                    </div>

                    <div className="form-field form-field--full">
                        <label htmlFor="employee-status">Статус</label>
                        <select
                            id="employee-status"
                            value={form.data.status}
                            onChange={(event) =>
                                form.setData(
                                    'status',
                                    event.target.value as EmployeeFormPayload['status'],
                                )
                            }
                        >
                            <option value="active">Активный</option>
                            <option value="inactive">Неактивный</option>
                        </select>
                        {form.errors.status ? (
                            <p className="form-field__error">{form.errors.status}</p>
                        ) : null}
                    </div>

                    <div className="form-field form-field--full">
                        <label>График работы — рабочие дни</label>
                        <div className="schedule-editor">
                            {scheduleDayLabels.map((label, index) => {
                                const checked = form.data.schedule.days.includes(index);

                                return (
                                    <label
                                        key={label}
                                        className={`schedule-editor__day ${
                                            checked ? 'is-active' : ''
                                        }`}
                                    >
                                        <span>{label}</span>
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={(event) =>
                                                toggleDay(index, event.target.checked)
                                            }
                                        />
                                    </label>
                                );
                            })}
                        </div>

                        <div className="schedule-editor__time-grid">
                            <div className="form-field">
                                <label htmlFor="employee-time-start">Начало</label>
                                <input
                                    id="employee-time-start"
                                    type="time"
                                    value={form.data.schedule.start}
                                    onChange={(event) =>
                                        form.setData('schedule', {
                                            ...form.data.schedule,
                                            start: event.target.value,
                                        })
                                    }
                                />
                            </div>

                            <div className="form-field">
                                <label htmlFor="employee-time-end">Конец</label>
                                <input
                                    id="employee-time-end"
                                    type="time"
                                    value={form.data.schedule.end}
                                    onChange={(event) =>
                                        form.setData('schedule', {
                                            ...form.data.schedule,
                                            end: event.target.value,
                                        })
                                    }
                                />
                            </div>
                        </div>

                        {form.errors['schedule.days'] ? (
                            <p className="form-field__error">
                                {form.errors['schedule.days']}
                            </p>
                        ) : null}
                        {form.errors['schedule.end'] ? (
                            <p className="form-field__error">
                                {form.errors['schedule.end']}
                            </p>
                        ) : null}
                    </div>

                    <div className="form-field form-field--full">
                        <label htmlFor="employee-notes">Заметки руководителя</label>
                        <textarea
                            id="employee-notes"
                            rows={5}
                            value={form.data.manager_notes}
                            onChange={(event) =>
                                form.setData('manager_notes', event.target.value)
                            }
                            placeholder="Сильные стороны, задачи, наблюдения…"
                        />
                        {form.errors.manager_notes ? (
                            <p className="form-field__error">
                                {form.errors.manager_notes}
                            </p>
                        ) : null}
                    </div>
                </div>

                <div className="modal-shell__footer">
                    <ModalDismiss
                        href={cancelHref}
                        onClick={onCancel}
                        className="modal-shell__cancel"
                    >
                        Отмена
                    </ModalDismiss>
                    <button
                        type="button"
                        onClick={submit}
                        disabled={form.processing}
                        className="modal-shell__save"
                    >
                        {form.processing ? (
                            <>
                                <LoaderCircle className="size-4 animate-spin" />
                                {saveLabel}
                            </>
                        ) : (
                            submitLabel
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
