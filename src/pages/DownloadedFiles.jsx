import React, { useEffect, useState } from 'react';
import {
    Download,
    Trash2,
    FileText,
    Clock,
    HardDrive,
    Trash
} from 'lucide-react';
import { getDownloadHistory, deleteDownloadRecord, clearDownloadHistory } from '../utils/downloadManager';
import './DownloadedFiles.css';

export default function DownloadedFiles() {
    const [downloads, setDownloads] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        setLoading(true);
        const history = await getDownloadHistory();
        setDownloads(history);
        setLoading(false);
    };

    const handleDownload = (file) => {
        if (!file.blob) return;

        const url = URL.createObjectURL(file.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Remove this file from history?')) {
            await deleteDownloadRecord(id);
            loadHistory();
        }
    };

    const handleClearAll = async () => {
        if (window.confirm('Are you sure you want to clear all download history?')) {
            await clearDownloadHistory();
            loadHistory();
        }
    };

    const formatDate = (isoString) => {
        return new Date(isoString).toLocaleString();
    };

    return (
        <div className="downloads-container">
            <div className="downloads-header">
                <h2>Downloaded Files</h2>
                <p>History of your generated PDFs. Files are stored locally in your browser.</p>
            </div>

            <div className="downloads-content glass-panel">
                {loading ? (
                    <div className="loading-state">
                        <p>Loading history...</p>
                    </div>
                ) : downloads.length === 0 ? (
                    <div className="empty-state">
                        <FileText size={48} style={{ opacity: 0.2 }} />
                        <p>No downloads yet.</p>
                    </div>
                ) : (
                    <>
                        <div className="downloads-toolbar">
                            <button className="btn-clear" onClick={handleClearAll}>
                                <Trash size={16} />
                                Clear History
                            </button>
                        </div>
                        <div style={{ overflowY: 'auto', flex: 1 }}>
                            <table className="downloads-table">
                                <thead>
                                    <tr>
                                        <th>File Name</th>
                                        <th>Size</th>
                                        <th>Date</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {downloads.map((file) => (
                                        <tr key={file.id}>
                                            <td>
                                                <div
                                                    className="file-name-cell"
                                                    onClick={() => handleDownload(file)}
                                                    title="Click to download"
                                                >
                                                    <FileText size={18} />
                                                    {file.fileName}
                                                </div>
                                            </td>
                                            <td>{file.size}</td>
                                            <td>{formatDate(file.date)}</td>
                                            <td>
                                                <div className="actions-cell">
                                                    <button
                                                        className="action-btn download"
                                                        onClick={() => handleDownload(file)}
                                                        title="Download Again"
                                                    >
                                                        <Download size={18} />
                                                    </button>
                                                    <button
                                                        className="action-btn delete"
                                                        onClick={() => handleDelete(file.id)}
                                                        title="Remove from History"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
