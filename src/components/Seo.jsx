import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_URL = 'https://kartik7588.github.io/PDF-King/';

const PAGES = {
  '/': { title: 'PDF King — Free browser-based PDF tools', description: 'Merge, split, rotate, annotate, and convert PDFs directly in your browser. Your files stay on your device.' },
  '/merge': { title: 'Merge PDF files online — PDF King', description: 'Combine PDF files in the order you choose, then download one merged document. Processing happens in your browser.' },
  '/split': { title: 'Split PDF pages online — PDF King', description: 'Extract selected PDF pages or page ranges and download a new PDF without sending the source file to a server.' },
  '/rotate': { title: 'Rotate PDF pages online — PDF King', description: 'Rotate individual PDF pages or an entire document, preview the result, and download it from your browser.' },
  '/add-media': { title: 'Add images to a PDF — PDF King', description: 'Place images or signatures on PDF pages and save the updated document directly from your browser.' },
  '/compress': { title: 'Compress PDF files — PDF King', description: 'Reduce PDF file size with browser-based processing and download the result when it is ready.' },
  '/edit': { title: 'Add text to a PDF — PDF King', description: 'Add text annotations to PDF pages, position them precisely, and download the edited document.' },
  '/image-to-pdf': { title: 'Convert images to PDF — PDF King', description: 'Turn JPG, PNG, and other image files into one PDF. Choose the page order before downloading.' },
  '/export-images': { title: 'Convert PDF pages to images — PDF King', description: 'Export PDF pages as image files and download the images from your browser.' },
  '/downloads': { title: 'Local download history — PDF King', description: 'Access PDF files saved to this browser by PDF King. This history is stored locally on your device.' },
};

function setMeta(selector, attribute, value) {
  const element = document.head.querySelector(selector);
  if (element) element.setAttribute(attribute, value);
}

export default function Seo() {
  const { pathname } = useLocation();

  useEffect(() => {
    const page = PAGES[pathname] || PAGES['/'];
    // Hash routes are client-side states, not separately crawlable documents.
    // Keep one canonical URL until the app is moved to server-rendered routes.
    const canonical = SITE_URL;
    document.title = page.title;
    setMeta('meta[name="description"]', 'content', page.description);
    setMeta('meta[property="og:title"]', 'content', page.title);
    setMeta('meta[property="og:description"]', 'content', page.description);
    setMeta('meta[name="twitter:title"]', 'content', page.title);
    setMeta('meta[name="twitter:description"]', 'content', page.description);
    setMeta('link[rel="canonical"]', 'href', canonical);
  }, [pathname]);

  return null;
}
