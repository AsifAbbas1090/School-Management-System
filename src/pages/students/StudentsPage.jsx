import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit, Trash2, Eye, Filter, Download, Upload, AlertCircle, TrendingUp } from 'lucide-react';
import { useStudentsStore, useClassesStore, useParentsStore, useFeesStore, useAuthStore, useSchoolStore } from '../../store';
import { studentsService, mockData } from '../../services/mockData';
import { formatDate, exportToCSV, generateId, formatCurrency } from '../../utils';
import { printTable } from '../../utils/printUtils';
import { USER_ROLES } from '../../constants';
import Breadcrumb from '../../components/common/Breadcrumb';
import Modal from '../../components/common/Modal';
import Avatar from '../../components/common/Avatar';
import Loading from '../../components/common/Loading';
import CSVImport from '../../components/common/CSVImport';
import toast from 'react-hot-toast';

const StudentsPage = () => {
    const { user } = useAuthStore();
    const { students, setStudents, addStudent, updateStudent, deleteStudent, loading, setLoading } = useStudentsStore();

    // Permissions check
    const canManageStudents = [USER_ROLES.ADMIN, USER_ROLES.MANAGEMENT, USER_ROLES.SUPER_ADMIN].includes(user?.role);

    if (!canManageStudents) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-[70vh]">
                <AlertCircle size={64} className="text-error-500 mb-4" />
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Access Denied</h1>
                <p className="text-gray-600 max-w-md">You do not have permission to access students management. This area is restricted to administrators and school management only.</p>
            </div>
        );
    }

    const { classes, sections, setClasses, setSections, getClassesBySchool, getSectionsBySchool } = useClassesStore();
    const { addParent, parents } = useParentsStore();
    const { feePayments } = useFeesStore();
    const { currentSchool } = useSchoolStore();

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
        monthlyFee: '',

        // Parent Details (Only for 'add' mode)
        parentName: '',
        parentEmail: '',
        parentPassword: '',
        parentPhone: '',
        parentOccupation: '',
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        loadData();
    }, [currentSchool]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load school-specific data
            if (currentSchool) {
                const schoolDataKey = `school_data_${currentSchool.id}`;
                const storedData = localStorage.getItem(schoolDataKey);
                
                if (storedData) {
                    const schoolData = JSON.parse(storedData);
                    setStudents(schoolData.students || []);
                    setClasses(schoolData.classes || []);
                    setSections(schoolData.sections || []);
                } else {
                    // Fallback to mock data filtered by school
                    const schoolStudents = mockData.students.filter(s => s.schoolId === currentSchool.id);
                    const schoolClasses = mockData.classes.filter(c => c.schoolId === currentSchool.id);
                    const schoolSections = mockData.sections.filter(s => s.schoolId === currentSchool.id);
                    
                    setStudents(schoolStudents);
                    setClasses(schoolClasses);
                    setSections(schoolSections);
                }
            } else {
                // No school selected, use all data (for super admin)
                const response = await studentsService.getAll();
                if (response.success) {
                    setStudents(response.data);
                }
                setClasses(mockData.classes);
                setSections(mockData.sections);
            }
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
            // Find linked parent if needed, but for now we focus on student edit
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
                monthlyFee: student.monthlyFee || '',
                // Parent fields left empty for edit as we manage parent separately or don't edit here
                parentName: '',
                parentEmail: '',
                parentPassword: '',
                parentPhone: '',
                parentOccupation: '',
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
            monthlyFee: '',
            parentName: '',
            parentEmail: '',
            parentPassword: '',
            parentPhone: '',
            parentOccupation: '',
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
        // Email is optional for students
        if (!formData.classId) newErrors.classId = 'Class is required';
        if (!formData.sectionId) newErrors.sectionId = 'Section is required';
        if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
        if (!formData.address.trim()) newErrors.address = 'Address is required';
        if (!formData.monthlyFee) newErrors.monthlyFee = 'Monthly fee is required';

        if (modalMode === 'add') {
            if (!formData.parentName.trim()) newErrors.parentName = 'Parent Name is required';
            if (!formData.parentEmail.trim()) newErrors.parentEmail = 'Parent Email is required';
            if (!formData.parentPassword.trim()) newErrors.parentPassword = 'Parent Password is required';
            if (!formData.parentPhone.trim()) newErrors.parentPhone = 'Parent Phone is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) return;

        try {
            let parentId = selectedStudent?.parentId;

            // Handle Parent Creation (Only in Add Mode)
            if (modalMode === 'add') {
                const newParentId = `p${Date.now()}`;
                parentId = newParentId;

                const newParent = {
                    id: newParentId,
                    name: formData.parentName,
                    email: formData.parentEmail,
                    phone: formData.parentPhone,
                    occupation: formData.parentOccupation,
                    password: formData.parentPassword, // Password set by admin/management
                    role: 'parent',
                    studentIds: [], // Will be updated
                    schoolId: currentSchool?.id || null, // Link to school
                    status: 'active',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };

                // Add parent to store
                addParent(newParent);
            }

            const studentData = {
                ...formData,
                dateOfBirth: new Date(formData.dateOfBirth),
                monthlyFee: parseFloat(formData.monthlyFee),
                parentId: parentId, // Link to parent
                schoolId: currentSchool?.id || null, // Link to school
            };

            // Remove parent fields from student object
            delete studentData.parentName;
            delete studentData.parentEmail;
            delete studentData.parentPassword;
            delete studentData.parentPhone;
            delete studentData.parentOccupation;

            if (modalMode === 'add') {
                const response = await studentsService.create(studentData);
                if (response.success) {
                    addStudent(response.data);

                    // Update parent with child ID if using a smarter store, but for now parent link is enough
                    toast.success('Student and Parent account created successfully');
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
            console.error(error);
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
        const data = filteredStudents.map(student => ({
            name: student.name,
            roll: student.rollNumber,
            class: `${getClassName(student.classId)} - ${getSectionName(student.sectionId)}`,
            fee: student.monthlyFee && student.monthlyFee > 0 ? formatCurrency(student.monthlyFee) : 'Rs 0',
            status: student.status.toUpperCase()
        }));

        printTable({
            title: 'Students Report',
            columns: [
                { header: 'Name', accessor: 'name' },
                { header: 'Roll No', accessor: 'roll' },
                { header: 'Class', accessor: 'class' },
                { header: 'Monthly Fee', accessor: 'fee' },
                { header: 'Status', accessor: 'status' }
            ],
            data: data
        });
    };

    const handleImport = (importedData) => {
        // Process imported data and add students
        importedData.forEach((row) => {
            const classData = classes.find(c => c.name === row.class);
            const sectionData = sections.find(s => s.name === row.section && s.classId === classData?.id);

            // Generate Parent ID
            const parentId = `p_imp_${generateId()}`;

            // Create Parent (Implicitly)
            addParent({
                id: parentId,
                name: row.fatherName || 'Unknown Parent',
                email: `parent_${row.rollNumber}@example.com`, // Auto-gen email
                password: row.parentPassword || 'password123', // Use provided password or default
                role: 'parent',
                phone: row.phone || '',
                createdAt: new Date()
            });

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
                monthlyFee: parseFloat(row.monthlyFee) || 5000,
                parentId: parentId,
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

    // Calculate Pending Fees
    const getFeeStatus = (student) => {
        const studentPayments = feePayments.filter(p => p.studentId === student.id);
        const totalPaid = studentPayments.reduce((sum, p) => sum + p.paidAmount, 0);
        // Simplified Logic: Assuming fee starts from admission, but for now let's just use a fixed "Total Due" logic or check current month
        // For the "Pending Alert > 2x monthly" requirement:
        // We'll simulate 'pending amount' as (random or derived) for demo if not strictly tracked month-by-month in store
        // Let's assume 'dueAmount' comes from store or is calculated.
        // For demo: verify against a mock "totalFeesDue" or similar.
        // For accurate tracking: Pending = (Months * MonthlyFee) - Paid.

        // Mock calculation for alert demo:
        const monthsJoined = 3; // Mock
        const totalExpected = (student.monthlyFee || 0) * monthsJoined;
        const pending = totalExpected - totalPaid;

        return {
            pending,
            isAlert: pending > ((student.monthlyFee || 0) * 2)
        };
    };

    // Filter sections by current school and selected class
    const availableSections = sections.filter((s) => {
        const matchesClass = s.classId === formData.classId;
        const matchesSchool = !currentSchool || s.schoolId === currentSchool.id;
        return matchesClass && matchesSchool;
    });

    const filteredStudents = students.filter((student) => {
        // Filter by school
        const matchesSchool = !currentSchool || student.schoolId === currentSchool.id;
        if (!matchesSchool) return false;
        
        const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (student.email && student.email.toLowerCase().includes(searchTerm.toLowerCase()));
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
                    <p className="text-gray-600">Manage all student records and parents</p>
                </div>
                <div className="flex gap-md">
                    <button className="btn btn-outline" onClick={() => setShowImportModal(true)}>
                        <Upload size={18} />
                        <span>Import CSV</span>
                    </button>
                    <button className="btn btn-outline" onClick={handleExport}>
                        <Download size={18} />
                        <span>PDF Report</span>
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
                            <th>Monthly Fee</th>
                            <th>Fee Status</th>
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
                            filteredStudents.map((student) => {
                                const { pending, isAlert } = getFeeStatus(student);
                                return (
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
                                        <td>{formatCurrency(student.monthlyFee || 0)}</td>
                                        <td>
                                            {isAlert ? (
                                                <div className="flex items-center gap-xs text-error-600 font-medium" title={`Pending: ${formatCurrency(pending)}`}>
                                                    <AlertCircle size={16} />
                                                    <span>Overdue</span>
                                                </div>
                                            ) : (
                                                <span className="text-success-600 text-sm">On Track</span>
                                            )}
                                        </td>
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
                                )
                            })
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
                <form className="student-form p-2">
                    {/* Student Information */}
                    <h3 className="text-lg font-bold mb-4 text-gray-800 border-b pb-2">Student Information</h3>
                    <div className="grid grid-cols-2 gap-4 mb-6">
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
                            <label className="form-label">Email (Optional)</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="input"
                                placeholder="Enter email address (optional)"
                            />
                            <p className="text-xs text-gray-500 mt-1">Students do not have login access</p>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Monthly Fee (PKR) *</label>
                            <input
                                type="number"
                                name="monthlyFee"
                                value={formData.monthlyFee}
                                onChange={handleChange}
                                className={`input ${errors.monthlyFee ? 'input-error' : ''}`}
                                placeholder="e.g 5000"
                            />
                            {errors.monthlyFee && <span className="form-error">{errors.monthlyFee}</span>}
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
                    </div>

                    <div className="form-group mb-6">
                        <label className="form-label">Address *</label>
                        <textarea
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            className={`textarea ${errors.address ? 'input-error' : ''}`}
                            placeholder="Enter full address"
                            rows="2"
                        />
                        {errors.address && <span className="form-error">{errors.address}</span>}
                    </div>

                    {/* Parent Details - Only in Add Mode */}
                    {modalMode === 'add' && (
                        <>
                            <h3 className="text-lg font-bold mb-4 text-gray-800 border-b pb-2">Parent / Guardian Information</h3>
                            <div className="bg-gray-50 p-4 rounded-lg mb-4 text-sm text-gray-600 mb-4">
                                <p>A parent account will be automatically created and linked to this student.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="form-group">
                                    <label className="form-label">Parent Name *</label>
                                    <input
                                        type="text"
                                        name="parentName"
                                        value={formData.parentName}
                                        onChange={handleChange}
                                        className={`input ${errors.parentName ? 'input-error' : ''}`}
                                        placeholder="Father/Guardian Name"
                                    />
                                    {errors.parentName && <span className="form-error">{errors.parentName}</span>}
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Parent Email *</label>
                                    <input
                                        type="email"
                                        name="parentEmail"
                                        value={formData.parentEmail}
                                        onChange={handleChange}
                                        className={`input ${errors.parentEmail ? 'input-error' : ''}`}
                                        placeholder="For login/notifications"
                                    />
                                    {errors.parentEmail && <span className="form-error">{errors.parentEmail}</span>}
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Parent Password *</label>
                                    <input
                                        type="text"
                                        name="parentPassword"
                                        value={formData.parentPassword}
                                        onChange={handleChange}
                                        className={`input ${errors.parentPassword ? 'input-error' : ''}`}
                                        placeholder="Set login password"
                                    />
                                    {errors.parentPassword && <span className="form-error">{errors.parentPassword}</span>}
                                    <p className="text-xs text-gray-500 mt-1">Password will be set by you and cannot be changed by the parent</p>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Phone Number *</label>
                                    <input
                                        type="tel"
                                        name="parentPhone"
                                        value={formData.parentPhone}
                                        onChange={handleChange}
                                        className={`input ${errors.parentPhone ? 'input-error' : ''}`}
                                        placeholder="+92..."
                                    />
                                    {errors.parentPhone && <span className="form-error">{errors.parentPhone}</span>}
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Occupation</label>
                                    <input
                                        type="text"
                                        name="parentOccupation"
                                        value={formData.parentOccupation}
                                        onChange={handleChange}
                                        className="input"
                                        placeholder="e.g. Engineer"
                                    />
                                </div>
                            </div>
                        </>
                    )}
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

            <style>{`
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
          max-height: 70vh;
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
