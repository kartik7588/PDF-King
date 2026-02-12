import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export async function mergePDFs(files) {
    try {
        const mergedPdf = await PDFDocument.create();

        for (const file of files) {
            const fileBuffer = await file.arrayBuffer();
            const pdf = await PDFDocument.load(fileBuffer);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());

            copiedPages.forEach((page) => mergedPdf.addPage(page));
        }

        const mergedPdfBytes = await mergedPdf.save();
        return mergedPdfBytes;
    } catch (error) {
        console.error("Error merging PDFs:", error);
        throw new Error("Failed to merge PDFs. Please ensure all files are valid PDFs.");
    }
}


export async function splitPDF(file, pageIndices) {
    try {
        const fileBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(fileBuffer);

        // Create specific Logic: if no indices provided, split all pages into individual files?
        // For now, let's assume we return a ZIP or array of Blobs? 
        // Simpler: Return a SINGLE PDF containing only the selected pages (Extract mode).
        // Or if "Split" means "Burst", we return an array.

        // Let's implement "Extract Selected Pages" as the primary "Split" function for now.

        const newPdf = await PDFDocument.create();
        const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);

        copiedPages.forEach((page) => newPdf.addPage(page));

        return await newPdf.save();
    } catch (error) {
        console.error("Error splitting PDF:", error);
        throw new Error("Failed to split PDF.");
    }
}

export async function rotatePDF(file, rotations) {
    // rotations = { pageIndex0: 90, pageIndex1: 180, ... }
    try {
        const fileBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(fileBuffer);
        const pages = pdfDoc.getPages();

        Object.keys(rotations).forEach((pageIndexAsStr) => {
            const index = parseInt(pageIndexAsStr);
            const rotationAngle = rotations[index];
            const page = pages[index];
            if (page) {
                const currentRotation = page.getRotation().angle;
                page.setRotation({ type: 'degrees', angle: (currentRotation + rotationAngle) % 360 });
            }
        });

        return await pdfDoc.save();
    } catch (error) {
        console.error("Error rotating PDF:", error);
        throw new Error("Failed to rotate PDF.");
    }
}

export async function addImageToPDF(file, imageFile, pageIndex, x, y, width, height, screenWidth, screenHeight) {
    try {
        const pdfBytes = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(pdfBytes);

        // Embed the image
        const imageBytes = await imageFile.arrayBuffer();
        let image;
        if (imageFile.type === 'image/png') {
            image = await pdfDoc.embedPng(imageBytes);
        } else {
            image = await pdfDoc.embedJpg(imageBytes);
        }

        const page = pdfDoc.getPages()[pageIndex];
        if (!page) throw new Error("Page not found");

        const { width: pageWidth, height: pageHeight } = page.getSize();

        // Coordinate Mapping
        // UI: Origin Top-Left. PDF: Origin Bottom-Left.
        // Scale Factor: PDF uses Points (72 dpi usually). UI uses Pixels.
        // We need to know the ratio of (PDF Point Width / UI Rendered Width).
        // The screenWidth passed here is the width of the rendered Page in the DOM.

        const scale = pageWidth / screenWidth;

        const pdfX = x * scale;
        // For Y: PDF (0,0) is bottom-left. UI (0,0) is top-left.
        // pdfY = pageHeight - ((y + imageHeight) * scale) ?
        // Or just pdfY = pageHeight - (y * scale) - (imageHeight * scale)
        const pdfWidth = width * scale;
        const pdfHeight = height * scale;

        // Inverted Y axis for PDF
        const pdfY = pageHeight - (y * scale) - pdfHeight;

        page.drawImage(image, {
            x: pdfX,
            y: pdfY,
            width: pdfWidth,
            height: pdfHeight,
        });

        return await pdfDoc.save();
    } catch (error) {
        console.error("Error adding image:", error);
        throw new Error("Failed to add image to PDF.");
    }
}

export async function addTextToPDF(file, textData, pageIndex, screenWidth) {
    // textData = { text: "Hello", x: 100, y: 100, size: 24, r:0, g:0, b:0 }
    try {
        const pdfBytes = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

        const page = pdfDoc.getPages()[pageIndex];
        if (!page) throw new Error("Page not found");

        const { width: pageWidth, height: pageHeight } = page.getSize();
        const scale = pageWidth / screenWidth;

        const { text, x, y, size, color } = textData;

        // Scale coordinates
        const pdfX = x * scale;
        // For text, y is usually the baseline.
        // pdf-lib drawText y is from bottom.
        // We need to approximate the height of the text block to position top-left correctly if that's what UI sends.
        // Simplification: Assume UI sends Top-Left coordinates.
        // PDF Y = pageHeight - (y * scale) - (size * scale * 0.8) (approx ascent adjustment?)
        // Let's just do standard inversion first.
        const pdfY = pageHeight - (y * scale) - (size * scale);

        page.drawText(text, {
            x: pdfX,
            y: pdfY,
            size: size * scale,
            font: helveticaFont,
            color: rgb(color.r, color.g, color.b),
        });

        return await pdfDoc.save();
    } catch (error) {
        console.error("Error adding text:", error);
        throw new Error("Failed to add text to PDF.");
    }
}

export async function saveAnnotationsToPDF(file, annotations, screenWidth) {
    try {
        const pdfBytes = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

        // Group annotations by page to optimize page retrieval
        // Assuming annotations have a 'page' property (0-indexed). 
        // If they don't, we might assume page 0 or current page (but we need that info).
        // The user prompt said: "assume... all annotations belong to the currently visible page" (implied passed in).
        // But better to expect 'page' in annotation if possible, OR pass a defaultPage.
        // Let's rely on annotation.page being present or default to 0.

        for (const note of annotations) {
            // Default to page 0 if not defined, though Edit.jsx should provide it.
            // Note: pageIndex in pdf-lib is 0-based.
            const pageIndex = note.page !== undefined ? note.page : 0;

            let page;
            try {
                page = pdfDoc.getPages()[pageIndex];
            } catch (e) {
                console.warn(`Page ${pageIndex} not found, skipping annotation.`);
                continue;
            }
            if (!page) continue;

            const { width: pageWidth, height: pageHeight } = page.getSize();
            const scale = pageWidth / screenWidth;

            const pdfX = note.x * scale;
            // PDF Y is inverted. 
            // pdfY = pageHeight - (screenY * scale) - (fontSize * scale)
            const pdfY = pageHeight - (note.y * scale) - (note.size * scale);

            // Normalize color if strictly needed, mostly assuming 0-1 or handling in UI
            // But standard check:
            const r = note.color?.r ?? 0;
            const g = note.color?.g ?? 0;
            const b = note.color?.b ?? 0;

            page.drawText(note.text, {
                x: pdfX,
                y: pdfY,
                size: note.size * scale,
                font: helveticaFont,
                color: rgb(r, g, b),
            });
        }

        return await pdfDoc.save();
    } catch (error) {
        console.error("Error saving annotations:", error);
        throw new Error("Failed to save PDF with annotations.");
    }
}
