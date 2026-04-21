import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PanelLeftClose } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useAuthStore, useSchoolStore } from '../../store';
import { NAVIGATION_ITEMS, SCHOOL_INFO } from '../../constants';
import { messagingService } from '../../services/api';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user } = useAuthStore();
  const { currentSchool } = useSchoolStore();

  const navigationItems = NAVIGATION_ITEMS[user?.role] || [];

  // Sidebar badge for unread messages.
  //  • Poll every 15s and skip the call if the tab is hidden to avoid
  //    waking backgrounded tabs.
  //  • Reset to 0 immediately when the user navigates to /messages —
  //    opening any conversation marks it read on the server, so a
  //    stale number on the badge would feel laggy.
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    const fetchCount = async () => {
      if (document.hidden) return;
      try {
        const res = await messagingService.getUnreadCount();
        if (!cancelled && res?.success && res.data) {
          setUnreadMessages(Number(res.data.count || 0));
        }
      } catch {
        /* ignore — don't flash the UI for transient poll errors */
      }
    };

    fetchCount();
    const id = setInterval(fetchCount, 15000);
    const onVis = () => {
      if (!document.hidden) fetchCount();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [user?.id]);

  // Optimistic zero when the user is on the messages page.
  useEffect(() => {
    if (location.pathname === '/messages' || location.pathname.startsWith('/messages/')) {
      setUnreadMessages(0);
    }
  }, [location.pathname]);

  const schoolName = currentSchool?.name || SCHOOL_INFO.name;
  const schoolTagline = currentSchool?.tagline || SCHOOL_INFO.tagline;

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <>
      {/* Overlay — shown when sidebar is open on any screen size where it overlays */}
      <div
        className={`sidebar-overlay ${isOpen ? 'show' : ''}`}
        onClick={onClose}
      />

      <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon">
              {currentSchool?.logo ? (
                <img src={currentSchool.logo} alt="Logo" className="w-full h-full object-cover rounded-lg" />
              ) : (
                <Icons.GraduationCap size={28} className="text-primary-600" />
              )}
            </div>
            <div className="logo-text">
              <h1 className="logo-name">{schoolName}</h1>
              <p className="logo-tagline">{schoolTagline}</p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Collapse sidebar" title="Collapse sidebar">
            <PanelLeftClose size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navigationItems.map((item) => {
            const Icon = Icons[item.icon];
            const active = isActive(item.path);
            const badgeCount = item.id === 'messages' ? unreadMessages : 0;
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`sidebar-nav-item ${active ? 'active' : ''}`}
                onClick={() => {
                  // On mobile, close sidebar on nav click
                  if (window.innerWidth < 1024) onClose();
                }}
              >
                <span className="nav-icon-wrap">
                  <Icon size={20} />
                  {badgeCount > 0 && (
                    <span className="nav-badge">
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  )}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <p className="footer-copy">© 2024 {SCHOOL_INFO.name}</p>
        </div>

        <style>{`
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
            z-index: 200;
            transition: transform 0.25s cubic-bezier(0.4,0,0.2,1), box-shadow 0.25s;
            overflow: hidden;
          }

          /* Desktop: sidebar toggles with transform, main content adjusts via DashboardLayout */
          .sidebar.open {
            transform: translateX(0);
            box-shadow: none;
          }

          .sidebar.closed {
            transform: translateX(-100%);
          }

          /* Overlay: visible whenever sidebar is open on any screen */
          .sidebar-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.45);
            z-index: 199;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.25s;
          }
          .sidebar-overlay.show {
            opacity: 1;
            pointer-events: auto;
          }

          .sidebar-header {
            padding: 1.25rem 1rem 1.25rem 1.25rem;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 0.5rem;
            min-height: 72px;
          }

          .sidebar-logo {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            overflow: hidden;
            flex: 1;
            min-width: 0;
          }

          .logo-icon {
            width: 44px;
            height: 44px;
            min-width: 44px;
            background: linear-gradient(135deg, var(--primary-50), var(--primary-100));
            border-radius: var(--radius-lg);
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .logo-text { overflow: hidden; min-width: 0; }
          .logo-name {
            font-size: 0.9rem;
            font-weight: 700;
            color: var(--text-primary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            line-height: 1.3;
          }
          .logo-tagline {
            font-size: 0.7rem;
            color: var(--text-secondary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-top: 1px;
          }

          .close-btn {
            flex-shrink: 0;
            width: 32px;
            height: 32px;
            border-radius: var(--radius-md);
            border: 1px solid var(--border-color);
            background: var(--bg-body);
            color: var(--text-secondary);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.15s;
          }
          .close-btn:hover {
            background: var(--error-50, #fef2f2);
            color: var(--error-600, #dc2626);
            border-color: var(--error-200, #fecaca);
          }

          .sidebar-nav {
            flex: 1;
            padding: 0.75rem;
            overflow-y: auto;
            overflow-x: hidden;
          }

          .sidebar-nav-item {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.65rem 0.875rem;
            margin-bottom: 2px;
            border-radius: var(--radius-md);
            color: var(--text-secondary);
            font-size: 0.875rem;
            font-weight: 500;
            transition: all 0.15s;
            text-decoration: none;
            white-space: nowrap;
          }

          .sidebar-nav-item:hover {
            background: var(--bg-body);
            color: var(--primary-600);
          }

          .sidebar-nav-item.active {
            background: linear-gradient(135deg, var(--primary-50), var(--primary-100));
            color: var(--primary-700);
            font-weight: 600;
          }

          /* Unread-message badge on the Messages nav item */
          .nav-icon-wrap {
            position: relative;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 20px;
            height: 20px;
          }
          .nav-badge {
            position: absolute;
            top: -6px;
            right: -8px;
            min-width: 18px;
            height: 18px;
            padding: 0 5px;
            background: #ef4444;
            color: #fff;
            border-radius: 10px;
            font-size: 0.65rem;
            font-weight: 700;
            line-height: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 0 2px var(--bg-card, #fff);
          }

          .sidebar-footer {
            padding: 0.75rem 1rem;
            border-top: 1px solid var(--border-color);
          }
          .footer-copy {
            font-size: 0.7rem;
            color: var(--text-tertiary, #9ca3af);
            text-align: center;
          }
        `}</style>
      </aside>
    </>
  );
};

export default Sidebar;
