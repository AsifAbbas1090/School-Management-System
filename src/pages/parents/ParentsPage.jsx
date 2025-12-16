import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit, Trash2, Download, UserCircle, Link as LinkIcon, Upload } from 'lucide-react';
import { useParentsStore, useStudentsStore } from '../../store';
import { mockData } from '../../services/mockData';
import { exportToCSV, generateId } from '../../utils';
import Breadcrumb from '../../components/common/Breadcrumb';
import Modal from '../../components/common/Modal';
import Avatar from '../../components/common/Avatar';
import CSVImport from '../../components/common/CSVImport';
import toast from 'react-hot-toast';

const ParentsPage = () => {
    const { parents, setParents, addParent, updateParent, deleteParent } = useParentsStore();
    const { students, setStudents } = useStudentsStore();

    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [selectedParent, setSelectedParent] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [parentToDelete, setParentToDelete] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        occupation: '',
        studentIds: [],
        status: 'active',
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        setParents(mockData.parents);
        setStudents(mockData.students);
    };

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
        if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
        if (!formData.address.trim()) newErrors.address = 'Address is required';
        if (!formData.occupation.trim()) newErrors.occupation = 'Occupation is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!validate()) return;

        const parentData = {
            ...formData,
            id: selectedParent?.id || generateId(),
            createdAt: selectedParent?.createdAt || new Date(),
            updatedAt: new Date(),
        };

        if (modalMode === 'add') {
            addParent(parentData);
            toast.success('Parent added successfully');
        } else {
            updateParent(selectedParent.id, parentData);
            toast.success('Parent updated successfully');
        }

        handleCloseModal();
    };

    const handleDeleteClick = (parent) => {
        setParentToDelete(parent);
        setShowDeleteConfirm(true);
    };

    const handleDeleteConfirm = () => {
        deleteParent(parentToDelete.id);
        toast.success('Parent deleted successfully');
        setShowDeleteConfirm(false);
        setParentToDelete(null);
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
        return studentIds
            .map(id => students.find(s => s.id === id)?.name)
            .filter(Boolean)
            .join(', ');
    };

    const filteredParents = parents.filter((parent) => {
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
                                        {parent.studentIds.length > 0 ? (
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
                            <label className="form-label">Occupation *</label>
                            <input
                                type="text"
                                name="occupation"
                                value={formData.occupation}
                                onChange={handleChange}
                                className={`input ${errors.occupation ? 'input-error' : ''}`}
                                placeholder="Enter occupation"
                            />
                            {errors.occupation && <span className="form-error">{errors.occupation}</span>}
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
                        <label className="form-label">Address *</label>
                        <textarea
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            className={`textarea ${errors.address ? 'input-error' : ''}`}
                            placeholder="Enter full address"
                            rows="3"
                        />
                        {errors.address && <span className="form-error">{errors.address}</span>}
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

            <style jsx>{`
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
