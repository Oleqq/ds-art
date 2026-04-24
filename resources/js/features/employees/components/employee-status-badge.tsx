import { Badge } from '@/components/ui/badge';
import { getStatusLabel } from '@/features/employees/utils';

export function EmployeeStatusBadge({
    status,
}: {
    status: 'active' | 'inactive';
}) {
    return (
        <Badge
            variant="outline"
            className={
                status === 'active'
                    ? 'status-badge status-badge--active'
                    : 'status-badge status-badge--inactive'
            }
        >
            {getStatusLabel(status)}
        </Badge>
    );
}
