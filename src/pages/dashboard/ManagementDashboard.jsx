import React, { useEffect, useState } from 'react';
import { Users, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { dashboardService } from '../../services/mockData';
import { formatCurrency } from '../../utils';
import Loading from '../../components/common/Loading';
import Breadcrumb from '../../components/common/Breadcrumb';

const ManagementDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            const response = await dashboardService.getStats('management');
            if (response.success) {
                setStats(response.data);
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
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

    const performanceData = [
        { class: 'Class 1', average: 78, passRate: 92 },
        { class: 'Class 2', average: 82, passRate: 95 },
        { class: 'Class 3', average: 75, passRate: 88 },
        { class: 'Class 4', average: 85, passRate: 96 },
        { class: 'Class 5', average: 80, passRate: 90 },
    ];

    const attendanceTrend = [
        { month: 'Aug', rate: 92 },
        { month: 'Sep', rate: 94 },
        { month: 'Oct', rate: 91 },
        { month: 'Nov', rate: 95 },
        { month: 'Dec', rate: 93 },
    ];

    const feeDefaulters = [
        { id: 1, name: 'John Doe', class: 'Class 5-A', amount: 5000, months: 2 },
        { id: 2, name: 'Jane Smith', class: 'Class 3-B', amount: 7500, months: 3 },
        { id: 3, name: 'Mike Johnson', class: 'Class 4-A', amount: 2500, months: 1 },
    ];

    const topStudents = [
        { rank: 1, name: 'Emma Wilson', class: 'Class 5-A', score: 98 },
        { rank: 2, name: 'Liam Brown', class: 'Class 4-B', score: 96 },
        { rank: 3, name: 'Olivia Davis', class: 'Class 5-B', score: 95 },
    ];

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
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="class" stroke="#6b7280" />
                            <YAxis stroke="#6b7280" />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="average" fill="#3b82f6" name="Average Score" radius={[8, 8, 0, 0]} />
                            <Bar dataKey="passRate" fill="#10b981" name="Pass Rate %" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Attendance Trend</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={attendanceTrend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="month" stroke="#6b7280" />
                            <YAxis stroke="#6b7280" />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="rate" stroke="#8b5cf6" strokeWidth={2} name="Attendance %" />
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
                                {feeDefaulters.map((student) => (
                                    <tr key={student.id}>
                                        <td className="font-medium">{student.name}</td>
                                        <td>{student.class}</td>
                                        <td className="text-error-600">{formatCurrency(student.amount)}</td>
                                        <td>
                                            <span className="badge badge-warning">{student.months} months</span>
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
                                {topStudents.map((student) => (
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

export default ManagementDashboard;
