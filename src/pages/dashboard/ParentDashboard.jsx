import React, { useEffect, useState } from 'react';
import { User, Calendar, DollarSign, FileText, Award, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { dashboardService } from '../../services/mockData';
import { formatCurrency } from '../../utils';
import Loading from '../../components/common/Loading';
import Breadcrumb from '../../components/common/Breadcrumb';
import Avatar from '../../components/common/Avatar';

const ParentDashboard = () => {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            await dashboardService.getStats('parent');
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const breadcrumbItems = [{ label: 'Dashboard', path: null }];

    const studentInfo = {
        name: 'Emma Wilson',
        rollNumber: 'STU001',
        class: 'Class 5-A',
        section: 'A',
        avatar: null,
    };

    const attendanceData = [
        { name: 'Present', value: 92, color: '#10b981' },
        { name: 'Absent', value: 5, color: '#ef4444' },
        { name: 'Leave', value: 3, color: '#f59e0b' },
    ];

    const academicProgress = [
        { month: 'Aug', score: 78 },
        { month: 'Sep', score: 82 },
        { month: 'Oct', score: 85 },
        { month: 'Nov', score: 88 },
        { month: 'Dec', score: 90 },
    ];

    const recentGrades = [
        { subject: 'Mathematics', marks: 92, total: 100, grade: 'A+' },
        { subject: 'English', marks: 88, total: 100, grade: 'A' },
        { subject: 'Science', marks: 85, total: 100, grade: 'A' },
        { subject: 'Social Studies', marks: 90, total: 100, grade: 'A+' },
        { subject: 'Computer Science', marks: 95, total: 100, grade: 'A+' },
    ];

    const feeStatus = {
        totalFee: 50000,
        paid: 35000,
        pending: 15000,
        dueDate: 'Dec 31, 2024',
    };

    const announcements = [
        { id: 1, title: 'Parent-Teacher Meeting', date: 'Dec 20, 2024', type: 'important' },
        { id: 2, title: 'Winter Break Notice', date: 'Dec 22, 2024', type: 'info' },
        { id: 3, title: 'Annual Day Celebration', date: 'Jan 15, 2025', type: 'event' },
    ];

    const upcomingEvents = [
        { id: 1, event: 'Final Exams', date: 'Jan 10-20, 2025' },
        { id: 2, event: 'Sports Day', date: 'Jan 25, 2025' },
        { id: 3, event: 'Science Fair', date: 'Feb 5, 2025' },
    ];

    if (loading) {
        return <Loading fullScreen />;
    }

    return (
        <div className="dashboard-page">
            <Breadcrumb items={breadcrumbItems} />

            <div className="dashboard-header">
                <div>
                    <h1>Parent Dashboard</h1>
                    <p className="text-gray-600">Track your child's academic progress and activities</p>
                </div>
            </div>

            {/* Student Profile Card */}
            <div className="card mb-xl">
                <div className="student-profile">
                    <Avatar name={studentInfo.name} src={studentInfo.avatar} size="xl" />
                    <div className="student-info">
                        <h2 className="student-name">{studentInfo.name}</h2>
                        <div className="student-details">
                            <span className="detail-item">
                                <strong>Roll No:</strong> {studentInfo.rollNumber}
                            </span>
                            <span className="detail-separator">•</span>
                            <span className="detail-item">
                                <strong>Class:</strong> {studentInfo.class}
                            </span>
                            <span className="detail-separator">•</span>
                            <span className="detail-item">
                                <strong>Section:</strong> {studentInfo.section}
                            </span>
                        </div>
                    </div>
                    <div className="student-stats">
                        <div className="stat-box">
                            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                                <TrendingUp size={20} />
                            </div>
                            <div>
                                <div className="stat-value">90%</div>
                                <div className="stat-label">Overall Score</div>
                            </div>
                        </div>
                        <div className="stat-box">
                            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                                <Award size={20} />
                            </div>
                            <div>
                                <div className="stat-value">Rank 3</div>
                                <div className="stat-label">Class Rank</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-3 mb-xl">
                {/* Attendance Overview */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Attendance Overview</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie
                                data={attendanceData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {attendanceData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="attendance-legend">
                        {attendanceData.map((item, index) => (
                            <div key={index} className="legend-item">
                                <div className="legend-color" style={{ background: item.color }}></div>
                                <span className="legend-label">{item.name}</span>
                                <span className="legend-value">{item.value}%</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Fee Status */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Fee Status</h3>
                    </div>
                    <div className="fee-details">
                        <div className="fee-row">
                            <span className="fee-label">Total Fee</span>
                            <span className="fee-value">{formatCurrency(feeStatus.totalFee)}</span>
                        </div>
                        <div className="fee-row">
                            <span className="fee-label">Paid</span>
                            <span className="fee-value text-success-600">{formatCurrency(feeStatus.paid)}</span>
                        </div>
                        <div className="fee-row">
                            <span className="fee-label">Pending</span>
                            <span className="fee-value text-error-600">{formatCurrency(feeStatus.pending)}</span>
                        </div>
                        <div className="fee-progress">
                            <div className="progress-bar">
                                <div
                                    className="progress-fill"
                                    style={{ width: `${(feeStatus.paid / feeStatus.totalFee) * 100}%` }}
                                ></div>
                            </div>
                            <span className="progress-text">
                                {Math.round((feeStatus.paid / feeStatus.totalFee) * 100)}% Paid
                            </span>
                        </div>
                        <div className="fee-due">
                            <span className="due-label">Due Date:</span>
                            <span className="due-date">{feeStatus.dueDate}</span>
                        </div>
                        <button className="btn btn-primary" style={{ width: '100%', marginTop: 'var(--spacing-md)' }}>
                            <DollarSign size={18} />
                            <span>Pay Now</span>
                        </button>
                    </div>
                </div>

                {/* Upcoming Events */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Upcoming Events</h3>
                    </div>
                    <div className="events-list">
                        {upcomingEvents.map((event) => (
                            <div key={event.id} className="event-item">
                                <div className="event-icon">
                                    <Calendar size={18} />
                                </div>
                                <div className="event-details">
                                    <h4 className="event-name">{event.event}</h4>
                                    <p className="event-date">{event.date}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-2 mb-xl">
                {/* Academic Progress */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Academic Progress</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={academicProgress}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="month" stroke="#6b7280" />
                            <YAxis stroke="#6b7280" />
                            <Tooltip />
                            <Line type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={3} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Recent Grades */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Recent Grades</h3>
                    </div>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Subject</th>
                                    <th>Marks</th>
                                    <th>Grade</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentGrades.map((grade, index) => (
                                    <tr key={index}>
                                        <td className="font-medium">{grade.subject}</td>
                                        <td>{grade.marks}/{grade.total}</td>
                                        <td>
                                            <span className="badge badge-success">{grade.grade}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Announcements */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">Recent Announcements</h3>
                </div>
                <div className="announcements-list">
                    {announcements.map((announcement) => (
                        <div key={announcement.id} className="announcement-item">
                            <div className={`announcement-badge badge-${announcement.type}`}>
                                {announcement.type}
                            </div>
                            <div className="announcement-content">
                                <h4 className="announcement-title">{announcement.title}</h4>
                                <p className="announcement-date">{announcement.date}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <style jsx>{`
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

        .student-profile {
          display: flex;
          align-items: center;
          gap: var(--spacing-xl);
          padding: var(--spacing-lg);
        }

        .student-info {
          flex: 1;
        }

        .student-name {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--gray-900);
          margin-bottom: var(--spacing-sm);
        }

        .student-details {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          font-size: 0.875rem;
          color: var(--gray-600);
        }

        .detail-separator {
          color: var(--gray-400);
        }

        .student-stats {
          display: flex;
          gap: var(--spacing-lg);
        }

        .stat-box {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          padding: var(--spacing-md);
          background: var(--gray-50);
          border-radius: var(--radius-lg);
        }

        .stat-icon {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .stat-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--gray-900);
        }

        .stat-label {
          font-size: 0.75rem;
          color: var(--gray-600);
        }

        .attendance-legend {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
          padding: var(--spacing-md);
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
        }

        .legend-color {
          width: 12px;
          height: 12px;
          border-radius: var(--radius-sm);
        }

        .legend-label {
          flex: 1;
          font-size: 0.875rem;
          color: var(--gray-700);
        }

        .legend-value {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--gray-900);
        }

        .fee-details {
          padding: var(--spacing-md);
        }

        .fee-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-sm) 0;
          border-bottom: 1px solid var(--gray-200);
        }

        .fee-row:last-of-type {
          border-bottom: none;
        }

        .fee-label {
          font-size: 0.875rem;
          color: var(--gray-600);
        }

        .fee-value {
          font-size: 1rem;
          font-weight: 600;
          color: var(--gray-900);
        }

        .fee-progress {
          margin: var(--spacing-lg) 0;
        }

        .progress-bar {
          height: 8px;
          background: var(--gray-200);
          border-radius: var(--radius-full);
          overflow: hidden;
          margin-bottom: var(--spacing-sm);
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--success-500), var(--success-600));
          transition: width var(--transition-slow);
        }

        .progress-text {
          font-size: 0.75rem;
          color: var(--gray-600);
        }

        .fee-due {
          display: flex;
          justify-content: space-between;
          padding: var(--spacing-sm);
          background: var(--warning-50);
          border-radius: var(--radius-md);
          font-size: 0.875rem;
        }

        .due-label {
          color: var(--warning-700);
        }

        .due-date {
          font-weight: 600;
          color: var(--warning-900);
        }

        .events-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
          padding: var(--spacing-md);
        }

        .event-item {
          display: flex;
          gap: var(--spacing-md);
          padding: var(--spacing-md);
          background: var(--gray-50);
          border-radius: var(--radius-md);
        }

        .event-icon {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
        }

        .event-details {
          flex: 1;
        }

        .event-name {
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--gray-900);
          margin-bottom: 0.25rem;
        }

        .event-date {
          font-size: 0.8125rem;
          color: var(--gray-600);
          margin: 0;
        }

        .announcements-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .announcement-item {
          display: flex;
          gap: var(--spacing-md);
          padding: var(--spacing-md);
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-md);
          transition: all var(--transition-base);
        }

        .announcement-item:hover {
          border-color: var(--primary-300);
          box-shadow: var(--shadow-sm);
        }

        .announcement-badge {
          padding: 0.25rem 0.75rem;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          align-self: flex-start;
        }

        .badge-important {
          background: var(--error-100);
          color: var(--error-700);
        }

        .badge-info {
          background: var(--primary-100);
          color: var(--primary-700);
        }

        .badge-event {
          background: var(--secondary-100);
          color: var(--secondary-700);
        }

        .announcement-content {
          flex: 1;
        }

        .announcement-title {
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--gray-900);
          margin-bottom: 0.25rem;
        }

        .announcement-date {
          font-size: 0.8125rem;
          color: var(--gray-600);
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

export default ParentDashboard;
