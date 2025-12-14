/**
 * Device detection and viewport utilities for mobile-aware PDF rendering
 */

/**
 * Detects if the current device is mobile based on viewport width and user agent
 * @returns {boolean} True if mobile device detected
 */
export const isMobileDevice = () => {
    // Check viewport width (primary method)
    const viewportWidth = window.innerWidth;
    const isMobileViewport = viewportWidth < 768;

    // Check user agent as secondary indicator
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());

    // Return true if either condition is met
    return isMobileViewport || isMobileUA;
};

/**
 * Gets current viewport dimensions
 * @returns {{ width: number, height: number }}
 */
export const getViewportDimensions = () => {
    return {
        width: window.innerWidth,
        height: window.innerHeight
    };
};

/**
 * Calculates optimal PDF render width based on device and container
 * @param {number} containerWidth - Width of the PDF container element
 * @returns {number} Optimal width for PDF rendering
 */
export const getOptimalPDFWidth = (containerWidth) => {
    const isMobile = isMobileDevice();
    const viewport = getViewportDimensions();

    if (isMobile) {
        // On mobile, use 95% of viewport width to maximize space but keep small margins
        // But do not exceed container width
        const mobileWidth = Math.min(viewport.width * 0.95, containerWidth || viewport.width);
        return Math.floor(mobileWidth);
    } else {
        // On desktop, use larger width but fit within container
        // Standard A4-ish viewing size or container width
        return Math.min(800, containerWidth - 40 || 800);
    }
};

/**
 * Checks if device supports touch events
 * @returns {boolean} True if touch is supported
 */
export const isTouchDevice = () => {
    return (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        navigator.msMaxTouchPoints > 0
    );
};

/**
 * Gets device pixel ratio for high-DPI displays
 * @returns {number} Device pixel ratio
 */
export const getDevicePixelRatio = () => {
    return window.devicePixelRatio || 1;
};

// Scroll Locking Utilities for Drag Operations
export const startScrollLock = () => {
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none'; // Prevent browser handling of gestures
};

export const endScrollLock = () => {
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
};
