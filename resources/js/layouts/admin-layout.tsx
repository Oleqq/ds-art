import AppLayout from '@/layouts/app-layout';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <AppLayout>{children}</AppLayout>;
}
