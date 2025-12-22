import React, { useState } from 'react';
import { User, Mail, Phone, MapPin, Plus, Search, Edit, Trash2 } from 'lucide-react';
import Breadcrumb from '../../components/common/Breadcrumb';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';

import { useAuthStore } from '../../store';
import { AlertCircle } from 'lucide-react';

const SupportStaffPage = () => {
    const { user } = useAuthStore();
    const canManageStaff = ['admin', 'management', 'super_admin'].includes(user?.role);

    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);

    if (!canManageStaff) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-[70vh]">
                <AlertCircle size={64} className="text-error-500 mb-4" />
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Access Denied</h1>
                <p className="text-gray-600 max-w-md">You do not have permission to access support staff management. This area is restricted to administrators and school management only.</p>
            </div>
        );
    }

    // Mock Data
    const [staffList, setStaffList] = useState([
        { id: 1, name: 'Alice Driver', role: 'Bus Driver', email: 'alice@school.com', phone: '123-456-7890', status: 'Active' },
        { id: 2, name: 'Bob Cleaner', role: 'Janitor', email: 'bob@school.com', phone: '123-456-7891', status: 'Active' },
        { id: 3, name: 'Charlie Guard', role: 'Security Guard', email: 'charlie@school.com', phone: '123-456-7892', status: 'Active' },
    ]);

    const breadcrumbItems = [
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Support Staff', path: null },
    ];

    const filteredStaff = staffList.filter(staff =>
        staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAddStaff = () => {
        toast.success("Staff added successfully");
        setShowModal(false);
    };

    const handleDelete = (id) => {
        setStaffList(staffList.filter(s => s.id !== id));
        toast.success("Staff member removed");
    };

    return (
        <div className="support-staff-page">
            <Breadcrumb items={breadcrumbItems} />

            <div className="page-header mb-lg flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Support Staff</h1>
                    <p className="text-gray-600">Manage support staff records and assignments</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={18} />
                    <span>Add Staff</span>
                </button>
            </div>

            <div className="card mb-lg p-md">
                <div className="flex gap-md items-center">
                    <Search size={20} className="text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name or role..."
                        className="input flex-1"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-md">
                {filteredStaff.map(staff => (
                    <div key={staff.id} className="card p-lg hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-md">
                            <div className="p-3 bg-primary-50 rounded-full text-primary-600">
                                <User size={24} />
                            </div>
                            <span className={`badge ${staff.status === 'Active' ? 'badge-success' : 'badge-error'}`}>
                                {staff.status}
                            </span>
                        </div>

                        <h3 className="text-lg font-bold text-gray-900 mb-1">{staff.name}</h3>
                        <p className="text-primary-600 font-medium mb-md">{staff.role}</p>

                        <div className="space-y-sm text-gray-600 text-sm mb-lg">
                            <div className="flex items-center gap-xs">
                                <Mail size={14} />
                                <span>{staff.email}</span>
                            </div>
                            <div className="flex items-center gap-xs">
                                <Phone size={14} />
                                <span>{staff.phone}</span>
                            </div>
                        </div>

                        <div className="flex gap-sm pt-md border-t border-gray-100">
                            <button className="btn btn-sm btn-outline flex-1">
                                <Edit size={14} />
                                <span>Edit</span>
                            </button>
                            <button className="btn btn-sm btn-outline text-error-600 hover:bg-error-50 flex-1" onClick={() => handleDelete(staff.id)}>
                                <Trash2 size={14} />
                                <span>Delete</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Staff Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="Add New Support Staff"
                footer={
                    <>
                        <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleAddStaff}>Add Staff</button>
                    </>
                }
            >
                <form className="space-y-md">
                    <div className="form-group">
                        <label className="form-label">Full Name</label>
                        <input type="text" className="input" placeholder="e.g. John Doe" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Role</label>
                        <select className="select">
                            <option>Security Guard</option>
                            <option>Janitor</option>
                            <option>Bus Driver</option>
                            <option>Librarian</option>
                            <option>Gardener</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input type="email" className="input" placeholder="email@school.com" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Phone</label>
                        <input type="tel" className="input" placeholder="Phone Number" />
                    </div>
                </form>
            </Modal>
            <style>{`
                .support-staff-page {
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

export default SupportStaffPage;
