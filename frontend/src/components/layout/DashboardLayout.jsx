import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import ErrorBoundary from '../common/ErrorBoundary';
import { Toaster } from 'react-hot-toast';

const SIDEBAR_WIDTH = 280;

const DashboardLayout = () => {
  // Start open on desktop, closed on mobile
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);

  // On resize, auto-open on desktop and close on mobile
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

  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;

  return (
    <div className="dashboard-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div
        className="main-content"
        style={{
          marginLeft: sidebarOpen ? SIDEBAR_WIDTH : 0,
          transition: 'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <Header onMenuClick={() => setSidebarOpen(prev => !prev)} />

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
          success: {
            iconTheme: { primary: 'var(--success-500)', secondary: 'white' },
          },
          error: {
            iconTheme: { primary: 'var(--error-500)', secondary: 'white' },
          },
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
