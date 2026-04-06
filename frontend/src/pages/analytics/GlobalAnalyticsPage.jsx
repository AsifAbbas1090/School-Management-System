import React, { useEffect, useState } from 'react';
import { School, Users, DollarSign, TrendingUp, Activity } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { analyticsService } from '../../services/api';
import { formatCurrency } from '../../utils';
import { useAuthStore } from '../../store';
import { USER_ROLES } from '../../constants';
import Loading from '../../components/common/Loading';
import Breadcrumb from '../../components/common/Breadcrumb';
import { ShieldAlert } from 'lucide-react';

const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

const GlobalAnalyticsPage = () => {
    const { user } = useAuthStore();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const isAuthorized = user?.role === USER_ROLES.SUPER_ADMIN;

    const breadcrumbItems = [
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Global Analytics', path: null },
    ];

    useEffect(() => {
        if (isAuthorized) loadData();
    }, [isAuthorized]);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await analyticsService.getSuperAdminStats();
            if (res.success && res.data) setStats(res.data);
        } catch {
            // silently handle
        } finally {
            setLoading(false);
        }
    };

    if (!isAuthorized) {
        return (
            <div className="flex flex-col items-center justify-center min-vh-50 text-center p-xl">
                <ShieldAlert size={64} className="text-error mb-md" />
                <h1 className="page-title">Access Denied</h1>
                <p className="text-gray-600 max-w-md">Only Super Admins can view global analytics.</p>
                <button className="btn btn-primary mt-lg" onClick={() => window.history.back()}>Go Back</button>
            </div>
        );
    }

    if (loading) return <Loading />;

    if (!stats) {
        return (
            <div className="flex flex-col items-center justify-center min-vh-50 text-center p-xl">
                <Activity size={64} style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }} />
                <h2 className="page-title">No Data Available</h2>
                <p className="text-gray-600">Unable to load analytics. Check backend connection.</p>
            </div>
        );
    }

    const kpis = [
        { title: 'Total Schools', value: stats.totalSchools, icon: School, color: 'primary' },
        { title: 'Total Students', value: stats.totalStudents, icon: Users, color: 'secondary' },
        { title: 'Total Revenue', value: formatCurrency(stats.totalRevenue || 0), icon: DollarSign, color: 'success' },
        { title: 'Avg Students/School', value: stats.totalSchools > 0 ? Math.round(stats.totalStudents / stats.totalSchools) : 0, icon: TrendingUp, color: 'warning' },
    ];

    const schoolBarData = (stats.schools || []).slice(0, 10).map(s => ({
        name: s.name.length > 12 ? s.name.slice(0, 12) + '…' : s.name,
        students: s.studentCount,
        users: s.userCount,
    }));

    const subStatusData = (stats.schools || []).reduce((acc, s) => {
        const key = s.subscriptionStatus || 'UNKNOWN';
        const existing = acc.find(a => a.name === key);
        if (existing) existing.value++;
        else acc.push({ name: key, value: 1 });
        return acc;
    }, []);

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
                    <h1 className="page-title">Global Analytics</h1>
                    <p className="page-subtitle">System-wide overview across all schools</p>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-4 mb-xl">
                {kpis.map((card, i) => {
                    const Icon = card.icon;
                    return (
                        <div key={i} className="kpi-card">
                            <div className="kpi-header">
                                <div className={`kpi-icon kpi-icon-${card.color}`}>
                                    <Icon size={22} />
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

            {/* Charts row */}
            <div className="grid grid-cols-2 mb-xl">
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Students & Users per School</h3>
                    </div>
                    {schoolBarData.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No schools found</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={schoolBarData} barGap={4}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--gray-500)' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 12, fill: 'var(--gray-500)' }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={chartTooltipStyle} />
                                <Legend wrapperStyle={{ fontSize: '0.8125rem' }} />
                                <Bar dataKey="students" fill="var(--primary-500)" name="Students" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="users" fill="var(--secondary-500)" name="Total Users" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Subscription Status</h3>
                    </div>
                    {subStatusData.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No data</div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', padding: '0 1rem' }}>
                            <ResponsiveContainer width="60%" height={220}>
                                <PieChart>
                                    <Pie data={subStatusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" paddingAngle={4}>
                                        {subStatusData.map((_, idx) => (
                                            <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={chartTooltipStyle} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {subStatusData.map((item, idx) => (
                                    <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                                        <div style={{ width: 12, height: 12, borderRadius: 3, background: PIE_COLORS[idx % PIE_COLORS.length], flexShrink: 0 }} />
                                        <span style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
                                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', marginLeft: 'auto' }}>{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Schools table */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">All Schools</h3>
                    <span className="badge badge-primary">{stats.totalSchools} total</span>
                </div>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>School Name</th>
                                <th>Slug</th>
                                <th>Students</th>
                                <th>Total Users</th>
                                <th>Subscription</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(stats.schools || []).map(school => (
                                <tr key={school.id}>
                                    <td className="font-medium">{school.name}</td>
                                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{school.slug}</td>
                                    <td>{school.studentCount}</td>
                                    <td>{school.userCount}</td>
                                    <td>
                                        <span className={`badge ${school.subscriptionStatus === 'ACTIVE' ? 'badge-green' : 'badge-warning'}`}>
                                            {school.subscriptionStatus || 'N/A'}
                                        </span>
                                    </td>
                                    <td>{school.subscriptionAmount ? formatCurrency(school.subscriptionAmount) : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
                .card-header { display: flex; align-items: center; justify-content: space-between; }
            `}</style>
        </div>
    );
};

export default GlobalAnalyticsPage;
