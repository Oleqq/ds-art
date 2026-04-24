import { Head } from '@inertiajs/react';
import { EmployeeFormModal } from '@/features/employees/components/employee-form-modal';
import type { EmployeeFormPayload } from '@/features/employees/types';

type AdminEmployeeEditProps = {
    positions: string[];
    employeeId: number;
    employee: EmployeeFormPayload;
};

export default function AdminEmployeeEdit({
    positions,
    employeeId,
    employee,
}: AdminEmployeeEditProps) {
    return (
        <>
            <Head title="Редактировать профиль" />

            <EmployeeFormModal
                title="Редактировать профиль"
                submitLabel="Сохранить"
                positions={positions}
                employee={employee}
                submitUrl={`/admin/employees/${employeeId}`}
                method="put"
                cancelHref={`/admin/employees/${employeeId}`}
            />
        </>
    );
}
