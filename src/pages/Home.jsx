import React from 'react';
import {
    Files,
    Scissors,
    RotateCw,
    ImagePlus,
    Minimize2,
    PenTool,
    Image as ImageIcon,
    Download,
    FileImage
} from 'lucide-react';
import Card from '../components/Card';
import './Home.css';

export default function Home() {
    const tools = [
        {
            to: '/merge',
            icon: Files,
            title: 'Merge PDF',
            description: 'Put several PDFs into one document, in the order you choose.',
            colorClass: 'text-primary'
        },
        {
            to: '/split',
            icon: Scissors,
            title: 'Split PDF',
            description: 'Extract selected pages or a page range into a new PDF.',
            colorClass: 'text-secondary'
        },
        {
            to: '/rotate',
            icon: RotateCw,
            title: 'Rotate PDF',
            description: 'Turn individual pages or the whole document by 90 degrees.',
            colorClass: 'text-accent'
        },
        {
            to: '/add-media',
            icon: ImagePlus,
            title: 'Add Media',
            description: 'Place images or signatures on a page and save the result.',
            colorClass: 'text-secondary'
        },
        {
            to: '/compress',
            icon: Minimize2,
            title: 'Compress PDF',
            description: 'Create a smaller PDF file with the compression level you select.',
            colorClass: 'text-primary'
        },
        {
            to: '/edit',
            icon: PenTool,
            title: 'Edit PDF',
            description: 'Add and position text annotations in an existing PDF.',
            colorClass: 'text-accent'
        },
        {
            to: '/image-to-pdf',
            icon: FileImage,
            title: 'Image to PDF',
            description: 'Combine images into a PDF and set the page order first.',
            colorClass: 'text-secondary'
        },
        {
            to: '/export-images',
            icon: ImageIcon,
            title: 'Export to Image',
            description: 'Export individual PDF pages as PNG or JPG files.',
            colorClass: 'text-primary'
        },
        {
            to: '/downloads',
            icon: Download,
            title: 'Downloads',
            description: 'Re-download files stored in this browser’s local history.',
            colorClass: 'text-accent'
        }
    ];

    return (
        <div className="home-container">
            <div className="hero-section">
                <h1 className="hero-title">
                    PDF work that stays on your device.
                </h1>
                <p className="hero-subtitle">
                    Choose a tool, add your files, and download the result. PDF King processes files in your browser; it does not upload them to a server.
                </p>
            </div>

            <div className="tools-grid">
                {tools.map((tool) => (
                    <Card key={tool.to} {...tool} />
                ))}
            </div>
        </div>
    );
}
