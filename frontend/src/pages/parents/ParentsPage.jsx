import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Plus, Search, Edit, Trash2, Download, UserCircle, Link as LinkIcon, Upload, AlertCircle } from 'lucide-react';
import { useParentsStore, useStudentsStore, useAuthStore, useSchoolStore } from '../../store';
import { USER_ROLES } from '../../constants';
import { usersService, studentsService } from '../../services/api';
import { exportToCSV, generateId } from '../../utils';
import Breadcrumb from '../../components/common/Breadcrumb';
import Modal from '../../components/common/Modal';
import Avatar from '../../components/common/Avatar';
import CSVImport from '../../components/common/CSVImport';
import toast from 'react-hot-toast';

const ParentsPage = () => {
    const { user } = useAuthStore();
    const canManageParents = [USER_ROLES.ADMIN, USER_ROLES.MANAGEMENT, USER_ROLES.SUPER_ADMIN].includes(user?.role);
    const canManageManagement = user?.role === USER_ROLES.ADMIN; // Only Admin can add Management

    const { parents, setParents, addParent, updateParent, deleteParent } = useParentsStore();
    const { students, setStudents } = useStudentsStore();
    const { currentSchool } = useSchoolStore();

    if (!canManageParents) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-[70vh]">
                <AlertCircle size={64} className="text-error-500 mb-4" />
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Access Denied</h1>
                <p className="text-gray-600 max-w-md">You do not have permission to access parents management. This area is restricted to administrators and school management only.</p>
            </div>
        );
    }

    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [selectedParent, setSelectedParent] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [parentToDelete, setParentToDelete] = useState(null);
    const [showManagementModal, setShowManagementModal] = useState(false);
    const [managementFormData, setManagementFormData] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
    });
    const [managementErrors, setManagementErrors] = useState({});

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        address: '',
        occupation: '',
        studentIds: [],
        status: 'active',
    });

    const [errors, setErrors] = useState({});

    const loadData = useCallback(async () => {
        try {
            // Load parents from API
            const parentsResponse = await usersService.getParents();
            let parentsData = [];
            if (parentsResponse.success && parentsResponse.data) {
                parentsData = Array.isArray(parentsResponse.data) ? parentsResponse.data : [];
            }

            // Load management users from API (if admin)
            if (canManageManagement) {
                try {
                    const managementResponse = await usersService.getManagement();
                    if (managementResponse.success && managementResponse.data) {
                        const managementData = Array.isArray(managementResponse.data) ? managementResponse.data : [];
                        // Add management users to parents list for display
                        const existingIds = new Set(parentsData.map(p => p.id));
                        const newManagement = managementData
                            .filter(m => !existingIds.has(m.id))
                            .map(m => ({ ...m, role: 'MANAGEMENT' }));
                        parentsData = [...parentsData, ...newManagement];
                    }
                } catch (mgmtError) {
                    console.error('Failed to load management users:', mgmtError);
                    // Continue without management users
                }
            }

            // Load students from API first
            const studentsResponse = await studentsService.getAll();
            let studentsData = [];
            if (studentsResponse.success && studentsResponse.data) {
                studentsData = studentsResponse.data.data || studentsResponse.data;
                setStudents(Array.isArray(studentsData) ? studentsData : []);
            }

            // Map parent data and build studentIds from students data
            // This ensures we have the correct parent-student relationships
            const mappedParents = parentsData.map(parent => {
                // Find all students linked to this parent
                const linkedStudents = studentsData.filter(student => 
                    student.parentId === parent.id
                );
                const studentIds = linkedStudents.map(s => s.id);
                
                return {
                    ...parent,
                    studentIds: Array.isArray(studentIds) ? studentIds : [],
                };
            });
            setParents(mappedParents);
        } catch (error) {
            console.error('Failed to load data:', error);
            toast.error('Failed to load parents and students');
            // Set empty arrays to prevent white screen
            setParents([]);
            setStudents([]);
        }
    }, [canManageManagement, setParents, setStudents]);

    useEffect(() => {
        loadData();
    }, [loadData, currentSchool]);

    const breadcrumbItems = [
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Parents', path: null },
    ];

    const handleOpenModal = (mode, parent = null) => {
        setModalMode(mode);
        if (mode === 'edit' && parent) {
            setSelectedParent(parent);
            setFormData({
                name: parent.name,
                email: parent.email,
                password: parent.password || '',
                phone: parent.phone,
                address: parent.address,
                occupation: parent.occupation,
                studentIds: parent.studentIds || [],
                status: parent.status,
            });
        } else {
            resetForm();
        }
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            email: '',
            password: '',
            phone: '',
            address: '',
            occupation: '',
            studentIds: [],
            status: 'active',
        });
        setErrors({});
        setSelectedParent(null);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        resetForm();
    };

    const handleChange = (e) => {
        const { name, value, type, options } = e.target;

        if (type === 'select-multiple') {
            const selectedValues = Array.from(options)
                .filter(option => option.selected)
                .map(option => option.value);
            setFormData((prev) => ({ ...prev, [name]: selectedValues }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }

        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.name.trim()) newErrors.name = 'Name is required';
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        if (!formData.password.trim() && modalMode === 'add') newErrors.password = 'Password is required';
        if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
        // Address and occupation are optional to match student form parent creation
        // if (!formData.address.trim()) newErrors.address = 'Address is required';
        // if (!formData.occupation.trim()) newErrors.occupation = 'Occupation is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) return;

        try {
            const parentData = {
                name: formData.name,
                email: formData.email,
                password: formData.password,
                phone: formData.phone,
                occupation: formData.occupation,
            };

            if (modalMode === 'add') {
                const response = await usersService.createParent({
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                    phone: formData.phone,
                    occupation: formData.occupation, // Include occupation
                });
                if (response.success && response.data) {
                    addParent({
                        ...response.data,
                        occupation: formData.occupation,
                        address: formData.address,
                        studentIds: formData.studentIds,
                    });
                    toast.success('Parent added successfully');
                    loadData();
                } else {
                    toast.error(response.error || 'Failed to create parent');
                    return;
                }
            } else {
                // Update parent user info
                const updateData = {
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                };
                
                // Only include password if it's provided
                if (formData.password && formData.password.trim()) {
                    updateData.password = formData.password;
                }

                const response = await usersService.updateUser(selectedParent.id, updateData);
                if (response.success && response.data) {
                    // Update parent in store
                    updateParent(selectedParent.id, {
                        ...response.data,
                        occupation: formData.occupation,
                        address: formData.address,
                        studentIds: formData.studentIds,
                    });

                    // Link/unlink students to this parent
                    if (formData.studentIds && Array.isArray(formData.studentIds)) {
                        try {
                            // Get current students linked to this parent
                            const currentLinkedStudents = students.filter(s => s.parentId === selectedParent.id);
                            const currentLinkedIds = currentLinkedStudents.map(s => s.id);
                            
                            // Find students to link (new ones)
                            const studentsToLink = formData.studentIds.filter(id => !currentLinkedIds.includes(id));
                            // Find students to unlink (removed ones)
                            const studentsToUnlink = currentLinkedIds.filter(id => !formData.studentIds.includes(id));

                            // Link new students
                            const linkPromises = studentsToLink.map(async (studentId) => {
                                try {
                                    const response = await studentsService.update(studentId, { parentId: selectedParent.id });
                                    if (!response.success) {
                                        console.error(`Failed to link student ${studentId}:`, response.error);
                                        throw new Error(response.error || 'Failed to link student');
                                    }
                                    return { studentId, success: true };
                                } catch (error) {
                                    console.error(`Failed to link student ${studentId}:`, error);
                                    return { studentId, success: false, error };
                                }
                            });

                            // Unlink removed students (set parentId to null)
                            const unlinkPromises = studentsToUnlink.map(async (studentId) => {
                                try {
                                    const response = await studentsService.update(studentId, { parentId: null });
                                    if (!response.success) {
                                        console.error(`Failed to unlink student ${studentId}:`, response.error);
                                        throw new Error(response.error || 'Failed to unlink student');
                                    }
                                    return { studentId, success: true };
                                } catch (error) {
                                    console.error(`Failed to unlink student ${studentId}:`, error);
                                    return { studentId, success: false, error };
                                }
                            });

                            // Wait for all updates to complete
                            const linkResults = await Promise.all(linkPromises);
                            const unlinkResults = await Promise.all(unlinkPromises);

                            // Check for failures
                            const failedLinks = linkResults.filter(r => !r.success);
                            const failedUnlinks = unlinkResults.filter(r => !r.success);

                            if (failedLinks.length > 0 || failedUnlinks.length > 0) {
                                console.warn('Some student links failed:', { failedLinks, failedUnlinks });
                            }
                        } catch (linkError) {
                            console.error('Failed to link/unlink students:', linkError);
                            toast.error('Parent updated but failed to update student links');
                        }
                    }

                    toast.success('Parent updated successfully');
                    await loadData();
                } else {
                    toast.error(response.error || 'Failed to update parent');
                    return;
                }
            }

            handleCloseModal();
        } catch (error) {
            // Silently handle errors - toast shows user message
            toast.error('Failed to save parent');
        }
    };

    const handleDeleteClick = (parent) => {
        setParentToDelete(parent);
        setShowDeleteConfirm(true);
    };

    const handleDeleteConfirm = async () => {
        // Delete not available in API yet
        deleteParent(parentToDelete.id);
        toast.success('Parent deleted successfully');
        setShowDeleteConfirm(false);
        setParentToDelete(null);
        loadData();
    };

    const handleExport = () => {
        const exportData = filteredParents.map((parent) => ({
            'Name': parent.name,
            'Email': parent.email,
            'Phone': parent.phone,
            'Occupation': parent.occupation,
            'Children': getStudentNames(parent.studentIds),
            'Status': parent.status,
        }));

        exportToCSV(exportData, 'parents.csv');
        toast.success('Parents exported successfully');
    };

    const getStudentNames = (studentIds) => {
        if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
            return 'No children linked';
        }
        return studentIds
            .map(id => students.find(s => s.id === id)?.name)
            .filter(Boolean)
            .join(', ') || 'No children linked';
    };

    const filteredParents = parents.filter((parent) => {
        // Filter by school
        const matchesSchool = !currentSchool || parent.schoolId === currentSchool.id;
        if (!matchesSchool) return false;

        const matchesSearch = parent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            parent.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            parent.phone.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = !filterStatus || parent.status === filterStatus;

        return matchesSearch && matchesStatus;
    });

    return (
        <div className="parents-page">
            <Breadcrumb items={breadcrumbItems} />

            <div className="page-header">
                <div>
                    <h1>Parents Management</h1>
                    <p className="text-gray-600">Manage parent accounts and student linkages</p>
                </div>
                <div className="flex gap-md">
                    <button className="btn btn-outline" onClick={() => setShowImportModal(true)}>
                        <Upload size={18} />
                        <span>Import CSV</span>
                    </button>
                    <button className="btn btn-outline" onClick={handleExport}>
                        <Download size={18} />
                        <span>Export</span>
                    </button>
                    {canManageManagement && (
                        <button className="btn btn-outline" onClick={() => setShowManagementModal(true)}>
                            <Plus size={18} />
                            <span>Add Management</span>
                        </button>
                    )}
                    <button className="btn btn-primary" onClick={() => handleOpenModal('add')}>
                        <Plus size={18} />
                        <span>Add Parent</span>
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="filters-section card mb-lg">
                <div className="filters-grid">
                    <div className="search-box">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search parents..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input"
                        />
                    </div>

                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="select"
                    >
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
            </div>

            {/* Parents Table */}
            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Parent</th>
                            <th>Phone</th>
                            <th>Occupation</th>
                            <th>Children</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredParents.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="text-center">
                                    <div className="empty-state">
                                        <div className="empty-state-icon">👨‍👩‍👧‍👦</div>
                                        <h3 className="empty-state-title">No parents found</h3>
                                        <p className="empty-state-description">
                                            {searchTerm || filterStatus
                                                ? 'Try adjusting your filters'
                                                : 'Get started by adding your first parent'}
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredParents.map((parent) => (
                                <tr key={parent.id}>
                                    <td>
                                        <div className="flex items-center gap-md">
                                            <Avatar name={parent.name} />
                                            <div>
                                                <div className="font-medium">{parent.name}</div>
                                                <div className="text-sm text-gray-500">{parent.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>{parent.phone}</td>
                                    <td>{parent.occupation}</td>
                                    <td className="text-sm">
                                        {parent.studentIds && Array.isArray(parent.studentIds) && parent.studentIds.length > 0 ? (
                                            <div className="flex items-center gap-sm">
                                                <LinkIcon size={14} className="text-primary-600" />
                                                <span>{getStudentNames(parent.studentIds)}</span>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400">No children linked</span>
                                        )}
                                    </td>
                                    <td>
                                        <span className={`badge badge-${parent.status === 'active' ? 'success' : 'gray'}`}>
                                            {parent.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex gap-sm">
                                            <button
                                                className="btn btn-sm btn-outline"
                                                onClick={() => handleOpenModal('edit', parent)}
                                                aria-label="Edit parent"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                className="btn btn-sm btn-danger"
                                                onClick={() => handleDeleteClick(parent)}
                                                aria-label="Delete parent"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={showModal}
                onClose={handleCloseModal}
                title={modalMode === 'add' ? 'Add New Parent' : 'Edit Parent'}
                size="lg"
                footer={
                    <>
                        <button className="btn btn-outline" onClick={handleCloseModal}>
                            Cancel
                        </button>
                        <button className="btn btn-primary" onClick={handleSubmit}>
                            {modalMode === 'add' ? 'Add Parent' : 'Update Parent'}
                        </button>
                    </>
                }
            >
                <form className="parent-form">
                    <div className="grid grid-cols-2">
                        <div className="form-group">
                            <label className="form-label">Full Name *</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className={`input ${errors.name ? 'input-error' : ''}`}
                                placeholder="Enter parent name"
                            />
                            {errors.name && <span className="form-error">{errors.name}</span>}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Email *</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className={`input ${errors.email ? 'input-error' : ''}`}
                                placeholder="Enter email address"
                            />
                            {errors.email && <span className="form-error">{errors.email}</span>}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password {modalMode === 'add' ? '*' : ''}</label>
                            <input
                                type="text"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className={`input ${errors.password ? 'input-error' : ''}`}
                                placeholder="Set login password"
                                disabled={modalMode === 'edit'}
                            />
                            {errors.password && <span className="form-error">{errors.password}</span>}
                            {modalMode === 'edit' && (
                                <p className="text-xs text-gray-500 mt-1">Password cannot be changed after creation</p>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Phone *</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className={`input ${errors.phone ? 'input-error' : ''}`}
                                placeholder="Enter phone number"
                            />
                            {errors.phone && <span className="form-error">{errors.phone}</span>}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Occupation</label>
                            <input
                                type="text"
                                name="occupation"
                                value={formData.occupation}
                                onChange={handleChange}
                                className="input"
                                placeholder="e.g. Engineer"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Link Students</label>
                            <select
                                name="studentIds"
                                value={formData.studentIds}
                                onChange={handleChange}
                                className="select"
                                multiple
                                size="5"
                            >
                                {students.map((student) => (
                                    <option key={student.id} value={student.id}>
                                        {student.name} ({student.rollNumber})
                                    </option>
                                ))}
                            </select>
                            <span className="text-xs text-gray-500">Hold Ctrl/Cmd to select multiple</span>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Status *</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="select"
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Address</label>
                        <textarea
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            className="textarea"
                            placeholder="Enter full address (optional)"
                            rows="3"
                        />
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                title="Confirm Delete"
                footer={
                    <>
                        <button className="btn btn-outline" onClick={() => setShowDeleteConfirm(false)}>
                            Cancel
                        </button>
                        <button className="btn btn-danger" onClick={handleDeleteConfirm}>
                            Delete
                        </button>
                    </>
                }
            >
                <p>Are you sure you want to delete <strong>{parentToDelete?.name}</strong>? This action cannot be undone.</p>
            </Modal>

            {/* Add Management Modal */}
            {showManagementModal && (
                <Modal
                    isOpen={showManagementModal}
                    onClose={() => {
                        setShowManagementModal(false);
                        setManagementFormData({ name: '', email: '', password: '', phone: '' });
                        setManagementErrors({});
                    }}
                    title="Add Management User"
                    footer={
                        <>
                            <button className="btn btn-outline" onClick={() => {
                                setShowManagementModal(false);
                                setManagementFormData({ name: '', email: '', password: '', phone: '' });
                                setManagementErrors({});
                            }}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={async () => {
                                const errors = {};
                                if (!managementFormData.name.trim()) errors.name = 'Name is required';
                                if (!managementFormData.email.trim()) errors.email = 'Email is required';
                                if (!managementFormData.password.trim()) errors.password = 'Password is required';
                                if (!managementFormData.phone.trim()) errors.phone = 'Phone is required';

                                if (Object.keys(errors).length > 0) {
                                    setManagementErrors(errors);
                                    return;
                                }

                                // Add management user via API
                                try {
                                    const response = await usersService.createManagement({
                                        name: managementFormData.name,
                                        email: managementFormData.email,
                                        password: managementFormData.password,
                                        phone: managementFormData.phone,
                                    });

                                    if (response.success && response.data) {
                                        toast.success(`Management user "${managementFormData.name}" added successfully with login credentials`);
                                        setShowManagementModal(false);
                                        setManagementFormData({ name: '', email: '', password: '', phone: '' });
                                        setManagementErrors({});
                                        loadData(); // Reload to show the new management user
                                    } else {
                                        toast.error(response.error || 'Failed to create management user');
                                    }
                                } catch (error) {
                                    toast.error('Failed to create management user');
                                }
                            }}>
                                Add Management
                            </button>
                        </>
                    }
                >
                    <form className="management-form">
                        <div className="grid grid-cols-2 gap-md">
                            <div className="form-group">
                                <label className="form-label">Full Name *</label>
                                <input
                                    type="text"
                                    value={managementFormData.name}
                                    onChange={(e) => {
                                        setManagementFormData(prev => ({ ...prev, name: e.target.value }));
                                        if (managementErrors.name) setManagementErrors(prev => ({ ...prev, name: '' }));
                                    }}
                                    className={`input ${managementErrors.name ? 'input-error' : ''}`}
                                    placeholder="Enter management name"
                                />
                                {managementErrors.name && <span className="form-error">{managementErrors.name}</span>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Email *</label>
                                <input
                                    type="email"
                                    value={managementFormData.email}
                                    onChange={(e) => {
                                        setManagementFormData(prev => ({ ...prev, email: e.target.value }));
                                        if (managementErrors.email) setManagementErrors(prev => ({ ...prev, email: '' }));
                                    }}
                                    className={`input ${managementErrors.email ? 'input-error' : ''}`}
                                    placeholder="Enter email address"
                                />
                                {managementErrors.email && <span className="form-error">{managementErrors.email}</span>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Password *</label>
                                <input
                                    type="text"
                                    value={managementFormData.password}
                                    onChange={(e) => {
                                        setManagementFormData(prev => ({ ...prev, password: e.target.value }));
                                        if (managementErrors.password) setManagementErrors(prev => ({ ...prev, password: '' }));
                                    }}
                                    className={`input ${managementErrors.password ? 'input-error' : ''}`}
                                    placeholder="Set login password"
                                />
                                {managementErrors.password && <span className="form-error">{managementErrors.password}</span>}
                                <p className="text-xs text-gray-500 mt-1">Password will be set by you and cannot be changed by the user</p>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Phone *</label>
                                <input
                                    type="tel"
                                    value={managementFormData.phone}
                                    onChange={(e) => {
                                        setManagementFormData(prev => ({ ...prev, phone: e.target.value }));
                                        if (managementErrors.phone) setManagementErrors(prev => ({ ...prev, phone: '' }));
                                    }}
                                    className={`input ${managementErrors.phone ? 'input-error' : ''}`}
                                    placeholder="Enter phone number"
                                />
                                {managementErrors.phone && <span className="form-error">{managementErrors.phone}</span>}
                            </div>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Import Modal */}
            {showImportModal && (
                <Modal
                    isOpen={showImportModal}
                    onClose={() => setShowImportModal(false)}
                    title="Import Parents via CSV"
                    size="lg"
                    footer={null}
                >
                    <CSVImport
                        type="parents"
                        onImport={(data) => {
                            let successCount = 0;
                            data.forEach(row => {
                                // Find student IDs from roll numbers
                                const linkedRollNumbers = row.linkedStudentRollNumbers ? row.linkedStudentRollNumbers.split(';') : [];
                                const linkedStudentIds = linkedRollNumbers
                                    .map(roll => students.find(s => s.rollNumber === roll.trim())?.id)
                                    .filter(Boolean);

                                addParent({
                                    id: generateId(),
                                    name: row.name,
                                    email: row.email,
                                    phone: row.phone,
                                    occupation: row.occupation || 'N/A',
                                    address: row.address || 'N/A',
                                    studentIds: linkedStudentIds,
                                    status: 'active',
                                    createdAt: new Date(),
                                    updatedAt: new Date(),
                                });
                                successCount++;
                            });

                            if (successCount > 0) {
                                toast.success(`Successfully imported ${successCount} parents`);
                                setShowImportModal(false);
                            }
                        }}
                    />
                </Modal>
            )}

            <style>{`
        .parents-page {
          animation: fadeIn 0.3s ease-in-out;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--spacing-xl);
        }

        .page-header h1 {
          font-size: 2rem;
          font-weight: 700;
          color: var(--gray-900);
          margin-bottom: var(--spacing-xs);
        }

        .filters-section {
          padding: var(--spacing-lg);
        }

        .filters-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: var(--spacing-md);
        }

        .search-box {
          position: relative;
        }

        .search-icon {
          position: absolute;
          left: 0.875rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--gray-400);
        }

        .search-box input {
          padding-left: 2.75rem;
        }

        .parent-form {
          max-height: 60vh;
          overflow-y: auto;
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

export default ParentsPage;
