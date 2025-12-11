import React, { useState } from 'react';
import { Minimize2, Download, Settings, FileText, Loader2 } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { pdfjs } from 'react-pdf';
import Dropzone from '../components/Dropzone';
import './Compress.css';

export default function Compress() {
    const [file, setFile] = useState(null);
    const [quality, setQuality] = useState(0.6); // 0.1 to 1.0
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [downloadUrl, setDownloadUrl] = useState(null);
    const [compressedSize, setCompressedSize] = useState(null);

    const handleFileDropped = (files) => {
        setFile(files[0]);
        setDownloadUrl(null);
        setCompressedSize(null);
        setProgress(0);
    };

    const compressPDF = async () => {
        if (!file) return;
        setIsProcessing(true);
        setProgress(0);

        try {
            // 1. Load the PDF using PDF.js to render pages
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjs.getDocument(arrayBuffer).promise;
            const numPages = pdf.numPages;

            // 2. Create a new PDF with pdf-lib
            const newPdf = await PDFDocument.create();

            // 3. Loop through pages
            for (let i = 1; i <= numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 1.5 }); // Scale 1.5 for decent balance of quality/size

                // Create canvas
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                // Render to canvas
                await page.render({ canvasContext: context, viewport: viewport }).promise;

                // Compress to JPEG Blob
                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
                const imageBytes = await blob.arrayBuffer();

                // Embed in new PDF
                const embeddedImage = await newPdf.embedJpg(imageBytes);
                const newPage = newPdf.addPage([viewport.width, viewport.height]);
                newPage.drawImage(embeddedImage, {
                    x: 0,
                    y: 0,
                    width: viewport.width,
                    height: viewport.height,
                });

                setProgress(Math.round((i / numPages) * 100));
            }

            const savedBytes = await newPdf.save();
            const savedBlob = new Blob([savedBytes], { type: 'application/pdf' });

            setDownloadUrl(URL.createObjectURL(savedBlob));
            setCompressedSize((savedBytes.byteLength / 1024 / 1024).toFixed(2));

        } catch (error) {
            console.error(error);
            alert("Compression failed: " + error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="compress-container">
            <div className="merge-header">
                <h2>Compress PDF</h2>
                <p>Reduce file size by optimizing pages (Rasterization method).</p>
            </div>

            {!file ? (
                <Dropzone onFilesDropped={handleFileDropped} multiple={false} />
            ) : (
                <div className="glass-panel" style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
                    <div className="file-info-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                        <FileText size={32} className="text-primary" />
                        <div>
                            <h3 style={{ margin: 0 }}>{file.name}</h3>
                            <p style={{ margin: 0, color: '#94a3b8' }}>Original: {(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                    </div>

                    <div className="settings-section">
                        <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span>Compression Level (Quality)</span>
                            <span>{Math.round(quality * 100)}%</span>
                        </label>
                        <input
                            type="range"
                            min="0.1"
                            max="0.9"
                            step="0.1"
                            value={quality}
                            onChange={(e) => setQuality(parseFloat(e.target.value))}
                            style={{ width: '100%', marginBottom: '0.5rem' }}
                        />
                        <div style={{ textAlign: 'center', margin: '0.5rem 0' }}>
                            <span className="fade-in-text" style={{
                                color: '#9ba3b1',
                                fontSize: '14px',
                                transition: 'all 0.3s ease'
                            }}>
                                Estimated Size: {((file.size / 1024 / 1024) * quality).toFixed(2)} MB
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
                            <span>Low Size (Low Quality)</span>
                            <span>High Quality (Big Size)</span>
                        </div>
                    </div>

                    <div className="action-area" style={{ marginTop: '2rem' }}>
                        {downloadUrl ? (
                            <div className="success-state">
                                <div className="stat-box" style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                    <p style={{ color: '#10b981', fontWeight: 'bold' }}>Success!</p>
                                    <p>New Size: {compressedSize} MB</p>
                                    <p style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                                        Reduced by {((1 - (compressedSize / (file.size / 1024 / 1024))) * 100).toFixed(0)}%
                                    </p>
                                </div>
                                <a href={downloadUrl} download={`compressed-${file.name}`} className="btn-primary" style={{ display: 'block', textAlign: 'center' }}>
                                    <Download size={18} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                                    Download Compressed PDF
                                </a>
                                <button onClick={() => setFile(null)} className="btn-secondary" style={{ marginTop: '1rem', width: '100%' }}>Compress Another</button>
                            </div>
                        ) : (
                            <button
                                className="btn-primary"
                                onClick={compressPDF}
                                disabled={isProcessing}
                                style={{ width: '100%' }}
                            >
                                {isProcessing ? (
                                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                        <Loader2 className="animate-spin" /> Processing Page {progress}%
                                    </span>
                                ) : 'Compress PDF'}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
