import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit, Trash2, Eye, Filter, Download, Upload } from 'lucide-react';
import { useStudentsStore, useClassesStore } from '../../store';
import { studentsService, mockData } from '../../services/mockData';
import { formatDate, exportToCSV, generateId } from '../../utils';
import Breadcrumb from '../../components/common/Breadcrumb';
import Modal from '../../components/common/Modal';
import Avatar from '../../components/common/Avatar';
import Loading from '../../components/common/Loading';
import CSVImport from '../../components/common/CSVImport';
import toast from 'react-hot-toast';

const StudentsPage = () => {
    const { students, setStudents, addStudent, updateStudent, deleteStudent, loading, setLoading } = useStudentsStore();
    const { classes, sections, setClasses, setSections } = useClassesStore();

    const [searchTerm, setSearchTerm] = useState('');
    const [filterClass, setFilterClass] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState(null);
    const [showImportModal, setShowImportModal] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        rollNumber: '',
        email: '',
        classId: '',
        sectionId: '',
        gender: 'male',
        dateOfBirth: '',
        phone: '',
        address: '',
        status: 'active',
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const response = await studentsService.getAll();
            if (response.success) {
                setStudents(response.data);
            }
            setClasses(mockData.classes);
            setSections(mockData.sections);
        } catch (error) {
            toast.error('Failed to load students');
        } finally {
            setLoading(false);
        }
    };

    const breadcrumbItems = [
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Students', path: null },
    ];

    const handleOpenModal = (mode, student = null) => {
        setModalMode(mode);
        if (mode === 'edit' && student) {
            setSelectedStudent(student);
            setFormData({
                name: student.name,
                rollNumber: student.rollNumber,
                email: student.email,
                classId: student.classId,
                sectionId: student.sectionId,
                gender: student.gender,
                dateOfBirth: student.dateOfBirth ? formatDate(student.dateOfBirth, 'yyyy-MM-dd') : '',
                phone: student.phone || '',
                address: student.address,
                status: student.status,
            });
        } else {
            resetForm();
        }
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            rollNumber: '',
            email: '',
            classId: '',
            sectionId: '',
            gender: 'male',
            dateOfBirth: '',
            phone: '',
            address: '',
            status: 'active',
        });
        setErrors({});
        setSelectedStudent(null);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        resetForm();
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.name.trim()) newErrors.name = 'Name is required';
        if (!formData.rollNumber.trim()) newErrors.rollNumber = 'Roll number is required';
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        if (!formData.classId) newErrors.classId = 'Class is required';
        if (!formData.sectionId) newErrors.sectionId = 'Section is required';
        if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
        if (!formData.address.trim()) newErrors.address = 'Address is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) return;

        try {
            const studentData = {
                ...formData,
                dateOfBirth: new Date(formData.dateOfBirth),
            };

            if (modalMode === 'add') {
                const response = await studentsService.create(studentData);
                if (response.success) {
                    addStudent(response.data);
                    toast.success('Student added successfully');
                }
            } else {
                const response = await studentsService.update(selectedStudent.id, studentData);
                if (response.success) {
                    updateStudent(selectedStudent.id, response.data);
                    toast.success('Student updated successfully');
                }
            }

            handleCloseModal();
        } catch (error) {
            toast.error('Operation failed');
        }
    };

    const handleDeleteClick = (student) => {
        setStudentToDelete(student);
        setShowDeleteConfirm(true);
    };

    const handleDeleteConfirm = async () => {
        try {
            await studentsService.delete(studentToDelete.id);
            deleteStudent(studentToDelete.id);
            toast.success('Student deleted successfully');
            setShowDeleteConfirm(false);
            setStudentToDelete(null);
        } catch (error) {
            toast.error('Failed to delete student');
        }
    };

    const handleExport = () => {
        const exportData = filteredStudents.map((student) => ({
            'Roll Number': student.rollNumber,
            'Name': student.name,
            'Email': student.email,
            'Class': getClassName(student.classId),
            'Section': getSectionName(student.sectionId),
            'Gender': student.gender,
            'Status': student.status,
        }));

        exportToCSV(exportData, 'students.csv');
        toast.success('Students exported successfully');
    };

    const handleImport = (importedData) => {
        // Process imported data and add students
        importedData.forEach((row) => {
            const classData = classes.find(c => c.name === row.class);
            const sectionData = sections.find(s => s.name === row.section && s.classId === classData?.id);

            const studentData = {
                id: generateId(),
                name: row.name,
                rollNumber: row.rollNumber,
                email: row.email,
                phone: row.phone || '',
                fatherName: row.fatherName || '',
                classId: classData?.id || '',
                sectionId: sectionData?.id || '',
                gender: 'male',
                dateOfBirth: row.admissionDate ? new Date(row.admissionDate) : new Date(),
                address: row.address || '',
                status: 'active',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            addStudent(studentData);
        });
    };

    const getClassName = (classId) => {
        const classData = classes.find((c) => c.id === classId);
        return classData ? classData.name : '';
    };

    const getSectionName = (sectionId) => {
        const section = sections.find((s) => s.id === sectionId);
        return section ? section.name : '';
    };

    const availableSections = sections.filter((s) => s.classId === formData.classId);

    const filteredStudents = students.filter((student) => {
        const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesClass = !filterClass || student.classId === filterClass;
        const matchesStatus = !filterStatus || student.status === filterStatus;

        return matchesSearch && matchesClass && matchesStatus;
    });

    if (loading) {
        return <Loading fullScreen />;
    }

    return (
        <div className="students-page">
            <Breadcrumb items={breadcrumbItems} />

            <div className="page-header">
                <div>
                    <h1>Students Management</h1>
                    <p className="text-gray-600">Manage all student records and information</p>
                </div>
                <div className="flex gap-md">
                    <button className="btn btn-outline" onClick={() => setShowImportModal(true)}>
                        <Upload size={18} />
                        <span>Import</span>
                    </button>
                    <button className="btn btn-outline" onClick={handleExport}>
                        <Download size={18} />
                        <span>Export</span>
                    </button>
                    <button className="btn btn-primary" onClick={() => handleOpenModal('add')}>
                        <Plus size={18} />
                        <span>Add Student</span>
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
                            placeholder="Search students..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input"
                        />
                    </div>

                    <select
                        value={filterClass}
                        onChange={(e) => setFilterClass(e.target.value)}
                        className="select"
                    >
                        <option value="">All Classes</option>
                        {classes.map((cls) => (
                            <option key={cls.id} value={cls.id}>{cls.name}</option>
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
                        <option value="suspended">Suspended</option>
                    </select>
                </div>
            </div>

            {/* Students Table */}
            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Student</th>
                            <th>Roll Number</th>
                            <th>Class & Section</th>
                            <th>Gender</th>
                            <th>Contact</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStudents.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="text-center">
                                    <div className="empty-state">
                                        <div className="empty-state-icon">📚</div>
                                        <h3 className="empty-state-title">No students found</h3>
                                        <p className="empty-state-description">
                                            {searchTerm || filterClass || filterStatus
                                                ? 'Try adjusting your filters'
                                                : 'Get started by adding your first student'}
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredStudents.map((student) => (
                                <tr key={student.id}>
                                    <td>
                                        <div className="flex items-center gap-md">
                                            <Avatar name={student.name} src={student.avatar} />
                                            <div>
                                                <div className="font-medium">{student.name}</div>
                                                <div className="text-sm text-gray-500">{student.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>{student.rollNumber}</td>
                                    <td>
                                        {getClassName(student.classId)} - {getSectionName(student.sectionId)}
                                    </td>
                                    <td className="capitalize">{student.gender}</td>
                                    <td>{student.phone || 'N/A'}</td>
                                    <td>
                                        <span className={`badge badge-${student.status === 'active' ? 'success' : 'gray'}`}>
                                            {student.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex gap-sm">
                                            <button
                                                className="btn btn-sm btn-outline"
                                                onClick={() => handleOpenModal('edit', student)}
                                                aria-label="Edit student"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                className="btn btn-sm btn-danger"
                                                onClick={() => handleDeleteClick(student)}
                                                aria-label="Delete student"
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
                title={modalMode === 'add' ? 'Add New Student' : 'Edit Student'}
                size="lg"
                footer={
                    <>
                        <button className="btn btn-outline" onClick={handleCloseModal}>
                            Cancel
                        </button>
                        <button className="btn btn-primary" onClick={handleSubmit}>
                            {modalMode === 'add' ? 'Add Student' : 'Update Student'}
                        </button>
                    </>
                }
            >
                <form className="student-form">
                    <div className="grid grid-cols-2">
                        <div className="form-group">
                            <label className="form-label">Full Name *</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className={`input ${errors.name ? 'input-error' : ''}`}
                                placeholder="Enter student name"
                            />
                            {errors.name && <span className="form-error">{errors.name}</span>}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Roll Number *</label>
                            <input
                                type="text"
                                name="rollNumber"
                                value={formData.rollNumber}
                                onChange={handleChange}
                                className={`input ${errors.rollNumber ? 'input-error' : ''}`}
                                placeholder="Enter roll number"
                            />
                            {errors.rollNumber && <span className="form-error">{errors.rollNumber}</span>}
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
                            <label className="form-label">Phone</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="input"
                                placeholder="Enter phone number"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Class *</label>
                            <select
                                name="classId"
                                value={formData.classId}
                                onChange={handleChange}
                                className={`select ${errors.classId ? 'input-error' : ''}`}
                            >
                                <option value="">Select Class</option>
                                {classes.map((cls) => (
                                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                                ))}
                            </select>
                            {errors.classId && <span className="form-error">{errors.classId}</span>}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Section *</label>
                            <select
                                name="sectionId"
                                value={formData.sectionId}
                                onChange={handleChange}
                                className={`select ${errors.sectionId ? 'input-error' : ''}`}
                                disabled={!formData.classId}
                            >
                                <option value="">Select Section</option>
                                {availableSections.map((section) => (
                                    <option key={section.id} value={section.id}>{section.name}</option>
                                ))}
                            </select>
                            {errors.sectionId && <span className="form-error">{errors.sectionId}</span>}
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
                            <label className="form-label">Status *</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="select"
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="suspended">Suspended</option>
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
                <p>Are you sure you want to delete <strong>{studentToDelete?.name}</strong>? This action cannot be undone.</p>
            </Modal>

            {/* CSV Import Modal */}
            {showImportModal && (
                <CSVImport
                    type="students"
                    onImport={handleImport}
                    onClose={() => setShowImportModal(false)}
                />
            )}

            <style jsx>{`
        .students-page {
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

        .student-form {
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

export default StudentsPage;
