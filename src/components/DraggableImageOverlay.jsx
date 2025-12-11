import React, { useState, useEffect, useRef } from 'react';

const DraggableImageOverlay = ({
    id,
    src,
    x,
    y,
    width,
    height,
    isSelected,
    onSelect,
    onUpdatePosition,
    onUpdateSize,
    onRemove
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const initialPosRef = useRef({ x, y });

    // Handle Dragging
    const handlePointerDown = (e) => {
        e.stopPropagation();
        e.preventDefault();
        onSelect(id);
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

    // Handle Resize
    const handleResizePointerDown = (e) => {
        e.stopPropagation();
        e.preventDefault(); // Stop drag from starting

        const startX = e.clientX;
        const startY = e.clientY;
        const startW = width;
        const startH = height;

        const onPointerMove = (moveEvent) => {
            moveEvent.preventDefault();
            moveEvent.stopPropagation();
            const newW = Math.max(50, startW + (moveEvent.clientX - startX));
            const newH = Math.max(50, startH + (moveEvent.clientY - startY));
            onUpdateSize(id, newW, newH);
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
            style={{
                position: 'absolute',
                left: x,
                top: y,
                width: width,
                height: height,
                border: isSelected ? '2px solid #3b82f6' : '1px dashed transparent',
                cursor: isDragging ? 'grabbing' : 'grab',
                zIndex: 10,
                touchAction: 'none' // Critical for pointer events
            }}
        >
            <img
                src={src}
                alt="Overlay"
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    pointerEvents: 'none', // Allow events to pass to container
                    userSelect: 'none'
                }}
            />

            {isSelected && (
                <>
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
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '12px',
                            zIndex: 20
                        }}
                    >
                        ×
                    </button>

                    <div
                        onPointerDown={handleResizePointerDown}
                        style={{
                            position: 'absolute',
                            bottom: -5,
                            right: -5,
                            width: '15px',
                            height: '15px',
                            background: 'white',
                            border: '1px solid #3b82f6',
                            cursor: 'se-resize',
                            zIndex: 20
                        }}
                    />
                </>
            )}
        </div>
    );
};

export default DraggableImageOverlay;
