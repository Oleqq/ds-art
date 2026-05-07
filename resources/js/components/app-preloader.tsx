import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';

const SHOW_DELAY = 120;
const HIDE_DELAY = 220;

function isPrefetchVisit(event: unknown) {
    return Boolean(
        (event as { detail?: { visit?: { prefetch?: boolean } } })?.detail
            ?.visit?.prefetch,
    );
}

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

        const start = router.on('start', (event) => {
            if (isPrefetchVisit(event)) {
                return;
            }

            clearShowTimer();
            clearHideTimer();

            showTimerRef.current = window.setTimeout(() => {
                setIsVisible(true);
            }, SHOW_DELAY);
        });

        const finish = router.on('finish', (event) => {
            if (isPrefetchVisit(event)) {
                return;
            }

            clearShowTimer();
            clearHideTimer();

            hideTimerRef.current = window.setTimeout(() => {
                setIsVisible(false);
            }, HIDE_DELAY);
        });

        const cancel = router.on('cancel', (event) => {
            if (isPrefetchVisit(event)) {
                return;
            }

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
        <div
            className={`app-preloader ${isVisible ? 'is-active' : ''}`}
            aria-hidden={!isVisible}
        >
            <div className="app-preloader__center" role="status" aria-live="polite">
                <span className="app-preloader__orbit app-preloader__orbit--outer" />
                <span className="app-preloader__orbit app-preloader__orbit--inner" />
                <span className="app-preloader__core">
                    <AppLogoIcon alt="" className="app-preloader__logo" />
                </span>
                <span className="sr-only">Loading</span>
            </div>
        </div>
    );
}
