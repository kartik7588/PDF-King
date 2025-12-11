import React from 'react';
import {
    Files,
    Scissors,
    RotateCw,
    ImagePlus,
    Minimize2,
    PenTool
} from 'lucide-react';
import Card from '../components/Card';
import './Home.css';

export default function Home() {
    const tools = [
        {
            to: '/merge',
            icon: Files,
            title: 'Merge PDF',
            description: 'Combine multiple PDF files into one single document in seconds.',
            colorClass: 'text-primary'
        },
        {
            to: '/split',
            icon: Scissors,
            title: 'Split PDF',
            description: 'Separate one page or a whole set for easy conversion into independent PDF files.',
            colorClass: 'text-secondary'
        },
        {
            to: '/rotate',
            icon: RotateCw,
            title: 'Rotate PDF',
            description: 'Rotate your split PDF files however you like. Rotate multiple PDFs at once.',
            colorClass: 'text-accent'
        },
        {
            to: '/add-media',
            icon: ImagePlus,
            title: 'Add Media',
            description: 'Insert images or signatures into your PDF documents with ease.',
            colorClass: 'text-secondary'
        },
        {
            to: '/compress',
            icon: Minimize2,
            title: 'Compress PDF',
            description: 'Reduce the file size of your PDF while maintaining the best quality possible.',
            colorClass: 'text-primary'
        },
        {
            to: '/edit',
            icon: PenTool,
            title: 'Edit PDF',
            description: 'Add text, shapes, and annotations to your PDF document.',
            colorClass: 'text-accent'
        }
    ];

    return (
        <div className="home-container">
            <div className="hero-section">
                <h1 className="hero-title">
                    All your <span className="text-gradient">PDF Tools</span> in one place.
                </h1>
                <p className="hero-subtitle">
                    Secure, private, and fast. All processing happens right in your browser.
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
