import React, { useState } from 'react';
import { Document, Page } from 'react-pdf';
import { RotateCw, Download, FileText, Loader2, RotateCcw } from 'lucide-react';
import Dropzone from '../components/Dropzone';
import { rotatePDF } from '../utils/pdfActions';
import './Rotate.css';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

export default function Rotate() {
    const [file, setFile] = useState(null);
    const [numPages, setNumPages] = useState(null);
    const [rotations, setRotations] = useState({}); // { pageIndex: 90 }
    const [isProcessing, setIsProcessing] = useState(false);
    const [downloadUrl, setDownloadUrl] = useState(null);

    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
    };

    const handleFileDropped = (files) => {
        if (files.length > 0) {
            setFile(files[0]);
            setRotations({});
            setDownloadUrl(null);
        }
    };

    const rotatePage = (index, direction) => {
        setRotations(prev => {
            const current = prev[index] || 0;
            const change = direction === 'cw' ? 90 : -90;
            return { ...prev, [index]: (current + change) % 360 };
        });
    };

    const rotateAll = (direction) => {
        if (!numPages) return;
        setRotations(prev => {
            const newRotations = { ...prev };
            const change = direction === 'cw' ? 90 : -90;
            for (let i = 0; i < numPages; i++) {
                newRotations[i] = ((newRotations[i] || 0) + change) % 360;
            }
            return newRotations;
        });
    };

    const handleApply = async () => {
        if (!file) return;
        setIsProcessing(true);
        try {
            const rotatedBytes = await rotatePDF(file, rotations);
            const blob = new Blob([rotatedBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
        } catch (error) {
            alert("Failed to rotate PDF");
            console.error(error);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="rotate-container">
            <div className="merge-header">
                <h2>Rotate PDF</h2>
                <p>Rotate individual pages or the entire document.</p>
            </div>

            {!file ? (
                <Dropzone onFilesDropped={handleFileDropped} multiple={false} />
            ) : (
                <div className="rotate-workspace glass-panel">
                    <div className="rotate-toolbar">
                        <button className="tool-btn" onClick={() => setFile(null)}>New File</button>
                        <div className="batch-actions">
                            <button className="tool-btn" onClick={() => rotateAll('cw')}>Rotate All CW <RotateCw size={16} /></button>
                            <button className="tool-btn" onClick={() => rotateAll('ccw')}>Rotate All CCW <RotateCcw size={16} /></button>
                        </div>
                        {downloadUrl ? (
                            <a href={downloadUrl} download={`rotated-${file.name}`} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '0.5rem 1rem' }}>
                                <Download size={16} /> Download
                            </a>
                        ) : (
                            <button className="btn-primary" onClick={handleApply} disabled={isProcessing}>
                                {isProcessing ? <Loader2 className="animate-spin" /> : 'Apply Rotation'}
                            </button>
                        )}
                    </div>

                    <div className="pdf-grid">
                        <Document
                            file={file}
                            onLoadSuccess={onDocumentLoadSuccess}
                            loading={<div className="loading-state">Loading PDF...</div>}
                            error={<div className="error-state">Failed to load PDF preview</div>}
                        >
                            {Array.from(new Array(numPages || 0), (el, index) => (
                                <div key={`page_${index}`} className="page-card">
                                    <div
                                        className="page-preview"
                                        style={{ transform: `rotate(${rotations[index] || 0}deg)` }}
                                    >
                                        <Page
                                            pageNumber={index + 1}
                                            width={180}
                                            renderTextLayer={false}
                                            renderAnnotationLayer={false}
                                        />
                                    </div>
                                    <div className="page-overlay">
                                        <button onClick={() => rotatePage(index, 'ccw')}><RotateCcw size={20} /></button>
                                        <span className="page-num">{index + 1}</span>
                                        <button onClick={() => rotatePage(index, 'cw')}><RotateCw size={20} /></button>
                                    </div>
                                </div>
                            ))}
                        </Document>
                    </div>
                </div>
            )}
        </div>
    );
}
