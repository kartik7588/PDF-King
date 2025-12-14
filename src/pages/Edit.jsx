import React, { useState, useRef, useEffect } from 'react';
import { Document, Page } from 'react-pdf';

import { Type, Save, ChevronLeft, ChevronRight, Download, Plus, X, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import Dropzone from '../components/Dropzone';
import { addTextToPDF, saveAnnotationsToPDF } from '../utils/pdfActions';
import { saveEditorChanges } from '../utils/editorUtils';
import { trackDownload } from '../utils/analytics';
import { saveDownloadRecord } from '../utils/downloadManager';
import { getOptimalPDFWidth, isMobileDevice, startScrollLock, endScrollLock } from '../utils/deviceUtils';
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

    // Zoom and Pan State
    const [zoom, setZoom] = useState(1);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [renderWidth, setRenderWidth] = useState(600); // Device-aware PDF width
    const [isDraggingOverlay, setIsDraggingOverlay] = useState(false); // Track if dragging annotation

    // Undo History System
    const [history, setHistory] = useState([]); // Array of Blobs/Files

    // Array of { id, text, x, y, size, color, isEditing, page, width, height }
    const [texts, setTexts] = useState([]);

    const containerRef = useRef(null);
    const canvasWrapperRef = useRef(null);

    // Touch gesture tracking
    const touchStartRef = useRef({ distance: 0, center: { x: 0, y: 0 }, zoom: 1, pan: { x: 0, y: 0 } });

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

        // Account for zoom when calculating position
        // Note: containerRect and spanRect are both subject to the same transform (pan/zoom) 
        // if they are inside the transformed container. 
        // But here containerRect is likely the wrapper? No, it's containerRef (page-container).
        // Since containerRef is INSIDE the zoom-container transformation, both rects are transformed.
        // Thus their difference is the SCALED difference. We only need to un-scale (divide by zoom).
        // Pan is implicitly handled because it applies to both.
        const relativeX = (spanRect.left - containerRect.left) / zoom;
        const relativeY = (spanRect.top - containerRect.top) / zoom;
        const width = spanRect.width / zoom;
        const height = spanRect.height / zoom;

        // Create new replacement annotation
        const newText = {
            id: Date.now(),
            text: target.textContent,
            originalText: target.textContent,
            x: relativeX,
            y: relativeY,
            width: width,
            height: height,
            cover: { // Permanent cover position
                x: relativeX,
                y: relativeY,
                width: width,
                height: height
            },
            size: parseFloat(window.getComputedStyle(target).fontSize) / zoom,
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
            // 1. Generate Edited PDF Bytes
            if (texts.length === 0) {
                if (file instanceof Uint8Array || file instanceof ArrayBuffer) {
                    pdfBytes = file;
                } else {
                    pdfBytes = await file.arrayBuffer();
                }
            } else {
                const currentScale = scale || 1;
                // Note: We don't pass zoom to saveEditorChanges because coordinates are already in unzoomed space
                // We use the raw 'scale' (Render:Original ratio) to map back to PDF points
                const pdfBytesUint8 = await saveEditorChanges(file, texts, currentScale);
                pdfBytes = pdfBytesUint8.buffer;
            }

            // 2. Create Blob from Bytes
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });

            // 3. Update Download Link & State
            // Push current state to History (before change)
            setHistory(prev => [...prev, file]);

            // Update File State to new PDF (Baked changes) allows continuous editing
            const newFile = new File([blob], file.name || "edited.pdf", { type: 'application/pdf' });
            setFile(newFile);

            // Clear Annotations (They are burned in now)
            setTexts([]);

            // Create URL for download
            if (downloadUrl) URL.revokeObjectURL(downloadUrl);
            const url = URL.createObjectURL(blob);
            setEditedBlob(blob);
            setDownloadUrl(url);

            // 4. Trigger Download directly
            const fileName = (file.name || 'document').replace('.pdf', '') + '_edited.pdf';
            const sizeStr = (blob.size / 1024 / 1024).toFixed(2) + ' MB';

            trackDownload('Edit', {
                annotationsCount: texts.length,
                size: sizeStr
            });

            await saveDownloadRecord(fileName, sizeStr, blob, 'Edit');

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


    // Calculate optimal render width on mount and resize
    useEffect(() => {
        const updateRenderWidth = () => {
            if (canvasWrapperRef.current) {
                const containerWidth = canvasWrapperRef.current.clientWidth;
                // Pass true for aggressive width usage if needed, or rely on internal logic
                const optimalWidth = getOptimalPDFWidth(containerWidth);
                setRenderWidth(optimalWidth);
            } else {
                // Fallback
                setRenderWidth(isMobileDevice() ? window.innerWidth * 0.95 : 800);
            }
        };

        // Initial delay to let layout settle
        const timeout = setTimeout(updateRenderWidth, 100);

        window.addEventListener('resize', updateRenderWidth);
        return () => {
            window.removeEventListener('resize', updateRenderWidth);
            clearTimeout(timeout);
        };
    }, []);

    // Initial Zoom set to 1, but we might want "Fit Width" logic if the user desires
    // Current logic: Render width matches container, so Zoom 1 = Fit Width approximately.

    // Zoom Controls
    const handleZoomIn = () => {
        setZoom(prev => Math.min(prev + 0.25, 3)); // Max 3x zoom
    };

    const handleZoomOut = () => {
        setZoom(prev => Math.max(prev - 0.25, 0.5)); // Min 0.5x zoom
    };

    const handleFitToScreen = () => {
        setZoom(1);
        setPanOffset({ x: 0, y: 0 });
    };

    // Wheel zoom (Ctrl/Cmd + Wheel)
    useEffect(() => {
        const handleWheel = (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -0.1 : 0.1;
                setZoom(prev => Math.max(0.5, Math.min(3, prev + delta)));
            }
        };

        const wrapper = canvasWrapperRef.current;
        if (wrapper) {
            wrapper.addEventListener('wheel', handleWheel, { passive: false });
            return () => wrapper.removeEventListener('wheel', handleWheel);
        }
    }, []);

    // Touch gesture handlers for pinch-zoom and pan
    useEffect(() => {
        const wrapper = canvasWrapperRef.current;
        if (!wrapper) return;

        const getTouchDistance = (touch1, touch2) => {
            const dx = touch1.clientX - touch2.clientX;
            const dy = touch1.clientY - touch2.clientY;
            return Math.sqrt(dx * dx + dy * dy);
        };

        const getTouchCenter = (touch1, touch2) => {
            return {
                x: (touch1.clientX + touch2.clientX) / 2,
                y: (touch1.clientY + touch2.clientY) / 2
            };
        };

        const handleTouchStart = (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                startScrollLock(); // Lock body scroll during gesture
                const distance = getTouchDistance(e.touches[0], e.touches[1]);
                const center = getTouchCenter(e.touches[0], e.touches[1]);
                touchStartRef.current = {
                    distance,
                    center,
                    zoom,
                    pan: { ...panOffset }
                };
            }
        };

        // Throttle touch move for performance could be added here if needed
        const handleTouchMove = (e) => {
            if (e.touches.length === 2 && touchStartRef.current.distance > 0) {
                e.preventDefault();

                const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
                const currentCenter = getTouchCenter(e.touches[0], e.touches[1]);

                // Calculate zoom
                const zoomDelta = currentDistance / touchStartRef.current.distance;
                const newZoom = Math.max(0.5, Math.min(3, touchStartRef.current.zoom * zoomDelta));

                // Calculate pan
                // The pan logic here is simplified; robust implementations usually consider zoom focal point
                // For now, we stick to simple delta translation
                const panDeltaX = currentCenter.x - touchStartRef.current.center.x;
                const panDeltaY = currentCenter.y - touchStartRef.current.center.y;

                setZoom(newZoom);
                setPanOffset({
                    x: touchStartRef.current.pan.x + panDeltaX,
                    y: touchStartRef.current.pan.y + panDeltaY
                });
            }
        };

        const handleTouchEnd = (e) => {
            if (e.touches.length < 2) {
                endScrollLock(); // Unlock body scroll
                touchStartRef.current = { distance: 0, center: { x: 0, y: 0 }, zoom: 1, pan: { x: 0, y: 0 } };
            }
        };

        // Use { passive: false } to allow preventing default
        wrapper.addEventListener('touchstart', handleTouchStart, { passive: false });
        wrapper.addEventListener('touchmove', handleTouchMove, { passive: false });
        wrapper.addEventListener('touchend', handleTouchEnd);
        wrapper.addEventListener('touchcancel', handleTouchEnd);

        return () => {
            wrapper.removeEventListener('touchstart', handleTouchStart);
            wrapper.removeEventListener('touchmove', handleTouchMove);
            wrapper.removeEventListener('touchend', handleTouchEnd);
            wrapper.removeEventListener('touchcancel', handleTouchEnd);
            endScrollLock(); // Ensure lock is released on unmount
        };
    }, [zoom, panOffset]);

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
                            {/* Combined Save & Download Button */}
                            <button
                                className="btn-primary"
                                onClick={handleSave}
                                disabled={!file || isProcessing}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}
                            >
                                <Save size={16} />
                                {isProcessing ? 'Saving...' : 'Save & Download'}
                                {texts.length > 0 && !isProcessing && (
                                    <span className="badge-count">
                                        {texts.length}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="canvas-wrapper" ref={canvasWrapperRef} style={{
                        overflow: isMobileDevice() ? 'auto' : 'visible',
                        maxHeight: isMobileDevice() ? '70vh' : 'none',
                        WebkitOverflowScrolling: 'touch',
                        overscrollBehavior: isDraggingOverlay ? 'none' : 'auto'
                    }}>
                        <div
                            className="zoom-container"
                            style={{
                                transform: `scale(${zoom}) translate(${panOffset.x / zoom}px, ${panOffset.y / zoom}px)`,
                                transformOrigin: 'top left',
                                transition: 'transform 0.1s ease-out',
                                display: 'inline-block'
                            }}
                        >
                            <div
                                className="page-container"
                                ref={containerRef}
                                style={{ position: 'relative', display: 'inline-block' }}
                                onDoubleClick={handleDoubleClick}
                            >
                                <Document
                                    file={file}
                                    onLoadSuccess={({ numPages }) => {
                                        setNumPages(numPages);
                                    }}
                                    loading="Loading PDF..."
                                >
                                    <Page
                                        pageNumber={currPage}
                                        width={renderWidth}
                                        renderTextLayer={true}
                                        renderAnnotationLayer={false}
                                        onLoadSuccess={({ width, originalWidth }) => {
                                            if (width && originalWidth) {
                                                setScale(width / originalWidth);
                                            }
                                        }}
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
                                            zoom={zoom}
                                            onUpdatePosition={updateTextPos}
                                            onUpdateText={updateTextContent}
                                            onUpdateSize={updateTextSize}
                                            onToggleEdit={toggleTextEdit}
                                            onRemove={removeText}
                                            onDragStart={() => {
                                                setIsDraggingOverlay(true);
                                                startScrollLock();
                                            }}
                                            onDragEnd={() => {
                                                setIsDraggingOverlay(false);
                                                endScrollLock();
                                            }}
                                        />
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>

                        {/* Zoom Controls */}
                        <div className="zoom-controls">
                            <button
                                className="zoom-btn"
                                onClick={handleZoomOut}
                                disabled={zoom <= 0.5}
                                title="Zoom Out"
                            >
                                <ZoomOut size={18} />
                            </button>
                            <span className="zoom-level">{Math.round(zoom * 100)}%</span>
                            <button
                                className="zoom-btn"
                                onClick={handleZoomIn}
                                disabled={zoom >= 3}
                                title="Zoom In"
                            >
                                <ZoomIn size={18} />
                            </button>
                            <button
                                className="zoom-btn"
                                onClick={handleFitToScreen}
                                title="Fit to Screen"
                            >
                                <Maximize2 size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
