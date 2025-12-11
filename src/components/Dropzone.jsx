import React, { useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import clsx from 'clsx';
import './Dropzone.css';

export default function Dropzone({ onFilesDropped, accept = "application/pdf", multiple = true }) {
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
            file.type === accept || accept === "*"
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
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
        >
            <input
                type="file"
                ref={inputRef}
                onChange={handleFileInput}
                accept={accept}
                multiple={multiple}
                style={{ display: 'none' }}
            />

            <div className="dropzone-content">
                <div className="icon-circle">
                    <UploadCloud size={40} className="upload-icon" />
                </div>
                <h3>Drop your PDF files here</h3>
                <p>or click to select files</p>
            </div>

            <div className="dropzone-bg-anim"></div>
        </div>
    );
}
