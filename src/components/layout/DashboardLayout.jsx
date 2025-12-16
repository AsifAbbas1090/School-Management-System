import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { Toaster } from 'react-hot-toast';

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="dashboard-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        <main className="content-area">
          <Outlet />
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
            iconTheme: {
              primary: 'var(--success-500)',
              secondary: 'white',
            },
          },
          error: {
            iconTheme: {
              primary: 'var(--error-500)',
              secondary: 'white',
            },
          },
        }}
      />

      <style jsx>{`
        .dashboard-layout {
          display: flex;
          min-height: 100vh;
          background: var(--gray-50);
        }

        .main-content {
          flex: 1;
          margin-left: 280px;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }

        .content-area {
          flex: 1;
          padding: var(--spacing-xl);
        }

        @media (max-width: 1024px) {
          .main-content {
            margin-left: 240px;
          }
        }

        @media (max-width: 768px) {
          .main-content {
            margin-left: 0;
          }

          .content-area {
            padding: var(--spacing-md);
          }
        }
      `}</style>
    </div>
  );
};

export default DashboardLayout;
