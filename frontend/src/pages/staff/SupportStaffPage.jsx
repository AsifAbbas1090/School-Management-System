import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Plus, Search, Edit, Trash2, ShieldAlert } from 'lucide-react';
import Breadcrumb from '../../components/common/Breadcrumb';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';

import { useAuthStore } from '../../store';
import { USER_ROLES } from '../../constants';
import { usersService } from '../../services/api';

const SupportStaffPage = () => {
    const { user } = useAuthStore();
    const canManageStaff = [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(user?.role);
    // Note: Management role usually shouldn't create other management users, but Admin can.

    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [staffList, setStaffList] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        role: 'MANAGEMENT', // Default to management for now, or add selector
    });

    useEffect(() => {
        if (canManageStaff) {
            loadStaff();
        }
    }, [canManageStaff]);

    const loadStaff = async () => {
        setLoading(true);
        try {
            // Load management users
            const managementResponse = await usersService.getManagement();
            if (managementResponse.success && managementResponse.data) {
                const managementData = Array.isArray(managementResponse.data) ? managementResponse.data : [];
                setStaffList(managementData);
            } else {
                setStaffList([]);
            }
        } catch (error) {
            console.error('Failed to load management users:', error);
            setStaffList([]);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddStaff = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (formData.role === 'MANAGEMENT') {
                await usersService.createManagement({
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                    phone: formData.phone
                });
                toast.success("Management user added successfully");
            } else {
                // Future support for other staff types
                toast.error("Only MANAGEMENT role creation is currently supported via this form");
                return;
            }
            setShowModal(false);
            setFormData({ name: '', email: '', password: '', phone: '', role: 'MANAGEMENT' });
            await loadStaff(); // Reload list
        } catch (error) {
            toast.error(error.message || "Failed to add staff member");
        } finally {
            setLoading(false);
        }
    };

    if (!canManageStaff) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-[70vh]">
                <ShieldAlert size={64} className="text-error-500 mb-4" />
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Access Denied</h1>
                <p className="text-gray-600 max-w-md">You do not have permission to access staff management.</p>
            </div>
        );
    }

    return (
        <div className="support-staff-page">
            <Breadcrumb items={[
                { label: 'Dashboard', path: '/dashboard' },
                { label: 'Staff Management', path: null },
            ]} />

            <div className="page-header mb-lg flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Staff & Management</h1>
                    <p className="text-gray-600">Create management users with predefined credentials</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={18} />
                    <span>Add Management User</span>
                </button>
            </div>

            {/* List View Placeholder */}
            {/* ... Existing list view code or improved version ... */}
            <div className="card mb-lg p-md">
                <div className="flex gap-md items-center">
                    <Search size={20} className="text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="input flex-1"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Loading staff...</div>
            ) : staffList.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <User size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No management users found.</p>
                    <p className="text-sm">Use the "Add Management User" button to create new accounts.</p>
                </div>
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Role</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {staffList
                                .filter(staff => 
                                    !searchTerm || 
                                    staff.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    staff.email?.toLowerCase().includes(searchTerm.toLowerCase())
                                )
                                .map((staff) => (
                                <tr key={staff.id}>
                                    <td>{staff.name}</td>
                                    <td>{staff.email}</td>
                                    <td>{staff.phone || 'N/A'}</td>
                                    <td>
                                        <span className="badge badge-primary">MANAGEMENT</span>
                                    </td>
                                    <td>
                                        <span className={`badge badge-${staff.status === 'ACTIVE' ? 'success' : 'gray'}`}>
                                            {staff.status || 'ACTIVE'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}


            {/* Add Staff Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="Add New Management User"
                footer={null}
            >
                <form onSubmit={handleAddStaff} className="space-y-md">
                    <div className="form-group">
                        <label className="form-label">Full Name</label>
                        <input
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            type="text"
                            className="input"
                            placeholder="e.g. John Doe"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Role</label>
                        <select
                            name="role"
                            value={formData.role}
                            onChange={handleInputChange}
                            className="select"
                            disabled
                        >
                            <option value="MANAGEMENT">Management</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Currently restricted to Management users.</p>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Email (Login ID)</label>
                        <input
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            type="email"
                            className="input"
                            placeholder="email@school.com"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                            name="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            type="text"
                            className="input"
                            placeholder="Enter hardcoded password"
                            required
                        />
                        <p className="text-xs text-warning-600 mt-1">
                            Note: Determine this password carefully. It will be the user's initial login.
                        </p>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Phone</label>
                        <input
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            type="tel"
                            className="input"
                            placeholder="Phone Number"
                        />
                    </div>

                    <div className="flex justify-end gap-sm mt-lg">
                        <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Creating...' : 'Create User'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default SupportStaffPage;
