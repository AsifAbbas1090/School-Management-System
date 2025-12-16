import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit, Trash2, Download, UserCheck, Upload } from 'lucide-react';
import { useTeachersStore, useClassesStore } from '../../store';
import { mockData } from '../../services/mockData';
import { formatDate, exportToCSV, generateId } from '../../utils';
import Breadcrumb from '../../components/common/Breadcrumb';
import Modal from '../../components/common/Modal';
import Avatar from '../../components/common/Avatar';
import CSVImport from '../../components/common/CSVImport';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

const TeachersPage = () => {
    const { teachers, setTeachers, addTeacher, updateTeacher, deleteTeacher } = useTeachersStore();
    const { subjects, setSubjects } = useClassesStore();

    const [searchTerm, setSearchTerm] = useState('');
    const [filterSubject, setFilterSubject] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [teacherToDelete, setTeacherToDelete] = useState(null);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        employeeId: '',
        phone: '',
        gender: 'male',
        dateOfBirth: '',
        address: '',
        subjectIds: [],
        salary: '',
        joiningDate: '',
        status: 'active',
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        setTeachers(mockData.teachers);
        setSubjects(mockData.subjects);
    };

    const breadcrumbItems = [
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Teachers', path: null },
    ];

    const handleOpenModal = (mode, teacher = null) => {
        setModalMode(mode);
        if (mode === 'edit' && teacher) {
            setSelectedTeacher(teacher);
            setFormData({
                name: teacher.name,
                email: teacher.email,
                employeeId: teacher.employeeId,
                phone: teacher.phone,
                gender: teacher.gender,
                dateOfBirth: teacher.dateOfBirth ? formatDate(teacher.dateOfBirth, 'yyyy-MM-dd') : '',
                address: teacher.address,
                subjectIds: teacher.subjectIds || [],
                salary: teacher.salary.toString(),
                joiningDate: teacher.joiningDate ? formatDate(teacher.joiningDate, 'yyyy-MM-dd') : '',
                status: teacher.status,
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
            employeeId: '',
            phone: '',
            gender: 'male',
            dateOfBirth: '',
            address: '',
            subjectIds: [],
            salary: '',
            joiningDate: '',
            status: 'active',
        });
        setErrors({});
        setSelectedTeacher(null);
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
        if (!formData.employeeId.trim()) newErrors.employeeId = 'Employee ID is required';
        if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
        if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
        if (!formData.address.trim()) newErrors.address = 'Address is required';
        if (!formData.salary) newErrors.salary = 'Salary is required';
        if (!formData.joiningDate) newErrors.joiningDate = 'Joining date is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!validate()) return;

        const teacherData = {
            ...formData,
            id: selectedTeacher?.id || generateId(),
            dateOfBirth: new Date(formData.dateOfBirth),
            joiningDate: new Date(formData.joiningDate),
            salary: parseFloat(formData.salary),
            classIds: [],
            createdAt: selectedTeacher?.createdAt || new Date(),
            updatedAt: new Date(),
        };

        if (modalMode === 'add') {
            addTeacher(teacherData);
            toast.success('Teacher added successfully');
        } else {
            updateTeacher(selectedTeacher.id, teacherData);
            toast.success('Teacher updated successfully');
        }

        handleCloseModal();
    };

    const handleDeleteClick = (teacher) => {
        setTeacherToDelete(teacher);
        setShowDeleteConfirm(true);
    };

    const handleDeleteConfirm = () => {
        deleteTeacher(teacherToDelete.id);
        toast.success('Teacher deleted successfully');
        setShowDeleteConfirm(false);
        setTeacherToDelete(null);
    };

    const handleExport = () => {
        const exportData = filteredTeachers.map((teacher) => ({
            'Employee ID': teacher.employeeId,
            'Name': teacher.name,
            'Email': teacher.email,
            'Phone': teacher.phone,
            'Subjects': getSubjectNames(teacher.subjectIds),
            'Salary': teacher.salary,
            'Status': teacher.status,
        }));

        exportToCSV(exportData, 'teachers.csv');
        toast.success('Teachers exported successfully');
    };

    const getSubjectNames = (subjectIds) => {
        return subjectIds
            .map(id => subjects.find(s => s.id === id)?.name)
            .filter(Boolean)
            .join(', ');
    };

    const filteredTeachers = teachers.filter((teacher) => {
        const matchesSearch = teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            teacher.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            teacher.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSubject = !filterSubject || teacher.subjectIds.includes(filterSubject);
        const matchesStatus = !filterStatus || teacher.status === filterStatus;

        return matchesSearch && matchesSubject && matchesStatus;
    });

    return (
        <div className="teachers-page">
            <Breadcrumb items={breadcrumbItems} />

            <div className="page-header">
                <div>
                    <h1>Teachers Management</h1>
                    <p className="text-gray-600">Manage all teacher records and assignments</p>
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
                        <span>Add Teacher</span>
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
                            placeholder="Search teachers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input"
                        />
                    </div>

                    <select
                        value={filterSubject}
                        onChange={(e) => setFilterSubject(e.target.value)}
                        className="select"
                    >
                        <option value="">All Subjects</option>
                        {subjects.map((subject) => (
                            <option key={subject.id} value={subject.id}>{subject.name}</option>
                        ))}
                    </select>

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

            {/* Teachers Table */}
            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Teacher</th>
                            <th>Employee ID</th>
                            <th>Subjects</th>
                            <th>Phone</th>
                            <th>Salary</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTeachers.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="text-center">
                                    <div className="empty-state">
                                        <div className="empty-state-icon">👨‍🏫</div>
                                        <h3 className="empty-state-title">No teachers found</h3>
                                        <p className="empty-state-description">
                                            {searchTerm || filterSubject || filterStatus
                                                ? 'Try adjusting your filters'
                                                : 'Get started by adding your first teacher'}
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredTeachers.map((teacher) => (
                                <tr key={teacher.id}>
                                    <td>
                                        <div className="flex items-center gap-md">
                                            <Avatar name={teacher.name} src={teacher.avatar} />
                                            <div>
                                                <div className="font-medium">{teacher.name}</div>
                                                <div className="text-sm text-gray-500">{teacher.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>{teacher.employeeId}</td>
                                    <td className="text-sm">{getSubjectNames(teacher.subjectIds) || 'Not assigned'}</td>
                                    <td>{teacher.phone}</td>
                                    <td className="font-medium">${teacher.salary.toLocaleString()}</td>
                                    <td>
                                        <span className={`badge badge-${teacher.status === 'active' ? 'success' : 'gray'}`}>
                                            {teacher.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex gap-sm">
                                            <button
                                                className="btn btn-sm btn-outline"
                                                onClick={() => handleOpenModal('edit', teacher)}
                                                aria-label="Edit teacher"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                className="btn btn-sm btn-danger"
                                                onClick={() => handleDeleteClick(teacher)}
                                                aria-label="Delete teacher"
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
                title={modalMode === 'add' ? 'Add New Teacher' : 'Edit Teacher'}
                size="lg"
                footer={
                    <>
                        <button className="btn btn-outline" onClick={handleCloseModal}>
                            Cancel
                        </button>
                        <button className="btn btn-primary" onClick={handleSubmit}>
                            {modalMode === 'add' ? 'Add Teacher' : 'Update Teacher'}
                        </button>
                    </>
                }
            >
                <form className="teacher-form">
                    <div className="grid grid-cols-2">
                        <div className="form-group">
                            <label className="form-label">Full Name *</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className={`input ${errors.name ? 'input-error' : ''}`}
                                placeholder="Enter teacher name"
                            />
                            {errors.name && <span className="form-error">{errors.name}</span>}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Employee ID *</label>
                            <input
                                type="text"
                                name="employeeId"
                                value={formData.employeeId}
                                onChange={handleChange}
                                className={`input ${errors.employeeId ? 'input-error' : ''}`}
                                placeholder="Enter employee ID"
                            />
                            {errors.employeeId && <span className="form-error">{errors.employeeId}</span>}
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
                            <label className="form-label">Gender *</label>
                            <select
                                name="gender"
                                value={formData.gender}
                                onChange={handleChange}
                                className="select"
                            >
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Date of Birth *</label>
                            <input
                                type="date"
                                name="dateOfBirth"
                                value={formData.dateOfBirth}
                                onChange={handleChange}
                                className={`input ${errors.dateOfBirth ? 'input-error' : ''}`}
                            />
                            {errors.dateOfBirth && <span className="form-error">{errors.dateOfBirth}</span>}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Joining Date *</label>
                            <input
                                type="date"
                                name="joiningDate"
                                value={formData.joiningDate}
                                onChange={handleChange}
                                className={`input ${errors.joiningDate ? 'input-error' : ''}`}
                            />
                            {errors.joiningDate && <span className="form-error">{errors.joiningDate}</span>}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Salary *</label>
                            <input
                                type="number"
                                name="salary"
                                value={formData.salary}
                                onChange={handleChange}
                                className={`input ${errors.salary ? 'input-error' : ''}`}
                                placeholder="Enter salary"
                            />
                            {errors.salary && <span className="form-error">{errors.salary}</span>}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Subjects</label>
                            <select
                                name="subjectIds"
                                value={formData.subjectIds}
                                onChange={handleChange}
                                className="select"
                                multiple
                                size="4"
                            >
                                {subjects.map((subject) => (
                                    <option key={subject.id} value={subject.id}>{subject.name}</option>
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
                <p>Are you sure you want to delete <strong>{teacherToDelete?.name}</strong>? This action cannot be undone.</p>
            </Modal>

            {/* Import Modal */}
            {showImportModal && (
                <Modal
                    isOpen={showImportModal}
                    onClose={() => setShowImportModal(false)}
                    title="Import Teachers via CSV"
                    size="lg"
                    footer={null}
                >
                    <CSVImport
                        type="teachers"
                        onImport={(data) => {
                            let successCount = 0;
                            data.forEach(row => {
                                // Find subject IDs from names
                                const subjectNames = row.subjects ? row.subjects.split(';') : [];
                                const subjectIds = subjectNames
                                    .map(name => subjects.find(s => s.name.toLowerCase() === name.trim().toLowerCase())?.id)
                                    .filter(Boolean);

                                addTeacher({
                                    id: generateId(),
                                    name: row.name,
                                    email: row.email,
                                    employeeId: row.employeeId,
                                    phone: row.phone || '',
                                    gender: 'male', // Default or parse if needed
                                    dateOfBirth: new Date('1990-01-01'), // Default or parse
                                    address: 'Address not provided',
                                    salary: parseFloat(row.salary),
                                    joiningDate: row.joiningDate ? new Date(row.joiningDate) : new Date(),
                                    subjectIds: subjectIds,
                                    classIds: [],
                                    status: 'active',
                                    createdAt: new Date(),
                                    updatedAt: new Date(),
                                });
                                successCount++;
                            });

                            if (successCount > 0) {
                                toast.success(`Successfully imported ${successCount} teachers`);
                                setShowImportModal(false);
                            }
                        }}
                    />
                </Modal>
            )}

            <style jsx>{`
        .teachers-page {
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
          grid-template-columns: 2fr 1fr 1fr;
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

        .teacher-form {
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

export default TeachersPage;
