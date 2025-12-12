import React, { useState, useRef, useEffect } from 'react';
import { Document, Page } from 'react-pdf';

import { Type, Save, ChevronLeft, ChevronRight, Download, Plus, X } from 'lucide-react';
import Dropzone from '../components/Dropzone';
import { addTextToPDF, saveAnnotationsToPDF } from '../utils/pdfActions';
import { saveEditorChanges } from '../utils/editorUtils';
import { trackDownload } from '../utils/analytics';
import { saveDownloadRecord } from '../utils/downloadManager';
import './Edit.css';

// Separate component to handle Ref for Draggable (Fixes React 18 StrictMode crash)
import DraggableTextOverlay from '../components/DraggableTextOverlay';

export default function Edit() {
    const [file, setFile] = useState(null);
    const [numPages, setNumPages] = useState(null);
    const [currPage, setCurrPage] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [downloadUrl, setDownloadUrl] = useState(null);
    const [editedBlob, setEditedBlob] = useState(null);
    const [scale, setScale] = useState(1); // Track scale

    // Undo History System
    const [history, setHistory] = useState([]); // Array of Blobs/Files

    // Array of { id, text, x, y, size, color, isEditing, page, width, height }
    const [texts, setTexts] = useState([]);

    const containerRef = useRef(null);

    const handleFileDropped = (files) => {
        const selected = files[0];
        if (selected.size > 150 * 1024 * 1024) {
            alert("File too large. Please use files under 150MB.");
            return;
        }
        setFile(selected);
        setDownloadUrl(null);
        setTexts([]);
        setHistory([]); // Reset history on new file load
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

    const handleDoubleClick = (e) => {
        // Check if we clicked on a text span
        const target = e.target;
        if (target.tagName !== 'SPAN' || !target.textContent) return;

        // This relies on react-pdf rendering spans in the text layer
        // We need to calculate position relative to our container
        const containerRect = containerRef.current.getBoundingClientRect();
        const spanRect = target.getBoundingClientRect();

        const relativeX = spanRect.left - containerRect.left;
        const relativeY = spanRect.top - containerRect.top;

        // Create new replacement annotation
        const newText = {
            id: Date.now(),
            text: target.textContent,
            originalText: target.textContent,
            x: relativeX,
            y: relativeY,
            width: spanRect.width,
            height: spanRect.height,
            cover: { // Permanent cover position
                x: relativeX,
                y: relativeY,
                width: spanRect.width,
                height: spanRect.height
            },
            size: parseFloat(window.getComputedStyle(target).fontSize),
            color: { r: 0, g: 0, b: 0 },
            isEditing: true,
            page: currPage - 1,
            isReplacement: true
        };

        try {
            // Hide the original span visually immediately to avoid double-text effect while editing
            // The white box rendered by React handles the persistence.
        } catch (e) { console.warn(e); }

        setTexts([...texts, newText]);
    };

    // Undo Logic
    const handleUndo = () => {
        if (history.length === 0) return;
        const previousFile = history[history.length - 1];
        setFile(previousFile);
        setTexts([]);
        setHistory(prev => prev.slice(0, -1));
        setDownloadUrl(null);
    };

    // Save Logic (Session Persistence)
    const handleSave = async () => {
        if (!file || !containerRef.current) return;
        setIsProcessing(true);
        try {
            let pdfBytes;
            if (texts.length === 0) {
                if (file instanceof Blob || file instanceof File) {
                    pdfBytes = await file.arrayBuffer();
                } else {
                    // Should act on bytes if we have them, but we store File object in state
                    pdfBytes = await file.arrayBuffer();
                }
            } else {
                const currentScale = scale || 1;
                const pdfBytesUint8 = await saveEditorChanges(file, texts, currentScale);
                pdfBytes = pdfBytesUint8.buffer;
            }

            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            // 1. Push current state to History (before change)
            setHistory(prev => [...prev, file]);

            // 2. Update File State to new PDF (Baked changes)
            const newFile = new File([blob], file.name, { type: 'application/pdf' });
            setFile(newFile);

            // 3. Clear Annotations (They are baked now)
            setTexts([]);

            // 4. Update Download Link
            setEditedBlob(blob);
            setDownloadUrl(url);

            // 5. Auto-download after save (as per user requirement)
            const fileName = file.name || 'edited-text.pdf';
            const sizeStr = (blob.size / 1024 / 1024).toFixed(2) + ' MB';

            // Track analytics
            trackDownload('Edit', {
                annotationsCount: texts.length,
                size: sizeStr
            });

            // Save to download history
            await saveDownloadRecord(fileName, sizeStr, blob, 'Edit');

            // Trigger download
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

        } catch (error) {
            alert("Failed to save PDF: " + error.message);
            console.error(error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownload = async () => {
        if (!editedBlob) return;
        const fileName = 'edited-text.pdf';
        const sizeStr = (editedBlob.size / 1024 / 1024).toFixed(2) + ' MB';

        trackDownload('Edit', {
            annotationsCount: texts.length,
            size: sizeStr
        });

        await saveDownloadRecord(fileName, sizeStr, editedBlob, 'Edit');

        // Trigger download
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    // Keyboard shortcut: Ctrl/Cmd + S to Save
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (file && !isProcessing) {
                    handleSave();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [file, isProcessing, handleSave]);

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
                            {history.length > 0 && (
                                <button className="btn-secondary" onClick={handleUndo} style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                    <span>↩</span> Undo Save
                                </button>
                            )}
                        </div>

                        <div className="action-controls">
                            {/* Always show Save button when file is loaded */}
                            <button
                                className="btn-primary"
                                onClick={handleSave}
                                disabled={!file || isProcessing}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}
                            >
                                <Save size={16} />
                                {isProcessing ? 'Saving...' : 'Save & Download'}
                                {texts.length > 0 && !isProcessing && (
                                    <span style={{
                                        fontSize: '10px',
                                        background: '#ef4444',
                                        color: 'white',
                                        padding: '2px 6px',
                                        borderRadius: '10px',
                                        marginLeft: '4px'
                                    }}>
                                        {texts.length}
                                    </span>
                                )}
                            </button>

                            {/* Optional: Separate Download button (only after save) */}
                            {downloadUrl && !isProcessing && (
                                <button
                                    onClick={handleDownload}
                                    className="btn-secondary"
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                >
                                    <Download size={16} /> Download Again
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="canvas-wrapper">
                        <div
                            className="page-container"
                            ref={containerRef}
                            style={{ position: 'relative', display: 'inline-block' }}
                            onDoubleClick={handleDoubleClick}
                        >
                            <Document
                                file={file}
                                onLoadSuccess={({ numPages, width, originalWidth }) => {
                                    setNumPages(numPages);
                                    if (width && originalWidth) {
                                        setScale(width / originalWidth);
                                    }
                                }}
                                loading="Loading PDF..."
                            >
                                <Page
                                    pageNumber={currPage}
                                    width={600}
                                    renderTextLayer={true}
                                    renderAnnotationLayer={false}
                                />
                            </Document>

                            {texts.filter(t => t.page === (currPage - 1)).map((textItem) => (
                                <React.Fragment key={textItem.id}>
                                    {/* 1a. Static Cover at Original Position (Hides Original Text) */}
                                    {textItem.isReplacement && textItem.cover && (
                                        <div
                                            className="whiteout-cover-static"
                                            style={{
                                                position: 'absolute',
                                                left: textItem.cover.x,
                                                top: textItem.cover.y,
                                                width: textItem.cover.width,
                                                height: textItem.cover.height,
                                                backgroundColor: 'white',
                                                zIndex: 15,
                                                pointerEvents: 'none'
                                            }}
                                        />
                                    )}

                                    {/* 1b. Dynamic Cover (Moves with Overlay - prevents canvas showing through) */}
                                    {textItem.isReplacement && (
                                        <div
                                            className="whiteout-cover-dynamic"
                                            style={{
                                                position: 'absolute',
                                                left: textItem.x,
                                                top: textItem.y,
                                                width: textItem.width || textItem.cover?.width || 100,
                                                height: textItem.height || textItem.cover?.height || 20,
                                                backgroundColor: 'white',
                                                zIndex: 15,
                                                pointerEvents: 'none'
                                            }}
                                        />
                                    )}

                                    {/* 2. Editable Overlay */}
                                    <DraggableTextOverlay
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
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
