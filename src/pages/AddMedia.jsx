import React, { useState, useRef, useEffect } from 'react';
import { Document, Page } from 'react-pdf';
import { ImagePlus, Save, ChevronLeft, ChevronRight, Upload, Download, Trash2, Maximize2 } from 'lucide-react';
import Dropzone from '../components/Dropzone';
import ImageDropzone from '../components/ImageDropzone';
import DraggableImageOverlay from '../components/DraggableImageOverlay';
import { addImageToPDF } from '../utils/pdfActions';
import { trackDownload } from '../utils/analytics';
import { saveDownloadRecord } from '../utils/downloadManager';
import './AddMedia.css';

export default function AddMedia() {
   const [file, setFile] = useState(null);
   const [numPages, setNumPages] = useState(null);
   const [currPage, setCurrPage] = useState(1);

   // Array of { id, src, x, y, width, height, file, page }
   const [images, setImages] = useState([]);
   const [selectedImageId, setSelectedImageId] = useState(null);

   const [isProcessing, setIsProcessing] = useState(false);
   const [downloadUrl, setDownloadUrl] = useState(null);
   const [editedBlob, setEditedBlob] = useState(null);
   const containerRef = useRef(null);

   const handleFileDropped = (files) => {
      const selected = files[0];
      if (selected.size > 150 * 1024 * 1024) {
         alert("File too large. Please use files under 150MB.");
         return;
      }
      setFile(selected);
      setDownloadUrl(null);
   };

   const handleImagesDropped = (files) => {
      const newImages = files.map(file => ({
         id: Math.random().toString(36).substr(2, 9),
         src: URL.createObjectURL(file), // Create URL once here
         file: file,
         x: 50,
         y: 50,
         width: 150,
         height: 150,
         page: currPage
      }));
      setImages(prev => [...prev, ...newImages]);
   };

   // Update image position
   const updateImagePos = (id, x, y) => {
      setImages(prev => prev.map(img => img.id === id ? { ...img, x, y } : img));
   };

   // Update image size
   const updateImageSize = (id, width, height) => {
      setImages(prev => prev.map(img => img.id === id ? { ...img, width, height } : img));
   };

   const removeImage = (id) => {
      setImages(prev => {
         const img = prev.find(i => i.id === id);
         if (img) URL.revokeObjectURL(img.src); // Cleanup
         return prev.filter(i => i.id !== id);
      });
   };

   // Cleanup URLs on unmount
   useEffect(() => {
      return () => {
         images.forEach(img => URL.revokeObjectURL(img.src));
      };
   }, []);

   const handleSave = async () => {
      if (!file || images.length === 0 || !containerRef.current) return;

      setIsProcessing(true);
      try {
         const renderedWidth = containerRef.current.clientWidth;
         const renderedHeight = containerRef.current.clientHeight; // Might vary per page? Assuming single page view consistency

         // Process sequentially to add all images
         let currentPdfBytes = await file.arrayBuffer();
         let currentPdfBlob = new Blob([currentPdfBytes], { type: 'application/pdf' });

         // We need to reload the PDF for each addition if using simple helpers, 
         // OR update the helper to take a PDFDocument. 
         // For now, let's just chain the binary updates (inefficient but safe for MVP).
         // Optimization: Update utils to accept PDFDocument? 
         // Let's stick to the existing util signature but loop carefully.

         // Actually, utils take 'file' object. We might need to wrap the intermediate bytes back into a File/Blob.
         let processedFile = file;

         for (const img of images) {
            const newBytes = await addImageToPDF(
               processedFile,
               img.file,
               img.page - 1,
               img.x,
               img.y,
               img.width,
               img.height,
               renderedWidth,
               renderedHeight
            );
            const blob = new Blob([newBytes], { type: 'application/pdf' });
            processedFile = new File([blob], "temp.pdf", { type: 'application/pdf' });
         }

         const url = URL.createObjectURL(processedFile);
         setEditedBlob(processedFile); // processedFile is a File object which works as Blob
         setDownloadUrl(url);

      } catch (error) {
         console.error(error);
         alert("Failed to save PDF: " + error.message);
      } finally {
         setIsProcessing(false);
      }
   };

   const handleDownload = async () => {
      if (!editedBlob) return;
      const fileName = 'media-added.pdf';
      const sizeStr = (editedBlob.size / 1024 / 1024).toFixed(2) + ' MB';

      // Track
      trackDownload('AddMedia', {
         imagesCount: images.length,
         size: sizeStr
      });

      // Save History
      await saveDownloadRecord(fileName, sizeStr, editedBlob, 'AddMedia');

      // Download
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
   };

   return (
      <div className="media-container">
         <div className="merge-header">
            <h2>Add Media</h2>
            <p>Insert images or signatures into your PDF.</p>
         </div>

         {!file ? (
            <Dropzone onFilesDropped={handleFileDropped} multiple={false} />
         ) : (
            <div className="work-area glass-panel">
               <div className="toolbar">
                  <div className="page-controls">
                     <button disabled={currPage <= 1} onClick={() => setCurrPage(p => p - 1)}><ChevronLeft /></button>
                     <span>Page {currPage} of {numPages || '--'}</span>
                     <button disabled={currPage >= numPages} onClick={() => setCurrPage(p => p + 1)}><ChevronRight /></button>
                  </div>

                  {/* Image Dropzone - Compact */}
                  <div className="image-upload-section">
                     <ImageDropzone onFilesDropped={handleImagesDropped} multiple={true} />
                  </div>

                  <div className="action-controls">
                     {downloadUrl ? (
                        <button onClick={handleDownload} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}> <Download size={16} /> Download</button>
                     ) : (
                        <button className="btn-primary" onClick={handleSave} disabled={images.length === 0 || isProcessing}>
                           {isProcessing ? 'Saving...' : 'Save PDF'}
                        </button>
                     )}
                  </div>
               </div>

               <div className="canvas-wrapper">
                  <div className="page-container" ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
                     <Document
                        file={file}
                        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                        loading="Loading PDF..."
                     >
                        <Page
                           pageNumber={currPage}
                           width={600}
                           renderTextLayer={false}
                           renderAnnotationLayer={false}
                           className="pdf-page"
                        />
                     </Document>

                     {images.filter(img => img.page === currPage).map((img) => (
                        <DraggableImageOverlay
                           key={img.id}
                           id={img.id}
                           src={img.src}
                           x={img.x}
                           y={img.y}
                           width={img.width}
                           height={img.height}
                           isSelected={selectedImageId === img.id}
                           onSelect={setSelectedImageId}
                           onUpdatePosition={updateImagePos}
                           onUpdateSize={updateImageSize}
                           onRemove={removeImage}
                        />
                     ))}
                  </div>
               </div>
            </div>
         )}
      </div>
   );
}
