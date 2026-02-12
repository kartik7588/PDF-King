# 👑 PDF King

**PDF King** is a powerful, privacy-first PDF utility application built with **React** and **Vite**. It allows you to merge, split, edit, and convert PDF documents directly in your browser without uploading any data to a server.

## 🚀 Features

PDF King offers a comprehensive suite of tools for all your PDF needs:

*   **📄 Merge PDF**: Combine multiple PDF files into a single document.
*   **✂️ Split PDF**: Extract specific pages or ranges from a PDF.
*   **🔄 Rotate PDF**: Rotate individual pages or all pages at once.
*   **🖼️ Image to PDF**: Convert multiple images (JPG, PNG, WEBP) into a single PDF.
    *   *New:* Supports manual reordering by typing positions directly on image previews.
*   **📸 Export to Image**: Convert PDF pages into high-resolution images (PNG or JPG).
    *   Download single pages or bulk export as a ZIP archive.
*   **✍️ Edit PDF**: Add text annotations, shapes, and overlays to your documents.
*   **✒️ Add Media & Signatures**: Insert images and digital signatures into your PDF.
*   **📉 Compress PDF**: Reduce PDF file size while maintaining quality (Client-side optimization).
*   **📂 Download Manager**: integrated history of your processed files.

## 🔒 Privacy Focused

**No servers. No uploads.**
PDF King runs entirely on the client-side using `pdf-lib` and `react-pdf`. Your documents never leave your device, ensuring maximum privacy and security.

## 🛠️ Tech Stack

*   **Frontend**: React 19, Vite 7
*   **PDF Processing**: `pdf-lib`, `react-pdf`
*   **Styling**: Modern CSS3 (Variables, Flexbox/Grid), Glassmorphism UI
*   **Icons**: `lucide-react`
*   **State/Storage**: `idb` (IndexedDB) for local history
*   **Build Tool**: Vite

## 📦 Installation & Running Locally

1.  **Clone the repository**
    ```bash
    git clone https://github.com/kartik7588/PDF-King.git
    cd PDF-King
    ```

2.  **Install dependencies**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Start the development server**
    ```bash
    npm run dev
    ```

4.  **Build for production**
    ```bash
    npm run build
    ```

## 🤝 Contribution

Contributions are welcome! Feel free to open issues or submit pull requests to improve the application.

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

---
*Developed with ❤️ by Kartik*
