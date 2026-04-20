import React, { useState, useEffect } from 'react';
import { TrendingUp, CheckCircle, Users, ShieldAlert, ArrowDownCircle, Clock, DollarSign } from 'lucide-react';
import Breadcrumb from '../../components/common/Breadcrumb';
import { formatCurrency } from '../../utils';
import { useAuthStore, useSchoolStore } from '../../store';
import { USER_ROLES } from '../../constants';
import { analyticsService } from '../../services/api';
import { getTargetSchoolIdForScopedApi } from '../../utils';
import toast from 'react-hot-toast';

const StaffPerformancePage = () => {
    const { user } = useAuthStore();
    const { currentSchool } = useSchoolStore();
    const isAuthorized = [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(user?.role);

    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isAuthorized) return;
        const load = async () => {
            try {
                const targetSchoolId = getTargetSchoolIdForScopedApi(user, currentSchool);
                if (!targetSchoolId) {
                    if (user?.role === USER_ROLES.SUPER_ADMIN) {
                        toast.error('Select a school before viewing staff performance.');
                    }
                    setStats(null);
                    return;
                }
                const res = await analyticsService.getDashboardStats({
                    schoolId: targetSchoolId,
                    role: user?.role,
                });
                if (res.success) setStats(res.data);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [isAuthorized, user, currentSchool]);

    if (!isAuthorized) {
        return (
            <div className="flex flex-col items-center justify-center min-vh-50 text-center p-xl">
                <ShieldAlert size={64} className="text-error mb-md" />
                <h1 className="page-title">Access Denied</h1>
                <p className="text-gray-600 max-w-md">
                    You do not have permission to view staff performance metrics.
                </p>
                <button className="btn btn-primary mt-lg" onClick={() => window.history.back()}>
                    Go Back
                </button>
            </div>
        );
    }

    const breadcrumbItems = [
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Staff Performance', path: null },
    ];

    const totalFee = (stats?.feeCollected || 0) + (stats?.feePending || 0);
    const feeEfficiency = totalFee > 0 ? Math.round((stats?.feeCollected / totalFee) * 100) : 0;
    const teacherAttendanceRate = stats?.teacherAttendanceRate || 0;

    return (
        <div className="performance-page">
            <Breadcrumb items={breadcrumbItems} />

            <div className="page-header mb-xl">
                <div>
                    <h1 className="page-title">Staff Performance & Efficiency</h1>
                    <p className="text-gray-600">Track management efficiency and operational metrics</p>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-xl text-gray-500">Loading metrics...</div>
            ) : (
                <>
                    {/* Key Metric Cards */}
                    <div className="grid grid-cols-4 gap-md mb-xl">
                        <div className="card p-lg flex items-center gap-md">
                            <div className="p-md rounded-full bg-primary-50 text-primary-600">
                                <TrendingUp size={24} />
                            </div>
                            <div>
                                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>{feeEfficiency}%</div>
                                <div className="text-sm text-gray-600">Fee Collection Rate</div>
                            </div>
                        </div>

                        <div className="card p-lg flex items-center gap-md">
                            <div className="p-md rounded-full bg-success-50 text-success-600">
                                <CheckCircle size={24} />
                            </div>
                            <div>
                                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>{teacherAttendanceRate}%</div>
                                <div className="text-sm text-gray-600">Teacher Attendance</div>
                            </div>
                        </div>

                        <div className="card p-lg flex items-center gap-md">
                            <div className="p-md rounded-full bg-warning-50 text-warning-600">
                                <Clock size={24} />
                            </div>
                            <div>
                                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>{stats?.pendingLeaves || 0}</div>
                                <div className="text-sm text-gray-600">Pending Leave Requests</div>
                            </div>
                        </div>

                        <div className="card p-lg flex items-center gap-md">
                            <div className="p-md rounded-full bg-purple-50 text-purple-600">
                                <Users size={24} />
                            </div>
                            <div>
                                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>{stats?.totalTeachers || 0}</div>
                                <div className="text-sm text-gray-600">Active Teachers</div>
                            </div>
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-lg mb-lg">
                        {/* Fee Handover Summary */}
                        <div className="card">
                            <div className="card-header border-b border-gray-100 p-md">
                                <h3 className="card-title font-semibold text-gray-900">Fee Handover Summary</h3>
                            </div>
                            <div className="p-md">
                                <div className="grid grid-cols-2 gap-md mb-md">
                                    <div className="p-md rounded-lg bg-primary-50 text-center">
                                        <div className="text-xl font-bold text-primary-700">{formatCurrency(stats?.totalHandedOver || 0)}</div>
                                        <div className="text-xs text-primary-600 mt-1">Total Handed Over</div>
                                    </div>
                                    <div className="p-md rounded-lg bg-success-50 text-center">
                                        <div className="text-xl font-bold text-success-700">{stats?.handoverCount || 0}</div>
                                        <div className="text-xs text-success-600 mt-1">Total Handovers</div>
                                    </div>
                                </div>
                                <div className="space-y-sm">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Total Fees Collected</span>
                                        <span className="font-medium">{formatCurrency(stats?.feeCollected || 0)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Pending Fees</span>
                                        <span className="font-medium text-warning-600">{formatCurrency(stats?.feePending || 0)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Teacher Attendance Breakdown */}
                        <div className="card">
                            <div className="card-header border-b border-gray-100 p-md">
                                <h3 className="card-title font-semibold text-gray-900">Teacher Attendance (This Month)</h3>
                            </div>
                            <div className="p-md">
                                <div className="space-y-lg">
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <span className="text-sm font-medium text-gray-700">Present</span>
                                            <span className="text-sm text-gray-600">{stats?.teacherAttendancePresent || 0} days</span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2">
                                            <div className="bg-success-500 h-2 rounded-full" style={{ width: `${teacherAttendanceRate}%` }}></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <span className="text-sm font-medium text-gray-700">Absent</span>
                                            <span className="text-sm text-gray-600">{stats?.teacherAttendanceAbsent || 0} days</span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2">
                                            <div className="bg-error-500 h-2 rounded-full" style={{ width: `${100 - teacherAttendanceRate}%` }}></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <span className="text-sm font-medium text-gray-700">Fee Collection Rate</span>
                                            <span className="text-sm text-gray-600">{feeEfficiency}%</span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2">
                                            <div className="bg-primary-500 h-2 rounded-full" style={{ width: `${feeEfficiency}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recent Handovers */}
                    <div className="card">
                        <div className="card-header border-b border-gray-100 p-md">
                            <h3 className="card-title font-semibold text-gray-900">Recent Fee Handovers</h3>
                        </div>
                        <div className="p-md">
                            {stats?.recentHandovers?.length > 0 ? (
                                <div className="space-y-sm">
                                    {stats.recentHandovers.map(h => (
                                        <div key={h.id} className="flex items-center gap-md p-sm rounded-lg bg-gray-50">
                                            <div className="p-sm rounded-full bg-primary-100 text-primary-600">
                                                <ArrowDownCircle size={16} />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-900">
                                                    {h.manager?.name || h.User?.name || 'Staff'} submitted {formatCurrency(h.amountSubmitted)}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {new Date(h.submittedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    {h.notes && ` • ${h.notes}`}
                                                </p>
                                            </div>
                                            <div className="text-sm font-semibold text-success-600">{formatCurrency(h.amountSubmitted)}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500 text-center py-md">No handovers recorded yet.</p>
                            )}
                        </div>
                    </div>
                </>
            )}

            <style>{`
                .performance-page {
                    animation: fadeIn 0.3s ease-in-out;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default StaffPerformancePage;
