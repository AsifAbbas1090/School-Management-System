import React from 'react';
import { TrendingUp, CheckCircle, AlertTriangle, Users } from 'lucide-react';
import Breadcrumb from '../../components/common/Breadcrumb';
import { formatCurrency } from '../../utils';

const StaffPerformancePage = () => {
    // Mock Data for Performance
    const performanceStats = {
        feeCollectionEfficiency: 85, // percentage
        attendanceCompletion: 98, // percentage
        studentSatisfaction: 4.5, // out of 5
        tasksCompleted: 120,
    };

    const recentActivities = [
        { id: 1, action: 'Fee Submission', user: 'Management Staff A', time: '2 hours ago', details: 'Submitted collected fees of 50,000' },
        { id: 2, action: 'Attendance Check', user: 'Management Staff B', time: '4 hours ago', details: 'Verified Class 10 attendance' },
        { id: 3, action: 'Exam Schedule', user: 'Admin User', time: '1 day ago', details: 'Published Midterm Schedule' },
    ];

    const breadcrumbItems = [
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Staff Performance', path: null },
    ];

    return (
        <div className="performance-page">
            <Breadcrumb items={breadcrumbItems} />

            <div className="page-header mb-xl">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-xs">Staff Performance & Efficiency</h1>
                    <p className="text-gray-600">Track management efficiency and operational metrics</p>
                </div>
            </div>

            {/* efficiency Metrics */}
            <div className="grid grid-cols-4 gap-md mb-xl">
                <div className="card p-lg flex items-center gap-md">
                    <div className="p-md rounded-full bg-primary-50 text-primary-600">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-gray-900">{performanceStats.feeCollectionEfficiency}%</div>
                        <div className="text-sm text-gray-600">Fee Collection</div>
                    </div>
                </div>

                <div className="card p-lg flex items-center gap-md">
                    <div className="p-md rounded-full bg-success-50 text-success-600">
                        <CheckCircle size={24} />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-gray-900">{performanceStats.attendanceCompletion}%</div>
                        <div className="text-sm text-gray-600">Attendance Completion</div>
                    </div>
                </div>

                <div className="card p-lg flex items-center gap-md">
                    <div className="p-md rounded-full bg-warning-50 text-warning-600">
                        <Users size={24} />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-gray-900">{performanceStats.studentSatisfaction}/5</div>
                        <div className="text-sm text-gray-600">Satisfaction Score</div>
                    </div>
                </div>

                <div className="card p-lg flex items-center gap-md">
                    <div className="p-md rounded-full bg-purple-50 text-purple-600">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-gray-900">{performanceStats.tasksCompleted}</div>
                        <div className="text-sm text-gray-600">Tasks Completed</div>
                    </div>
                </div>
            </div>

            {/* Performance Details */}
            <div className="grid grid-cols-2 gap-lg">
                <div className="card">
                    <div className="card-header border-b border-gray-100 p-md">
                        <h3 className="card-title font-semibold text-gray-900">Recent Management Activities</h3>
                    </div>
                    <div className="p-md">
                        <div className="space-y-md">
                            {recentActivities.map(activity => (
                                <div key={activity.id} className="flex gap-md items-start pb-md border-b border-gray-50 last:border-0 last:pb-0">
                                    <div className="w-2 h-2 mt-2 rounded-full bg-primary-500 shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                                        <p className="text-xs text-gray-500 mb-1">{activity.user} • {activity.time}</p>
                                        <p className="text-sm text-gray-600">{activity.details}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header border-b border-gray-100 p-md">
                        <h3 className="card-title font-semibold text-gray-900">Efficiency Targets</h3>
                    </div>
                    <div className="p-md">
                        <div className="space-y-lg">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700">Fee Collection Target</span>
                                    <span className="text-sm text-gray-600">85% / 90%</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2">
                                    <div className="bg-primary-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700">Attendance Marking</span>
                                    <span className="text-sm text-gray-600">98% / 100%</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2">
                                    <div className="bg-success-500 h-2 rounded-full" style={{ width: '98%' }}></div>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700">Syllabus Completion</span>
                                    <span className="text-sm text-gray-600">65% / 70%</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2">
                                    <div className="bg-warning-500 h-2 rounded-full" style={{ width: '65%' }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
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
