import React, { useState, useEffect } from 'react';
import { PDFDocument, rgb } from 'pdf-lib';
import { saveAs } from 'file-saver';
import { Download, X, FileImage } from 'lucide-react';
import Dropzone from '../components/Dropzone';
import { trackDownload } from '../utils/analytics';
import { saveDownloadRecord } from '../utils/downloadManager';
import './ImageToPDF.css';

const OrderInput = ({ index, total, onReorder }) => {
    const [val, setVal] = useState(index + 1);

    useEffect(() => {
        setVal(index + 1);
    }, [index]);

    const handleCommit = () => {
        let newPos = parseInt(val);
        if (isNaN(newPos)) {
            setVal(index + 1);
            return;
        }
        // Clamp value
        if (newPos < 1) newPos = 1;
        if (newPos > total) newPos = total;

        if (newPos !== index + 1) {
            onReorder(newPos - 1);
        } else {
            setVal(index + 1);
        }
    };

    return (
        <input
            type="number"
            className="image-order-input"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={handleCommit}
            onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
        />
    );
};

export default function ImageToPDF() {
    const [images, setImages] = useState([]); // { id, file, preview, width, height }
    const [isConverting, setIsConverting] = useState(false);

    const handleFilesDropped = (files) => {
        const newImages = files.map(file => ({
            id: `img-${Date.now()}-${Math.random()}`,
            file,
            preview: URL.createObjectURL(file),
            name: file.name
        }));
        setImages(prev => [...prev, ...newImages]);
    };

    const removeImage = (id) => {
        setImages(prev => {
            const newImages = prev.filter(img => img.id !== id);
            // Revoke URL to avoid memory leaks
            const imgToRemove = prev.find(img => img.id === id);
            if (imgToRemove) URL.revokeObjectURL(imgToRemove.preview);
            return newImages;
        });
    };

    const reorderImage = (fromIndex, toIndex) => {
        setImages(prev => {
            const newImages = [...prev];
            const [movedImage] = newImages.splice(fromIndex, 1);
            newImages.splice(toIndex, 0, movedImage);
            return newImages;
        });
    };

    const convertToPDF = async () => {
        if (images.length === 0) return;
        setIsConverting(true);

        try {
            const pdfDoc = await PDFDocument.create();

            for (const imgData of images) {
                const imageBytes = await imgData.file.arrayBuffer();
                let pdfImage;

                // Embed image based on type
                if (imgData.file.type === 'image/jpeg') {
                    pdfImage = await pdfDoc.embedJpg(imageBytes);
                } else if (imgData.file.type === 'image/png') {
                    pdfImage = await pdfDoc.embedPng(imageBytes);
                } else {
                    // Fallback for other formats (like WEBP) - draw to canvas first if needed
                    // pdf-lib supports PNG and JPG directly. For others, we might need conversion.
                    // For now, let's assume JPG/PNG or warn.
                    // Actually, let's try to embed PNG if it's not JPG. PDF-lib strictly wants JPG or PNG.
                    // If user uploads WEBP, we need to convert it.
                    // Let's implement a quick canvas convert helper.
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const img = new Image();
                    img.src = imgData.preview;
                    await new Promise(resolve => img.onload = resolve);

                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);

                    const pngDataUrl = canvas.toDataURL('image/png');
                    const pngBytes = await fetch(pngDataUrl).then(res => res.arrayBuffer());
                    pdfImage = await pdfDoc.embedPng(pngBytes);
                }

                const { width, height } = pdfImage;
                const page = pdfDoc.addPage([width, height]);
                page.drawImage(pdfImage, {
                    x: 0,
                    y: 0,
                    width,
                    height,
                });
            }

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const fileName = `images_merged_${Date.now()}.pdf`;

            saveAs(blob, fileName);

            const sizeStr = (blob.size / 1024 / 1024).toFixed(2) + ' MB';
            trackDownload('ImageToPDF', { count: images.length, size: sizeStr });
            await saveDownloadRecord(fileName, sizeStr, blob, 'Image to PDF');

        } catch (error) {
            console.error("Conversion failed:", error);
            alert("Failed to create PDF. " + error.message);
        } finally {
            setIsConverting(false);
        }
    };

    return (
        <div className="image-to-pdf-container">
            <div className="merge-header">
                <h2>Image to PDF</h2>
                <p>Convert and combine images into a single PDF.</p>
            </div>

            <div className="work-area glass-panel">
                <div className="toolbar">
                    <span className="count-label">{images.length} images</span>
                    <button
                        className="btn-primary"
                        onClick={convertToPDF}
                        disabled={images.length === 0 || isConverting}
                    >
                        {isConverting ? 'Converting...' : 'Convert to PDF'}
                        <Download size={16} style={{ marginLeft: '0.5rem' }} />
                    </button>
                </div>

                <div className="upload-section">
                    <Dropzone onFilesDropped={handleFilesDropped} accept="image/*" multiple={true} text="Drop your images here" />
                </div>

                {images.length > 0 && (
                    <div className="images-grid">
                        {images.map((img, index) => (
                            <div key={img.id} className="image-card">
                                <div className="image-preview">
                                    <img src={img.preview} alt={img.name} />
                                    <div className="order-input-overlay">
                                        <OrderInput
                                            index={index}
                                            total={images.length}
                                            onReorder={(newIndex) => reorderImage(index, newIndex)}
                                        />
                                    </div>
                                    <button
                                        className="remove-btn"
                                        onClick={() => removeImage(img.id)}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                                <div className="image-info">
                                    <span className="image-name">{img.name}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
