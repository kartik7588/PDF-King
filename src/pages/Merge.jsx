import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'; // Note: react-beautiful-dnd might have strict mode issues, using simple array move for now to avoid complexity or I'll implement a simple list without dnd first for MVP functionality.
import { FileText, X, ArrowDown, ArrowUp } from 'lucide-react';
import Dropzone from '../components/Dropzone';
import { mergePDFs } from '../utils/pdfActions';
import './Merge.css';

export default function Merge() {
    const [files, setFiles] = useState([]);
    const [isMerging, setIsMerging] = useState(false);
    const [downloadUrl, setDownloadUrl] = useState(null);

    const handleFilesDropped = (newFiles) => {
        // Add unique ID to each file for list key
        const filesWithId = newFiles.map(file => ({
            file,
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            size: (file.size / 1024 / 1024).toFixed(2) // MB
        }));
        setFiles(prev => [...prev, ...filesWithId]);
        setDownloadUrl(null); // Reset prev merge
    };

    const removeFile = (id) => {
        setFiles(files.filter(f => f.id !== id));
    };

    const moveFile = (index, direction) => {
        if (
            (direction === 'up' && index === 0) ||
            (direction === 'down' && index === files.length - 1)
        ) return;

        const newFiles = [...files];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newFiles[index], newFiles[targetIndex]] = [newFiles[targetIndex], newFiles[index]];
        setFiles(newFiles);
    };

    const handleMerge = async () => {
        if (files.length < 2) return;

        setIsMerging(true);
        try {
            const mergedBytes = await mergePDFs(files.map(f => f.file));
            const blob = new Blob([mergedBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
        } catch (error) {
            alert(error.message);
        } finally {
            setIsMerging(false);
        }
    };

    return (
        <div className="merge-container">
            <div className="merge-header">
                <h2>Merge PDF Files</h2>
                <p>Combine multiple PDFs into one. Drag and drop to reorder.</p>
            </div>

            <div className="merge-workspace">
                {files.length === 0 ? (
                    <Dropzone onFilesDropped={handleFilesDropped} />
                ) : (
                    <div className="file-list-container glass-panel">
                        <div className="file-actions-bar">
                            <button className="btn-secondary" onClick={() => setFiles([])}>Clear All</button>
                            <button className="btn-add-more">
                                <label htmlFor="add-more-input">Add More Files</label>
                                <input
                                    id="add-more-input"
                                    type="file"
                                    multiple
                                    accept="application/pdf"
                                    onChange={(e) => handleFilesDropped(Array.from(e.target.files))}
                                    style={{ display: 'none' }}
                                />
                            </button>
                        </div>

                        <div className="file-list">
                            {files.map((file, index) => (
                                <div key={file.id} className="file-item">
                                    <div className="file-info">
                                        <FileText size={24} className="text-secondary" />
                                        <div>
                                            <span className="file-name">{file.name}</span>
                                            <span className="file-size">{file.size} MB</span>
                                        </div>
                                    </div>

                                    <div className="file-controls">
                                        <button
                                            onClick={() => moveFile(index, 'up')}
                                            disabled={index === 0}
                                            className="control-btn"
                                        >
                                            <ArrowUp size={16} />
                                        </button>
                                        <button
                                            onClick={() => moveFile(index, 'down')}
                                            disabled={index === files.length - 1}
                                            className="control-btn"
                                        >
                                            <ArrowDown size={16} />
                                        </button>
                                        <button onClick={() => removeFile(file.id)} className="control-btn delete">
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="merge-actions">
                            {downloadUrl ? (
                                <a
                                    href={downloadUrl}
                                    download="merged-document.pdf"
                                    className="btn-primary download-btn"
                                >
                                    Download Merged PDF
                                </a>
                            ) : (
                                <button
                                    className="btn-primary merge-btn"
                                    onClick={handleMerge}
                                    disabled={files.length < 2 || isMerging}
                                >
                                    {isMerging ? 'Merging...' : 'Merge PDFs'}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
