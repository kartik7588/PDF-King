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
        >
            <input
                type="file"
                ref={inputRef}
                onChange={handleFileInput}
                accept="image/*"
                multiple={multiple}
                style={{ display: 'none' }}
            />

            <div className="dropzone-content">
                <div className="icon-circle">
                    <ImagePlus size={18} className="upload-icon" />
                </div>
                <h3>Drop images</h3>
            </div>
        </div>
    );
}
