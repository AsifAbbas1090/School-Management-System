import React, { useEffect, useState } from 'react';
import { Users, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { analyticsService } from '../../services/api';
import { formatCurrency, getRelativeTime } from '../../utils';
import { useAuthStore } from '../../store';
import { USER_ROLES } from '../../constants';
import Loading from '../../components/common/Loading';
import Breadcrumb from '../../components/common/Breadcrumb';
import { ShieldAlert } from 'lucide-react';

const ManagementDashboard = () => {
    const { user } = useAuthStore();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const isAuthorized = [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.MANAGEMENT].includes(user?.role);

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
                <p className="text-gray-600 max-w-md">
                    You do not have permission to view the management dashboard.
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
                setStats(response.data);
            }
        } catch (error) {
            // Silently handle errors - UI shows empty state
        } finally {
            setLoading(false);
        }
    };

    const breadcrumbItems = [{ label: 'Dashboard', path: null }];

    const kpiCards = stats ? [
        {
            title: 'Total Students',
            value: stats.totalStudents,
            icon: Users,
            color: 'primary',
            change: '+5%',
        },
        {
            title: 'Present Today',
            value: stats.presentToday,
            icon: CheckCircle,
            color: 'success',
            change: '+2%',
        },
        {
            title: 'Fee Pending',
            value: formatCurrency(stats.feePending),
            icon: AlertCircle,
            color: 'warning',
            change: '-3%',
        },
        {
            title: 'Academic Score',
            value: '85%',
            icon: TrendingUp,
            color: 'secondary',
            change: '+7%',
        },
    ] : [];

    const performanceData = stats?.classPerformance || [];
    const attendanceTrend = stats?.attendanceTrend || [];
    const feeDefaulters = stats?.feeDefaulters || [];
    const topStudents = stats?.topStudents || [];

    if (loading) {
        return <Loading fullScreen />;
    }

    return (
        <div className="dashboard-page">
            <Breadcrumb items={breadcrumbItems} />

            <div className="dashboard-header">
                <div>
                    <h1>Management Dashboard</h1>
                    <p className="text-gray-600">Overview of academic performance and operations</p>
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
                                <span className="text-sm text-success-600 font-semibold">{card.change}</span>
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
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Class-wise Performance</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={performanceData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                            <XAxis dataKey="class" tick={{ fontSize: 12, fill: 'var(--gray-500)' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 12, fill: 'var(--gray-500)' }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.8125rem' }} />
                            <Legend wrapperStyle={{ fontSize: '0.8125rem' }} />
                            <Bar dataKey="average" fill="var(--primary-500)" name="Average Score" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="passRate" fill="var(--success-500)" name="Pass Rate %" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Attendance Trend</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={attendanceTrend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                            <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--gray-500)' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 12, fill: 'var(--gray-500)' }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.8125rem' }} />
                            <Legend wrapperStyle={{ fontSize: '0.8125rem' }} />
                            <Line type="monotone" dataKey="rate" stroke="var(--secondary-500)" strokeWidth={2.5} dot={false} name="Attendance %" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-2 mb-xl">
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Fee Defaulters</h3>
                    </div>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Student</th>
                                    <th>Class</th>
                                    <th>Amount</th>
                                    <th>Months</th>
                                </tr>
                            </thead>
                            <tbody>
                                {feeDefaulters.length === 0 ? (
                                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)' }}>No defaulters</td></tr>
                                ) : feeDefaulters.map((student) => (
                                    <tr key={student.id}>
                                        <td className="font-medium">{student.name}</td>
                                        <td>{student.className || student.class || 'N/A'}</td>
                                        <td className="text-error-600">{formatCurrency(student.amount)}</td>
                                        <td>
                                            <span className="badge badge-warning">{student.invoiceCount || 1} due</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Top Performers</h3>
                    </div>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Student</th>
                                    <th>Class</th>
                                    <th>Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topStudents.length === 0 ? (
                                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)' }}>No exam results yet</td></tr>
                                ) : topStudents.map((student) => (
                                    <tr key={student.rank}>
                                        <td>
                                            <span className="badge badge-primary">#{student.rank}</span>
                                        </td>
                                        <td className="font-medium">{student.name}</td>
                                        <td>{student.class}</td>
                                        <td className="text-success-600 font-semibold">{student.score}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <style>{`
        .dashboard-page { animation: fadeIn 0.3s ease-in-out; }
        .dashboard-header { margin-bottom: var(--spacing-xl); }
        .dashboard-header h1 {
          font-size: 2rem; font-weight: 700;
          color: var(--text-primary); margin-bottom: var(--spacing-xs);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </div>
    );
};

export default ManagementDashboard;
