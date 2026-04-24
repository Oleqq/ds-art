import { Head } from '@inertiajs/react';

export default function EmployeeDashboard() {
    return (
        <>
            <Head title="Employee" />

            <div className="flex flex-1 flex-col gap-4 p-6">
                <div className="rounded-xl border border-border/70 bg-background p-6">
                    <h1 className="text-2xl font-semibold">Сотрудник</h1>
                    <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                        Базовый пользовательский поток уже отделен от admin-части.
                        Дальше сюда пойдет профиль сотрудника и доступ к базе знаний.
                    </p>
                </div>
            </div>
        </>
    );
}
