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
  X
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
      {/* Mobile Header */ }
      <header className="mobile-header">
        <div className="logo-mobile">
          <span className="logo-icon">👑</span>
          <span className="logo-text">PDF King</span>
        </div>
        <button className="menu-btn" onClick={toggleSidebar}>
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Sidebar */ }
      <aside className={clsx("sidebar glass-panel", { "open": isSidebarOpen })}>
        <div className="sidebar-header">
          <div className="logo-container">
            <span className="logo-icon">👑</span>
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
          <p>© 2025 PDF King</p>
          <p className="version">v1.0.0 Client-Side</p>
        </div>
      </aside>

      {/* Main Content */ }
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
