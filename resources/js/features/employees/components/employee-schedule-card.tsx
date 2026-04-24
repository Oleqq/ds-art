import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { EmployeeSchedule } from '@/features/employees/types';
import { scheduleDayLabels } from '@/features/employees/utils';

export function EmployeeScheduleCard({
    schedule,
}: {
    schedule: EmployeeSchedule | null;
}) {
    if (!schedule) {
        return (
            <Card className="surface-card gap-0 border shadow-none">
                <CardHeader className="pb-0">
                    <CardTitle className="section-card__title">График работы</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                    График не заполнен.
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="surface-card gap-0 border shadow-none">
            <CardHeader className="pb-0">
                <CardTitle className="section-card__title">График работы</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="schedule-grid">
                    {scheduleDayLabels.map((label, index) => {
                        const active = schedule.days.includes(index);

                        return (
                            <span
                                key={label}
                                className={`schedule-grid__day ${
                                    active ? 'is-active' : 'is-off'
                                }`}
                            >
                                <strong>{label}</strong>
                                <span>{active ? schedule.start : 'Вых.'}</span>
                                <span>{active ? schedule.end : ''}</span>
                            </span>
                        );
                    })}
                </div>

                <div className="schedule-grid__summary text-sm">
                    {scheduleDayLabels
                        .filter((_, index) => schedule.days.includes(index))
                        .join(', ')}
                    . ТГ: <b>{schedule.start}</b> — <b>{schedule.end}</b>
                </div>
            </CardContent>
        </Card>
    );
}
