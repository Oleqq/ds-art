import AppLayout from '@/layouts/app-layout';

export default function EmployeeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <AppLayout>{children}</AppLayout>;
}
