import React, { useState, useEffect, useRef } from 'react';
import { Document, Page } from 'react-pdf';
import { Download, Image as ImageIcon, CheckSquare, Square, X } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import Dropzone from '../components/Dropzone';
import { trackDownload } from '../utils/analytics';
import { saveDownloadRecord } from '../utils/downloadManager';
import './ExportImages.css'; // We will create this next

export default function ExportImages() {
    const [file, setFile] = useState(null);
    const [pdfDoc, setPdfDoc] = useState(null); // Raw PDF reference
    const [numPages, setNumPages] = useState(null);
    const [selectedPages, setSelectedPages] = useState(new Set());
    const [isExporting, setIsExporting] = useState(false);
    const [exportFormat, setExportFormat] = useState('png'); // 'png' or 'jpg'
    const [quality, setQuality] = useState(2.0); // Scale factor (2.0 = ~144 DPI)

    const handleFileDropped = (files) => {
        if (files.length > 0) {
            setFile(files[0]);
            setSelectedPages(new Set());
            setPdfDoc(null);
        }
    };

    const onDocumentLoadSuccess = (pdf) => {
        setNumPages(pdf.numPages);
        setPdfDoc(pdf);
        // Auto-select all pages by default? Or none? Let's do ALL for convenience.
        const allPages = new Set(Array.from({ length: pdf.numPages }, (_, i) => i + 1));
        setSelectedPages(allPages);
    };

    const togglePageSelection = (pageNum) => {
        const newSelection = new Set(selectedPages);
        if (newSelection.has(pageNum)) {
            newSelection.delete(pageNum);
        } else {
            newSelection.add(pageNum);
        }
        setSelectedPages(newSelection);
    };

    const toggleSelectAll = () => {
        if (selectedPages.size === numPages) {
            setSelectedPages(new Set());
        } else {
            setSelectedPages(new Set(Array.from({ length: numPages }, (_, i) => i + 1)));
        }
    };

    const handleExport = async () => {
        if (!pdfDoc || selectedPages.size === 0) return;

        setIsExporting(true);
        try {
            const zip = new JSZip();
            const folderName = (file.name || 'document').replace('.pdf', '') + '_images';
            const imgFolder = zip.folder(folderName);

            const pagesToExport = Array.from(selectedPages).sort((a, b) => a - b);

            // Sequential processing to avoid memory spikes
            if (selectedPages.size === 1) {
                // Single File Export
                const pageNum = Array.from(selectedPages)[0];
                const page = await pdfDoc.getPage(pageNum);
                const viewport = page.getViewport({ scale: quality });

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({ canvasContext: context, viewport }).promise;

                const mimeType = exportFormat === 'png' ? 'image/png' : 'image/jpeg';
                const extension = exportFormat;
                const fileName = `${(file.name || 'document').replace('.pdf', '')}_page_${pageNum}.${extension}`;

                canvas.toBlob(async (blob) => {
                    saveAs(blob, fileName);

                    const sizeStr = (blob.size / 1024 / 1024).toFixed(2) + ' MB';
                    trackDownload('ExportImages', { count: 1, format: exportFormat, size: sizeStr });
                    await saveDownloadRecord(fileName, sizeStr, blob, 'Export Images');
                }, mimeType, 0.9);

            } else {
                // Multiple Files -> ZIP
                for (const pageNum of pagesToExport) {
                    const page = await pdfDoc.getPage(pageNum);
                    const viewport = page.getViewport({ scale: quality });

                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    await page.render({ canvasContext: context, viewport }).promise;

                    // Convert to Blob
                    const mimeType = exportFormat === 'png' ? 'image/png' : 'image/jpeg';
                    const extension = exportFormat;

                    const blob = await new Promise(resolve => canvas.toBlob(resolve, mimeType, 0.9));

                    // Add to Zip
                    imgFolder.file(`page_${pageNum}.${extension}`, blob);
                }

                // Generate Zip
                const content = await zip.generateAsync({ type: 'blob' });
                const zipName = `${folderName}.zip`;

                // Save
                saveAs(content, zipName);

                // Analytics
                const sizeStr = (content.size / 1024 / 1024).toFixed(2) + ' MB';
                trackDownload('ExportImages', { count: selectedPages.size, format: exportFormat, size: sizeStr });
                await saveDownloadRecord(zipName, sizeStr, content, 'Export Images');
            }

        } catch (error) {
            console.error("Export failed:", error);
            alert("Failed to export images. " + error.message);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="export-container">
            <div className="merge-header">
                <h2>Export as Image</h2>
                <p>Convert PDF pages to high-quality images.</p>
            </div>

            {!file ? (
                <Dropzone onFilesDropped={handleFileDropped} multiple={false} />
            ) : (
                <div className="work-area glass-panel">
                    <div className="toolbar">
                        <div className="selection-controls">
                            <button className="btn-secondary" onClick={toggleSelectAll}>
                                {selectedPages.size === numPages ? <CheckSquare size={16} /> : <Square size={16} />}
                                {selectedPages.size === numPages ? 'Unselect All' : 'Select All'}
                            </button>
                            <span className="selection-count">{selectedPages.size} pages selected</span>
                        </div>

                        <div className="export-controls">
                            <select
                                value={exportFormat}
                                onChange={(e) => setExportFormat(e.target.value)}
                                className="format-select"
                            >
                                <option value="png">PNG (Lossless)</option>
                                <option value="jpg">JPG (Smaller)</option>
                            </select>

                            <button
                                className="btn-primary"
                                onClick={handleExport}
                                disabled={isExporting || selectedPages.size === 0}
                            >
                                {isExporting ? 'Exporting...' : 'Export Images'}
                                <Download size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="thumbnails-grid">
                        <Document
                            file={file}
                            onLoadSuccess={onDocumentLoadSuccess}
                            loading={<div className="loading-spinner">Loading PDF...</div>}
                        >
                            {numPages && Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => (
                                <div
                                    key={pageNum}
                                    className={`thumbnail-wrapper ${selectedPages.has(pageNum) ? 'selected' : ''}`}
                                    onClick={() => togglePageSelection(pageNum)}
                                >
                                    <div className="thumbnail-overlay">
                                        {selectedPages.has(pageNum) ? <CheckSquare color="white" /> : <Square color="white" />}
                                    </div>
                                    <Page
                                        pageNumber={pageNum}
                                        width={200}
                                        renderTextLayer={false}
                                        renderAnnotationLayer={false}
                                    />
                                    <div className="page-number">Page {pageNum}</div>
                                </div>
                            ))}
                        </Document>
                    </div>
                </div>
            )}
        </div>
    );
}
