import { rgb, StandardFonts } from 'pdf-lib';

/**
 * Validates that a value is a finite number
 */
const isValidNumber = (val) => typeof val === 'number' && isFinite(val);

/**
 * Converts DOM/Canvas coordinates to PDF coordinates (points).
 * PDF coordinates start at bottom-left, while DOM starts at top-left.
 * 
 * @param {number} x - X coordinate in pixels (relative to page container)
 * @param {number} y - Y coordinate in pixels 
 * @param {number} pageHeight - Height of the page in PDF points
 * @param {number} scale - Current rendering scale (Canvas px / PDF points)
 * @param {number} zoom - Current zoom level (default 1.0)
 * @param {Object} panOffset - Current pan offset { x, y } (default { x: 0, y: 0 })
 */
export const toPdfLibCoords = (x, y, pageHeight, scale, zoom = 1, panOffset = { x: 0, y: 0 }) => {
    // Guard against invalid inputs
    if (!isValidNumber(x) || !isValidNumber(y) || !isValidNumber(pageHeight) || !isValidNumber(scale) || scale === 0) {
        console.error('Invalid coords:', { x, y, pageHeight, scale });
        return { pdfX: 0, pdfY: 0 };
    }

    // Validate zoom
    if (!isValidNumber(zoom) || zoom <= 0) {
        console.warn('Invalid zoom, using 1.0:', zoom);
        zoom = 1;
    }

    // Validate panOffset
    const safePanX = isValidNumber(panOffset?.x) ? panOffset.x : 0;
    const safePanY = isValidNumber(panOffset?.y) ? panOffset.y : 0;

    // Account for zoom and pan when converting coordinates
    // First subtract pan offset, then divide by (scale * zoom)
    const effectiveScale = scale * zoom;

    return {
        pdfX: (x - safePanX) / effectiveScale,
        pdfY: pageHeight - ((y - safePanY) / effectiveScale)
    };
};

/**
 * Validates an annotation object before processing
 */
const validateAnnotation = (ann, pageCount, scale) => {
    const errors = [];

    // Check required fields exist
    if (!isValidNumber(ann.x)) errors.push(`x is invalid: ${ann.x}`);
    if (!isValidNumber(ann.y)) errors.push(`y is invalid: ${ann.y}`);
    if (!isValidNumber(ann.width) || ann.width <= 0) errors.push(`width is invalid: ${ann.width}`);
    if (!isValidNumber(ann.height) || ann.height <= 0) errors.push(`height is invalid: ${ann.height}`);
    if (!isValidNumber(ann.size) || ann.size <= 0) errors.push(`size is invalid: ${ann.size}`);
    if (!isValidNumber(ann.page) || ann.page < 0 || ann.page >= pageCount) {
        errors.push(`page is invalid: ${ann.page} (pageCount: ${pageCount})`);
    }
    if (!isValidNumber(scale) || scale <= 0) errors.push(`scale is invalid: ${scale}`);
    if (!ann.text || typeof ann.text !== 'string') errors.push(`text is invalid`);

    return errors;
};

/**
 * Saves edits to the PDF Blob/Bytes.
 * Covers original text with white rectangles and draws new text on top.
 * 
 * @param {Blob|Uint8Array} fileInput - Original PDF file or bytes
 * @param {Array} annotations - List of text edits
 * @param {Object|number} scaleMapOrSingle - Either {pageIndex: scale} map or single scale for all pages
 * @returns {Promise<Uint8Array>} - Modified PDF bytes
 */
export const saveEditorChanges = async (fileInput, annotations, scaleMapOrSingle) => {
    const { PDFDocument } = await import('pdf-lib');
    let existingPdfBytes;

    if (fileInput instanceof Uint8Array) {
        existingPdfBytes = fileInput;
    } else {
        existingPdfBytes = await fileInput.arrayBuffer();
    }

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Handle both scaleMap object and single scale number (backward compatibility)
    const getScale = (pageIndex) => {
        if (typeof scaleMapOrSingle === 'object' && scaleMapOrSingle !== null) {
            const scale = scaleMapOrSingle[pageIndex];
            if (isValidNumber(scale) && scale > 0) return scale;
            console.warn(`Missing scale for page ${pageIndex}, using default 1`);
            return 1;
        }
        // Single scale for all pages (legacy)
        return isValidNumber(scaleMapOrSingle) && scaleMapOrSingle > 0 ? scaleMapOrSingle : 1;
    };

    let processedCount = 0;
    let skippedCount = 0;

    for (const ann of annotations) {
        // Get scale for this annotation's page
        const pageScale = getScale(ann.page);

        // Validate annotation
        const errors = validateAnnotation(ann, pages.length, pageScale);
        if (errors.length > 0) {
            console.error(`Skipping invalid annotation:`, errors, ann);
            skippedCount++;
            continue;
        }

        try {
            const page = pages[ann.page];
            const { height: pageHeight } = page.getSize();

            // Sanitize annotation values (clamp to safe ranges)
            const safeX = Math.max(0, ann.x);
            const safeY = Math.max(0, ann.y);
            const safeWidth = Math.max(1, ann.width);
            const safeHeight = Math.max(1, ann.height);
            const safeSize = Math.max(1, ann.size);

            // Convert to PDF coordinates using THIS PAGE's scale
            const { pdfX, pdfY: pdfTopY } = toPdfLibCoords(safeX, safeY, pageHeight, pageScale);
            const pdfBoxWidth = safeWidth / pageScale;
            const pdfBoxHeight = safeHeight / pageScale;
            const pdfBottomY = pdfTopY - pdfBoxHeight;
            const fontSizePdf = safeSize / pageScale;

            // Final validation before drawing
            if (!isValidNumber(pdfX) || !isValidNumber(pdfBottomY) ||
                !isValidNumber(pdfBoxWidth) || !isValidNumber(pdfBoxHeight) ||
                !isValidNumber(fontSizePdf)) {
                console.error(`Computed invalid PDF coords, skipping annotation:`, {
                    pdfX, pdfBottomY, pdfBoxWidth, pdfBoxHeight, fontSizePdf
                });
                skippedCount++;
                continue;
            }

            // Draw white rectangle (cover)
            page.drawRectangle({
                x: pdfX - 1,
                y: pdfBottomY - 1,
                width: pdfBoxWidth + 2,
                height: pdfBoxHeight + 2,
                color: rgb(1, 1, 1),
            });

            // Draw replacement text
            page.drawText(ann.text, {
                x: pdfX,
                y: pdfBottomY + (pdfBoxHeight * 0.2),
                size: fontSizePdf,
                font: font,
                color: rgb(
                    ann.color?.r || 0,
                    ann.color?.g || 0,
                    ann.color?.b || 0
                ),
                maxWidth: pdfBoxWidth
            });

            processedCount++;
        } catch (error) {
            console.error(`Error processing annotation:`, error, ann);
            skippedCount++;
        }
    }

    console.log(`Save complete: ${processedCount} processed, ${skippedCount} skipped`);

    return await pdfDoc.save();
};
