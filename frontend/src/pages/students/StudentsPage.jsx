import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Plus, Search, Edit, Trash2, Download, Upload, AlertCircle, Loader2 } from 'lucide-react';
import { useStudentsStore, useClassesStore, useParentsStore, useFeesStore, useAuthStore, useSchoolStore } from '../../store';
import { studentsService, classesService, sectionsService, formatSettledApiError } from '../../services/api';
import { formatCurrency } from '../../utils';
import { printTable } from '../../utils/printUtils';
import { USER_ROLES } from '../../constants';
import Breadcrumb from '../../components/common/Breadcrumb';
import Modal from '../../components/common/Modal';
import Avatar from '../../components/common/Avatar';
import Loading from '../../components/common/Loading';
import CSVImport from '../../components/common/CSVImport';
import toast from 'react-hot-toast';

const STUDENTS_LIST_PAGE_SIZE = 50;
const DROPDOWN_LIST_PAGE_SIZE = 200;

function toDateInputValue(value) {
    if (!value) return '';
    try {
        const d = typeof value === 'string' ? new Date(value) : value;
        if (Number.isNaN(d.getTime())) return '';
        return d.toISOString().split('T')[0];
    } catch {
        return '';
    }
}

function normalizeGender(g) {
    const u = String(g || 'MALE').toUpperCase();
    if (u === 'MALE' || u === 'FEMALE' || u === 'OTHER') return u;
    return 'MALE';
}

/** Build PATCH body with only changed scalar fields (reduces backend work). */
function buildStudentUpdatePatch(original, form) {
    const patch = {};
    const str = (x) => (x == null ? '' : String(x)).trim();
    if (str(form.name) !== str(original.name)) patch.name = form.name.trim();
    if (str(form.rollNumber) !== str(original.rollNumber)) patch.rollNumber = form.rollNumber.trim();
    if (str(form.email) !== str(original.email)) patch.email = form.email || undefined;
    if (str(form.classId) !== str(original.classId)) patch.classId = form.classId;
    if (str(form.sectionId) !== str(original.sectionId)) patch.sectionId = form.sectionId;
    const fg = normalizeGender(form.gender);
    const og = normalizeGender(original.gender);
    if (fg !== og) patch.gender = fg;
    const st = (form.status || 'ACTIVE').toUpperCase();
    const ost = (original.status || 'ACTIVE').toUpperCase();
    if (st !== ost) patch.status = st;
    const fd = toDateInputValue(form.dateOfBirth);
    const od = toDateInputValue(original.dateOfBirth);
    if (fd !== od) patch.dateOfBirth = fd;
    const fa = toDateInputValue(form.admissionDate);
    const oa = toDateInputValue(original.admissionDate);
    if (fa !== oa) patch.admissionDate = fa;
    if (str(form.phone) !== str(original.phone)) patch.phone = form.phone || undefined;
    if (str(form.address) !== str(original.address)) patch.address = form.address.trim();
    const nf = form.monthlyFee === '' || form.monthlyFee === undefined ? null : Number(form.monthlyFee);
    const of = original.monthlyFee == null ? null : Number(original.monthlyFee);
    if (nf !== of) patch.monthlyFee = nf == null ? undefined : nf;
    const npd = form.pendingDues === '' || form.pendingDues === undefined ? 0 : Number(form.pendingDues);
    const opd = original.pendingDues == null ? 0 : Number(original.pendingDues);
    if (npd !== opd) patch.pendingDues = Number.isFinite(npd) ? npd : 0;
    return patch;
}

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
    const { students, setStudents, addStudent, updateStudent, deleteStudent } = useStudentsStore();

    // Permissions check
    const canManageStudents = [USER_ROLES.ADMIN, USER_ROLES.MANAGEMENT, USER_ROLES.SUPER_ADMIN].includes(user?.role);

    if (!canManageStudents) {
        return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3rem", textAlign: "center", minHeight: "60vh" }}>
                <AlertCircle size={64} className="text-error-500 mb-4" />
                <h1 className="page-title">Access Denied</h1>
                <p className="text-gray-600 max-w-md">You do not have permission to access students management. This area is restricted to administrators and school management only.</p>
            </div>
        );
    }

    const { classes, sections, setClasses, setSections } = useClassesStore();
    const { addParent, parents } = useParentsStore();
    const { feePayments } = useFeesStore();
    const { currentSchool } = useSchoolStore();

    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [studentsMeta, setStudentsMeta] = useState({
        total: 0,
        page: 1,
        pageSize: STUDENTS_LIST_PAGE_SIZE,
        totalPages: 1,
    });
    
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
    const [dropdownsLoading, setDropdownsLoading] = useState(true);
    const [studentsFetching, setStudentsFetching] = useState(false);
    const [searchBusy, setSearchBusy] = useState(false);

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
        pendingDues: 0,

        // Parent Details (Only for 'add' mode)
        parentName: '',
        parentEmail: '',
        parentPassword: '',
        parentPhone: '',
        parentOccupation: '',
    });

    const [errors, setErrors] = useState({});

    // Classes + sections for dropdowns: load once per school (small lists, cached in store)
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setDropdownsLoading(true);
            const listQuery = {
                page: 1,
                pageSize: DROPDOWN_LIST_PAGE_SIZE,
                ...(currentSchool?.id ? { schoolId: currentSchool.id } : {}),
            };
            try {
                const [classesResponse, sectionsResponse] = await Promise.allSettled([
                    classesService.getAll(listQuery),
                    sectionsService.getAll(listQuery),
                ]);
                if (cancelled) return;

                const classesErr = classesResponse.status === 'fulfilled' && classesResponse.value.success && classesResponse.value.data != null
                    ? null
                    : formatSettledApiError(classesResponse);
                const sectionsErr = sectionsResponse.status === 'fulfilled' && sectionsResponse.value.success && sectionsResponse.value.data != null
                    ? null
                    : formatSettledApiError(sectionsResponse);

                if (!classesErr) {
                    const classesData = classesResponse.value.data.data || classesResponse.value.data;
                    setClasses(Array.isArray(classesData) ? classesData : []);
                } else {
                    console.error('Failed to load classes:', classesErr);
                    setClasses([]);
                }

                if (!sectionsErr) {
                    const sectionsData = sectionsResponse.value.data.data || sectionsResponse.value.data;
                    setSections(Array.isArray(sectionsData) ? sectionsData : []);
                } else {
                    console.error('Failed to load sections:', sectionsErr);
                    setSections([]);
                }

                if (classesErr || sectionsErr) {
                    toast.error(classesErr || sectionsErr || 'Failed to load classes or sections');
                }
            } catch (e) {
                if (!cancelled) {
                    toast.error('Failed to load classes or sections');
                    setClasses([]);
                    setSections([]);
                }
            } finally {
                if (!cancelled) setDropdownsLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [currentSchool?.id, setClasses, setSections]);

    const loadStudentsPage = useCallback(async () => {
        setStudentsFetching(true);
        setSearchBusy(true);
        try {
            const studentsQuery = {
                page,
                pageSize: STUDENTS_LIST_PAGE_SIZE,
                ...(debouncedSearchTerm.trim() && { search: debouncedSearchTerm.trim() }),
                ...(filterClass && { classId: filterClass }),
                ...(filterStatus && { status: filterStatus }),
                ...(currentSchool?.id ? { schoolId: currentSchool.id } : {}),
            };
            const studentsResponse = await studentsService.getAll(studentsQuery);
            if (studentsResponse.success && studentsResponse.data != null) {
                const payload = studentsResponse.data;
                const studentsData = payload?.data ?? payload;
                const meta = payload?.meta;
                setStudents(Array.isArray(studentsData) ? studentsData : []);
                if (meta && typeof meta.total === 'number') {
                    setStudentsMeta(meta);
                }
            } else {
                console.error('Failed to load students:', studentsResponse.error);
                toast.error(studentsResponse.error || 'Failed to load students');
            }
        } catch (error) {
            console.error('Failed to load students:', error);
            toast.error('Failed to load students. Please check your connection.');
        } finally {
            setStudentsFetching(false);
            setSearchBusy(false);
        }
    }, [setStudents, currentSchool?.id, page, debouncedSearchTerm, filterClass, filterStatus]);

    useEffect(() => {
        loadStudentsPage();
    }, [loadStudentsPage]);

    useEffect(() => {
        setPage(1);
    }, [currentSchool?.id]);

    const breadcrumbItems = useMemo(() => [
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Students', path: null },
    ], []);

    const handleOpenModal = useCallback((mode, student = null) => {
        setModalMode(mode);
        if (mode === 'edit' && student) {
            setSelectedStudent(student);
            setFormData({
                name: student.name || '',
                rollNumber: student.rollNumber || '',
                email: student.email || '',
                classId: student.classId || '',
                sectionId: student.sectionId || '',
                gender: normalizeGender(student.gender),
                dateOfBirth: toDateInputValue(student.dateOfBirth),
                admissionDate: toDateInputValue(student.admissionDate),
                phone: student.phone || '',
                address: student.address || '',
                status: (student.status || 'ACTIVE').toUpperCase(),
                monthlyFee: student.monthlyFee ?? '',
                pendingDues: student.pendingDues ?? 0,
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
            pendingDues: 0,
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
            if (modalMode === 'add') {
                const studentData = {
                    ...formData,
                    gender: formData.gender.toUpperCase(),
                    status: formData.status ? formData.status.toUpperCase() : 'ACTIVE',
                    dateOfBirth: formData.dateOfBirth,
                    admissionDate: formData.admissionDate || new Date().toISOString().split('T')[0],
                    parentName: formData.parentName,
                    parentEmail: formData.parentEmail,
                    parentPassword: formData.parentPassword,
                    parentPhone: formData.parentPhone,
                    parentOccupation: formData.parentOccupation,
                };

                if (formData.monthlyFee !== '' && formData.monthlyFee !== undefined) {
                    studentData.monthlyFee = Number(formData.monthlyFee);
                }
                studentData.pendingDues = Number(formData.pendingDues) || 0;

                const response = await studentsService.create(studentData);
                if (response.success && response.data) {
                    const newStudent = response.data;

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
                    handleCloseModal();
                    await loadStudentsPage();
                } else {
                    toast.error(response.error || 'Failed to create student');
                }
                return;
            }

            const patch = buildStudentUpdatePatch(selectedStudent, formData);
            if (Object.keys(patch).length === 0) {
                toast.success('No changes to save');
                handleCloseModal();
                return;
            }

            const prevSnapshot = { ...selectedStudent };
            const optimisticRow = {
                ...selectedStudent,
                ...patch,
            };
            updateStudent(selectedStudent.id, optimisticRow);
            handleCloseModal();

            try {
                const response = await studentsService.update(prevSnapshot.id, patch);
                if (response.success && response.data) {
                    updateStudent(prevSnapshot.id, response.data);
                    toast.success('Student updated successfully');
                } else {
                    updateStudent(prevSnapshot.id, prevSnapshot);
                    toast.error(response.error || 'Failed to update student');
                }
            } catch (err) {
                updateStudent(prevSnapshot.id, prevSnapshot);
                toast.error(err?.message || 'Failed to update student');
            }
        } catch (err) {
            const message = err?.message || 'Operation failed';
            toast.error(message);
        }
    }, [formData, modalMode, selectedStudent, validate, addStudent, addParent, currentSchool, loadStudentsPage, handleCloseModal, updateStudent]);

    const handleDeleteClick = useCallback((student) => {
        setStudentToDelete(student);
        setShowDeleteConfirm(true);
    }, []);

    const handleDeleteConfirm = useCallback(async () => {
        if (!studentToDelete) return;
        const snapshot = { ...studentToDelete };
        deleteStudent(snapshot.id);
        setShowDeleteConfirm(false);
        setStudentToDelete(null);
        try {
            const response = await studentsService.delete(snapshot.id);
            if (response.success) {
                toast.success('Student deleted successfully');
                await loadStudentsPage();
            } else {
                addStudent(snapshot);
                toast.error(response.error || 'Failed to delete student');
            }
        } catch {
            addStudent(snapshot);
            toast.error('Failed to delete student');
        }
    }, [studentToDelete, deleteStudent, addStudent, loadStudentsPage]);

    const handleCsvImportResult = useCallback(
        (result) => {
            if (!result?.success) {
                toast.error(result?.error || 'Import failed');
                return;
            }
            const d = result.data;
            if (!d) return;
            const ok = typeof d.success === 'number' ? d.success : 0;
            const fail = typeof d.failed === 'number' ? d.failed : 0;
            const skipped = typeof d.skipped === 'number' ? d.skipped : 0;
            toast.success(
                `${ok} imported${skipped ? ` · ${skipped} skipped (already exist or duplicate in file)` : ''}${fail ? ` · ${fail} failed` : ''}.`,
                { duration: 6000 },
            );
            if (Array.isArray(d.skippedDetails) && d.skippedDetails.length > 0) {
                const shown = d.skippedDetails.slice(0, 15).join('\n');
                toast(shown, { duration: 20000 });
            }
            if (Array.isArray(d.errors) && d.errors.length > 0) {
                const shown = d.errors.slice(0, 8).join(' · ');
                toast.error(shown, { duration: 12000 });
            }
            loadStudentsPage();
        },
        [loadStudentsPage],
    );

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

    // Reset page when filters change (server-side filters)
    useEffect(() => { setPage(1); }, [debouncedSearchTerm, filterClass, filterStatus]);

    const classSectionLabel = useCallback(
        (student) => {
            const cn = student.Class?.name || getClassName(student.classId);
            const sn = student.Section?.name
                ? `Section ${student.Section.name}`
                : getSectionName(student.sectionId);
            return `${cn} - ${sn}`;
        },
        [getClassName, getSectionName],
    );

    const handleExport = useCallback(() => {
        const data = students.map(student => ({
            name: student.name,
            roll: student.rollNumber,
            class: classSectionLabel(student),
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
    }, [students, classSectionLabel]);

    // Memoize table rows to prevent unnecessary re-renders
    const tableRows = useMemo(() => {
        return students.map((student) => {
            const { pending, isAlert } = getFeeStatus(student);
            return (
                <tr key={student.id}>
                    <td>
                        <div className="flex items-center gap-md">
                            <Avatar name={student.name} src={student.avatar} />
                            <div>
                                <div className="font-medium">{student.name}</div>
                                <div className="text-sm text-gray-500">{student.email || '—'}</div>
                            </div>
                        </div>
                    </td>
                    <td>{student.rollNumber}</td>
                    <td>
                        {classSectionLabel(student)}
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
    }, [students, getFeeStatus, classSectionLabel, handleOpenModal, handleDeleteClick]);

    const showSkeleton = dropdownsLoading && classes.length === 0;
    const showTableSkeleton = studentsFetching && students.length === 0;

    return (
        <div className="students-page">
            <Breadcrumb items={breadcrumbItems} />

            <div className="page-header">
                <div>
                    <h1 className="page-title">Students Management</h1>
                    <p className="text-gray-600">Manage all student records and parents</p>
                    <p className="text-xs text-gray-500 mt-sm max-w-2xl">
                        CSV import (server): required columns — name, rollNumber, dateOfBirth, gender, className,
                        sectionName (you may use classId / sectionId instead). Optional — monthlyFee, pendingDues, parentId,
                        phone, address, email, admissionDate, status. Download a template from the import dialog.
                    </p>
                </div>
                <div className="flex gap-md">
                    <button className="btn btn-outline" onClick={() => setShowImportModal(true)} disabled={showSkeleton}>
                        <Upload size={18} />
                        <span>Import CSV</span>
                    </button>
                    <button className="btn btn-outline" onClick={handleExport} disabled={showSkeleton || students.length === 0}>
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
                    <div className="search-box" style={{ position: 'relative' }}>
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search students..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input"
                            disabled={showSkeleton}
                            style={{ paddingRight: searchBusy ? '2.5rem' : undefined }}
                        />
                        {searchBusy && students.length > 0 && (
                            <span
                                className="students-search-spinner"
                                style={{
                                    position: 'absolute',
                                    right: '0.75rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    display: 'inline-flex',
                                }}
                            >
                                <Loader2 size={18} className="text-gray-400" />
                            </span>
                        )}
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
                        {showTableSkeleton ? (
                            // Show skeleton loaders
                            [...Array(8)].map((_, i) => (
                                <StudentRowSkeleton key={i} />
                            ))
                        ) : students.length === 0 ? (
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
            {studentsMeta.totalPages > 1 && (
                <div className="pagination-bar">
                    <span className="pagination-info">
                        Page {studentsMeta.page} of {studentsMeta.totalPages} ({studentsMeta.total} students)
                    </span>
                    <div className="pagination-controls">
                        <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page <= 1}
                        >
                            Previous
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => setPage((p) => Math.min(studentsMeta.totalPages, p + 1))}
                            disabled={page >= studentsMeta.totalPages}
                        >
                            Next
                        </button>
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
                            <label className="form-label">Opening Pending Dues (Rs.)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                name="pendingDues"
                                value={formData.pendingDues}
                                onChange={handleChange}
                                className="input"
                                placeholder="0 — leave blank if no prior dues"
                            />
                            <p className="text-xs text-gray-500 mt-1">Enter any fee dues this student carried from before enrollment</p>
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
                    serverImportFn={studentsService.bulkImport}
                    onServerImportResult={handleCsvImportResult}
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

        .students-search-spinner svg {
          animation: studentsSearchSpin 0.8s linear infinite;
        }
        @keyframes studentsSearchSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
};

export default StudentsPage;
