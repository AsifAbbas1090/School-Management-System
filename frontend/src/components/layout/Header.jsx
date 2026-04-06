import React, { useState, useEffect, useRef } from 'react';
import { Bell, Search, Moon, Sun, LogOut, User, Menu, Building, Settings, ChevronDown } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore, useThemeStore, useSchoolStore } from '../../store';
import Avatar from '../common/Avatar';

const roleLabel = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'School Admin',
  MANAGEMENT: 'Management',
  TEACHER: 'Teacher',
  PARENT: 'Parent',
  STUDENT: 'Student',
  SUPPORT_STAFF: 'Support Staff',
};

const Header = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { currentSchool } = useSchoolStore();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="header-left">
        {/* Hamburger — always visible, toggles sidebar */}
        <button className="menu-btn" onClick={onMenuClick} aria-label="Toggle sidebar">
          <Menu size={20} />
        </button>

        {/* School branding */}
        <div className="branding">
          {currentSchool?.logo ? (
            <img src={currentSchool.logo} alt={currentSchool.name} className="header-school-logo" />
          ) : (
            <div className="header-school-icon">
              <Building size={18} />
            </div>
          )}
          <span className="header-school-name">{currentSchool?.name || 'School CMS'}</span>
        </div>

        {/* Search */}
        <div className="header-search">
          <Search size={16} className="header-search-icon" />
          <input
            type="text"
            placeholder="Search students, teachers, fees…"
            className="header-search-input"
            aria-label="Global search"
          />
        </div>
      </div>

      <div className="header-right">
        {/* Theme toggle */}
        <button className="hdr-btn" onClick={toggleTheme} aria-label="Toggle theme" title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* Notifications */}
        <button className="hdr-btn hdr-btn-notif" aria-label="Notifications">
          <Bell size={18} />
          <span className="notif-dot" aria-hidden="true" />
        </button>

        {/* Divider */}
        <div className="hdr-divider" />

        {/* Profile */}
        <div className="profile-wrap" ref={profileRef}>
          <button
            className="profile-btn"
            onClick={() => setShowProfileMenu(v => !v)}
            aria-label="Account menu"
            aria-expanded={showProfileMenu}
          >
            <Avatar name={user?.name} src={user?.avatar} size="sm" />
            <div className="profile-text">
              <span className="profile-name">{user?.name || 'User'}</span>
              <span className="profile-role">{roleLabel[user?.role] || user?.role}</span>
            </div>
            <ChevronDown size={14} className={`profile-chevron ${showProfileMenu ? 'open' : ''}`} />
          </button>

          {showProfileMenu && (
            <div className="profile-dropdown">
              <div className="dropdown-user-header">
                <Avatar name={user?.name} src={user?.avatar} size="md" />
                <div>
                  <div className="dropdown-user-name">{user?.name}</div>
                  <div className="dropdown-user-email">{user?.email}</div>
                </div>
              </div>
              <div className="dropdown-divider" />
              <Link to="/settings" className="dropdown-item" onClick={() => setShowProfileMenu(false)}>
                <Settings size={15} />
                <span>Settings</span>
              </Link>
              <button className="dropdown-item dropdown-item-danger" onClick={handleLogout}>
                <LogOut size={15} />
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .header {
          height: 64px;
          background: var(--bg-card);
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 1.25rem;
          position: sticky;
          top: 0;
          z-index: var(--z-sticky);
          gap: 1rem;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 0.875rem;
          flex: 1;
          min-width: 0;
        }

        .menu-btn {
          flex-shrink: 0;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          border-radius: var(--radius-md);
          transition: all var(--transition-fast);
        }
        .menu-btn:hover {
          background: var(--gray-100);
          color: var(--text-primary);
        }

        /* Branding */
        .branding {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-shrink: 0;
          padding-right: 0.875rem;
          border-right: 1px solid var(--border-color);
        }
        .header-school-logo {
          height: 28px;
          width: auto;
          object-fit: contain;
          border-radius: 4px;
        }
        .header-school-icon {
          width: 28px;
          height: 28px;
          background: var(--primary-100);
          color: var(--primary-600);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .header-school-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 180px;
        }

        /* Search */
        .header-search {
          position: relative;
          flex: 1;
          max-width: 380px;
        }
        .header-search-icon {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--gray-400);
          pointer-events: none;
        }
        .header-search-input {
          width: 100%;
          height: 36px;
          padding: 0 0.875rem 0 2.25rem;
          font-size: 0.8125rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-full);
          background: var(--bg-body);
          color: var(--text-primary);
          outline: none;
          transition: all var(--transition-base);
        }
        .header-search-input::placeholder { color: var(--gray-400); }
        .header-search-input:focus {
          background: var(--bg-card);
          border-color: var(--primary-400);
          box-shadow: 0 0 0 3px var(--primary-100);
        }

        /* Right actions */
        .header-right {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          flex-shrink: 0;
        }

        .hdr-btn {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          border-radius: var(--radius-md);
          transition: all var(--transition-fast);
          position: relative;
        }
        .hdr-btn:hover {
          background: var(--gray-100);
          color: var(--primary-600);
        }

        .hdr-btn-notif .notif-dot {
          position: absolute;
          top: 7px;
          right: 7px;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--error-500);
          border: 2px solid var(--bg-card);
        }

        .hdr-divider {
          width: 1px;
          height: 24px;
          background: var(--border-color);
          margin: 0 0.25rem;
        }

        /* Profile button */
        .profile-wrap { position: relative; }

        .profile-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.3125rem 0.625rem 0.3125rem 0.375rem;
          background: none;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-full);
          cursor: pointer;
          transition: all var(--transition-fast);
          max-width: 220px;
        }
        .profile-btn:hover {
          background: var(--gray-50);
          border-color: var(--gray-300);
        }

        .profile-text {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          min-width: 0;
        }
        .profile-name {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 120px;
        }
        .profile-role {
          font-size: 0.6875rem;
          color: var(--text-secondary);
          white-space: nowrap;
        }

        .profile-chevron {
          color: var(--gray-400);
          flex-shrink: 0;
          transition: transform var(--transition-fast);
        }
        .profile-chevron.open { transform: rotate(180deg); }

        /* Dropdown */
        .profile-dropdown {
          position: absolute;
          top: calc(100% + 6px);
          right: 0;
          min-width: 220px;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-xl);
          overflow: hidden;
          z-index: var(--z-dropdown);
          animation: slideDown 0.15s ease;
        }

        .dropdown-user-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1rem;
          background: var(--gray-50);
        }
        .dropdown-user-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 140px;
        }
        .dropdown-user-email {
          font-size: 0.75rem;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 140px;
        }

        .dropdown-divider {
          height: 1px;
          background: var(--border-color);
        }

        .dropdown-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.625rem 1rem;
          background: none;
          border: none;
          color: var(--text-secondary);
          font-size: 0.875rem;
          cursor: pointer;
          transition: all var(--transition-fast);
          text-decoration: none;
          text-align: left;
        }
        .dropdown-item:hover {
          background: var(--gray-50);
          color: var(--text-primary);
        }
        .dropdown-item-danger:hover {
          background: var(--error-50);
          color: var(--error-600);
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .header-school-name { display: none; }
          .branding { padding-right: 0.5rem; }
        }
        @media (max-width: 768px) {
          .header-search { display: none; }
          .profile-text  { display: none; }
          .profile-chevron { display: none; }
          .hdr-divider   { display: none; }
          .branding { border-right: none; padding-right: 0; }
        }
      `}</style>
    </header>
  );
};

export default Header;
