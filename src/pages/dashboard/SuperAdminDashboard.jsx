import React, { useState } from 'react';
import { Building, Users, MapPin, Plus, TrendingUp, Settings, School, Activity } from 'lucide-react';
import Modal from '../../components/common/Modal';
import { useSchoolStore } from '../../store';
import { formatDate } from '../../utils';
import toast from 'react-hot-toast';

const SuperAdminDashboard = () => {
    const { schools, addSchool, setCurrentSchool } = useSchoolStore();
    const [showSchoolModal, setShowSchoolModal] = useState(false);

    // Mock Global Stats
    const stats = {
        totalSchools: schools.length || 2,
        totalStudents: 12500,
        totalRevenue: 5200000,
        activeCampuses: 8
    };

    const handleCreateSchool = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        addSchool({
            id: `school_${Date.now()}`,
            name: formData.get('name'),
            code: formData.get('code'),
            address: formData.get('address'),
            contactEmail: formData.get('email'),
            status: 'active',
            createdAt: new Date(),
        });

        toast.success('New school created successfully');
        setShowSchoolModal(false);
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
                    <button className="btn btn-primary" onClick={() => setShowSchoolModal(true)}>
                        <Plus size={18} />
                        <span>Add New School</span>
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

            {/* Create School Modal */}
            <Modal
                isOpen={showSchoolModal}
                onClose={() => setShowSchoolModal(false)}
                title="Register New School"
                size="lg"
                footer={null} // Custom footer within form
            >
                <form onSubmit={handleCreateSchool} className="space-y-md">
                    <div className="grid grid-cols-2 gap-md">
                        <div className="form-group">
                            <label className="form-label">School Name *</label>
                            <input name="name" type="text" className="input" required placeholder="e.g. Springfield Academy" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">School Code *</label>
                            <input name="code" type="text" className="input" required placeholder="e.g. SPG01" />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Logo URL</label>
                        <input name="logo" type="url" className="input" placeholder="https://example.com/logo.png" />
                        <p className="text-xs text-gray-500 mt-1">Direct link to school logo image (PNG/JPG)</p>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Address</label>
                        <input name="address" type="text" className="input" placeholder="Full physical address" />
                    </div>

                    <div className="grid grid-cols-2 gap-md">
                        <div className="form-group">
                            <label className="form-label">Contact Email *</label>
                            <input name="email" type="email" className="input" required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Phone</label>
                            <input name="phone" type="tel" className="input" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-md">
                        <div className="form-group">
                            <label className="form-label">Subscription Plan</label>
                            <select name="subscriptionPlan" className="select">
                                <option value="standard">Standard Plan</option>
                                <option value="premium">Premium Plan</option>
                                <option value="enterprise">Enterprise Plan</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-sm pt-md">
                        <button type="button" className="btn btn-outline" onClick={() => setShowSchoolModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Create School</button>
                    </div>
                </form>
            </Modal>

            <style jsx>{`
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
