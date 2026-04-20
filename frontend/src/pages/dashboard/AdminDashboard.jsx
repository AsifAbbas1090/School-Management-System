import React, { useEffect, useState, useCallback } from 'react';
import { Users, UserCheck, DollarSign, AlertCircle, ShieldAlert, Clock, Send, Banknote, Wallet } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { analyticsService } from '../../services/api';
import { formatCurrency, getTargetSchoolIdForScopedApi } from '../../utils';
import { useAuthStore, useSchoolStore } from '../../store';
import { USER_ROLES } from '../../constants';
import Breadcrumb from '../../components/common/Breadcrumb';
import DashboardSkeleton from '../../components/dashboard/DashboardSkeleton';
import toast from 'react-hot-toast';

/**
 * Mount API calls:
 * - GET /school/analytics/dashboard?schoolId=&role=  (analyticsService.getDashboardStats)
 */
const AdminDashboard = () => {
    const { user } = useAuthStore();
    const { currentSchool } = useSchoolStore();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const isAuthorized = [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(user?.role);


    if (!isAuthorized) {
        return (
            <div className="flex flex-col items-center justify-center min-vh-50 text-center p-xl">
                <ShieldAlert size={64} className="text-error mb-md" />
                <h1 className="page-title">Access Denied</h1>
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

    const loadDashboardData = useCallback(async () => {
        setLoading(true);
        try {
            const targetSchoolId = getTargetSchoolIdForScopedApi(user, currentSchool);
            if (!targetSchoolId) {
                if (user?.role === USER_ROLES.SUPER_ADMIN) {
                    toast.error('Select a school (e.g. from the Schools page) before opening this dashboard.');
                }
                setStats(null);
                return;
            }
            const response = await analyticsService.getDashboardStats({
                schoolId: targetSchoolId,
                role: user?.role,
            });
            if (response.success && response.data) {
                setStats(response.data);
            } else {
                setStats(null);
            }
        } catch (error) {
            console.error('Dashboard load error:', error);
            setStats(null);
        } finally {
            setLoading(false);
        }
    }, [user, currentSchool]);

    useEffect(() => {
        if (isAuthorized && user) {
            loadDashboardData();
        }
    }, [isAuthorized, user, loadDashboardData]);

    const breadcrumbItems = [
        { label: 'Dashboard', path: null },
    ];

    if (loading) {
        return <DashboardSkeleton breadcrumbItems={breadcrumbItems} />;
    }

    // Show empty state if backend is not available
    if (!stats) {
        return (
            <div className="flex flex-col items-center justify-center min-vh-50 text-center p-xl">
                <AlertCircle size={64} className="text-warning-500 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Connection Error</h2>
                <p className="text-gray-600 mb-4">
                    Unable to connect to the server. This is often caused by a database connection failure.
                </p>
                <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg text-left inline-block max-w-md">
                    <p className="font-semibold mb-2">Troubleshooting Steps:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Ensure your internet connection is active.</li>
                        <li>Check if the backend server is running on port 3000.</li>
                        <li>Verify the database connection (Railway) is active.</li>
                    </ul>
                </div>
            </div>
        );
    }

    const kpiCards = [
        {
            title: 'Total Students',
            value: stats?.totalStudents || 0,
            icon: Users,
            color: 'primary',
            sublabel: 'Enrolled students',
        },
        {
            title: 'Total Teachers',
            value: stats?.totalTeachers || 0,
            icon: UserCheck,
            color: 'secondary',
            sublabel: 'Active staff',
        },
        {
            title: 'Fee Collected',
            value: formatCurrency(stats?.feeCollected || 0),
            icon: DollarSign,
            color: 'success',
            sublabel: `Pending: ${formatCurrency(stats?.feePending || 0)}`,
        },
        {
            title: 'Pending Leaves',
            value: stats?.pendingLeaves || 0,
            icon: AlertCircle,
            color: 'warning',
            sublabel: 'Awaiting approval',
        },
    ];

    const monthlyFeeData = stats?.monthlyFeeData || [];
    const attendanceData = stats?.weeklyAttendance || [];
    const classDistribution = stats?.classDistribution || [];
    const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
    const recentActivities = stats?.recentActivities || [];

    const chartTooltipStyle = {
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        fontSize: '0.8125rem',
    };

    return (
        <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
            <Breadcrumb items={breadcrumbItems} />

            <div className="page-header" style={{ marginBottom: 'var(--spacing-xl)' }}>
                <div>
                    <h1 className="page-title">Admin Dashboard</h1>
                    <p className="page-subtitle">Welcome back, {user?.name?.split(' ')[0]}! Here's what's happening today.</p>
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
                                    <Icon size={22} />
                                </div>
                            </div>
                            <div className="kpi-body">
                                <h3 className="kpi-value">{card.value}</h3>
                                <p className="kpi-title">{card.title}</p>
                                {card.sublabel && <p className="kpi-sublabel">{card.sublabel}</p>}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Collection & handover KPI row — all values derived from the same dashboard response, zero extra API calls. */}
            {(() => {
                const collections = stats?.collections || {};
                const salaries = stats?.salaries || {};
                const pendingCount = collections.pendingHandoversCount || 0;
                const cards = [
                    {
                        title: "Today's Collection",
                        value: formatCurrency(collections.todayTotal || 0),
                        sublabel: `${collections.todayCount || 0} payments today`,
                        icon: Banknote,
                        color: 'success',
                    },
                    {
                        title: "This Month's Collection",
                        value: formatCurrency(collections.monthTotal || 0),
                        sublabel: `Expected: ${formatCurrency(collections.monthExpected || 0)}`,
                        icon: Wallet,
                        color: 'primary',
                    },
                    {
                        title: 'Pending Handovers',
                        value: pendingCount,
                        sublabel: pendingCount > 0 ? 'Managers yet to submit' : 'All caught up',
                        icon: Clock,
                        color: pendingCount > 0 ? 'warning' : 'success',
                    },
                    {
                        title: 'Pending Salary Dues',
                        value: formatCurrency(salaries.pendingRemaining || 0),
                        sublabel: `${salaries.pendingRecordCount || 0} record(s) unpaid`,
                        icon: Send,
                        color: (salaries.pendingRemaining || 0) > 0 ? 'warning' : 'secondary',
                    },
                ];
                return (
                    <div className="grid grid-cols-4 mb-xl">
                        {cards.map((card, idx) => {
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
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                );
            })()}

            {/* Pending handovers table — admin-only, visible when at least one manager has collections awaiting verification. */}
            {Array.isArray(stats?.collections?.pendingHandovers) && stats.collections.pendingHandovers.length > 0 && (
                <div className="card mb-xl">
                    <div className="card-header">
                        <h3 className="card-title">Pending Handovers</h3>
                        <span className="badge badge-warning">{stats.collections.pendingHandovers.length}</span>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Manager</th>
                                    <th>Submitted</th>
                                    <th>Collected</th>
                                    <th>Payments</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.collections.pendingHandovers.map(h => (
                                    <tr key={h.id}>
                                        <td>{h.manager?.name || 'Staff'}</td>
                                        <td style={{ fontWeight: 600, color: 'var(--success-600)' }}>{formatCurrency(h.amountSubmitted)}</td>
                                        <td>{formatCurrency(h.totalCollected || h.amountSubmitted)}</td>
                                        <td>{h._count?.payments ?? 0}</td>
                                        <td>{h.submittedAt ? new Date(h.submittedAt).toLocaleDateString() : '—'}</td>
                                        <td><span className="badge badge-warning">{h.status}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-xs text-gray-500 mt-sm">Verify pending handovers from the Fees &rsaquo; Handovers page.</p>
                </div>
            )}

            {/* Fee + Attendance Charts */}
            <div className="grid grid-cols-2 mb-xl">
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Fee Collection Overview</h3>
                        <span className="badge badge-primary">This year</span>
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={monthlyFeeData} barGap={4}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                            <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--gray-500)' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 12, fill: 'var(--gray-500)' }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={chartTooltipStyle} />
                            <Legend wrapperStyle={{ fontSize: '0.8125rem' }} />
                            <Bar dataKey="collected" fill="var(--primary-500)" name="Collected" radius={[4,4,0,0]} />
                            <Bar dataKey="pending"   fill="var(--warning-400, #fbbf24)" name="Pending"   radius={[4,4,0,0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Weekly Attendance</h3>
                        <span className="badge badge-green">This week</span>
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={attendanceData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                            <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--gray-500)' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 12, fill: 'var(--gray-500)' }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={chartTooltipStyle} />
                            <Legend wrapperStyle={{ fontSize: '0.8125rem' }} />
                            <Line type="monotone" dataKey="present" stroke="var(--success-500)" strokeWidth={2.5} dot={false} name="Present" />
                            <Line type="monotone" dataKey="absent"  stroke="var(--error-500)"   strokeWidth={2.5} dot={false} name="Absent" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-3 mb-xl">
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Fee Summary</h3>
                    </div>
                    <div className="space-y-md">
                        {[
                            { label: 'Collected', value: formatCurrency(stats?.feeCollected || 0), color: 'var(--success-600)' },
                            { label: 'Pending',   value: formatCurrency(stats?.feePending   || 0), color: 'var(--warning-600)' },
                            { label: 'Handed Over', value: formatCurrency(stats?.totalHandedOver || 0), color: 'var(--primary-600)' },
                        ].map(row => (
                            <div key={row.label} className="flex items-center justify-between" style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                                <span className="text-sm text-gray-600">{row.label}</span>
                                <span className="font-semibold text-sm" style={{ color: row.color }}>{row.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Teacher Attendance</h3>
                        <span className="badge badge-gray">This month</span>
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                        <div className="flex items-center justify-between mb-sm">
                            <span className="text-sm text-gray-600">Attendance Rate</span>
                            <span className="font-bold" style={{ color: 'var(--primary-600)' }}>{stats?.teacherAttendanceRate || 0}%</span>
                        </div>
                        <div style={{ height: 8, background: 'var(--gray-100)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                            <div style={{ width: `${stats?.teacherAttendanceRate || 0}%`, height: '100%', background: 'var(--primary-500)', borderRadius: 'var(--radius-full)', transition: 'width 0.6s ease' }} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-md">
                        <div className="text-center p-md rounded-lg bg-success-50">
                            <div className="font-bold text-2xl" style={{ color: 'var(--success-600)' }}>{stats?.teacherAttendancePresent || 0}</div>
                            <div className="text-xs text-gray-600">Present</div>
                        </div>
                        <div className="text-center p-md rounded-lg bg-error-50">
                            <div className="font-bold text-2xl" style={{ color: 'var(--error-600)' }}>{stats?.teacherAttendanceAbsent || 0}</div>
                            <div className="text-xs text-gray-600">Absent</div>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Recent Handovers</h3>
                    </div>
                    {stats?.recentHandovers?.length > 0 ? (
                        <div className="space-y-sm">
                            {stats.recentHandovers.slice(0,4).map(h => (
                                <div key={h.id} className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>
                                        {h.manager?.name || h.User?.name || 'Staff'}
                                    </span>
                                    <span className="font-semibold" style={{ color: 'var(--success-600)' }}>{formatCurrency(h.amountSubmitted)}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500">No handovers yet</p>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .card-header { display: flex; align-items: center; justify-content: space-between; }
            `}</style>
        </div>
    );
};

export default AdminDashboard;
