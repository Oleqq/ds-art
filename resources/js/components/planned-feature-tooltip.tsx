import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export type PlannedFeatureMeta = {
    phase: string;
    note: string;
    status?: string;
};

export function PlannedFeatureTooltip({
    feature,
    children,
    side = 'right',
}: {
    feature: PlannedFeatureMeta;
    children: React.ReactNode;
    side?: 'top' | 'right' | 'bottom' | 'left';
}) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <span className="planned-feature-trigger inline-flex">
                    {children}
                </span>
            </TooltipTrigger>
            <TooltipContent
                side={side}
                className="planned-feature-tooltip max-w-[240px] rounded-[10px] px-3 py-2"
            >
                <div className="planned-feature-tooltip-title">
                    {feature.status ?? 'Запланировано'}
                </div>
                <div className="planned-feature-tooltip-phase">
                    {feature.phase}
                </div>
                <p className="planned-feature-tooltip-note">{feature.note}</p>
            </TooltipContent>
        </Tooltip>
    );
}
