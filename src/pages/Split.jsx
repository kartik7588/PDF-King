import React, { useState } from 'react';
import { Scissors, Download, FileText } from 'lucide-react';
import Dropzone from '../components/Dropzone';
import { splitPDF } from '../utils/pdfActions';
import { PDFDocument } from 'pdf-lib';
// Note: importing PDFDocument here just to get page count if needed, or we can move that to utils.
// Actually, let's put "getPageCount" in utils to keep it clean, but for speed I'll do it here inline or import pdf-lib.
// I'll import just the specific helper if possible or load the doc.

export default function Split() {
    const [file, setFile] = useState(null);
    const [pageCount, setPageCount] = useState(0);
    const [range, setRange] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [downloadUrl, setDownloadUrl] = useState(null);

    const handleFileDropped = async (files) => {
        if (files.length > 0) {
            const selectedFile = files[0];
            setFile(selectedFile);
            setDownloadUrl(null);

            // Get page count
            const buffer = await selectedFile.arrayBuffer();
            const doc = await PDFDocument.load(buffer);
            setPageCount(doc.getPageCount());
            setRange(`1-${doc.getPageCount()}`);
        }
    };

    const parseRange = (rangeStr, totalPages) => {
        // Basic parser for "1, 3-5, 8"
        const pages = new Set();
        const parts = rangeStr.split(',');

        parts.forEach(part => {
            const trimmed = part.trim();
            if (trimmed.includes('-')) {
                const [start, end] = trimmed.split('-').map(Number);
                if (!isNaN(start) && !isNaN(end)) {
                    for (let i = start; i <= end; i++) {
                        if (i >= 1 && i <= totalPages) pages.add(i - 1); // 0-indexed
                    }
                }
            } else {
                const num = Number(trimmed);
                if (!isNaN(num) && num >= 1 && num <= totalPages) {
                    pages.add(num - 1);
                }
            }
        });

        return Array.from(pages).sort((a, b) => a - b);
    };

    const handleSplit = async () => {
        if (!file) return;

        setIsProcessing(true);
        try {
            const pageIndices = parseRange(range, pageCount);
            if (pageIndices.length === 0) {
                alert("Invalid page range.");
                setIsProcessing(false);
                return;
            }

            const splitBytes = await splitPDF(file, pageIndices);
            const blob = new Blob([splitBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
        } catch (error) {
            alert(error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="merge-container"> {/* Reusing merge-container logic for width */}
            <div className="merge-header">
                <h2>Split PDF</h2>
                <p>Extract specific pages or ranges from your document.</p>
            </div>

            <div className="merge-workspace">
                {!file ? (
                    <Dropzone onFilesDropped={handleFileDropped} multiple={false} />
                ) : (
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                        <div className="file-item" style={{ marginBottom: '2rem' }}>
                            <div className="file-info">
                                <FileText size={24} className="text-secondary" />
                                <div>
                                    <span className="file-name">{file.name}</span>
                                    <span className="file-size">{pageCount} Pages</span>
                                </div>
                            </div>
                            <button className="control-btn" onClick={() => setFile(null)}>CHANGE</button>
                        </div>

                        <div className="split-controls" style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#cbd5e1' }}>
                                Pages to Extract (e.g. 1-5, 8, 11-13)
                            </label>
                            <input
                                type="text"
                                value={range}
                                onChange={(e) => setRange(e.target.value)}
                                className="input-field"
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    borderRadius: '0.5rem',
                                    background: 'rgba(0,0,0,0.2)',
                                    border: '1px solid var(--color-border)',
                                    color: 'white',
                                    fontSize: '1rem'
                                }}
                            />
                        </div>

                        <div className="merge-actions">
                            {downloadUrl ? (
                                <a
                                    href={downloadUrl}
                                    download={`split-${file.name}`}
                                    className="btn-primary download-btn"
                                >
                                    <Download size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                                    Download Extracted PDF
                                </a>
                            ) : (
                                <button
                                    className="btn-primary merge-btn"
                                    onClick={handleSplit}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? 'Processing...' : 'Split PDF'}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
