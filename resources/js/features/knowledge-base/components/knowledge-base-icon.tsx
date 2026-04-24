import { cn } from '@/lib/utils';

export function KnowledgeBaseIcon({
    icon,
    imageUrl,
    className,
    imageClassName,
}: {
    icon: string | null | undefined;
    imageUrl?: string | null;
    className?: string;
    imageClassName?: string;
}) {
    if (imageUrl) {
        return (
            <span className={cn('kb-icon-visual', className)}>
                <img
                    src={imageUrl}
                    alt=""
                    className={cn('kb-icon-visual__image', imageClassName)}
                />
            </span>
        );
    }

    if (!icon) {
        return null;
    }

    return <span className={className}>{icon}</span>;
}
