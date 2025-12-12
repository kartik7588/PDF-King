/**
 * Helper to track PDF downloads in GA4
 * @param {string} feature - The feature name (e.g., "Edit", "Merge", "Compress")
 * @param {object} extra - Optional extra metrics (e.g., { pageCount: 5, sizeKB: 1024 })
 */
export const trackDownload = (feature, extra = {}) => {
    if (window.gtag) {
        window.gtag('event', 'pdf_download', {
            feature,
            timestamp: Date.now(),
            ...extra
        });
        console.log('GA4 Event Tracked:', 'pdf_download', { feature, ...extra });
    } else {
        console.warn('GA4 not initialized (window.gtag not found)');
    }
};
