import { Head } from '@inertiajs/react';

export default function AdminDashboard() {
    return (
        <>
            <Head title="Admin" />

            <div className="flex flex-1 flex-col gap-4 p-6">
                <div className="rounded-xl border border-border/70 bg-background p-6">
                    <h1 className="text-2xl font-semibold">Админская часть проекта</h1>
                    <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                        Базовый role-flow уже подключен. Следующий этап — собрать отдельные
                        layouts, экраны входа и затем перейти к модулю сотрудников.
                    </p>
                </div>
            </div>
        </>
    );
}
