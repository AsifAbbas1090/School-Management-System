import React, { useState } from 'react';
import { Bell, Search, Moon, Sun, LogOut, User, Menu, Building } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useThemeStore, useSchoolStore } from '../../store';
import Avatar from '../common/Avatar';

const Header = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { currentSchool } = useSchoolStore();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Use current school for branding
  const userSchool = currentSchool;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="header-left">
        <button className="menu-btn" onClick={onMenuClick} aria-label="Toggle menu">
          <Menu size={24} />
        </button>

        <div className="branding">
          {userSchool?.logo ? (
            <img src={userSchool.logo} alt={userSchool.name} className="header-school-logo" />
          ) : (
            <div className="header-school-icon">
              <Building size={20} />
            </div>
          )}
          <span className="header-school-name">{userSchool?.name || 'School CMS'}</span>
        </div>

        <div className="search-bar">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search students, teachers, classes..."
            className="search-input"
          />
        </div>
      </div>

      <div className="header-right">
        <button
          className="header-icon-btn"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        <button className="header-icon-btn" aria-label="Notifications">
          <Bell size={20} />
          <span className="notification-badge">3</span>
        </button>

        <div className="profile-menu">
          <button
            className="profile-btn"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            aria-label="Profile menu"
          >
            <Avatar name={user?.name} src={user?.avatar} size="sm" />
            <div className="profile-info">
              <span className="profile-name">{user?.name}</span>
              <span className="profile-role">{user?.role}</span>
            </div>
          </button>

          {showProfileMenu && (
            <div className="profile-dropdown">
              <button className="dropdown-item">
                <User size={16} />
                <span>Profile</span>
              </button>
              <button className="dropdown-item" onClick={handleLogout}>
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .header {
          height: 70px;
          background: var(--bg-card);
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 var(--spacing-xl);
          position: sticky;
          top: 0;
          z-index: var(--z-sticky);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: var(--spacing-lg);
          flex: 1;
        }

        .menu-btn {
          display: none;
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: var(--spacing-sm);
          border-radius: var(--radius-md);
          transition: background var(--transition-base);
        }

        .menu-btn:hover {
          background: var(--bg-body);
        }

        .search-bar {
          position: relative;
          max-width: 400px;
          width: 100%;
        }

        .search-icon {
          position: absolute;
          left: 0.875rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-secondary);
        }

        .search-input {
          width: 100%;
          padding: 0.625rem 0.875rem 0.625rem 2.75rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-full);
          font-size: 0.875rem;
          background: var(--bg-body);
          transition: all var(--transition-base);
          outline: none;
          color: var(--text-primary);
        }

        .search-input:focus {
          background: var(--bg-card);
          border-color: var(--primary-500);
          box-shadow: 0 0 0 3px var(--primary-100);
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
        }

        .header-icon-btn {
          position: relative;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          border-radius: var(--radius-md);
          transition: all var(--transition-base);
        }

        .header-icon-btn:hover {
          background: var(--bg-body);
          color: var(--primary-600);
        }

        .notification-badge {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 18px;
          height: 18px;
          background: var(--error-500);
          color: white;
          font-size: 0.625rem;
          font-weight: 600;
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .profile-menu {
          position: relative;
        }

        .profile-btn {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          padding: 0.375rem 0.75rem;
          background: none;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-full);
          cursor: pointer;
          transition: all var(--transition-base);
        }

        .profile-btn:hover {
          background: var(--bg-body);
          border-color: var(--gray-400);
        }

        .profile-info {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .profile-name {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-primary);
        }

        .profile-role {
          font-size: 0.75rem;
          color: var(--text-secondary);
          text-transform: capitalize;
        }

        .profile-dropdown {
          position: absolute;
          top: calc(100% + 0.5rem);
          right: 0;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          min-width: 180px;
          overflow: hidden;
          animation: slideDown var(--transition-base);
        }

        .dropdown-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          padding: 0.75rem var(--spacing-md);
          background: none;
          border: none;
          color: var(--text-secondary);
          font-size: 0.875rem;
          cursor: pointer;
          transition: background var(--transition-base);
          text-align: left;
        }

        .dropdown-item:hover {
          background: var(--bg-body);
          color: var(--text-primary);
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .branding {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          margin-right: var(--spacing-lg);
          padding-right: var(--spacing-lg);
          border-right: 1px solid var(--border-color);
        }

        .header-school-logo {
          height: 32px;
          width: auto;
          object-fit: contain;
        }

        .header-school-icon {
          width: 32px;
          height: 32px;
          background: var(--primary-100);
          color: var(--primary-600);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .header-school-name {
          font-weight: 600;
          font-size: 0.9375rem;
          color: var(--text-primary);
          white-space: nowrap;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        @media (max-width: 1024px) {
           .header-school-name {
             display: none;
           }
        }

        @media (max-width: 768px) {
          .menu-btn {
            display: flex;
          }

          .branding {
             margin-right: 0;
             padding-right: 0;
             border-right: none;
          }

          .search-bar {
            display: none;
          }

          .profile-info {
            display: none;
          }
        }
      `}</style>
    </header>
  );
};

export default Header;
