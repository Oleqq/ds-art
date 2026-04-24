import { Head } from '@inertiajs/react';
import { EmployeeFormModal } from '@/features/employees/components/employee-form-modal';
import type { EmployeeFormPayload } from '@/features/employees/types';

type AdminEmployeeCreateProps = {
    positions: string[];
    employee: EmployeeFormPayload;
};

export default function AdminEmployeeCreate({
    positions,
    employee,
}: AdminEmployeeCreateProps) {
    return (
        <>
            <Head title="Новый сотрудник" />

            <EmployeeFormModal
                title="Новый сотрудник"
                submitLabel="Сохранить"
                positions={positions}
                employee={employee}
                submitUrl="/admin/employees"
                method="post"
                cancelHref="/admin/employees"
            />
        </>
    );
}
