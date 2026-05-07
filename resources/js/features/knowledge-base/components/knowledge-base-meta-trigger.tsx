import { CalendarClock, History, Info, UserRound } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

type KnowledgeBaseMetaRow =
    | string
    | {
          label: string;
          value: string;
          tone?: 'author' | 'created' | 'updated';
      };

type KnowledgeBaseMetaTriggerProps = {
    rows: KnowledgeBaseMetaRow[];
    className?: string;
    buttonClassName?: string;
    panelClassName?: string;
    label?: string;
};

export function KnowledgeBaseMetaTrigger({
    rows,
    className,
    buttonClassName,
    panelClassName,
    label = 'Показать информацию об элементе',
}: KnowledgeBaseMetaTriggerProps) {
    const isMobile = useIsMobile();
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLSpanElement | null>(null);
    const panelRef = useRef<HTMLSpanElement | null>(null);
    const panelId = useId();

    useEffect(() => {
        if (!isMobile) {
            setOpen(false);
            return;
        }

        if (!open) {
            return;
        }

        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target as Node;

            if (
                rootRef.current?.contains(target) ||
                panelRef.current?.contains(target)
            ) {
                return;
            }

            if (!rootRef.current?.contains(target)) {
                setOpen(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isMobile, open]);

    if (rows.length === 0) {
        return null;
    }

    const renderRow = (row: KnowledgeBaseMetaRow): ReactNode => {
        if (typeof row === 'string') {
            return <span className="kb-meta-trigger__row-text">{row}</span>;
        }

        const Icon =
            row.tone === 'created'
                ? CalendarClock
                : row.tone === 'updated'
                  ? History
                  : UserRound;

        return (
            <>
                <span className="kb-meta-trigger__row-icon">
                    <Icon className="size-3.5" />
                </span>
                <span className="kb-meta-trigger__row-copy">
                    <span className="kb-meta-trigger__row-label">
                        {row.label}
                    </span>
                    <span className="kb-meta-trigger__row-value">
                        {row.value}
                    </span>
                </span>
            </>
        );
    };

    const getRowKey = (row: KnowledgeBaseMetaRow) =>
        typeof row === 'string' ? row : `${row.label}-${row.value}`;

    const triggerButton = (
        <button
            type="button"
            className={cn('kb-meta-trigger__button', buttonClassName)}
            aria-label={label}
            aria-expanded={isMobile ? open : undefined}
            aria-controls={isMobile ? panelId : undefined}
            aria-haspopup={isMobile ? 'dialog' : undefined}
            data-kb-no-card-select
            onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
            }}
            onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();

                if (isMobile) {
                    setOpen((current) => !current);
                }
            }}
        >
            <Info className="size-3.5" />
            <span className="sr-only">{label}</span>
        </button>
    );

    const mobilePanel = open ? (
        <span
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-label={label}
            className={cn('kb-meta-trigger__panel', panelClassName)}
            onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
            }}
        >
            {rows.map((row) => (
                <span key={getRowKey(row)} className="kb-meta-trigger__row">
                    {renderRow(row)}
                </span>
            ))}
        </span>
    ) : null;

    return (
        <span
            ref={rootRef}
            className={cn('kb-meta-trigger', className)}
            data-kb-no-card-select
        >
            {isMobile ? (
                <>
                    {triggerButton}
                    {mobilePanel && typeof document !== 'undefined'
                        ? createPortal(mobilePanel, document.body)
                        : null}
                </>
            ) : (
                <Tooltip>
                    <TooltipTrigger asChild>{triggerButton}</TooltipTrigger>
                    <TooltipContent
                        side="top"
                        align="end"
                        sideOffset={10}
                        className={cn(
                            'kb-meta-trigger__tooltip',
                            panelClassName,
                        )}
                    >
                        <div className="kb-meta-trigger__tooltip-body">
                            {rows.map((row) => (
                                <div
                                    key={getRowKey(row)}
                                    className="kb-meta-trigger__row"
                                >
                                    {renderRow(row)}
                                </div>
                            ))}
                        </div>
                    </TooltipContent>
                </Tooltip>
            )}
        </span>
    );
}
