import React, { useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import clsx from 'clsx';
import './Dropzone.css'; // Reusing existing dropzone styles where possible

export default function ImageDropzone({ onFilesDropped, multiple = false }) {
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files).filter(file =>
            file.type.startsWith('image/')
        );

        if (files.length > 0) {
            onFilesDropped(files);
        }
    };

    const handleFileInput = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            onFilesDropped(files);
        }
    };

    return (
        <div
            className={clsx("dropzone", { dragging: isDragging })}
            style={{
                minHeight: '120px',
                border: '2px dashed rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.05)'
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
            }}
        >
            <input
                type="file"
                ref={inputRef}
                onChange={handleFileInput}
                accept="image/*"
                multiple={multiple}
                style={{ display: 'none' }}
            />

            <div className="dropzone-content" style={{ gap: '0.5rem' }}>
                <div className="icon-circle" style={{ width: '40px', height: '40px' }}>
                    <ImagePlus size={20} className="upload-icon" />
                </div>
                <h3 style={{ fontSize: '0.9rem', margin: 0 }}>Drop images here</h3>
            </div>
        </div>
    );
}
