import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { PanelLeftOpen } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import ErrorBoundary from '../common/ErrorBoundary';
import { Toaster } from 'react-hot-toast';

const SIDEBAR_WIDTH = 280;

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggle = () => setSidebarOpen(prev => !prev);

  return (
    <div className="dashboard-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Floating reopen button — only visible when sidebar is closed */}
      {!sidebarOpen && (
        <button
          className="sidebar-reopen-btn"
          onClick={toggle}
          title="Open sidebar"
          aria-label="Open sidebar"
        >
          <PanelLeftOpen size={20} />
        </button>
      )}

      <div
        className="main-content"
        style={{
          marginLeft: sidebarOpen ? SIDEBAR_WIDTH : 0,
          transition: 'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <Header onMenuClick={toggle} />

        <main className="content-area">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'white',
            color: 'var(--gray-900)',
            boxShadow: 'var(--shadow-lg)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--spacing-md)',
          },
          success: { iconTheme: { primary: 'var(--success-500)', secondary: 'white' } },
          error: { iconTheme: { primary: 'var(--error-500)', secondary: 'white' } },
        }}
      />

      <style>{`
        .dashboard-layout {
          display: flex;
          min-height: 100vh;
          background: var(--gray-50);
        }

        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          min-width: 0;
        }

        .content-area {
          flex: 1;
          padding: var(--spacing-xl);
        }

        /* Floating button to reopen the sidebar when it's closed */
        .sidebar-reopen-btn {
          position: fixed;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          z-index: 201;
          width: 32px;
          height: 48px;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-left: none;
          border-radius: 0 var(--radius-lg) var(--radius-lg) 0;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: var(--shadow-md);
          transition: all 0.15s;
        }
        .sidebar-reopen-btn:hover {
          background: var(--primary-50);
          color: var(--primary-600);
          width: 40px;
        }

        @media (max-width: 768px) {
          .content-area {
            padding: var(--spacing-md);
          }
        }
      `}</style>
    </div>
  );
};

export default DashboardLayout;
