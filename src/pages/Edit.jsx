import React, { useState, useRef, useEffect } from 'react';
import { Document, Page } from 'react-pdf';

import { Type, Save, ChevronLeft, ChevronRight, Download, Plus, X } from 'lucide-react';
import Dropzone from '../components/Dropzone';
import { addTextToPDF, saveAnnotationsToPDF } from '../utils/pdfActions';
import './Edit.css';

// Separate component to handle Ref for Draggable (Fixes React 18 StrictMode crash)
import DraggableTextOverlay from '../components/DraggableTextOverlay';

export default function Edit() {
    const [file, setFile] = useState(null);
    const [numPages, setNumPages] = useState(null);
    const [currPage, setCurrPage] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [downloadUrl, setDownloadUrl] = useState(null);

    // Array of { id, text, x, y, size, color, isEditing, page }
    const [texts, setTexts] = useState([]);

    const containerRef = useRef(null);

    const handleFileDropped = (files) => {
        setFile(files[0]);
        setDownloadUrl(null);
        setTexts([]);
    };

    const addText = () => {
        const newText = {
            id: Date.now(),
            text: "Double click to edit",
            x: 50,
            y: 50,
            size: 16,
            color: { r: 0, g: 0, b: 0 },
            isEditing: true, // Start in edit mode
            page: currPage - 1 // Store 0-indexed page
        };
        setTexts([...texts, newText]);
    };

    const updateTextPos = (id, x, y) => {
        setTexts(prev => prev.map(t => t.id === id ? { ...t, x, y } : t));
    };

    const updateTextContent = (id, newContent) => {
        setTexts(prev => prev.map(t => t.id === id ? { ...t, text: newContent } : t));
    };

    const toggleTextEdit = (id, isEditing) => {
        setTexts(prev => prev.map(t => t.id === id ? { ...t, isEditing: isEditing } : t));
    };

    const updateTextSize = (id, newSize) => {
        setTexts(prev => prev.map(t => t.id === id ? { ...t, size: newSize } : t));
    };

    const removeText = (id) => {
        setTexts(prev => prev.filter(t => t.id !== id));
    };

    const handleSave = async () => {
        if (!file || !containerRef.current) return;
        // Even if texts.length is 0, we might want to just save the PDF? 
        // User said: "If there are no annotations, just download the original PDF unchanged."

        setIsProcessing(true);
        try {
            const renderedWidth = containerRef.current.clientWidth;

            let pdfBytes;
            if (texts.length === 0) {
                pdfBytes = await file.arrayBuffer();
            } else {
                pdfBytes = await saveAnnotationsToPDF(file, texts, renderedWidth);
            }

            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);

        } catch (error) {
            alert("Failed to save PDF: " + error.message);
            console.error(error);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="edit-container">
            <div className="merge-header">
                <h2>Edit PDF</h2>
                <p>Add text annotations to your document.</p>
            </div>

            {!file ? (
                <Dropzone onFilesDropped={handleFileDropped} multiple={false} />
            ) : (
                <div className="work-area glass-panel">
                    <div className="toolbar">
                        <div className="page-controls">
                            <button disabled={currPage <= 1} onClick={() => setCurrPage(p => p - 1)}><ChevronLeft /></button>
                            <span>Page {currPage} of {numPages || '--'}</span>
                            <button disabled={currPage >= numPages} onClick={() => setCurrPage(p => p + 1)}><ChevronRight /></button>
                        </div>

                        <div className="tool-controls">
                            <button className="btn-secondary" onClick={addText} style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                <Plus size={16} /> Add Text
                            </button>
                        </div>

                        <div className="action-controls">
                            {downloadUrl ? (
                                <a href={downloadUrl} download="edited-text.pdf" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Download size={16} /> Download
                                </a>
                            ) : (
                                <button className="btn-primary" onClick={handleSave} disabled={isProcessing}>
                                    {isProcessing ? 'Saving...' : 'Save PDF'}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="canvas-wrapper">
                        <div className="page-container" ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
                            <Document
                                file={file}
                                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                                loading="Loading PDF..."
                            >
                                <Page
                                    pageNumber={currPage}
                                    width={600}
                                    renderTextLayer={false}
                                    renderAnnotationLayer={false}
                                />
                            </Document>

                            {texts.filter(t => t.page === (currPage - 1)).map((textItem) => (
                                <DraggableTextOverlay
                                    key={textItem.id}
                                    id={textItem.id}
                                    text={textItem.text}
                                    x={textItem.x}
                                    y={textItem.y}
                                    fontSize={textItem.size}
                                    color={textItem.color}
                                    isEditing={textItem.isEditing}
                                    onUpdatePosition={updateTextPos}
                                    onUpdateText={updateTextContent}
                                    onUpdateSize={updateTextSize}
                                    onToggleEdit={toggleTextEdit}
                                    onRemove={removeText}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
