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
    onUpdatePosition,
    onUpdateText,
    onUpdateSize,
    onToggleEdit,
    onRemove
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
    };

    const handlePointerMove = (e) => {
        if (!isDragging) return;
        e.stopPropagation();
        e.preventDefault();

        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;

        onUpdatePosition(id, initialPosRef.current.x + dx, initialPosRef.current.y + dy);
    };

    const handlePointerUp = (e) => {
        if (isDragging) {
            e.stopPropagation();
            setIsDragging(false);
            e.target.releasePointerCapture(e.pointerId);
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

        const onPointerMove = (moveEvent) => {
            moveEvent.preventDefault();
            moveEvent.stopPropagation();

            // Simple logic: Dragging down increases size, up decreases.
            // Sensitivity: 1px drag = 0.5px font size change
            const deltaY = moveEvent.clientY - startY;
            const newSize = Math.max(8, startSize + (deltaY * 0.5)); // Min 8px

            // Cap max size if needed, e.g. 100
            const cappedSize = Math.min(100, newSize);

            onUpdateSize(id, cappedSize); // Assume parent passes onUpdateSize
        };

        const onPointerUp = () => {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    };

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

                    {/* Delete button only visual when hovering/interacting - simplistic approach */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove(id);
                        }}
                        style={{
                            position: 'absolute',
                            top: -10,
                            right: -10,
                            background: 'red',
                            color: 'white',
                            borderRadius: '50%',
                            width: '18px',
                            height: '18px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '10px',
                            zIndex: 21
                        }}
                        className="delete-btn"
                    >
                        <X size={10} />
                    </button>

                    {/* Resize Handle */}
                    <div
                        onPointerDown={handleResizePointerDown}
                        style={{
                            position: 'absolute',
                            bottom: -5,
                            right: -5,
                            width: '12px',
                            height: '12px',
                            background: 'white',
                            border: '1px solid #3b82f6',
                            borderRadius: '50%',
                            cursor: 'se-resize',
                            zIndex: 21
                        }}
                    />
                </div>
            )}
        </div>
    );
};

export default DraggableTextOverlay;
