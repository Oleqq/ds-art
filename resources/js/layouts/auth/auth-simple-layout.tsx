import { Link } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import AppLogo from '@/components/app-logo';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    const shellRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const node = shellRef.current;

        if (!node) {
            return;
        }

        const updatePointer = (event: PointerEvent) => {
            const rect = node.getBoundingClientRect();
            const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
            const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;

            node.style.setProperty('--auth-mouse-x', x.toFixed(3));
            node.style.setProperty('--auth-mouse-y', y.toFixed(3));
        };

        const resetPointer = () => {
            node.style.setProperty('--auth-mouse-x', '0');
            node.style.setProperty('--auth-mouse-y', '0');
        };

        node.addEventListener('pointermove', updatePointer);
        node.addEventListener('pointerleave', resetPointer);

        return () => {
            node.removeEventListener('pointermove', updatePointer);
            node.removeEventListener('pointerleave', resetPointer);
        };
    }, []);

    return (
        <div ref={shellRef} className="auth-shell">
            <div className="auth-shell__ambient" aria-hidden="true">
                <span className="auth-shell__glow auth-shell__glow--primary" />
                <span className="auth-shell__glow auth-shell__glow--secondary" />
                <span className="auth-shell__grid" />
                <span className="auth-shell__beam auth-shell__beam--one" />
                <span className="auth-shell__beam auth-shell__beam--two" />
                <span className="auth-shell__halo auth-shell__halo--one" />
                <span className="auth-shell__halo auth-shell__halo--two" />
                <span className="auth-shell__noise" />
            </div>

            <div className="auth-shell__frame">
                <div className="auth-shell__brand">
                    <Link href={home()} className="auth-shell__brand-logo">
                        <AppLogo />
                    </Link>

                    <div className="auth-shell__brand-copy">
                        <h2>База знаний</h2>
                        <p>
                            Статьи, инструкции и внутренние материалы команды
                            собраны в одном рабочем пространстве.
                        </p>
                    </div>
                </div>

                <div className="auth-shell__panel">
                    <div className="auth-shell__card">
                        <div
                            className="auth-shell__card-glow"
                            aria-hidden="true"
                        />
                        <div
                            className="auth-shell__card-grid"
                            aria-hidden="true"
                        />

                        <div className="auth-shell__content">
                            <div className="auth-shell__copy">
                                <h1>{title}</h1>
                                <p>{description}</p>
                            </div>

                            <div className="auth-shell__form-shell">
                                {children}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
