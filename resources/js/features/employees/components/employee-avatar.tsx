import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/features/employees/utils';

export function EmployeeAvatar({
    name,
    photoUrl,
    className = 'size-12',
    fallbackClassName = '',
}: {
    name: string;
    photoUrl: string | null;
    className?: string;
    fallbackClassName?: string;
}) {
    return (
        <Avatar className={className}>
            <AvatarImage src={photoUrl ?? undefined} alt={name} />
            <AvatarFallback
                className={`employee-avatar__fallback text-sm font-semibold ${fallbackClassName}`.trim()}
            >
                {getInitials(name)}
            </AvatarFallback>
        </Avatar>
    );
}
