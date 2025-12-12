# PDF King

## Overview
PDF King is a complete browser-based PDF management tool built using React and Vite.  
It allows users to edit, sign, merge, split, rotate, and compress PDF files directly from their browser without the need for server uploads.  
All operations run locally, ensuring data privacy, high speed, and smooth performance.

---

## Live Demo
Project is deployed and live at:  
[https://kartik7588.github.io/PDF-King/](https://kartik7588.github.io/PDF-King/)

---

## Features

### 1. Edit PDF
- Add, edit, move, and resize text annotations on PDFs.  
- Double-click to edit text content, drag to reposition, or remove if needed.  
- Font size and positioning can be adjusted freely.

### 2. Add Media or Signatures
- Upload signatures or images using drag-and-drop functionality.  
- Resize, crop, and move media freely for better placement.  
- Image compression and scaling included for optimized performance.

### 3. Merge and Split PDFs
- Merge multiple PDFs into one consolidated document.  
- Split a large PDF into smaller parts quickly and efficiently.

### 4. Rotate Pages
- Rotate single or multiple PDF pages and instantly preview changes.

### 5. Compress PDFs
- Adjustable compression slider with real-time preview of estimated size.  
- Displays output size before download to ensure balanced quality and storage efficiency.

### 6. Security and Performance
- 100% client-side — no server interaction, ensuring complete privacy.  
- Uses **pdf-lib** and **react-pdf** for in-browser PDF rendering and editing.

### 7. Responsive and Optimized
- Built with TailwindCSS and Vite for a clean, fast, responsive UI.  
- Works perfectly on both desktop and mobile browsers.

---

## Tech Stack

| Layer | Tools |
|-------|--------|
| Frontend | React (Vite), TailwindCSS |
| PDF Handling | pdf-lib, react-pdf |
| Routing | React Router DOM (HashRouter) |
| UI Components | Lucide Icons, Custom Components |
| Deployment | GitHub Pages using gh-pages |

---

## Complete Setup and Deployment Guide

### Step 1: Clone the Repository
Clone this repository to your local system:
```bash
git clone https://github.com/kartik7588/PDF-King.git
cd PDF-King
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Run the Development Server
Run the local development server:
```bash
npm run dev
```
Then open in your browser:
http://localhost:5173/

### Step 4: Build for Production
Build the project for production:
```bash
npm run build
```

---

## How It Works
- The app uses **pdf-lib** to manipulate PDFs entirely on the client side.
- **react-pdf** renders PDFs for preview.
- Annotations (text, images) are managed as state and drawn dynamically onto the document.
- The final edited PDF is generated in-memory and offered for download.
- The project is deployed via GitHub Pages using the `gh-pages` package.

---

## Future Enhancements
- [ ] AI-powered document summarization and auto form-filling.
- [ ] Smart signature detection and alignment.
- [ ] Integration with cloud storage platforms such as Google Drive or Dropbox.
- [ ] Undo/Redo functionality for editing actions.
- [ ] Enhanced mobile drag and touch event handling.

---

## Developer
**Author:** Kartik Jangid  
**Role:** Computer Science Engineer | Full Stack Developer | Creator of PDF King

*"Built to make PDF editing fast, simple, and private."*

---

## Acknowledgements
- React PDF
- pdf-lib
- Vite
- TailwindCSS
- Lucide Icons
