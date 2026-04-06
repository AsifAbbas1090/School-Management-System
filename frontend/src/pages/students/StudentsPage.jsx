import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Plus, Search, Edit, Trash2, Download, Upload, AlertCircle } from 'lucide-react';
import { useStudentsStore, useClassesStore, useParentsStore, useFeesStore, useAuthStore, useSchoolStore } from '../../store';
import { studentsService, classesService, sectionsService } from '../../services/api';
import { formatDate, exportToCSV, generateId, formatCurrency } from '../../utils';
import { debounce } from '../../utils/debounce';
import { printTable } from '../../utils/printUtils';
import { USER_ROLES } from '../../constants';
import Breadcrumb from '../../components/common/Breadcrumb';
import Modal from '../../components/common/Modal';
import Avatar from '../../components/common/Avatar';
import Loading from '../../components/common/Loading';
import CSVImport from '../../components/common/CSVImport';
import toast from 'react-hot-toast';

// Skeleton loader for table rows
const StudentRowSkeleton = () => (
    <tr>
        <td>
            <div className="flex items-center gap-md">
                <div className="skeleton-shimmer" style={{ width: '40px', height: '40px', borderRadius: '50%' }}></div>
                <div>
                    <div className="skeleton-shimmer" style={{ width: '120px', height: '16px', marginBottom: '4px', borderRadius: '4px' }}></div>
                    <div className="skeleton-shimmer" style={{ width: '100px', height: '14px', borderRadius: '4px' }}></div>
                </div>
            </div>
        </td>
        <td><div className="skeleton-shimmer" style={{ width: '80px', height: '16px', borderRadius: '4px' }}></div></td>
        <td><div className="skeleton-shimmer" style={{ width: '100px', height: '16px', borderRadius: '4px' }}></div></td>
        <td><div className="skeleton-shimmer" style={{ width: '70px', height: '16px', borderRadius: '4px' }}></div></td>
        <td><div className="skeleton-shimmer" style={{ width: '80px', height: '16px', borderRadius: '4px' }}></div></td>
        <td><div className="skeleton-shimmer" style={{ width: '60px', height: '20px', borderRadius: '4px' }}></div></td>
        <td>
            <div className="flex gap-sm">
                <div className="skeleton-shimmer" style={{ width: '32px', height: '32px', borderRadius: '4px' }}></div>
                <div className="skeleton-shimmer" style={{ width: '32px', height: '32px', borderRadius: '4px' }}></div>
            </div>
        </td>
    </tr>
);

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
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 20;
    
    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);
    
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
        admissionDate: '',
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

    // Track if initial data is loaded
    const initialDataLoaded = useRef(false);

    // Optimized data loading - load critical data first, fee payments later
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // Load critical data in parallel (students, classes, sections)
            const [studentsResponse, classesResponse, sectionsResponse] = await Promise.allSettled([
                studentsService.getAll(),
                classesService.getAll(),
                sectionsService.getAll()
            ]);

            // Process students
            if (studentsResponse.status === 'fulfilled' && studentsResponse.value.success && studentsResponse.value.data) {
                const studentsData = studentsResponse.value.data.data || studentsResponse.value.data;
                setStudents(Array.isArray(studentsData) ? studentsData : []);
            } else {
                console.error('Failed to load students:', studentsResponse.reason);
                setStudents([]);
            }
            
            // Process classes
            if (classesResponse.status === 'fulfilled' && classesResponse.value.success && classesResponse.value.data) {
                const classesData = classesResponse.value.data.data || classesResponse.value.data;
                setClasses(Array.isArray(classesData) ? classesData : []);
            } else {
                console.error('Failed to load classes:', classesResponse.reason);
                setClasses([]);
            }
            
            // Process sections
            if (sectionsResponse.status === 'fulfilled' && sectionsResponse.value.success && sectionsResponse.value.data) {
                const sectionsData = sectionsResponse.value.data.data || sectionsResponse.value.data;
                setSections(Array.isArray(sectionsData) ? sectionsData : []);
            } else {
                console.error('Failed to load sections:', sectionsResponse.reason);
                setSections([]);
            }

            initialDataLoaded.current = true;
        } catch (error) {
            console.error('Failed to load data:', error);
            toast.error('Failed to load students. Please check your connection.');
            setStudents([]);
            setClasses([]);
            setSections([]);
        } finally {
            setLoading(false);
        }
    }, [setStudents, setClasses, setSections, setLoading]);

    useEffect(() => {
        loadData();
    }, [currentSchool]); // Remove loadData from deps to prevent infinite loops

    const breadcrumbItems = useMemo(() => [
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Students', path: null },
    ], []);

    const handleOpenModal = useCallback((mode, student = null) => {
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
                gender: student.gender || 'MALE',
                dateOfBirth: student.dateOfBirth ? formatDate(student.dateOfBirth, 'yyyy-MM-dd') : '',
                admissionDate: student.admissionDate ? formatDate(student.admissionDate, 'yyyy-MM-dd') : '',
                phone: student.phone || '',
                address: student.address,
                status: student.status || 'ACTIVE',
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
    }, []);

    const resetForm = useCallback(() => {
        setFormData({
            name: '',
            rollNumber: '',
            email: '',
            classId: '',
            sectionId: '',
            gender: 'MALE',
            dateOfBirth: '',
            admissionDate: new Date().toISOString().split('T')[0], // Default to today
            phone: '',
            address: '',
            status: 'ACTIVE',
            monthlyFee: '',
            parentName: '',
            parentEmail: '',
            parentPassword: '',
            parentPhone: '',
            parentOccupation: '',
        });
        setErrors({});
        setSelectedStudent(null);
    }, []);

    const handleCloseModal = useCallback(() => {
        setShowModal(false);
        resetForm();
    }, [resetForm]);

    const handleChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    }, [errors]);

    const validate = useCallback(() => {
        const newErrors = {};

        if (!formData.name.trim()) newErrors.name = 'Name is required';
        if (!formData.rollNumber.trim()) newErrors.rollNumber = 'Roll number is required';
        // Email is optional for students
        if (!formData.classId) newErrors.classId = 'Class is required';
        if (!formData.sectionId) newErrors.sectionId = 'Section is required';
        if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
        if (!formData.admissionDate) newErrors.admissionDate = 'Admission date is required';
        if (!formData.address.trim()) newErrors.address = 'Address is required';

        // Parent fields are optional - student can be added without parent initially
        // Validation happens only if parent details are partially filled
        if (modalMode === 'add') {
            const hasPartialParentInfo = formData.parentName.trim() || formData.parentEmail.trim() || 
                                        formData.parentPassword.trim() || formData.parentPhone.trim();
            if (hasPartialParentInfo) {
                if (!formData.parentName.trim()) newErrors.parentName = 'Parent Name is required if providing parent info';
                if (!formData.parentEmail.trim()) newErrors.parentEmail = 'Parent Email is required if providing parent info';
                if (!formData.parentPassword.trim()) newErrors.parentPassword = 'Parent Password is required if providing parent info';
                if (!formData.parentPhone.trim()) newErrors.parentPhone = 'Parent Phone is required if providing parent info';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [formData, modalMode]);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();

        if (!validate()) return;

        try {
            // Prepare student data - backend will create parent user if parent details provided
            const studentData = {
                ...formData,
                gender: formData.gender.toUpperCase(), // Convert to uppercase enum: MALE, FEMALE, OTHER
                status: formData.status ? formData.status.toUpperCase() : 'ACTIVE', // Convert to uppercase enum: ACTIVE, INACTIVE, GRADUATED, TRANSFERRED
                dateOfBirth: formData.dateOfBirth,
                admissionDate: formData.admissionDate || new Date().toISOString().split('T')[0],
                // Include parent creation fields if in add mode
                ...(modalMode === 'add' && {
                    parentName: formData.parentName,
                    parentEmail: formData.parentEmail,
                    parentPassword: formData.parentPassword,
                    parentPhone: formData.parentPhone,
                    parentOccupation: formData.parentOccupation,
                }),
                // Include parentId if editing and parent exists
                ...(modalMode === 'edit' && selectedStudent?.parentId && {
                    parentId: selectedStudent.parentId,
                }),
            };

            // Include monthlyFee if provided
            if (formData.monthlyFee !== '' && formData.monthlyFee !== undefined) {
                studentData.monthlyFee = parseFloat(formData.monthlyFee) || 0;
            }

            if (modalMode === 'add') {
                const response = await studentsService.create(studentData);
                if (response.success && response.data) {
                    // Backend creates parent user and student
                    const newStudent = response.data;
                    addStudent(newStudent);
                    
                    // Link parent if created
                    if (newStudent.User || newStudent.parentId) {
                        const parentData = newStudent.User || {
                            id: newStudent.parentId,
                            name: formData.parentName,
                            email: formData.parentEmail,
                            phone: formData.parentPhone,
                        };
                        addParent({
                            id: parentData.id,
                            name: parentData.name,
                            email: parentData.email,
                            phone: parentData.phone,
                            role: 'PARENT',
                            schoolId: currentSchool?.id || null,
                            status: 'ACTIVE',
                        });
                    }
                    toast.success('Student and Parent account created successfully');
                    
                    // Clear localStorage cache to force fresh data
                    if (currentSchool) {
                        const schoolDataKey = `school_data_${currentSchool.id}`;
                        localStorage.removeItem(schoolDataKey);
                    }
                    
                    // Reload all data from backend
                    await loadData();
                } else {
                    toast.error(response.error || 'Failed to create student');
                }
            } else {
                // For edit mode, don't include parent creation fields
                const updateData = {
                    name: formData.name,
                    rollNumber: formData.rollNumber,
                    email: formData.email,
                    classId: formData.classId,
                    sectionId: formData.sectionId,
                    gender: formData.gender.toUpperCase(),
                    status: formData.status ? formData.status.toUpperCase() : 'ACTIVE',
                    dateOfBirth: formData.dateOfBirth,
                    admissionDate: formData.admissionDate,
                    phone: formData.phone,
                    address: formData.address,
                    ...(formData.monthlyFee !== '' && formData.monthlyFee !== undefined && {
                        monthlyFee: parseFloat(formData.monthlyFee) || 0,
                    }),
                };

                const response = await studentsService.update(selectedStudent.id, updateData);
                if (response.success && response.data) {
                    updateStudent(selectedStudent.id, response.data);
                    toast.success('Student updated successfully');
                    // Clear localStorage cache to force fresh data
                    if (currentSchool) {
                        const schoolDataKey = `school_data_${currentSchool.id}`;
                        localStorage.removeItem(schoolDataKey);
                    }
                    await loadData(); // Reload data from backend
                } else {
                    toast.error(response.error || 'Failed to update student');
                }
            }

            handleCloseModal();
        } catch (error) {
            // Silently handle errors - toast shows user message
            toast.error(error.response?.data?.message || 'Operation failed');
        }
    }, [formData, modalMode, selectedStudent, validate, addStudent, addParent, currentSchool, loadData, handleCloseModal]);

    const handleDeleteClick = useCallback((student) => {
        setStudentToDelete(student);
        setShowDeleteConfirm(true);
    }, []);

    const handleDeleteConfirm = useCallback(async () => {
        if (!studentToDelete) return;
        try {
            const response = await studentsService.delete(studentToDelete.id);
            if (response.success) {
                deleteStudent(studentToDelete.id);
                toast.success('Student deleted successfully');
                loadData(); // Reload data from backend
            } else {
                toast.error(response.error || 'Failed to delete student');
            }
            setShowDeleteConfirm(false);
            setStudentToDelete(null);
        } catch (error) {
            toast.error('Failed to delete student');
        }
    }, [studentToDelete, deleteStudent, loadData]);

    const handleImport = useCallback((importedData) => {
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
    }, [classes, sections, addParent, addStudent]);

    // Memoize fee status calculation
    const getFeeStatus = useCallback((student) => {
        if (!feePayments || feePayments.length === 0) {
            return { pending: 0, isAlert: false };
        }
        
        const studentPayments = feePayments.filter(p => p.studentId === student.id);
        const totalPaid = studentPayments.reduce((sum, p) => sum + p.paidAmount, 0);
        
        // Mock calculation for alert demo:
        const monthsJoined = 3; // Mock
        const totalExpected = (student.monthlyFee || 0) * monthsJoined;
        const pending = totalExpected - totalPaid;

        return {
            pending,
            isAlert: pending > ((student.monthlyFee || 0) * 2)
        };
    }, [feePayments]);

    // Memoize helper functions
    const getClassName = useCallback((classId) => {
        if (!classId) return 'N/A';
        const classData = classes.find(c => c.id === classId);
        return classData ? classData.name : 'Unknown';
    }, [classes]);

    const getSectionName = useCallback((sectionId) => {
        if (!sectionId) return 'N/A';
        const sectionData = sections.find(s => s.id === sectionId);
        return sectionData ? `Section ${sectionData.name}` : 'Unknown';
    }, [sections]);

    // Memoize filtered sections
    const availableSections = useMemo(() => {
        return sections.filter((s) => {
            const matchesClass = s.classId === formData.classId;
            const matchesSchool = !currentSchool || s.schoolId === currentSchool.id;
            return matchesClass && matchesSchool;
        });
    }, [sections, formData.classId, currentSchool]);

    // Reset page when filters change
    useEffect(() => { setCurrentPage(1); }, [debouncedSearchTerm, filterClass, filterStatus]);

    // Memoize filtered students for performance
    const filteredStudents = useMemo(() => {
        return students.filter((student) => {
            // Filter by school
            const matchesSchool = !currentSchool || student.schoolId === currentSchool.id;
            if (!matchesSchool) return false;
        
            // Filter by search term (use debounced version)
            const matchesSearch = !debouncedSearchTerm || 
                student.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                student.rollNumber.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                (student.email && student.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));
            const matchesClass = !filterClass || student.classId === filterClass;
            const matchesStatus = !filterStatus || (student.status || 'ACTIVE').toUpperCase() === filterStatus.toUpperCase();

            return matchesSearch && matchesClass && matchesStatus;
        });
    }, [students, currentSchool, filterClass, filterStatus, debouncedSearchTerm]);

    const totalPages = Math.ceil(filteredStudents.length / PAGE_SIZE);
    const paginatedStudents = filteredStudents.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const handleExport = useCallback(() => {
        const data = filteredStudents.map(student => ({
            name: student.name,
            roll: student.rollNumber,
            class: `${getClassName(student.classId)} - ${getSectionName(student.sectionId)}`,
            fee: student.monthlyFee && student.monthlyFee > 0 ? formatCurrency(student.monthlyFee) : 'Rs 0',
            status: (student.status || 'ACTIVE').toUpperCase()
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
    }, [filteredStudents, getClassName, getSectionName]);

    // Memoize table rows to prevent unnecessary re-renders
    const tableRows = useMemo(() => {
        return paginatedStudents.map((student) => {
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
                        <span className={`badge badge-${student.status === 'ACTIVE' || student.status === 'active' ? 'success' : 'gray'}`}>
                            {student.status || 'ACTIVE'}
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
            );
        });
    }, [paginatedStudents, getFeeStatus, getClassName, getSectionName, handleOpenModal, handleDeleteClick]);

    // Show skeleton loaders during initial load instead of full screen loading
    const showSkeleton = loading && students.length === 0 && classes.length === 0;

    return (
        <div className="students-page">
            <Breadcrumb items={breadcrumbItems} />

            <div className="page-header">
                <div>
                    <h1>Students Management</h1>
                    <p className="text-gray-600">Manage all student records and parents</p>
                </div>
                <div className="flex gap-md">
                    <button className="btn btn-outline" onClick={() => setShowImportModal(true)} disabled={showSkeleton}>
                        <Upload size={18} />
                        <span>Import CSV</span>
                    </button>
                    <button className="btn btn-outline" onClick={handleExport} disabled={showSkeleton || filteredStudents.length === 0}>
                        <Download size={18} />
                        <span>PDF Report</span>
                    </button>
                    <button className="btn btn-primary" onClick={() => handleOpenModal('add')} disabled={showSkeleton}>
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
                            disabled={showSkeleton}
                        />
                    </div>

                    <select
                        value={filterClass}
                        onChange={(e) => setFilterClass(e.target.value)}
                        className="select"
                        disabled={showSkeleton}
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
                        disabled={showSkeleton}
                    >
                        <option value="">All Status</option>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                        <option value="GRADUATED">Graduated</option>
                        <option value="TRANSFERRED">Transferred</option>
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
                        {showSkeleton ? (
                            // Show skeleton loaders
                            [...Array(8)].map((_, i) => (
                                <StudentRowSkeleton key={i} />
                            ))
                        ) : filteredStudents.length === 0 ? (
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
                            tableRows
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="pagination-bar">
                    <span className="pagination-info">
                        Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredStudents.length)} of {filteredStudents.length} students
                    </span>
                    <div className="pagination-controls">
                        <button className="btn btn-sm btn-outline" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>«</button>
                        <button className="btn btn-sm btn-outline" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>‹</button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                            const page = start + i;
                            return (
                                <button key={page} className={`btn btn-sm ${page === currentPage ? 'btn-primary' : 'btn-outline'}`} onClick={() => setCurrentPage(page)}>{page}</button>
                            );
                        })}
                        <button className="btn btn-sm btn-outline" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>›</button>
                        <button className="btn btn-sm btn-outline" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>»</button>
                    </div>
                </div>
            )}

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
                                <option value="MALE">Male</option>
                                <option value="FEMALE">Female</option>
                                <option value="OTHER">Other</option>
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
                            <label className="form-label">Admission Date *</label>
                            <input
                                type="date"
                                name="admissionDate"
                                value={formData.admissionDate}
                                onChange={handleChange}
                                className={`input ${errors.admissionDate ? 'input-error' : ''}`}
                            />
                            {errors.admissionDate && <span className="form-error">{errors.admissionDate}</span>}
                            <p className="text-xs text-gray-500 mt-1">Fee calculation will start from this date</p>
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
        .pagination-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          border-top: 1px solid var(--border-color);
          background: var(--bg-card);
          border-radius: 0 0 var(--radius-lg) var(--radius-lg);
        }
        .pagination-info { font-size: 0.875rem; color: var(--text-secondary); }
        .pagination-controls { display: flex; gap: 4px; align-items: center; }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--spacing-xl);
        }

        .page-header h1 {
          font-size: 2rem;
          font-weight: 700;
          color: var(--text-primary);
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

        /* Skeleton loader styles */
        .skeleton-shimmer {
          background: linear-gradient(
            90deg,
            var(--gray-200) 0%,
            var(--gray-100) 50%,
            var(--gray-200) 100%
          );
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }

        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
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
