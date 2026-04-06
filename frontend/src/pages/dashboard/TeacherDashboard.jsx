import React, { useEffect, useState } from 'react';
import { BookOpen, Users, ClipboardCheck, MessageSquare, Calendar, Bell } from 'lucide-react';
import { messagesService, studentsService } from '../../services/api';
import { useAuthStore } from '../../store';
import { USER_ROLES } from '../../constants';
import Loading from '../../components/common/Loading';
import Breadcrumb from '../../components/common/Breadcrumb';
import { ShieldAlert } from 'lucide-react';
import { getRelativeTime } from '../../utils';

const TeacherDashboard = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [recentMessages, setRecentMessages] = useState([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  const isAuthorized = [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.MANAGEMENT, USER_ROLES.TEACHER].includes(user?.role);

  useEffect(() => {
    if (isAuthorized) {
      loadDashboardData();
    }
  }, [isAuthorized]);

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-vh-50 text-center p-xl">
        <ShieldAlert size={64} className="text-error mb-md" />
        <h1 className="page-title">Access Denied</h1>
        <p className="text-gray-600 max-w-md">You do not have permission to view the teacher dashboard.</p>
        <button className="btn btn-primary mt-lg" onClick={() => window.history.back()}>Go Back</button>
      </div>
    );
  }

  const loadDashboardData = async () => {
    try {
      const [messagesRes, studentsRes] = await Promise.all([
        messagesService.getInbox(),
        studentsService.getAll({ pageSize: 1 }),
      ]);

      if (messagesRes.success && messagesRes.data) {
        const msgs = messagesRes.data.data || messagesRes.data || [];
        const arr = Array.isArray(msgs) ? msgs : [];
        setRecentMessages(arr.slice(0, 3));
        setUnreadCount(arr.filter(m => !m.isRead).length);
      }

      if (studentsRes.success && studentsRes.data) {
        setTotalStudents(studentsRes.data.total || studentsRes.data.data?.length || 0);
      }
    } catch (error) {
      // silently handle
    } finally {
      setLoading(false);
    }
  };

  const breadcrumbItems = [{ label: 'Dashboard', path: null }];

  // Pending tasks based on real context
  const pendingTasks = [
    { id: 1, task: 'Take attendance for your classes today', priority: 'high', dueDate: 'Today', link: '/attendance' },
    { id: 2, task: 'Review and upload exam marks', priority: 'high', dueDate: 'This week', link: '/exams' },
    { id: 3, task: 'Check pending leave requests', priority: 'medium', dueDate: 'This week', link: '/leave' },
    { id: 4, task: 'Review student performance reports', priority: 'low', dueDate: 'Ongoing', link: '/exams' },
  ];

  if (loading) {
    return <Loading fullScreen />;
  }

  return (
    <div className="dashboard-page">
      <Breadcrumb items={breadcrumbItems} />

      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Teacher Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.name?.split(' ')[0]}! Here's your overview.</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 mb-xl">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, var(--primary-500), var(--primary-600))' }}>
            <BookOpen size={24} />
          </div>
          <div className="stat-content">
            <h3 className="stat-value">—</h3>
            <p className="stat-label">Assigned Classes</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, var(--secondary-500), var(--secondary-600))' }}>
            <Users size={24} />
          </div>
          <div className="stat-content">
            <h3 className="stat-value">{totalStudents > 0 ? totalStudents : '—'}</h3>
            <p className="stat-label">School Students</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, var(--success-500), var(--success-600))' }}>
            <ClipboardCheck size={24} />
          </div>
          <div className="stat-content">
            <h3 className="stat-value">{pendingTasks.filter(t => t.priority === 'high').length}</h3>
            <p className="stat-label">High Priority Tasks</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, var(--warning-500), var(--warning-600))' }}>
            <MessageSquare size={24} />
          </div>
          <div className="stat-content">
            <h3 className="stat-value">{unreadCount}</h3>
            <p className="stat-label">Unread Messages</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-3 mb-xl">
        {/* Quick Actions */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header">
            <h3 className="card-title">
              <Calendar size={20} style={{ display: 'inline', marginRight: '8px' }} />
              Quick Actions
            </h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', padding: 'var(--spacing-md)' }}>
            {[
              { label: 'Take Attendance', desc: 'Mark student attendance for today', link: '/attendance', color: 'var(--primary-500)' },
              { label: 'Upload Exam Marks', desc: 'Add results for recent exams', link: '/exams', color: 'var(--success-500)' },
              { label: 'Send Message', desc: 'Communicate with parents or admin', link: '/messages', color: 'var(--secondary-500)' },
              { label: 'View Timetable', desc: 'Check your class schedule', link: '/timetable', color: 'var(--warning-500)' },
            ].map((action) => (
              <a key={action.label} href={action.link} style={{ textDecoration: 'none' }}>
                <div className="task-item" style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = action.color}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: action.color, marginBottom: '0.5rem' }} />
                  <p className="task-text" style={{ fontWeight: 600 }}>{action.label}</p>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>{action.desc}</p>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Bell size={20} style={{ display: 'inline', marginRight: '8px' }} />
              Pending Tasks
            </h3>
          </div>
          <div className="task-list">
            {pendingTasks.map((task) => (
              <div key={task.id} className="task-item">
                <div className="task-header">
                  <span className={`priority-badge priority-${task.priority}`}>{task.priority}</span>
                  <span className="task-due">{task.dueDate}</span>
                </div>
                <p className="task-text">{task.task}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Messages */}
      <div className="card mb-xl">
        <div className="card-header">
          <h3 className="card-title">Recent Messages</h3>
          <a href="/messages" className="text-sm font-semibold" style={{ color: 'var(--primary-600)', textDecoration: 'none' }}>View All</a>
        </div>
        <div className="message-list">
          {recentMessages.length === 0 ? (
            <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--text-secondary)' }}>No messages yet</div>
          ) : recentMessages.map((msg) => (
            <div key={msg.id} className={`message-item ${!msg.isRead ? 'unread' : ''}`}>
              <div className="message-header">
                <span className="message-from">{msg.senderName || msg.sender?.name || 'Unknown'}</span>
                <span className="message-time">{getRelativeTime(msg.createdAt)}</span>
              </div>
              <p className="message-text">{msg.subject}</p>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .dashboard-page { animation: fadeIn 0.3s ease-in-out; }
        .dashboard-header { margin-bottom: var(--spacing-xl); }

        .stat-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
          box-shadow: var(--shadow-sm);
          display: flex;
          gap: var(--spacing-md);
          align-items: center;
          transition: all var(--transition-base);
        }
        .stat-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
        .stat-icon {
          width: 56px; height: 56px;
          border-radius: var(--radius-lg);
          display: flex; align-items: center; justify-content: center;
          color: white; flex-shrink: 0;
        }
        .stat-value { font-size: 1.875rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.25rem; }
        .stat-label { font-size: 0.875rem; color: var(--text-secondary); margin: 0; }

        .task-list { display: flex; flex-direction: column; gap: var(--spacing-md); }
        .task-item {
          padding: var(--spacing-md);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
          transition: all var(--transition-base);
        }
        .task-item:hover { border-color: var(--primary-300); box-shadow: var(--shadow-sm); }
        .task-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-sm); }
        .priority-badge { font-size: 0.75rem; padding: 0.125rem 0.5rem; border-radius: var(--radius-full); text-transform: uppercase; font-weight: 600; }
        .priority-high { background: var(--error-100); color: var(--error-700); }
        .priority-medium { background: var(--warning-100); color: var(--warning-700); }
        .priority-low { background: var(--gray-100); color: var(--text-primary); }
        .task-due { font-size: 0.75rem; color: var(--gray-500); }
        .task-text { font-size: 0.875rem; color: var(--text-primary); margin: 0; }

        .message-list { display: flex; flex-direction: column; }
        .message-item {
          padding: var(--spacing-md);
          border-bottom: 1px solid var(--border-color);
          transition: all var(--transition-base);
        }
        .message-item:hover { background: var(--gray-50); }
        .message-item.unread { background: var(--primary-50); }
        .message-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem; }
        .message-from { font-size: 0.875rem; font-weight: 600; color: var(--text-primary); }
        .message-time { font-size: 0.75rem; color: var(--gray-500); }
        .message-text { font-size: 0.875rem; color: var(--text-secondary); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default TeacherDashboard;
