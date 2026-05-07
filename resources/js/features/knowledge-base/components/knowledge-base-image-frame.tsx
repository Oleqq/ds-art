import { type CSSProperties, useMemo } from 'react';

type KnowledgeBaseImageFrameProps = {
    src: string;
    alt?: string;
    height: number;
    widthPercent?: number;
    focusX: number;
    focusY: number;
    zoomPercent: number;
    frameClassName?: string;
    imageClassName?: string;
    style?: CSSProperties;
};

function clampPercent(value: number) {
    if (!Number.isFinite(value)) {
        return 50;
    }

    return Math.min(100, Math.max(0, value));
}

export function KnowledgeBaseImageFrame({
    src,
    alt = '',
    height,
    widthPercent = 100,
    focusX,
    focusY,
    zoomPercent,
    frameClassName = '',
    imageClassName = '',
    style,
}: KnowledgeBaseImageFrameProps) {
    const mediaStyle = useMemo<CSSProperties>(() => {
        const x = clampPercent(focusX);
        const y = clampPercent(focusY);
        const zoom =
            Math.max(100, Number.isFinite(zoomPercent) ? zoomPercent : 100) /
            100;

        return {
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: `${x}% ${y}%`,
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
            maxWidth: 'none',
            maxHeight: 'none',
        };
    }, [focusX, focusY, zoomPercent]);

    return (
        <span
            className={`kb-media-frame ${frameClassName}`.trim()}
            style={{
                width: `${widthPercent}%`,
                height: `${height}px`,
                ...style,
            }}
        >
            <img
                src={src}
                alt={alt}
                className={`kb-media-frame__image ${imageClassName}`.trim()}
                style={mediaStyle}
            />
        </span>
    );
}
