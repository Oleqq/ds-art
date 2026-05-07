import type { ImgHTMLAttributes } from 'react';

export default function AppLogoIcon({
    alt = 'DS Art',
    className,
    ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
    return (
        <img
            {...props}
            src="/dsart-logo.webp"
            alt={alt}
            className={['app-logo-icon', className].filter(Boolean).join(' ')}
            draggable={false}
        />
    );
}
