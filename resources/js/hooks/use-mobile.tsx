import { useSyncExternalStore } from 'react';

const MOBILE_BREAKPOINT = 768;

function getServerSnapshot(): boolean {
    return false;
}

function getDeviceScreenWidth(): number | null {
    if (typeof window === 'undefined') {
        return null;
    }

    const candidates = [window.screen?.width, window.screen?.height].filter(
        (value): value is number => typeof value === 'number' && value > 0,
    );

    if (candidates.length === 0) {
        return null;
    }

    return Math.min(...candidates);
}

function isWithinViewportWidth(maxWidth: number): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    if (window.matchMedia(`(max-width: ${maxWidth}px)`).matches) {
        return true;
    }

    const visualViewportWidth = window.visualViewport?.width;

    if (
        typeof visualViewportWidth === 'number' &&
        visualViewportWidth > 0 &&
        visualViewportWidth <= maxWidth
    ) {
        return true;
    }

    const deviceScreenWidth = getDeviceScreenWidth();

    return deviceScreenWidth !== null && deviceScreenWidth <= maxWidth;
}

function subscribeToViewportChanges(callback: () => void) {
    if (typeof window === 'undefined') {
        return () => {};
    }

    const handleChange = () => {
        callback();
    };
    const mobileMql = window.matchMedia(
        `(max-width: ${MOBILE_BREAKPOINT - 1}px)`,
    );

    mobileMql.addEventListener('change', handleChange);
    window.addEventListener('resize', handleChange);
    window.addEventListener('orientationchange', handleChange);
    window.visualViewport?.addEventListener('resize', handleChange);

    return () => {
        mobileMql.removeEventListener('change', handleChange);
        window.removeEventListener('resize', handleChange);
        window.removeEventListener('orientationchange', handleChange);
        window.visualViewport?.removeEventListener('resize', handleChange);
    };
}

export function useViewportMaxWidth(maxWidth: number): boolean {
    return useSyncExternalStore(
        subscribeToViewportChanges,
        () => isWithinViewportWidth(maxWidth),
        getServerSnapshot,
    );
}

export function useIsMobile(): boolean {
    return useViewportMaxWidth(MOBILE_BREAKPOINT - 1);
}
