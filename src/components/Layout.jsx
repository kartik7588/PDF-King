import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Files,
  Scissors,
  RotateCw,
  ImagePlus,
  Minimize2,
  PenTool,
  Home,
  Menu,
  X,
  Download,
  Image as ImageIcon,
  FileImage
} from 'lucide-react';
import clsx from 'clsx';
import './Layout.css'; // We'll create this for layout-specific styles

const SIDEBAR_ITEMS = [
  { icon: Home, label: 'Dashboard', path: '/' },
  { icon: Files, label: 'Merge PDF', path: '/merge' },
  { icon: Scissors, label: 'Split PDF', path: '/split' },
  { icon: RotateCw, label: 'Rotate', path: '/rotate' },
  { icon: ImagePlus, label: 'Add Media', path: '/add-media' },
  { icon: Minimize2, label: 'Compress', path: '/compress' },
  { icon: PenTool, label: 'Edit PDF', path: '/edit' },
  { icon: FileImage, label: 'Image to PDF', path: '/image-to-pdf' },
  { icon: ImageIcon, label: 'Export to Image', path: '/export-images' },
  { icon: Download, label: 'Downloads', path: '/downloads' },
];

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  // Get current page title
  const currentItem = SIDEBAR_ITEMS.find(item => item.path === location.pathname);
  const pageTitle = currentItem ? currentItem.label : 'PDF King';

  return (
    <div className="app-container">
      {/* Mobile Header */}
      <header className="mobile-header">
        <div className="logo-mobile">
          <Files className="logo-icon" aria-hidden="true" />
          <span className="logo-text">PDF King</span>
        </div>
        <button className="menu-btn" onClick={toggleSidebar}>
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Sidebar */}
      <aside className={clsx("sidebar glass-panel", { "open": isSidebarOpen })}>
        <div className="sidebar-header">
          <div className="logo-container">
            <Files className="logo-icon" aria-hidden="true" />
            <h1 className="logo-text">PDF King</h1>
          </div>
        </div>

        <nav className="sidebar-nav">
          {SIDEBAR_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={closeSidebar}
              className={({ isActive }) => clsx("nav-item", { active: isActive })}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p>PDF tools that run in your browser</p>
          <p className="version">Files remain on this device</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="page-header glass-panel">
          <h2>{pageTitle}</h2>
          <div className="header-actions">
            {/* Placeholder for toolbar/actions */}
          </div>
        </header>

        <div className="content-scrollable">
          <Outlet />
        </div>
      </main>

      {/* Mobile Overlay */}
      {isSidebarOpen && <div className="overlay" onClick={closeSidebar} />}
    </div>
  );
}
