import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { X } from 'lucide-react';

const DraggableTextOverlay = ({
    id,
    text,
    x,
    y,
    fontSize,
    color,
    isEditing,
    zoom = 1,
    fixedWidth = false,
    maxWidth = 0,
    onUpdatePosition,
    onUpdateText,
    onUpdateSize,
    onToggleEdit,
    onRemove,
    onDragStart,
    onDragEnd
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [viewFontSize, setViewFontSize] = useState(fontSize);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const initialPosRef = useRef({ x, y });
    const textareaRef = useRef(null);
    const measureRef = useRef(null);

    // Calculate optimal font size for VIEW mode (shrink to fit)
    useLayoutEffect(() => {
        if (fixedWidth && maxWidth > 0 && measureRef.current) {
            const el = measureRef.current;
            // Start with base size
            let currentSize = fontSize;
            el.style.fontSize = `${currentSize}px`;

            // Loop to shrink until it fits
            // Note: We use a clamp (min 6px) to prevent disappearance
            while (el.scrollWidth > maxWidth && currentSize > 6) {
                currentSize -= 1;
                el.style.fontSize = `${currentSize}px`;
            }
            setViewFontSize(currentSize);
        } else {
            setViewFontSize(fontSize);
        }
    }, [text, fixedWidth, maxWidth, fontSize, zoom]);

    // 1. Auto-focus and SELECT all text when editing starts
    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.select();
        }
    }, [isEditing]);

    // 2. Auto-expand Width during Edit (so user can read what they type)
    useEffect(() => {
        if (isEditing && textareaRef.current && fixedWidth) {
            textareaRef.current.style.width = 'auto'; // Reset to measure
            textareaRef.current.style.width = `${Math.max(maxWidth, textareaRef.current.scrollWidth)}px`;
        }
    }, [isEditing, text, fixedWidth, maxWidth]);

    // Handle Dragging
    const handlePointerDown = (e) => {
        // Prevent Drag if FixedWidth (Single Word Editing Lock)
        if (fixedWidth && !e.ctrlKey) return;

        if (isEditing) return; // Don't drag while editing

        e.stopPropagation();
        e.preventDefault();
        setIsDragging(true);
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        initialPosRef.current = { x, y };
        e.target.setPointerCapture(e.pointerId);

        // Notify parent to lock scroll
        if (onDragStart) onDragStart();
    };

    const handlePointerMove = (e) => {
        if (!isDragging) return;
        e.stopPropagation();
        e.preventDefault();

        // Account for zoom when calculating delta
        const dx = (e.clientX - dragStartRef.current.x) / zoom;
        const dy = (e.clientY - dragStartRef.current.y) / zoom;

        onUpdatePosition(id, initialPosRef.current.x + dx, initialPosRef.current.y + dy);
    };

    const handlePointerUp = (e) => {
        if (isDragging) {
            e.stopPropagation();
            setIsDragging(false);
            e.target.releasePointerCapture(e.pointerId);

            // Notify parent to unlock scroll
            if (onDragEnd) onDragEnd();
        }
    };

    const handleDoubleClick = (e) => {
        e.stopPropagation();
        onToggleEdit(id, true);
    };

    const handleBlur = () => {
        onToggleEdit(id, false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { // Shift+Enter for newline, Enter to save
            e.preventDefault();
            handleBlur();
        }
    };

    // Handle Resize (Font Scale)
    const handleResizePointerDown = (e) => {
        e.stopPropagation();
        e.preventDefault();

        const startY = e.clientY;
        const startSize = fontSize;

        // Notify parent to lock scroll
        if (onDragStart) onDragStart();

        const onPointerMove = (moveEvent) => {
            moveEvent.preventDefault();
            moveEvent.stopPropagation();

            // Account for zoom
            const deltaY = (moveEvent.clientY - startY) / zoom;
            const newSize = Math.max(8, startSize + (deltaY * 0.5));
            const cappedSize = Math.min(100, newSize);

            onUpdateSize(id, cappedSize);
        };

        const onPointerUp = () => {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);

            // Notify parent to unlock scroll
            if (onDragEnd) onDragEnd();
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    };

    const handleSize = Math.max(12, Math.min(24, fontSize * 1.2));

    return (
        <>
            {/* Hidden Measurement Span for Auto-Scale Calculation */}
            {fixedWidth && (
                <span
                    ref={measureRef}
                    style={{
                        position: 'absolute',
                        visibility: 'hidden',
                        height: 'auto',
                        width: 'auto',
                        whiteSpace: 'pre',
                        fontFamily: 'Helvetica, sans-serif', // Match PDF font approx
                        fontSize: `${fontSize}px`,
                        fontWeight: 'normal',
                    }}
                >
                    {text}
                </span>
            )}

            <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onDoubleClick={handleDoubleClick}
                style={{
                    position: 'absolute',
                    left: x,
                    top: y,
                    cursor: isEditing ? 'text' : (isDragging ? 'grabbing' : 'grab'),
                    userSelect: 'none',
                    zIndex: isEditing ? 50 : 20, // Raise zIndex when editing
                    minWidth: '20px',
                    touchAction: 'none'
                }}
            >
                {isEditing ? (
                    <textarea
                        ref={textareaRef}
                        value={text}
                        onChange={(e) => onUpdateText(id, e.target.value)}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        rows={1}
                        style={{
                            fontSize: `${fontSize}px`, // Always use FULL size when editing
                            color: `rgb(${color.r},${color.g},${color.b})`,
                            background: 'rgba(255, 255, 255, 0.95)',
                            border: '1px solid #3b82f6',
                            borderRadius: '4px',
                            padding: '4px', // Keep padding for readability
                            outline: 'none',
                            resize: 'none',
                            whiteSpace: 'pre', // No wrap for single word
                            overflow: 'hidden',
                            minWidth: fixedWidth ? `${maxWidth}px` : '150px',
                            minHeight: '1.2em',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <div
                        style={{
                            fontSize: `${viewFontSize}px`, // Use Scaled Size
                            color: `rgb(${color.r},${color.g},${color.b})`,
                            background: 'rgba(255, 255, 255, 0.3)',
                            border: '1px dashed transparent',
                            whiteSpace: 'pre',
                            padding: fixedWidth ? '0px' : '5px', // Reduce padding in View mode for tight fit
                            // Note: We don't apply padding in fixedWidth view mode to align perfectly with original text
                            position: 'relative'
                        }}
                        className="text-display"
                    >
                        {text}

                        {/* Delete button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemove(id);
                            }}
                            style={{
                                position: 'absolute',
                                top: -handleSize / 2,
                                right: -handleSize / 2,
                                background: 'red',
                                color: 'white',
                                borderRadius: '50%',
                                width: `${handleSize}px`,
                                height: `${handleSize}px`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: `${Math.max(8, handleSize / 2)}px`,
                                zIndex: 21,
                                padding: 0
                            }}
                            className="delete-btn"
                        >
                            <X size={handleSize * 0.6} />
                        </button>

                        {/* Resize Handle */}
                        {!fixedWidth && (
                            <div
                                onPointerDown={handleResizePointerDown}
                                style={{
                                    position: 'absolute',
                                    bottom: -handleSize / 2,
                                    right: -handleSize / 2,
                                    width: `${handleSize}px`,
                                    height: `${handleSize}px`,
                                    background: 'white',
                                    border: '1px solid #3b82f6',
                                    borderRadius: '50%',
                                    cursor: 'se-resize',
                                    zIndex: 21,
                                    touchAction: 'none'
                                }}
                            />
                        )}
                    </div>
                )}
            </div>
        </>
    );
};

export default DraggableTextOverlay;
