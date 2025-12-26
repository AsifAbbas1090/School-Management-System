import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuthStore } from '../../store';
import { teacherAttendanceService } from '../../services/api';
import { USER_ROLES } from '../../constants';
import { formatDate } from '../../utils';
import Breadcrumb from '../../components/common/Breadcrumb';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

const MyAttendancePage = () => {
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [attendance, setAttendance] = useState([]);
    const [startDate, setStartDate] = useState(new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    const isAuthorized = user?.role === USER_ROLES.TEACHER;

    const loadData = useCallback(async () => {
        if (!isAuthorized || !user?.id) return;
        
        setLoading(true);
        try {
            const [statsRes, attendanceRes] = await Promise.all([
                teacherAttendanceService.getTeacherStats(user.id, {
                    startDate,
                    endDate,
                }),
                teacherAttendanceService.getAll({
                    teacherId: user.id,
                    startDate,
                    endDate,
                }),
            ]);

            if (statsRes.success && statsRes.data) {
                setStats(statsRes.data);
            }

            if (attendanceRes.success && attendanceRes.data) {
                const data = attendanceRes.data.data || attendanceRes.data;
                setAttendance(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error('Failed to load attendance:', error);
            toast.error('Failed to load attendance data');
        } finally {
            setLoading(false);
        }
    }, [user?.id, startDate, endDate, isAuthorized]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    if (!isAuthorized) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-[70vh]">
                <AlertCircle size={64} className="text-error-500 mb-4" />
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Access Denied</h1>
                <p className="text-gray-600 max-w-md">Only teachers can view their attendance.</p>
            </div>
        );
    }

    const breadcrumbItems = [
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'My Attendance', path: null },
    ];

    // Prepare chart data
    const attendanceChartData = useMemo(() => {
        if (!stats?.chartData) return [];
        return stats.chartData.map(item => ({
            date: formatDate(item.date, 'MMM dd'),
            present: item.present,
            absent: item.absent,
            permittedLeave: item.permittedLeave,
        }));
    }, [stats]);

    const statusDistribution = useMemo(() => {
        if (!stats) return [];
        return [
            { name: 'Present', value: stats.present, color: '#10b981' },
            { name: 'Absent', value: stats.absent, color: '#ef4444' },
            { name: 'Permitted Leave', value: stats.permittedLeave, color: '#f59e0b' },
        ].filter(item => item.value > 0);
    }, [stats]);

    if (loading) {
        return <Loading fullScreen />;
    }

    return (
        <div className="my-attendance-page">
            <Breadcrumb items={breadcrumbItems} />

            <div className="page-header">
                <div>
                    <h1>My Attendance</h1>
                    <p className="text-gray-600">View your attendance records and statistics</p>
                </div>
                <div className="flex gap-md">
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="input"
                    />
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="input"
                    />
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-lg mb-lg">
                    <div className="card">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Days</p>
                                <h3 className="text-2xl font-bold">{stats.total}</h3>
                            </div>
                            <Calendar className="text-primary-500" size={32} />
                        </div>
                    </div>

                    <div className="card">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Present</p>
                                <h3 className="text-2xl font-bold text-success-600">{stats.present}</h3>
                            </div>
                            <TrendingUp className="text-success-500" size={32} />
                        </div>
                    </div>

                    <div className="card">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Absent</p>
                                <h3 className="text-2xl font-bold text-error-600">{stats.absent}</h3>
                            </div>
                            <AlertCircle className="text-error-500" size={32} />
                        </div>
                    </div>

                    <div className="card">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Attendance Rate</p>
                                <h3 className="text-2xl font-bold">{stats.attendanceRate}%</h3>
                            </div>
                            <Clock className="text-primary-500" size={32} />
                        </div>
                    </div>
                </div>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg mb-lg">
                {/* Attendance Trend Chart */}
                {attendanceChartData.length > 0 && (
                    <div className="card">
                        <h3 className="card-title">Attendance Trend</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={attendanceChartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="present" stroke="#10b981" name="Present" />
                                <Line type="monotone" dataKey="absent" stroke="#ef4444" name="Absent" />
                                <Line type="monotone" dataKey="permittedLeave" stroke="#f59e0b" name="Permitted Leave" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Status Distribution */}
                {statusDistribution.length > 0 && (
                    <div className="card">
                        <h3 className="card-title">Status Distribution</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={statusDistribution}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {statusDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* Attendance Records Table */}
            <div className="card">
                <h3 className="card-title">Attendance Records</h3>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Status</th>
                                <th>Entry Time</th>
                                <th>Exit Time</th>
                                <th>Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {attendance.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="text-center text-gray-500 py-8">
                                        No attendance records found
                                    </td>
                                </tr>
                            ) : (
                                attendance.map((record) => (
                                    <tr key={record.id}>
                                        <td>{formatDate(record.date)}</td>
                                        <td>
                                            <span className={`badge badge-${
                                                record.status === 'PRESENT' ? 'success' :
                                                record.status === 'ABSENT' ? 'error' : 'warning'
                                            }`}>
                                                {record.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td>
                                            {record.entryTime ? formatDate(record.entryTime, 'HH:mm') : '-'}
                                        </td>
                                        <td>
                                            {record.exitTime ? formatDate(record.exitTime, 'HH:mm') : '-'}
                                        </td>
                                        <td>{record.notes || '-'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default MyAttendancePage;

