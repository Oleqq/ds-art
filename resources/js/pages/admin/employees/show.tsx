import { Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { EmployeeDetailView } from '@/features/employees/components/employee-detail-view';
import type { EmployeeRecord } from '@/features/employees/types';

type AdminEmployeeShowProps = {
    employee: EmployeeRecord;
};

export default function AdminEmployeeShow({ employee }: AdminEmployeeShowProps) {
    return (
        <>
            <Head title={employee.name} />

            <div className="page-layout employee-detail-page flex flex-1 flex-col gap-6">
                <div>
                    <Link
                        href="/admin/employees"
                        className="page-layout__back-link inline-flex items-center gap-2 text-sm transition"
                    >
                        <ArrowLeft className="size-4" />
                        Назад к списку
                    </Link>
                </div>

                <EmployeeDetailView employee={employee} showManagerNotes readonly={false} />
            </div>
        </>
    );
}
