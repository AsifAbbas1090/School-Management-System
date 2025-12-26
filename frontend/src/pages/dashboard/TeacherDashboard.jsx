import React, { useEffect, useState } from 'react';
import { BookOpen, Users, ClipboardCheck, MessageSquare, Calendar, Bell } from 'lucide-react';
import { analyticsService } from '../../services/api';
import { useAuthStore } from '../../store';
import { USER_ROLES } from '../../constants';
import Loading from '../../components/common/Loading';
import Breadcrumb from '../../components/common/Breadcrumb';
import { ShieldAlert } from 'lucide-react';

const TeacherDashboard = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);

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
        <h1 className="text-2xl font-bold mb-sm">Access Denied</h1>
        <p className="text-gray-600 max-w-md">
          You do not have permission to view the teacher dashboard.
        </p>
        <button
          className="btn btn-primary mt-lg"
          onClick={() => window.history.back()}
        >
          Go Back
        </button>
      </div>
    );
  }

  const loadDashboardData = async () => {
    try {
      const response = await analyticsService.getDashboardStats();
      if (response.success && response.data) {
        // Teacher dashboard can use same stats
        setLoading(false);
      }
    } catch (error) {
      // Silently handle errors - UI shows empty state
    } finally {
      setLoading(false);
    }
  };

  const breadcrumbItems = [{ label: 'Dashboard', path: null }];

  const assignedClasses = [
    { id: 1, name: 'Class 5-A', subject: 'Mathematics', students: 30, schedule: 'Mon, Wed, Fri - 9:00 AM' },
    { id: 2, name: 'Class 4-B', subject: 'Mathematics', students: 28, schedule: 'Tue, Thu - 10:00 AM' },
    { id: 3, name: 'Class 3-A', subject: 'Science', students: 25, schedule: 'Mon, Wed - 2:00 PM' },
  ];

  const todaySchedule = [
    { time: '09:00 AM', class: 'Class 5-A', subject: 'Mathematics', room: 'Room 101', status: 'completed' },
    { time: '10:30 AM', class: 'Class 4-B', subject: 'Mathematics', room: 'Room 102', status: 'completed' },
    { time: '02:00 PM', class: 'Class 3-A', subject: 'Science', room: 'Lab 1', status: 'upcoming' },
  ];

  const pendingTasks = [
    { id: 1, task: 'Take attendance for Class 5-A', priority: 'high', dueDate: 'Today' },
    { id: 2, task: 'Upload marks for Midterm Exam', priority: 'high', dueDate: 'Tomorrow' },
    { id: 3, task: 'Prepare lesson plan for next week', priority: 'medium', dueDate: 'Dec 15' },
    { id: 4, task: 'Review homework submissions', priority: 'low', dueDate: 'Dec 16' },
  ];

  const recentMessages = [
    { id: 1, from: 'Parent - John Doe', message: 'Request for meeting regarding Emma\'s progress', time: '2 hours ago', unread: true },
    { id: 2, from: 'Admin', message: 'Staff meeting scheduled for tomorrow at 3 PM', time: '5 hours ago', unread: true },
    { id: 3, from: 'Parent - Jane Smith', message: 'Thank you for the extra help with mathematics', time: '1 day ago', unread: false },
  ];

  const classPerformance = [
    { class: 'Class 5-A', average: 85, attendance: 95, assignments: 28 },
    { class: 'Class 4-B', average: 78, attendance: 92, assignments: 25 },
    { class: 'Class 3-A', average: 82, attendance: 90, assignments: 22 },
  ];

  if (loading) {
    return <Loading fullScreen />;
  }

  return (
    <div className="dashboard-page">
      <Breadcrumb items={breadcrumbItems} />

      <div className="dashboard-header">
        <div>
          <h1>Teacher Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's your teaching schedule and tasks</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 mb-xl">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
            <BookOpen size={24} />
          </div>
          <div className="stat-content">
            <h3 className="stat-value">{assignedClasses.length}</h3>
            <p className="stat-label">Assigned Classes</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
            <Users size={24} />
          </div>
          <div className="stat-content">
            <h3 className="stat-value">83</h3>
            <p className="stat-label">Total Students</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <ClipboardCheck size={24} />
          </div>
          <div className="stat-content">
            <h3 className="stat-value">2</h3>
            <p className="stat-label">Pending Tasks</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            <MessageSquare size={24} />
          </div>
          <div className="stat-content">
            <h3 className="stat-value">2</h3>
            <p className="stat-label">Unread Messages</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-3 mb-xl">
        {/* Today's Schedule */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header">
            <h3 className="card-title">
              <Calendar size={20} style={{ display: 'inline', marginRight: '8px' }} />
              Today's Schedule
            </h3>
          </div>
          <div className="schedule-list">
            {todaySchedule.map((item, index) => (
              <div key={index} className="schedule-item">
                <div className="schedule-time">
                  <span className="time-text">{item.time}</span>
                  <span className={`status-badge status-${item.status}`}>
                    {item.status}
                  </span>
                </div>
                <div className="schedule-details">
                  <h4 className="schedule-class">{item.class} - {item.subject}</h4>
                  <p className="schedule-room">{item.room}</p>
                </div>
              </div>
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
                  <span className={`priority-badge priority-${task.priority}`}>
                    {task.priority}
                  </span>
                  <span className="task-due">{task.dueDate}</span>
                </div>
                <p className="task-text">{task.task}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-2 mb-xl">
        {/* Assigned Classes */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">My Classes</h3>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Subject</th>
                  <th>Students</th>
                  <th>Schedule</th>
                </tr>
              </thead>
              <tbody>
                {assignedClasses.map((cls) => (
                  <tr key={cls.id}>
                    <td className="font-medium">{cls.name}</td>
                    <td>{cls.subject}</td>
                    <td>{cls.students}</td>
                    <td className="text-sm text-gray-600">{cls.schedule}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Messages */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Messages</h3>
          </div>
          <div className="message-list">
            {recentMessages.map((msg) => (
              <div key={msg.id} className={`message-item ${msg.unread ? 'unread' : ''}`}>
                <div className="message-header">
                  <span className="message-from">{msg.from}</span>
                  <span className="message-time">{msg.time}</span>
                </div>
                <p className="message-text">{msg.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .dashboard-page {
          animation: fadeIn 0.3s ease-in-out;
        }

        .dashboard-header {
          margin-bottom: var(--spacing-xl);
        }

        .dashboard-header h1 {
          font-size: 2rem;
          font-weight: 700;
          color: var(--gray-900);
          margin-bottom: var(--spacing-xs);
        }

        .stat-card {
          background: white;
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
          box-shadow: var(--shadow-sm);
          display: flex;
          gap: var(--spacing-md);
          align-items: center;
          transition: all var(--transition-base);
        }

        .stat-card:hover {
          box-shadow: var(--shadow-md);
          transform: translateY(-2px);
        }

        .stat-icon {
          width: 56px;
          height: 56px;
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
        }

        .stat-content {
          flex: 1;
        }

        .stat-value {
          font-size: 1.875rem;
          font-weight: 700;
          color: var(--gray-900);
          margin-bottom: 0.25rem;
        }

        .stat-label {
          font-size: 0.875rem;
          color: var(--gray-600);
          margin: 0;
        }

        .schedule-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .schedule-item {
          display: flex;
          gap: var(--spacing-lg);
          padding: var(--spacing-md);
          border-radius: var(--radius-md);
          background: var(--gray-50);
          transition: background var(--transition-base);
        }

        .schedule-item:hover {
          background: var(--gray-100);
        }

        .schedule-time {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
          min-width: 100px;
        }

        .time-text {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--gray-900);
        }

        .status-badge {
          font-size: 0.75rem;
          padding: 0.125rem 0.5rem;
          border-radius: var(--radius-full);
          text-transform: capitalize;
        }

        .status-completed {
          background: var(--success-100);
          color: var(--success-700);
        }

        .status-upcoming {
          background: var(--primary-100);
          color: var(--primary-700);
        }

        .schedule-details {
          flex: 1;
        }

        .schedule-class {
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--gray-900);
          margin-bottom: 0.25rem;
        }

        .schedule-room {
          font-size: 0.8125rem;
          color: var(--gray-600);
          margin: 0;
        }

        .task-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .task-item {
          padding: var(--spacing-md);
          border-radius: var(--radius-md);
          border: 1px solid var(--gray-200);
          transition: all var(--transition-base);
        }

        .task-item:hover {
          border-color: var(--primary-300);
          box-shadow: var(--shadow-sm);
        }

        .task-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-sm);
        }

        .priority-badge {
          font-size: 0.75rem;
          padding: 0.125rem 0.5rem;
          border-radius: var(--radius-full);
          text-transform: uppercase;
          font-weight: 600;
        }

        .priority-high {
          background: var(--error-100);
          color: var(--error-700);
        }

        .priority-medium {
          background: var(--warning-100);
          color: var(--warning-700);
        }

        .priority-low {
          background: var(--gray-100);
          color: var(--gray-700);
        }

        .task-due {
          font-size: 0.75rem;
          color: var(--gray-500);
        }

        .task-text {
          font-size: 0.875rem;
          color: var(--gray-900);
          margin: 0;
        }

        .message-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .message-item {
          padding: var(--spacing-md);
          border-radius: var(--radius-md);
          border: 1px solid var(--gray-200);
          transition: all var(--transition-base);
        }

        .message-item.unread {
          background: var(--primary-50);
          border-color: var(--primary-200);
        }

        .message-item:hover {
          box-shadow: var(--shadow-sm);
        }

        .message-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-sm);
        }

        .message-from {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--gray-900);
        }

        .message-time {
          font-size: 0.75rem;
          color: var(--gray-500);
        }

        .message-text {
          font-size: 0.875rem;
          color: var(--gray-700);
          margin: 0;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default TeacherDashboard;
