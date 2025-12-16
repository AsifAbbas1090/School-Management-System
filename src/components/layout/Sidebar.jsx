import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { useAuthStore, useSchoolStore } from '../../store';
import { NAVIGATION_ITEMS, SCHOOL_INFO } from '../../constants';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user } = useAuthStore();
  const { currentSchool } = useSchoolStore();

  const navigationItems = NAVIGATION_ITEMS[user?.role] || [];

  // Display School Name or Fallback
  const schoolName = currentSchool?.name || SCHOOL_INFO.name;
  const schoolTagline = currentSchool?.tagline || SCHOOL_INFO.tagline;

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={`sidebar-overlay ${isOpen ? 'show' : ''}`}
        onClick={onClose}
      />

      <aside className={`sidebar ${isOpen ? 'show' : ''}`}>
        {/* Logo Section */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon">
              {currentSchool?.logo ? (
                <img src={currentSchool.logo} alt="Logo" className="w-full h-full object-cover rounded-lg" />
              ) : (
                <Icons.GraduationCap size={32} className="text-primary-600" />
              )}
            </div>
            <div className="logo-text">
              <h1 className="text-xl font-bold text-gray-900">{schoolName}</h1>
              <p className="text-xs text-gray-500">{schoolTagline}</p>
            </div>
          </div>
          <button className="close-btn md:hidden" onClick={onClose}>
            <Icons.X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navigationItems.map((item) => {
            const Icon = Icons[item.icon];
            const active = isActive(item.path);

            return (
              <Link
                key={item.id}
                to={item.path}
                className={`sidebar-nav-item ${active ? 'active' : ''}`}
                onClick={() => window.innerWidth < 768 && onClose()}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <p className="text-xs text-gray-500 text-center">
            © 2024 {SCHOOL_INFO.name}
          </p>
        </div>

        <style jsx>{`
        .sidebar {
          width: 280px;
          height: 100vh;
          background: var(--bg-card);
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          position: fixed;
          left: 0;
          top: 0;
          z-index: var(--z-sticky);
          transition: transform var(--transition-base);
        }

        .sidebar-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.5);
            z-index: var(--z-dropdown);
            opacity: 0;
            visibility: hidden;
            transition: opacity var(--transition-base);
        }
        
        .sidebar-overlay.show {
            opacity: 1;
            visibility: visible;
        }

        .sidebar-header {
          padding: var(--spacing-lg);
          border-bottom: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
        }

        .logo-icon {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, var(--primary-50), var(--primary-100));
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .logo-text h1 { color: var(--text-primary); }
        .logo-text p { color: var(--text-secondary); }

        .sidebar-nav {
          flex: 1;
          padding: var(--spacing-lg);
          overflow-y: auto;
        }

        .sidebar-nav-item {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          padding: 0.75rem var(--spacing-md);
          margin-bottom: var(--spacing-xs);
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-size: 0.875rem;
          font-weight: 500;
          transition: all var(--transition-base);
          text-decoration: none;
        }

        .sidebar-nav-item:hover {
          background: var(--bg-body);
          color: var(--primary-600);
        }

        .sidebar-nav-item.active {
          background: linear-gradient(135deg, var(--primary-50), var(--primary-100));
          color: var(--primary-700);
          box-shadow: var(--shadow-sm);
        }

        .sidebar-footer {
          padding: var(--spacing-md);
          border-top: 1px solid var(--border-color);
        }
        
        .close-btn {
            background: none;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            padding: 4px;
        }

        @media (max-width: 1024px) {
          .sidebar {
            width: 240px;
          }
        }

        @media (max-width: 768px) {
          .sidebar {
            transform: translateX(-100%);
          }

          .sidebar.show {
            transform: translateX(0);
          }
          
          /* Hide sidebar overlay on desktop */
           .sidebar-overlay {
               display: block; 
           }
        }
        
        @media (min-width: 769px) {
             .sidebar-overlay {
                 display: none;
             }
        }
      `}</style>
      </aside>
    </>
  );
};

export default Sidebar;
