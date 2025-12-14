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
    const { PDFDocument, rgb } = await import('pdf-lib');
    let existingPdfBytes;

    if (fileInput instanceof Uint8Array) {
        existingPdfBytes = fileInput;
    } else if (fileInput instanceof ArrayBuffer) {
        existingPdfBytes = fileInput;
    } else {
        existingPdfBytes = await fileInput.arrayBuffer();
    }

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Normalize scale helper
    const getScale = (pageIndex) => {
        if (typeof scaleMapOrSingle === 'object' && scaleMapOrSingle !== null) {
            return scaleMapOrSingle[pageIndex] || 1;
        }
        return Number(scaleMapOrSingle) || 1;
    };

    let processedCount = 0;

    for (const ann of annotations) {
        try {
            // Guard: Page out of bounds
            if (ann.page < 0 || ann.page >= pages.length) {
                console.warn(`Annotation on page ${ann.page} out of bounds (Total: ${pages.length})`);
                continue;
            }

            const page = pages[ann.page];

            // Get CropBox (Visible Area) or MediaBox (Physical Size)
            // react-pdf renders the CropBox. pdf-lib writes to absolute coordinates.
            // If CropBox is offset (e.g. x=100, y=100), we must add that to our coordinates.
            const cropBox = page.getCropBox() || page.getMediaBox();
            const { x: cropX, y: cropY, height: cropHeight } = cropBox;
            const pageScale = getScale(ann.page);

            // Coordinates
            // Ensure inputs are numbers
            const x = Number(ann.x) || 0;
            const y = Number(ann.y) || 0;
            const width = Number(ann.width) || 100;
            const height = Number(ann.height) || 20;
            const size = Number(ann.size) || 12;

            // Convert to PDF Coords (Normalizing visual input to Points)
            const normalizedX = x / pageScale;
            // Visual Y is from top. Distance from BOTTOM of visible area is: height - visualY
            const normalizedYFromBottom = (cropHeight - (y / pageScale));

            // Apply offsets to map to absolute PDF space
            const pdfX = cropX + normalizedX;
            const pdfY = cropY + normalizedYFromBottom;
            const pdfTopY = pdfY; // This is our anchor (Top-Left of the annotation box in PDF space? No, wait.)

            // toPdfLibCoords logic was: pdfY = pageHeight - (y / scale)
            // Here pageHeight corresponds to cropHeight. 
            // And we add cropY offset.
            // So: pdfTopY = cropY + cropHeight - (y / scale)
            // Which matches my formula above.

            // Allow for slight error margin or "NaN" recovery
            if (isNaN(pdfX) || isNaN(pdfTopY)) {
                console.error("Computed NaN coordinates", { x, y, cropHeight, pageScale });
                continue;
            }

            const pdfBoxWidth = width / pageScale;
            const pdfBoxHeight = height / pageScale;
            const pdfBottomY = pdfTopY - pdfBoxHeight;
            const fontSizePdf = size / pageScale;

            // Draw Whiteout (Background)
            page.drawRectangle({
                x: pdfX, // Removed -1 offset for strictness, user wants EXACT position
                y: pdfBottomY,
                width: pdfBoxWidth,
                height: pdfBoxHeight,
                color: rgb(1, 1, 1),
            });

            // Handle Color - ensure 0-1 range if RGB is provided as 0-255? 
            // Assuming the app provides 0-255 logic elsewhere? 
            // Actually Edit.jsx init is {r:0, g:0, b:0}.
            // DraggableTextOverlay doesn't seem to have a generic color picker yet that returns 0-255.
            // But let's be safe. If > 1, assume 8-bit.
            let r = ann.color?.r || 0;
            let g = ann.color?.g || 0;
            let b = ann.color?.b || 0;
            if (r > 1) r /= 255;
            if (g > 1) g /= 255;
            if (b > 1) b /= 255;

            // Draw Text
            page.drawText(ann.text || "", {
                x: pdfX,
                y: pdfBottomY + (pdfBoxHeight * 0.2), // Vertical alignment adjustment
                size: fontSizePdf,
                font: font,
                color: rgb(r, g, b),
                maxWidth: pdfBoxWidth
            });

            processedCount++;
        } catch (error) {
            console.error("Failed to save annotation:", error, ann);
        }
    }

    console.log(`Saved PDF with ${processedCount} edits.`);
    return await pdfDoc.save();
};
