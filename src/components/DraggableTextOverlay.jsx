import React, { useState, useRef, useEffect } from 'react';
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
    onUpdatePosition,
    onUpdateText,
    onUpdateSize,
    onToggleEdit,
    onRemove,
    onDragStart,
    onDragEnd
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const initialPosRef = useRef({ x, y });
    const textareaRef = useRef(null);

    // Auto-focus textarea when editing starts
    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.select(); // Optional: select all text on edit
        }
    }, [isEditing]);

    // Handle Dragging
    const handlePointerDown = (e) => {
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

            // Account for zoom: Dragging down increases size, up decreases.
            // Sensitivity: 1px drag = 0.5px font size change, adjusted for zoom
            const deltaY = (moveEvent.clientY - startY) / zoom;
            const newSize = Math.max(8, startSize + (deltaY * 0.5)); // Min 8px

            // Cap max size if needed, e.g. 100
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

    // Calculate handle size based on fontSize to satisfy "Scale proportionally" requirement
    // Clamp between 16px (minimum touchable) and 24px (max standard)
    // Or allow it to shrink further if text is tiny, but keep a larger invisible hit area?
    // Requirement says: "When text size decreases, control handles must also decrease."
    const handleSize = Math.max(12, Math.min(24, fontSize * 1.2));

    // Hit area should remain decent (e.g. at least 24px) via padding/margins if visible size is small,
    // but for now we follow the visible scaling requested.

    return (
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
                zIndex: 20,
                minWidth: '20px',
                touchAction: 'none' // Critical: Disable browser gestures on this element
            }}
        >
            {isEditing ? (
                <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => onUpdateText(id, e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    style={{
                        fontSize: `${fontSize}px`,
                        color: `rgb(${color.r},${color.g},${color.b})`,
                        background: 'rgba(255, 255, 255, 0.9)',
                        border: '1px solid #3b82f6',
                        borderRadius: '4px',
                        padding: '4px',
                        outline: 'none',
                        resize: 'none',
                        whiteSpace: 'pre-wrap',
                        overflow: 'hidden',
                        minWidth: '150px',
                        minHeight: '1.2em'
                    }}
                    onClick={(e) => e.stopPropagation()} // Allow clicking inside without triggering drag
                />
            ) : (
                <div
                    style={{
                        fontSize: `${fontSize}px`,
                        color: `rgb(${color.r},${color.g},${color.b})`,
                        background: 'rgba(255, 255, 255, 0.3)', // Slight background to indicate interactable
                        border: '1px dashed transparent', // Placeholder for hover effect
                        whiteSpace: 'pre-wrap',
                        padding: '5px', // Match padding of textarea roughly
                        position: 'relative' // relative for absolute children
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
                </div>
            )}
        </div>
    );
};

export default DraggableTextOverlay;
