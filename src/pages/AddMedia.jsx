import React, { useState, useRef, useEffect } from 'react';
import { Document, Page } from 'react-pdf';
import { ImagePlus, Save, ChevronLeft, ChevronRight, Upload, Download, Trash2, Maximize2, ZoomIn, ZoomOut, RefreshCcw } from 'lucide-react';
import Dropzone from '../components/Dropzone';
import ImageDropzone from '../components/ImageDropzone';
import DraggableImageOverlay from '../components/DraggableImageOverlay';
import { addImageToPDF } from '../utils/pdfActions';
import { trackDownload } from '../utils/analytics';
import { saveDownloadRecord } from '../utils/downloadManager';
import { startScrollLock, endScrollLock, getOptimalPDFWidth, isMobileDevice } from '../utils/deviceUtils';
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
   const canvasWrapperRef = useRef(null);

   // Zoom and Pan State
   const [zoom, setZoom] = useState(1);
   const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
   const [renderWidth, setRenderWidth] = useState(600);
   const [isDraggingOverlay, setIsDraggingOverlay] = useState(false);

   // Touch gesture tracking
   const touchStartRef = useRef({ distance: 0, center: { x: 0, y: 0 }, zoom: 1, pan: { x: 0, y: 0 } });

   useEffect(() => {
      const updateRenderWidth = () => {
         if (canvasWrapperRef.current) {
            const containerWidth = canvasWrapperRef.current.clientWidth;
            const optimalWidth = getOptimalPDFWidth(containerWidth);
            setRenderWidth(optimalWidth);
         } else {
            setRenderWidth(isMobileDevice() ? window.innerWidth * 0.95 : 600);
         }
      };

      const timeout = setTimeout(updateRenderWidth, 100);
      window.addEventListener('resize', updateRenderWidth);
      return () => {
         window.removeEventListener('resize', updateRenderWidth);
         clearTimeout(timeout);
      };
   }, []);

   // Touch gesture handlers (Copied from Edit.jsx for consistency)
   useEffect(() => {
      const wrapper = canvasWrapperRef.current;
      if (!wrapper) return;

      const getTouchDistance = (touch1, touch2) => {
         const dx = touch1.clientX - touch2.clientX;
         const dy = touch1.clientY - touch2.clientY;
         return Math.sqrt(dx * dx + dy * dy);
      };

      const getTouchCenter = (touch1, touch2) => {
         return {
            x: (touch1.clientX + touch2.clientX) / 2,
            y: (touch1.clientY + touch2.clientY) / 2
         };
      };

      const handleTouchStart = (e) => {
         if (e.touches.length === 2) {
            e.preventDefault();
            startScrollLock();
            const distance = getTouchDistance(e.touches[0], e.touches[1]);
            const center = getTouchCenter(e.touches[0], e.touches[1]);
            touchStartRef.current = {
               distance,
               center,
               zoom,
               pan: { ...panOffset }
            };
         }
      };

      const handleTouchMove = (e) => {
         if (e.touches.length === 2 && touchStartRef.current.distance > 0) {
            e.preventDefault();
            const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
            const currentCenter = getTouchCenter(e.touches[0], e.touches[1]);
            const zoomDelta = currentDistance / touchStartRef.current.distance;
            const newZoom = Math.max(0.5, Math.min(3, touchStartRef.current.zoom * zoomDelta));
            const panDeltaX = currentCenter.x - touchStartRef.current.center.x;
            const panDeltaY = currentCenter.y - touchStartRef.current.center.y;
            setZoom(newZoom);
            setPanOffset({
               x: touchStartRef.current.pan.x + panDeltaX,
               y: touchStartRef.current.pan.y + panDeltaY
            });
         }
      };

      const handleTouchEnd = (e) => {
         if (e.touches.length < 2) {
            endScrollLock();
            touchStartRef.current = { distance: 0, center: { x: 0, y: 0 }, zoom: 1, pan: { x: 0, y: 0 } };
         }
      };

      wrapper.addEventListener('touchstart', handleTouchStart, { passive: false });
      wrapper.addEventListener('touchmove', handleTouchMove, { passive: false });
      wrapper.addEventListener('touchend', handleTouchEnd);
      wrapper.addEventListener('touchcancel', handleTouchEnd);

      return () => {
         wrapper.removeEventListener('touchstart', handleTouchStart);
         wrapper.removeEventListener('touchmove', handleTouchMove);
         wrapper.removeEventListener('touchend', handleTouchEnd);
         wrapper.removeEventListener('touchcancel', handleTouchEnd);
         endScrollLock();
      };
   }, [zoom, panOffset]);

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

               <div className="canvas-wrapper" ref={canvasWrapperRef} style={{
                  overflow: isMobileDevice() ? 'auto' : 'visible',
                  WebkitOverflowScrolling: 'touch',
                  overscrollBehavior: isDraggingOverlay ? 'none' : 'auto'
               }}>
                  <div
                     className="zoom-container"
                     style={{
                        transform: `scale(${zoom}) translate(${panOffset.x / zoom}px, ${panOffset.y / zoom}px)`,
                        transformOrigin: 'top left',
                        transition: 'transform 0.1s ease-out',
                        display: 'inline-block'
                     }}
                  >
                     <div className="page-container" ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
                        <Document
                           file={file}
                           onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                           loading="Loading PDF..."
                        >
                           <Page
                              pageNumber={currPage}
                              width={renderWidth}
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

               {/* Zoom Controls */}
               <div className="zoom-controls" style={{
                  position: 'fixed',
                  bottom: '80px',
                  right: '20px',
                  display: 'flex',
                  flexDirection: isMobileDevice() ? 'column' : 'row',
                  gap: '8px',
                  background: 'var(--color-bg-card)',
                  padding: '8px',
                  borderRadius: '24px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  zIndex: 100,
                  border: '1px solid var(--color-border)'
               }}>
                  <button onClick={() => {
                     setZoom(z => Math.max(0.5, z - 0.2));
                  }} className="zoom-btn" style={{
                     width: '40px', height: '40px', borderRadius: '50%',
                     border: 'none', background: 'var(--color-primary)', color: 'white',
                     display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                     <ZoomOut size={20} />
                  </button>
                  <span style={{
                     margin: '0 8px',
                     color: 'var(--color-text-primary)',
                     display: isMobileDevice() ? 'none' : 'block'
                  }}>
                     {Math.round(zoom * 100)}%
                  </span>
                  <button onClick={() => {
                     setZoom(z => Math.min(3, z + 0.2));
                  }} className="zoom-btn" style={{
                     width: '40px', height: '40px', borderRadius: '50%',
                     border: 'none', background: 'var(--color-primary)', color: 'white',
                     display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                     <ZoomIn size={20} />
                  </button>
               </div>
            </div>
         )}
      </div>
   );
}
