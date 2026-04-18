import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Plus, Search, Edit, Trash2, Download, Link as LinkIcon, Upload, AlertCircle } from 'lucide-react';
import { useParentsStore, useAuthStore, useSchoolStore, useClassesStore } from '../../store';
import { USER_ROLES } from '../../constants';
import { usersService, studentsService } from '../../services/api';
import { exportToCSV, generateId } from '../../utils';
import Breadcrumb from '../../components/common/Breadcrumb';
import Modal from '../../components/common/Modal';
import Avatar from '../../components/common/Avatar';
import CSVImport from '../../components/common/CSVImport';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

const ParentsPage = () => {
    const { user } = useAuthStore();
    const canManageParents = [USER_ROLES.ADMIN, USER_ROLES.MANAGEMENT, USER_ROLES.SUPER_ADMIN].includes(user?.role);
    const canManageManagement = user?.role === USER_ROLES.ADMIN; // Only Admin can add Management

    const { parents, setParents, addParent, updateParent, deleteParent } = useParentsStore();
    const { classes } = useClassesStore();
    const { currentSchool } = useSchoolStore();

    if (!canManageParents) {
        return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3rem", textAlign: "center", minHeight: "60vh" }}>
                <AlertCircle size={64} className="text-error-500 mb-4" />
                <h1 className="page-title">Access Denied</h1>
                <p className="text-gray-600 max-w-md">You do not have permission to access parents management. This area is restricted to administrators and school management only.</p>
            </div>
        );
    }

    const [search, setSearch] = useState('');
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
    const [loading, setLoading] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    /** Slim student rows: id, parentId, name, rollNumber, classId, Class — for link map + names. */
    const [studentLinkRows, setStudentLinkRows] = useState([]);
    const [parentsPage, setParentsPage] = useState(1);
    const [parentsMeta, setParentsMeta] = useState({ total: 0, totalPages: 1, pageSize: 25 });
    const searchRef = useRef(null);
    const filterStatusRef = useRef(filterStatus);
    filterStatusRef.current = filterStatus;
    const searchValueRef = useRef(search);
    searchValueRef.current = search;
    const [linkSearchQuery, setLinkSearchQuery] = useState('');
    const [debouncedLinkSearch, setDebouncedLinkSearch] = useState('');
    const [linkSearchResults, setLinkSearchResults] = useState([]);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedLinkSearch(linkSearchQuery.trim()), 300);
        return () => clearTimeout(t);
    }, [linkSearchQuery]);

    useEffect(() => {
        if (!showModal || modalMode !== 'edit') {
            setLinkSearchResults([]);
            return;
        }
        if (debouncedLinkSearch.length < 2) {
            setLinkSearchResults([]);
            return;
        }
        let cancelled = false;
        (async () => {
            const res = await studentsService.getAll({
                search: debouncedLinkSearch,
                pageSize: 20,
                page: 1,
            });
            if (cancelled || !res.success) return;
            const payload = res.data;
            const list = payload?.data ?? payload;
            setLinkSearchResults(Array.isArray(list) ? list : []);
        })();
        return () => {
            cancelled = true;
        };
    }, [showModal, modalMode, debouncedLinkSearch]);

    const studentById = useMemo(() => {
        const m = new Map();
        studentLinkRows.forEach((s) => m.set(s.id, s));
        return m;
    }, [studentLinkRows]);

    const normalizeParentRow = useCallback((parent) => {
        const embedded = parent.Student || parent.students;
        const idsFromApi = Array.isArray(embedded) ? embedded.map((s) => s.id).filter(Boolean) : [];
        return {
            ...parent,
            studentIds: idsFromApi.length > 0 ? idsFromApi : parent.studentIds || [],
        };
    }, []);

    const fetchParents = useCallback(async (currentPage, searchTerm) => {
        setIsLoading(true);
        try {
            const fs = filterStatusRef.current;
            const parentResponse = await usersService.getParents({
                page: currentPage,
                limit: 25,
                search: searchTerm,
                ...(fs && { status: fs === 'active' ? 'ACTIVE' : 'INACTIVE' }),
            });

            if (!parentResponse.success || parentResponse.data == null) {
                setParents([]);
                return;
            }

            const body = parentResponse.data;
            if (body?.meta && Array.isArray(body.data)) {
                setParentsMeta(body.meta);
                setParentsPage(body.meta.page ?? currentPage);
                setParents(body.data.map(normalizeParentRow));
                return;
            }

            if (Array.isArray(body)) {
                setParents(body.map(normalizeParentRow));
                setParentsMeta({ total: body.length, totalPages: 1, pageSize: 25 });
                setParentsPage(1);
            } else {
                setParents([]);
            }
        } catch (error) {
            console.error('Failed to load parents:', error);
            toast.error('Failed to load parents');
            setParents([]);
        } finally {
            setIsLoading(false);
        }
    }, [setParents, normalizeParentRow]);

    const loadStudentLinkRows = useCallback(async () => {
        try {
            const sr = await studentsService.getForParentsUi();
            if (sr.success && sr.data != null) {
                const raw = sr.data.data ?? sr.data;
                setStudentLinkRows(Array.isArray(raw) ? raw : []);
            } else {
                setStudentLinkRows([]);
            }
        } catch (error) {
            console.error('Failed to load student link rows:', error);
            setStudentLinkRows([]);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        setSearch('');
        (async () => {
            setLoading(true);
            try {
                await Promise.all([fetchParents(1, ''), loadStudentLinkRows()]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [fetchParents, loadStudentLinkRows, currentSchool?.id]);

    useEffect(() => {
        fetchParents(1, searchValueRef.current);
    }, [filterStatus, fetchParents]);

    const handleSearch = useCallback((value) => {
        setSearch(value);
        if (searchRef.current) {
            clearTimeout(searchRef.current);
        }
        searchRef.current = setTimeout(() => {
            fetchParents(1, value);
        }, 300);
    }, [fetchParents]);

    const breadcrumbItems = [
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Parents', path: null },
    ];

    const handleOpenModal = useCallback((mode, parent = null) => {
        setModalMode(mode);
        setLinkSearchQuery('');
        setLinkSearchResults([]);
        if (mode === 'edit' && parent) {
            setSelectedParent(parent);
            const currentLinkedStudentIds = studentLinkRows
                .filter((s) => s.parentId === parent.id)
                .map((s) => s.id);

            setFormData({
                name: parent.name,
                email: parent.email,
                password: parent.password || '',
                phone: parent.phone,
                address: parent.address,
                occupation: parent.occupation,
                studentIds: currentLinkedStudentIds.length > 0 ? currentLinkedStudentIds : (parent.studentIds || []),
                status: parent.status,
            });
        } else {
            resetForm();
        }
        setShowModal(true);
    }, [studentLinkRows]);

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
        const { name, value, type, options, multiple } = e.target;

        // Handle multi-select
        if (multiple && options) {
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

        let succeeded = false;

        try {
            if (modalMode === 'add') {
                const response = await usersService.createParent({
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                    phone: formData.phone,
                    occupation: formData.occupation,
                });
                if (response.success && response.data) {
                    toast.success('Parent added successfully');
                    await fetchParents(parentsPage, search);
                    await loadStudentLinkRows();
                    succeeded = true;
                } else {
                    toast.error(response.error || 'Failed to create parent');
                }
            } else {
                const updateData = {
                    name: formData.name.trim(),
                    email: formData.email.trim(),
                    phone: formData.phone.trim(),
                    occupation: formData.occupation,
                    address: formData.address,
                    status: (formData.status || 'ACTIVE').toUpperCase(),
                };

                if (formData.password && formData.password.trim()) {
                    updateData.password = formData.password;
                }

                const response = await usersService.updateUser(selectedParent.id, updateData);
                if (!response.success || !response.data) {
                    toast.error(response.error || 'Failed to update parent');
                    return;
                }

                updateParent(selectedParent.id, response.data);

                const desiredIds = Array.isArray(formData.studentIds) ? formData.studentIds : [];
                const currentLinkedIds = studentLinkRows.filter((s) => s.parentId === selectedParent.id).map((s) => s.id);
                const studentsToLink = desiredIds.filter((id) => !currentLinkedIds.includes(id));
                const studentsToUnlink = currentLinkedIds.filter((id) => !desiredIds.includes(id));

                const bulkTasks = [];
                if (studentsToLink.length > 0) {
                    bulkTasks.push(
                        studentsService.bulkUpdateParent({
                            studentIds: studentsToLink,
                            parentId: selectedParent.id,
                        }),
                    );
                }
                if (studentsToUnlink.length > 0) {
                    bulkTasks.push(
                        studentsService.bulkUpdateParent({
                            studentIds: studentsToUnlink,
                            parentId: null,
                        }),
                    );
                }
                if (bulkTasks.length > 0) {
                    const bulkResults = await Promise.all(bulkTasks);
                    const failed = bulkResults.find((r) => !r.success);
                    if (failed) {
                        toast.error(failed.error || 'Failed to update student links');
                        await fetchParents(parentsPage, search);
                        await loadStudentLinkRows();
                        return;
                    }
                }

                toast.success('Parent updated successfully');
                await fetchParents(parentsPage, search);
                await loadStudentLinkRows();
                succeeded = true;
            }

            if (succeeded) {
                handleCloseModal();
            }
        } catch (err) {
            toast.error(err?.message || 'Failed to save parent');
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
        fetchParents(parentsPage, search);
        loadStudentLinkRows();
    };

    const handleExport = () => {
        const exportData = displayParents.map((parent) => ({
            'Name': parent.name,
            'Email': parent.email,
            'Phone': parent.phone,
            'Occupation': parent.occupation,
            'Children': getStudentNames(parent),
            'Status': parent.status,
        }));

        exportToCSV(exportData, 'parents.csv');
        toast.success('Parents exported successfully');
    };

    const getStudentNames = (parent) => {
        const embedded = parent?.Student || parent?.students;
        if (Array.isArray(embedded) && embedded.length > 0) {
            return embedded.map((s) => s.name).filter(Boolean).join(', ') || 'No children linked';
        }
        const studentIds = parent?.studentIds;
        if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
            return 'No children linked';
        }
        return (
            studentIds
                .map((id) => studentById.get(id)?.name)
                .filter(Boolean)
                .join(', ') || 'No children linked'
        );
    };

    const displayParents = useMemo(() => {
        return parents.filter((parent) => !currentSchool || parent.schoolId === currentSchool.id);
    }, [parents, currentSchool?.id]);

    return (
        <div className="parents-page">
            <Breadcrumb items={breadcrumbItems} />

            <div className="page-header">
                <div>
                    <h1 className="page-title">Parents Management</h1>
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
                            value={search}
                            onChange={(e) => handleSearch(e.target.value)}
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
            <div className="table-container" style={{ opacity: isLoading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
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
                        {loading && parents.length === 0 ? (
                            // Show skeleton loaders during initial load
                            [...Array(6)].map((_, i) => (
                                <tr key={i}>
                                    <td>
                                        <div className="flex items-center gap-md">
                                            <div className="skeleton-shimmer" style={{ width: '40px', height: '40px', borderRadius: '50%' }}></div>
                                            <div>
                                                <div className="skeleton-shimmer" style={{ width: '120px', height: '16px', marginBottom: '4px', borderRadius: '4px' }}></div>
                                                <div className="skeleton-shimmer" style={{ width: '100px', height: '14px', borderRadius: '4px' }}></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td><div className="skeleton-shimmer" style={{ width: '100px', height: '16px', borderRadius: '4px' }}></div></td>
                                    <td><div className="skeleton-shimmer" style={{ width: '80px', height: '16px', borderRadius: '4px' }}></div></td>
                                    <td><div className="skeleton-shimmer" style={{ width: '120px', height: '16px', borderRadius: '4px' }}></div></td>
                                    <td><div className="skeleton-shimmer" style={{ width: '60px', height: '20px', borderRadius: '4px' }}></div></td>
                                    <td>
                                        <div className="flex gap-sm">
                                            <div className="skeleton-shimmer" style={{ width: '32px', height: '32px', borderRadius: '4px' }}></div>
                                            <div className="skeleton-shimmer" style={{ width: '32px', height: '32px', borderRadius: '4px' }}></div>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : displayParents.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="text-center">
                                    <div className="empty-state">
                                        <div className="empty-state-icon">👨‍👩‍👧‍👦</div>
                                        <h3 className="empty-state-title">No parents found</h3>
                                        <p className="empty-state-description">
                                            {search || filterStatus
                                                ? 'Try adjusting your filters'
                                                : 'Get started by adding your first parent'}
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            displayParents.map((parent) => (
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
                                                <span>{getStudentNames(parent)}</span>
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

            {parentsMeta.totalPages > 1 && (
                <div className="pagination-bar" style={{ marginTop: 'var(--spacing-md)' }}>
                    <span className="pagination-info">
                        Page {parentsPage} of {parentsMeta.totalPages} ({parentsMeta.total} parents)
                    </span>
                    <div className="pagination-controls">
                        <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => fetchParents(parentsPage - 1, search)}
                            disabled={parentsPage <= 1 || isLoading}
                        >
                            Previous
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => fetchParents(parentsPage + 1, search)}
                            disabled={parentsPage >= parentsMeta.totalPages || isLoading}
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
                            <label className="form-label">Link students</label>
                            {modalMode === 'add' ? (
                                <p className="text-xs text-gray-500">Save the parent first, then edit to link students.</p>
                            ) : (
                                <>
                                    <p className="text-xs text-gray-500 mb-sm">
                                        Search by name or roll (min. 2 characters), then add from results. Selected:{' '}
                                        <strong>{formData.studentIds?.length || 0}</strong>
                                    </p>
                                    <input
                                        type="text"
                                        className="input mb-sm"
                                        placeholder="Type to search students…"
                                        value={linkSearchQuery}
                                        onChange={(e) => setLinkSearchQuery(e.target.value)}
                                    />
                                    {debouncedLinkSearch.length >= 2 && linkSearchResults.length > 0 && (
                                        <div className="mb-sm" style={{ maxHeight: 140, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 8, padding: 8 }}>
                                            {linkSearchResults.map((student) => {
                                                const cn = classes.find((c) => c.id === student.classId);
                                                const picked = formData.studentIds?.includes(student.id);
                                                return (
                                                    <div key={student.id} className="flex items-center justify-between gap-sm py-xs text-sm">
                                                        <span>
                                                            {student.name} ({student.rollNumber})
                                                            {cn ? ` — ${cn.name}` : student.Class?.name ? ` — ${student.Class.name}` : ''}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            className="btn btn-xs btn-outline"
                                                            disabled={picked}
                                                            onClick={() => {
                                                                if (picked) return;
                                                                setFormData((prev) => ({
                                                                    ...prev,
                                                                    studentIds: [...(prev.studentIds || []), student.id],
                                                                }));
                                                            }}
                                                        >
                                                            Add
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {Array.isArray(formData.studentIds) && formData.studentIds.length > 0 && (
                                        <div className="flex flex-wrap gap-sm">
                                            {formData.studentIds.map((id) => {
                                                const s = studentById.get(id) || linkSearchResults.find((x) => x.id === id);
                                                const cn = s && classes.find((c) => c.id === s.classId);
                                                const label = s
                                                    ? `${s.name} (${s.rollNumber})${cn ? ` — ${cn.name}` : ''}`
                                                    : id;
                                                return (
                                                    <span
                                                        key={id}
                                                        className="badge badge-gray"
                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                                                    >
                                                        {label}
                                                        <button
                                                            type="button"
                                                            className="btn btn-xs btn-ghost"
                                                            aria-label="Remove"
                                                            onClick={() =>
                                                                setFormData((prev) => ({
                                                                    ...prev,
                                                                    studentIds: (prev.studentIds || []).filter((x) => x !== id),
                                                                }))
                                                            }
                                                        >
                                                            ×
                                                        </button>
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}
                                </>
                            )}
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
                                        fetchParents(parentsPage, search);
                                        loadStudentLinkRows();
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
                                    .map((roll) => studentLinkRows.find((s) => s.rollNumber === roll.trim())?.id)
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
          color: var(--text-primary);
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
      `}</style>
        </div>
    );
};

export default ParentsPage;
