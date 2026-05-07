import { Link, router } from '@inertiajs/react';
import { Camera, LoaderCircle, Mail, Phone } from 'lucide-react';
import { useRef, useState } from 'react';
import { ConfirmModal } from '@/components/confirm-modal';
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
    photoUploadUrl,
    statusToggleUrl,
    deleteUrl,
    editHref,
    extraActions,
    fileUploadUrl,
    fileDeleteUrl,
}: {
    employee: EmployeeRecord;
    showManagerNotes: boolean;
    readonly?: boolean;
    photoUploadUrl?: string | null;
    statusToggleUrl?: string | null;
    deleteUrl?: string | null;
    editHref?: string | null;
    extraActions?: React.ReactNode;
    fileUploadUrl?: string | null;
    fileDeleteUrl?: ((fileId: number) => string) | null;
}) {
    const photoInputRef = useRef<HTMLInputElement | null>(null);
    const [isStatusUpdating, setIsStatusUpdating] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isPhotoUploading, setIsPhotoUploading] = useState(false);
    const [photoError, setPhotoError] = useState<string | null>(null);

    const submitPhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;

        if (!file) {
            return;
        }

        if (!photoUploadUrl) {
            return;
        }

        setIsPhotoUploading(true);
        setPhotoError(null);

        router.post(photoUploadUrl, { photo: file }, {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                if (photoInputRef.current) {
                    photoInputRef.current.value = '';
                }
            },
            onError: (errors) =>
                setPhotoError(
                    typeof errors.photo === 'string'
                        ? errors.photo
                        : 'Не удалось загрузить фото.',
                ),
            onFinish: () => setIsPhotoUploading(false),
        });
    };

    const toggleStatus = () => {
        if (!statusToggleUrl) {
            return;
        }

        setIsStatusUpdating(true);

        router.patch(statusToggleUrl, {}, {
            preserveScroll: true,
            onFinish: () => setIsStatusUpdating(false),
        });
    };

    const deleteEmployee = () => {
        if (!deleteUrl) {
            return;
        }

        setIsDeleting(true);

        router.delete(deleteUrl, {
            preserveScroll: true,
            onFinish: () => setIsDeleting(false),
        });
    };

    return (
        <>
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

                                {readonly || !photoUploadUrl ? null : (
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
                                            disabled={isPhotoUploading}
                                            onClick={() => photoInputRef.current?.click()}
                                        >
                                            {isPhotoUploading ? (
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
                                    {photoError ? (
                                        <p className="mt-2 text-sm text-destructive">
                                            {photoError}
                                        </p>
                                    ) : null}
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
                                {statusToggleUrl && employee.can_toggle_status !== false ? (
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
                                ) : null}

                                {editHref ? (
                                    <Button variant="outline" asChild className="button-base--outline">
                                        <Link href={editHref}>
                                            ✎ Редактировать
                                        </Link>
                                    </Button>
                                ) : null}

                                {extraActions}

                                {deleteUrl && employee.can_delete !== false ? (
                                    <Button
                                        variant="secondary"
                                        className="button-base--danger"
                                        onClick={() => setIsDeleteConfirmOpen(true)}
                                    >
                                        Удалить
                                    </Button>
                                ) : null}
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
                    files={employee.files}
                    readonly={readonly}
                    uploadUrl={fileUploadUrl}
                    deleteUrl={fileDeleteUrl}
                />
            </div>

            {deleteUrl ? (
                <ConfirmModal
                    open={isDeleteConfirmOpen}
                    title="Удалить сотрудника?"
                    description={`Карточка сотрудника ${employee.name} будет удалена без возможности восстановления.`}
                    confirmLabel="Удалить"
                    cancelLabel="Назад"
                    danger
                    processing={isDeleting}
                    onConfirm={deleteEmployee}
                    onCancel={() => {
                        if (isDeleting) {
                            return;
                        }

                        setIsDeleteConfirmOpen(false);
                    }}
                />
            ) : null}
        </>
    );
}
