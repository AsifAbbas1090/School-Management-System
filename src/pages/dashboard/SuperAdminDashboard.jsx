import React from 'react';
import { Building, Users, MapPin, Plus, TrendingUp, Settings, School, ShieldAlert } from 'lucide-react';
import { useSchoolStore, useAuthStore } from '../../store';
import { USER_ROLES } from '../../constants';
import { formatDate } from '../../utils';

const SuperAdminDashboard = () => {
    const { user } = useAuthStore();
    const { schools, setCurrentSchool } = useSchoolStore();

    const isAuthorized = user?.role === USER_ROLES.SUPER_ADMIN;

    if (!isAuthorized) {
        return (
            <div className="flex flex-col items-center justify-center min-vh-50 text-center p-xl">
                <ShieldAlert size={64} className="text-error mb-md" />
                <h1 className="text-2xl font-bold mb-sm">Access Denied</h1>
                <p className="text-gray-600 max-w-md">
                    You do not have permission to view the super admin dashboard.
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

    // Mock Global Stats
    const stats = {
        totalSchools: schools.length || 2,
        totalStudents: 12500,
        totalRevenue: 5200000,
        activeCampuses: 8
    };

    const handleEnterSchool = (school) => {
        setCurrentSchool(school);
        toast.success(`Switched context to ${school.name}`);
        // In a real app, this might redirect to that school's specific dashboard URL
    };

    return (
        <div className="super-admin-dashboard">
            <div className="flex justify-between items-center mb-xl">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-xs">Super Admin Dashboard</h1>
                    <p className="text-gray-600">Overview of all schools and global performance</p>
                </div>
                <div className="flex gap-md">
                    <button className="btn btn-primary" onClick={() => window.location.href = '/schools'}>
                        <Plus size={18} />
                        <span>Manage Schools</span>
                    </button>
                    <button className="btn btn-outline">
                        <Settings size={18} />
                        <span>Global Settings</span>
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-md mb-xl">
                <div className="card p-lg flex items-center gap-md">
                    <div className="p-md rounded-full bg-primary-50 text-primary-600">
                        <School size={24} />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-gray-900">{stats.totalSchools}</div>
                        <div className="text-sm text-gray-600">Total Schools</div>
                    </div>
                </div>

                <div className="card p-lg flex items-center gap-md">
                    <div className="p-md rounded-full bg-success-50 text-success-600">
                        <Users size={24} />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-gray-900">{stats.totalStudents.toLocaleString()}</div>
                        <div className="text-sm text-gray-600">Total Students</div>
                    </div>
                </div>

                <div className="card p-lg flex items-center gap-md">
                    <div className="p-md rounded-full bg-warning-50 text-warning-600">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-gray-900">$ {stats.totalRevenue.toLocaleString()}</div>
                        <div className="text-sm text-gray-600">Total Revenue</div>
                    </div>
                </div>

                <div className="card p-lg flex items-center gap-md">
                    <div className="p-md rounded-full bg-purple-50 text-purple-600">
                        <MapPin size={24} />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-gray-900">{stats.activeCampuses}</div>
                        <div className="text-sm text-gray-600">Active Campuses</div>
                    </div>
                </div>
            </div>

            {/* Schools List */}
            <div className="card">
                <div className="card-header border-b border-gray-100 p-lg flex justify-between items-center">
                    <h3 className="card-title font-semibold text-gray-900">Managed Schools & Subscriptions</h3>
                    <div className="flex gap-sm">
                        <input type="text" placeholder="Search schools..." className="input input-sm w-64" />
                    </div>
                </div>
                <div className="p-md">
                    <div className="grid grid-cols-3 gap-md">
                        {schools.map(school => (
                            <div key={school.id} className="border border-gray-200 rounded-lg p-md hover:shadow-md transition-all bg-white group flex flex-col h-full">
                                <div className="flex justify-between items-start mb-md">
                                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                                        {school.logo ? (
                                            <img src={school.logo} alt={school.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <Building className="text-gray-400" />
                                        )}
                                    </div>
                                    <div className="flex flex-col items-end gap-xs">
                                        <span className={`badge ${school.status === 'active' ? 'badge-success' : 'badge-error'}`}>
                                            {school.status}
                                        </span>
                                        <span className={`text-xs px-2 py-1 rounded-full ${school.subscriptionPlan === 'enterprise' ? 'bg-purple-100 text-purple-700' :
                                            school.subscriptionPlan === 'premium' ? 'bg-amber-100 text-amber-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                            {school.subscriptionPlan?.toUpperCase()}
                                        </span>
                                    </div>
                                </div>

                                <h4 className="font-bold text-gray-900 text-lg mb-xs">{school.name}</h4>
                                <p className="text-sm text-gray-500 mb-md truncate">{school.address || "No address provided"}</p>

                                <div className="mt-auto pt-md border-t border-gray-100 space-y-sm">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-500">Subscription Status:</span>
                                        <span className={school.subscriptionStatus === 'active' ? 'text-success-600 font-medium' : 'text-error-600 font-medium'}>
                                            {school.subscriptionStatus?.toUpperCase() || 'ACTIVE'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-500">Next Payment:</span>
                                        <span className="text-gray-900">
                                            {school.nextPaymentDate ? formatDate(new Date(school.nextPaymentDate)) : 'N/A'}
                                        </span>
                                    </div>

                                    <button
                                        className="btn btn-sm btn-primary w-full mt-2"
                                        onClick={() => handleEnterSchool(school)}
                                    >
                                        Manage Dashboard
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>


            <style>{`
                .super-admin-dashboard {
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

export default SuperAdminDashboard;
