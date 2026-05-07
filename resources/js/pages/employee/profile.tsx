import { Head } from '@inertiajs/react';
import { AlertCircle, Lock, PencilLine } from 'lucide-react';
import { useState } from 'react';
import { EmployeeDetailView } from '@/features/employees/components/employee-detail-view';
import { EmployeeFormModal } from '@/features/employees/components/employee-form-modal';
import { Button } from '@/components/ui/button';
import type { EmployeeFormPayload } from '@/features/employees/types';
import type { EmployeeRecord } from '@/features/employees/types';

type EmployeeProfileProps = {
    employee: EmployeeRecord;
    employee_form: EmployeeFormPayload;
    positions: string[];
    banner: string;
    is_active_employee: boolean;
};

export default function EmployeeProfile({
    employee,
    employee_form,
    positions,
    banner,
    is_active_employee,
}: EmployeeProfileProps) {
    const [isEditOpen, setIsEditOpen] = useState(false);

    return (
        <>
            <Head title="Мой профиль" />

            <div className="page-layout employee-profile-page flex flex-1 flex-col gap-6">
                <div className="space-y-1">
                    <h1 className="page-layout__title">Мой профиль</h1>
                    <p className="page-layout__subtitle">
                        Информация доступна только вам и руководству.
                    </p>
                </div>

                <div className="notice-banner flex items-start gap-3 px-4 py-3 text-sm">
                    <Lock className="mt-0.5 size-4 shrink-0" />
                    <span>{banner}</span>
                </div>

                {is_active_employee ? null : (
                    <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                        <AlertCircle className="mt-0.5 size-4 shrink-0" />
                        <span>
                            Ваш профиль сохранен, но статус сотрудника сейчас неактивен.
                        </span>
                    </div>
                )}

                <EmployeeDetailView
                    employee={employee}
                    showManagerNotes={false}
                    readonly={false}
                    photoUploadUrl="/employee/profile/photo"
                    fileUploadUrl="/employee/profile/files"
                    fileDeleteUrl={(fileId) => `/employee/profile/files/${fileId}`}
                    extraActions={
                        <Button
                            type="button"
                            variant="outline"
                            className="button-base--outline"
                            onClick={() => setIsEditOpen(true)}
                        >
                            <PencilLine className="size-4" />
                            Редактировать профиль
                        </Button>
                    }
                />
            </div>

            {isEditOpen ? (
                <EmployeeFormModal
                    title="Редактировать мой профиль"
                    submitLabel="Сохранить изменения"
                    positions={positions}
                    employee={employee_form}
                    submitUrl="/employee/profile"
                    method="put"
                    mode="self"
                    onCancel={() => setIsEditOpen(false)}
                    onSuccess={() => setIsEditOpen(false)}
                />
            ) : null}
        </>
    );
}
