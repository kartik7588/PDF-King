import React, { useRef, useState } from 'react';
import { UploadCloud, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import './Dropzone.css';



export default function Dropzone({ onFilesDropped, accept = "application/pdf", multiple = true, text = "Drop your PDF files here" }) {
    const [isDragging, setIsDragging] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    const inputRef = useRef(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const validateAndPassFiles = (fileList) => {
        const validFiles = [];
        let hasInvalidFiles = false;

        fileList.forEach(file => {
            let isValid = false;

            // Check if file matches accepted type
            if (accept === "*") {
                isValid = true;
            } else if (accept === "application/pdf") {
                isValid = file.type === "application/pdf" || file.name.toLowerCase().endsWith('.pdf');
            } else if (accept === "image/*") {
                isValid = file.type.startsWith('image/');
            } else if (accept.includes('*')) {
                // Handle wildcards like "image/*", "video/*"
                const baseType = accept.split('/')[0];
                isValid = file.type.startsWith(baseType + '/');
            } else {
                // Handle specific MIME types
                isValid = file.type === accept;
            }

            if (!isValid) {
                hasInvalidFiles = true;
            } else {
                validFiles.push(file);
            }
        });

        if (hasInvalidFiles) {
            const errorMsg = accept === "application/pdf" 
                ? "Please upload PDF files only."
                : accept === "image/*" 
                ? "Please upload image files only."
                : "Invalid file format.";
            setErrorMessage(errorMsg);
            setTimeout(() => setErrorMessage(null), 3000);
        }

        if (validFiles.length > 0) {
            onFilesDropped(validFiles);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        validateAndPassFiles(files);
    };

    const handleFileInput = (e) => {
        const files = Array.from(e.target.files);
        validateAndPassFiles(files);
        e.target.value = null; // Reset input to allow selecting same file again
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
                <div className={clsx("icon-circle", { "error-pulse": errorMessage })}>
                    {errorMessage ? (
                        <AlertCircle size={40} className="upload-icon error-icon" />
                    ) : (
                        <UploadCloud size={40} className="upload-icon" />
                    )}
                </div>
                <h3>{errorMessage || text}</h3>
                <p className={clsx({ "error-text": errorMessage })}>
                    {errorMessage ? "Invalid file format" : "or click to select files"}
                </p>
            </div>

            <div className="dropzone-bg-anim"></div>
        </div>
    );
}
