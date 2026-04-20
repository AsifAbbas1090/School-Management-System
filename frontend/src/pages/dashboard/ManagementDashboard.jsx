import React, { useEffect, useState } from 'react';
import { Users, TrendingUp, AlertCircle, CheckCircle, Banknote, Send, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { analyticsService } from '../../services/api';
import { formatCurrency, getTargetSchoolIdForScopedApi } from '../../utils';
import { useAuthStore, useSchoolStore } from '../../store';
import { USER_ROLES } from '../../constants';
import Breadcrumb from '../../components/common/Breadcrumb';
import DashboardSkeleton from '../../components/dashboard/DashboardSkeleton';
import { ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Mount API calls:
 * - GET /school/analytics/dashboard?schoolId=&role=  (analyticsService.getDashboardStats)
 */
const ManagementDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { currentSchool } = useSchoolStore();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const isAuthorized = [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.MANAGEMENT].includes(user?.role);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            const targetSchoolId = getTargetSchoolIdForScopedApi(user, currentSchool);
            if (!targetSchoolId) {
                if (user?.role === USER_ROLES.SUPER_ADMIN) {
                    toast.error('Select a school (e.g. from the Schools page) before opening this dashboard.');
                }
                return;
            }
            const response = await analyticsService.getDashboardStats({
                schoolId: targetSchoolId,
                role: user?.role,
            });
            if (response.success && response.data) {
                setStats(response.data);
            }
        } catch (error) {
            // Silently handle errors - UI shows empty state
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthorized) {
            loadDashboardData();
        }
    }, [isAuthorized, user, currentSchool]);

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
        return <DashboardSkeleton breadcrumbItems={breadcrumbItems} />;
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

            {/* Personal collection/handover cards — uses the unsubmittedByManager slice scoped to the current manager. */}
            {user?.role === USER_ROLES.MANAGEMENT && (() => {
                const collections = stats?.collections || {};
                const mine = (collections.unsubmittedByManager || []).find(r => r.managerId === user?.id) || {
                    managerId: user?.id,
                    managerName: user?.name,
                    amountUnsubmitted: 0,
                    paymentCount: 0,
                    todayCollected: 0,
                };
                const lastHandover = (stats?.recentHandovers || []).find(h => h.manager?.id === user?.id || h.managerId === user?.id);
                const lastStatus = lastHandover?.status || null;
                const personalCards = [
                    {
                        title: 'Your Collections Today',
                        value: formatCurrency(mine.todayCollected || 0),
                        sublabel: 'Fees you collected today',
                        icon: Banknote,
                        color: 'success',
                    },
                    {
                        title: 'Your Unsubmitted Total',
                        value: formatCurrency(mine.amountUnsubmitted || 0),
                        sublabel: `${mine.paymentCount || 0} payment(s) awaiting handover`,
                        icon: Clock,
                        color: (mine.amountUnsubmitted || 0) > 0 ? 'warning' : 'secondary',
                        action: (mine.amountUnsubmitted || 0) > 0 ? {
                            label: 'Submit Handover',
                            onClick: () => navigate('/fees?tab=handovers'),
                        } : null,
                    },
                    {
                        title: 'Your Last Handover',
                        value: lastHandover ? formatCurrency(lastHandover.amountSubmitted || 0) : '—',
                        sublabel: lastHandover
                            ? `${lastStatus === 'VERIFIED' ? 'Verified' : lastStatus === 'PENDING' ? 'Pending' : lastStatus} • ${new Date(lastHandover.submittedAt).toLocaleDateString()}`
                            : 'No handovers yet',
                        icon: Send,
                        color: lastStatus === 'VERIFIED' ? 'success' : lastStatus === 'PENDING' ? 'warning' : 'primary',
                    },
                ];
                return (
                    <div className="grid grid-cols-3 mb-xl">
                        {personalCards.map((card, idx) => {
                            const Icon = card.icon;
                            return (
                                <div key={idx} className="kpi-card">
                                    <div className="kpi-header">
                                        <div className={`kpi-icon kpi-icon-${card.color}`}>
                                            <Icon size={22} />
                                        </div>
                                    </div>
                                    <div className="kpi-body">
                                        <h3 className="kpi-value">{card.value}</h3>
                                        <p className="kpi-title">{card.title}</p>
                                        <p className="kpi-sublabel">{card.sublabel}</p>
                                        {card.action && (
                                            <button
                                                type="button"
                                                className="btn btn-primary btn-sm mt-sm"
                                                onClick={card.action.onClick}
                                            >
                                                {card.action.label}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                );
            })()}

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
