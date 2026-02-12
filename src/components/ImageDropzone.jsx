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
            className={clsx("dropzone", "image-dropzone", { dragging: isDragging })}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
            }}
            style={{
                // Inline styles for basic structure responsiveness, though CSS is preferred
                // Putting some basic overrides here to ensure it works immediately
                padding: '10px',
                minHeight: 'auto'
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

            <div className="dropzone-content" style={{ flexDirection: 'row', gap: '10px', padding: '5px' }}>
                <div className="icon-circle" style={{ width: '30px', height: '30px', minWidth: '30px' }}>
                    <ImagePlus size={16} className="upload-icon" />
                </div>
                <h3 style={{ fontSize: '14px', margin: 0, textAlign: 'left' }}>
                    <span className="desktop-text">Drop images here or click</span>
                    <span className="mobile-text">Add Images</span>
                </h3>
            </div>

            <style jsx>{`
                .mobile-text { display: none; }
                @media (max-width: 768px) {
                    .desktop-text { display: none; }
                    .mobile-text { display: inline; }
                    .image-dropzone { 
                        border-style: dashed !important; 
                        border-width: 2px !important; 
                        border-color: var(--color-border) !important;
                        background: var(--color-bg-secondary) !important;
                        color: var(--color-text-primary) !important;
                    }
                }
            `}</style>
        </div>
    );
}
