import { Link, router, useForm } from '@inertiajs/react';
import { Camera, LoaderCircle, Mail, Phone } from 'lucide-react';
import { useRef, useState } from 'react';
import { PlannedFeatureTooltip } from '@/components/planned-feature-tooltip';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmployeeAvatar } from '@/features/employees/components/employee-avatar';
import { EmployeeFilesCard } from '@/features/employees/components/employee-files-card';
import { EmployeeScheduleCard } from '@/features/employees/components/employee-schedule-card';
import { EmployeeStatusBadge } from '@/features/employees/components/employee-status-badge';
import type { EmployeeRecord } from '@/features/employees/types';
import { formatJoinedOn, formatTenure } from '@/features/employees/utils';

export function EmployeeDetailView({
    employee,
    showManagerNotes,
    readonly = true,
}: {
    employee: EmployeeRecord;
    showManagerNotes: boolean;
    readonly?: boolean;
}) {
    const photoInputRef = useRef<HTMLInputElement | null>(null);
    const [isStatusUpdating, setIsStatusUpdating] = useState(false);
    const photoForm = useForm<{
        photo: File | null;
    }>({
        photo: null,
    });

    const submitPhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;

        if (!file) {
            return;
        }

        photoForm.setData('photo', file);
        photoForm.post(`/admin/employees/${employee.id}/photo`, {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                photoForm.reset();

                if (photoInputRef.current) {
                    photoInputRef.current.value = '';
                }
            },
        });
    };

    const toggleStatus = () => {
        setIsStatusUpdating(true);

        router.patch(
            `/admin/employees/${employee.id}/status`,
            {},
            {
                preserveScroll: true,
                onFinish: () => setIsStatusUpdating(false),
            },
        );
    };

    return (
        <div className="space-y-6">
            <Card className="surface-card employee-card__hero gap-0 overflow-hidden border shadow-none">
                <CardContent className="flex flex-col gap-6 pt-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-4">
                        <div className="employee-avatar__stack">
                            <EmployeeAvatar
                                name={employee.name}
                                photoUrl={employee.photo_url}
                                className="size-[72px]"
                                fallbackClassName="employee-avatar__fallback text-2xl"
                            />

                            {readonly ? null : (
                                <>
                                    <input
                                        ref={photoInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={submitPhoto}
                                    />
                                    <button
                                        type="button"
                                        className="employee-avatar__action"
                                        disabled={photoForm.processing}
                                        onClick={() => photoInputRef.current?.click()}
                                    >
                                        {photoForm.processing ? (
                                            <LoaderCircle className="size-3.5 animate-spin" />
                                        ) : (
                                            <Camera className="size-3.5" />
                                        )}
                                    </button>
                                </>
                            )}
                        </div>

                        <div className="space-y-3">
                            <div>
                                <h1 className="employee-card__name text-2xl font-semibold tracking-tight">
                                    {employee.name}
                                </h1>
                                <p className="employee-card__role text-base text-muted-foreground">
                                    {employee.position}
                                </p>
                            </div>

                            <div className="employee-card__meta flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                                <span>
                                    В команде с{' '}
                                    <b className="text-foreground">
                                        {formatJoinedOn(employee.joined_on)}
                                    </b>
                                </span>
                                <span>
                                    Стаж{' '}
                                    <b className="text-foreground">
                                        {formatTenure(employee.joined_on)}
                                    </b>
                                </span>
                                <EmployeeStatusBadge status={employee.status} />
                            </div>
                        </div>
                    </div>

                    {readonly ? null : (
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={toggleStatus}
                                disabled={isStatusUpdating}
                                className="button-base--outline inline-flex h-10 items-center justify-center px-4 text-sm"
                            >
                                {isStatusUpdating ? (
                                    <>
                                        <LoaderCircle className="size-4 animate-spin" />
                                        Обновляем...
                                    </>
                                ) : employee.status === 'active' ? (
                                    'Деактивировать'
                                ) : (
                                    'Активировать'
                                )}
                            </button>

                            <Button variant="outline" asChild className="button-base--outline">
                                <Link href={`/admin/employees/${employee.id}/edit`}>
                                    ✎ Редактировать
                                </Link>
                            </Button>

                            <PlannedFeatureTooltip
                                feature={{
                                    status: 'Ограничение',
                                    phase: 'Удаление сотрудника',
                                    note: 'Удаление и архивирование сотрудника пока недоступно в этом интерфейсе.',
                                }}
                                side="left"
                            >
                                <Button
                                    variant="secondary"
                                    disabled
                                    className="button-base--danger disabled:cursor-default disabled:opacity-100"
                                >
                                    Удалить
                                </Button>
                            </PlannedFeatureTooltip>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="surface-card gap-0 border shadow-none">
                <CardHeader className="pb-0">
                    <CardTitle className="section-card__title">
                        Контакты
                    </CardTitle>
                </CardHeader>
                <CardContent className="contact-grid grid gap-3 md:grid-cols-2">
                    <div className="contact-card flex items-start gap-3 p-4">
                        <div className="contact-card__icon rounded-lg p-2 text-primary">
                            <Mail className="size-4" />
                        </div>
                        <div>
                            <div className="contact-card__label text-xs uppercase tracking-wide text-muted-foreground">
                                Email
                            </div>
                            <div className="contact-card__value mt-1 font-medium">
                                {employee.email}
                            </div>
                        </div>
                    </div>

                    <div className="contact-card flex items-start gap-3 p-4">
                        <div className="contact-card__icon rounded-lg p-2 text-primary">
                            <Phone className="size-4" />
                        </div>
                        <div>
                            <div className="contact-card__label text-xs uppercase tracking-wide text-muted-foreground">
                                Телефон
                            </div>
                            <div className="contact-card__value mt-1 font-medium">
                                {employee.phone || '—'}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <EmployeeScheduleCard schedule={employee.schedule} />

            {showManagerNotes ? (
                <Card className="surface-card gap-0 border shadow-none">
                    <CardHeader className="pb-0">
                        <CardTitle className="section-card__title">
                            Заметки руководителя
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="note-block text-sm leading-6 text-muted-foreground">
                        {employee.manager_notes ? (
                            <p>{employee.manager_notes}</p>
                        ) : (
                            <p>Заметок пока нет.</p>
                        )}
                    </CardContent>
                </Card>
            ) : null}

            <EmployeeFilesCard
                employeeId={employee.id}
                files={employee.files}
                readonly={readonly}
            />
        </div>
    );
}
