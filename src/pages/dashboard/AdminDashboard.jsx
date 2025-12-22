import React, { useEffect, useState } from 'react';
import { Users, UserCheck, UserCircle, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { dashboardService } from '../../services/mockData';
import { formatCurrency } from '../../utils';
import { useAuthStore } from '../../store';
import { USER_ROLES } from '../../constants';
import Loading from '../../components/common/Loading';
import Breadcrumb from '../../components/common/Breadcrumb';
import { ShieldAlert } from 'lucide-react';

const AdminDashboard = () => {
    const { user } = useAuthStore();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const isAuthorized = [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(user?.role);

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
                    You do not have permission to view the admin dashboard.
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
            const response = await dashboardService.getStats('admin');
            if (response.success) {
                setStats(response.data);
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const breadcrumbItems = [
        { label: 'Dashboard', path: null },
    ];

    const kpiCards = stats ? [
        {
            title: 'Total Students',
            value: stats.totalStudents,
            icon: Users,
            color: 'primary',
            trend: '+12%',
            trendUp: true,
        },
        {
            title: 'Total Teachers',
            value: stats.totalTeachers,
            icon: UserCheck,
            color: 'secondary',
            trend: '+5%',
            trendUp: true,
        },
        {
            title: 'Total Parents',
            value: stats.totalParents,
            icon: UserCircle,
            color: 'success',
            trend: '+8%',
            trendUp: true,
        },
        {
            title: 'Fee Collected',
            value: formatCurrency(stats.feeCollected),
            icon: DollarSign,
            color: 'warning',
            trend: '+15%',
            trendUp: true,
        },
    ] : [];

    const monthlyFeeData = [
        { month: 'Jan', collected: 45000, pending: 15000 },
        { month: 'Feb', collected: 52000, pending: 12000 },
        { month: 'Mar', collected: 48000, pending: 18000 },
        { month: 'Apr', collected: 61000, pending: 10000 },
        { month: 'May', collected: 55000, pending: 14000 },
        { month: 'Jun', collected: 67000, pending: 8000 },
    ];

    const attendanceData = [
        { day: 'Mon', present: 145, absent: 15 },
        { day: 'Tue', present: 152, absent: 8 },
        { day: 'Wed', present: 148, absent: 12 },
        { day: 'Thu', present: 155, absent: 5 },
        { day: 'Fri', present: 150, absent: 10 },
    ];

    const classDistribution = [
        { name: 'Class 1', value: 60 },
        { name: 'Class 2', value: 58 },
        { name: 'Class 3', value: 55 },
        { name: 'Class 4', value: 52 },
        { name: 'Class 5', value: 50 },
    ];

    const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

    const recentActivities = [
        { id: 1, type: 'student', message: 'New student Emma Wilson enrolled in Class 1-A', time: '2 hours ago' },
        { id: 2, type: 'fee', message: 'Fee payment received from John Doe - $5,000', time: '3 hours ago' },
        { id: 3, type: 'teacher', message: 'Teacher Sarah Johnson updated attendance for Class 2-B', time: '5 hours ago' },
        { id: 4, type: 'announcement', message: 'New announcement posted: Parent-Teacher Meeting', time: '1 day ago' },
        { id: 5, type: 'exam', message: 'Midterm exam results published for Class 3', time: '2 days ago' },
    ];

    if (loading) {
        return <Loading fullScreen />;
    }

    return (
        <div className="dashboard-page">
            <Breadcrumb items={breadcrumbItems} />

            <div className="dashboard-header">
                <div>
                    <h1>Admin Dashboard</h1>
                    <p className="text-gray-600">Welcome back! Here's what's happening today.</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-4 mb-xl">
                {kpiCards.map((card, index) => {
                    const Icon = card.icon;
                    return (
                        <div key={index} className="kpi-card">
                            <div className="kpi-header">
                                <div className={`kpi-icon kpi-icon-${card.color}`}>
                                    <Icon size={24} />
                                </div>
                                <div className={`kpi-trend ${card.trendUp ? 'trend-up' : 'trend-down'}`}>
                                    {card.trendUp ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                    <span>{card.trend}</span>
                                </div>
                            </div>
                            <div className="kpi-body">
                                <h3 className="kpi-value">{card.value}</h3>
                                <p className="kpi-title">{card.title}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-2 mb-xl">
                {/* Monthly Fee Collection */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Monthly Fee Collection</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={monthlyFeeData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="month" stroke="#6b7280" />
                            <YAxis stroke="#6b7280" />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'white',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                }}
                            />
                            <Legend />
                            <Bar dataKey="collected" fill="#3b82f6" name="Collected" radius={[8, 8, 0, 0]} />
                            <Bar dataKey="pending" fill="#f59e0b" name="Pending" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Weekly Attendance */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Weekly Attendance Overview</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={attendanceData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="day" stroke="#6b7280" />
                            <YAxis stroke="#6b7280" />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'white',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                }}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2} name="Present" />
                            <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} name="Absent" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-3 mb-xl">
                {/* Class Distribution */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Class Distribution</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={classDistribution}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {classDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Recent Activities */}
                <div className="card" style={{ gridColumn: 'span 2' }}>
                    <div className="card-header">
                        <h3 className="card-title">Recent Activities</h3>
                    </div>
                    <div className="activity-list">
                        {recentActivities.map((activity) => (
                            <div key={activity.id} className="activity-item">
                                <div className="activity-dot"></div>
                                <div className="activity-content">
                                    <p className="activity-message">{activity.message}</p>
                                    <span className="activity-time">{activity.time}</span>
                                </div>
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

        .kpi-card {
          background: white;
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
          box-shadow: var(--shadow-sm);
          transition: all var(--transition-base);
        }

        .kpi-card:hover {
          box-shadow: var(--shadow-md);
          transform: translateY(-2px);
        }

        .kpi-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--spacing-md);
        }

        .kpi-icon {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .kpi-icon-primary {
          background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
        }

        .kpi-icon-secondary {
          background: linear-gradient(135deg, var(--secondary-500), var(--secondary-600));
        }

        .kpi-icon-success {
          background: linear-gradient(135deg, var(--success-500), var(--success-600));
        }

        .kpi-icon-warning {
          background: linear-gradient(135deg, var(--warning-500), var(--warning-600));
        }

        .kpi-trend {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.875rem;
          font-weight: 600;
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-md);
        }

        .trend-up {
          color: var(--success-600);
          background: var(--success-50);
        }

        .trend-down {
          color: var(--error-600);
          background: var(--error-50);
        }

        .kpi-body {
          margin-top: var(--spacing-md);
        }

        .kpi-value {
          font-size: 1.875rem;
          font-weight: 700;
          color: var(--gray-900);
          margin-bottom: 0.25rem;
        }

        .kpi-title {
          font-size: 0.875rem;
          color: var(--gray-600);
          margin: 0;
        }

        .activity-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .activity-item {
          display: flex;
          gap: var(--spacing-md);
          padding-bottom: var(--spacing-md);
          border-bottom: 1px solid var(--gray-200);
        }

        .activity-item:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .activity-dot {
          width: 8px;
          height: 8px;
          border-radius: var(--radius-full);
          background: var(--primary-500);
          margin-top: 0.5rem;
          flex-shrink: 0;
        }

        .activity-content {
          flex: 1;
        }

        .activity-message {
          font-size: 0.875rem;
          color: var(--gray-900);
          margin-bottom: 0.25rem;
        }

        .activity-time {
          font-size: 0.75rem;
          color: var(--gray-500);
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

export default AdminDashboard;
