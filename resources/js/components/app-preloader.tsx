import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

const SHOW_DELAY = 120;
const HIDE_DELAY = 220;

export function AppPreloader() {
    const [isVisible, setIsVisible] = useState(false);
    const showTimerRef = useRef<number | null>(null);
    const hideTimerRef = useRef<number | null>(null);

    useEffect(() => {
        const clearShowTimer = () => {
            if (showTimerRef.current) {
                window.clearTimeout(showTimerRef.current);
                showTimerRef.current = null;
            }
        };

        const clearHideTimer = () => {
            if (hideTimerRef.current) {
                window.clearTimeout(hideTimerRef.current);
                hideTimerRef.current = null;
            }
        };

        const start = router.on('start', () => {
            clearShowTimer();
            clearHideTimer();

            showTimerRef.current = window.setTimeout(() => {
                setIsVisible(true);
            }, SHOW_DELAY);
        });

        const finish = router.on('finish', () => {
            clearShowTimer();
            clearHideTimer();

            hideTimerRef.current = window.setTimeout(() => {
                setIsVisible(false);
            }, HIDE_DELAY);
        });

        const cancel = router.on('cancel', () => {
            clearShowTimer();
            clearHideTimer();
            setIsVisible(false);
        });

        return () => {
            start();
            finish();
            cancel();
            clearShowTimer();
            clearHideTimer();
        };
    }, []);

    return (
        <div className={`app-preloader ${isVisible ? 'is-active' : ''}`} aria-hidden={!isVisible}>
            <div className="app-preloader__bar" />

            <div className="app-preloader__badge" role="status" aria-live="polite">
                <span className="app-preloader__mark">SC</span>
                <span className="app-preloader__text">Загружаем раздел</span>
                <span className="app-preloader__dots" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                </span>
            </div>
        </div>
    );
}
