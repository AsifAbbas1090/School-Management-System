import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, BookOpen, Trash2, Edit, Users, Download } from 'lucide-react';
import { useClassesStore, useStudentsStore, useAuthStore, useSchoolStore } from '../../store';
import { USER_ROLES } from '../../constants';
import { classesService, sectionsService, studentsService } from '../../services/api';
import { printTable } from '../../utils/printUtils';
import { AlertCircle } from 'lucide-react';
import DeleteWarningModal from '../../components/common/DeleteWarningModal';
import Modal from '../../components/common/Modal';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

// Skeleton loader component for better perceived performance
const ClassCardSkeleton = () => (
    <div className="class-card skeleton">
        <div className="class-card-header">
            <div className="class-icon skeleton-shimmer"></div>
            <div className="class-actions">
                <div className="skeleton-shimmer" style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)' }}></div>
                <div className="skeleton-shimmer" style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)' }}></div>
            </div>
        </div>
        <div className="class-card-body">
            <div className="skeleton-shimmer" style={{ width: '60%', height: '24px', marginBottom: '8px', borderRadius: '4px' }}></div>
            <div className="skeleton-shimmer" style={{ width: '40%', height: '16px', marginBottom: '16px', borderRadius: '4px' }}></div>
            <div className="skeleton-shimmer" style={{ width: '100%', height: '80px', borderRadius: 'var(--radius-md)' }}></div>
        </div>
    </div>
);

const ClassesManagementPage = () => {
    const { user } = useAuthStore();
    const canManageClasses = [USER_ROLES.ADMIN, USER_ROLES.MANAGEMENT, USER_ROLES.SUPER_ADMIN].includes(user?.role);

    const { classes, sections, setClasses, setSections } = useClassesStore();
    const { students, setStudents } = useStudentsStore();
    const { currentSchool } = useSchoolStore();
    
    const [loading, setLoading] = useState(true);
    const [studentsLoading, setStudentsLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingClass, setEditingClass] = useState(null);
    const [formData, setFormData] = useState({
        grade: '',
        numberOfSections: '1',
        capacity: '30',
    });
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, classId: null, className: null });
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    
    // Track if students have been loaded
    const studentsLoadedRef = useRef(false);

    // Memoize class sections map for performance
    const classSectionsMap = useMemo(() => {
        const map = new Map();
        sections.forEach(section => {
            if (!section.deletedAt) {
                const classId = section.classId;
                if (!map.has(classId)) {
                    map.set(classId, []);
                }
                map.get(classId).push(section);
            }
        });
        return map;
    }, [sections]);

    // Memoize student count map for performance
    const studentCountMap = useMemo(() => {
        const map = new Map();
        students.forEach(student => {
            const classId = student.classId;
            map.set(classId, (map.get(classId) || 0) + 1);
        });
        return map;
    }, [students]);

    // Find next available class number (fill gaps)
    const getNextAvailableClassNumber = useCallback((existingClasses) => {
        if (!existingClasses || existingClasses.length === 0) {
            return 1;
        }

        // Extract numbers from class names (e.g., "Class 1" -> 1, "Class 10" -> 10)
        const classNumbers = existingClasses
            .map(cls => {
                const match = cls.name?.match(/Class\s+(\d+)/i);
                return match ? parseInt(match[1], 10) : null;
            })
            .filter(num => num !== null && !isNaN(num))
            .sort((a, b) => a - b);

        if (classNumbers.length === 0) {
            return 1;
        }

        // Find the first gap or return next number
        for (let i = 1; i <= classNumbers.length; i++) {
            if (classNumbers[i - 1] !== i) {
                return i;
            }
        }

        // No gaps found, return next number
        return classNumbers[classNumbers.length - 1] + 1;
    }, []);

    // Auto-generate class name with next available number
    const generateClassName = useCallback((grade, existingClasses) => {
        if (!grade) return '';
        
        // If editing, use the existing class name
        if (editingClass) {
            return editingClass.name;
        }
        
        // For new classes, find next available number
        const nextNumber = getNextAvailableClassNumber(existingClasses);
        return `Class ${nextNumber}`;
    }, [editingClass, getNextAvailableClassNumber]);

    // Lazy load students data only when needed
    const loadStudentsData = useCallback(async () => {
        if (studentsLoadedRef.current) return;
        
        setStudentsLoading(true);
        try {
            const studentsResponse = await studentsService.getAll();
            if (studentsResponse.success && studentsResponse.data) {
                const studentsData = studentsResponse.data.data || studentsResponse.data;
                setStudents(Array.isArray(studentsData) ? studentsData : []);
                studentsLoadedRef.current = true;
            }
        } catch (error) {
            console.error('Failed to load students:', error);
        } finally {
            setStudentsLoading(false);
        }
    }, [setStudents]);

    // Optimized data loading - load classes and sections first, students later
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // Load classes and sections first (critical data)
            const [classesResponse, sectionsResponse] = await Promise.allSettled([
                classesService.getAll(),
                sectionsService.getAll()
            ]);

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

            // Load students in background (non-blocking)
            loadStudentsData();
        } catch (error) {
            console.error('Failed to load data:', error);
            toast.error('Failed to load classes and sections');
            setClasses([]);
            setSections([]);
        } finally {
            setLoading(false);
        }
    }, [setClasses, setSections, loadStudentsData]);

    useEffect(() => {
        loadData();
    }, [currentSchool]); // Remove loadData from deps to prevent infinite loops

    // Load students when modal opens (for delete validation)
    useEffect(() => {
        if (deleteModal.isOpen || showModal) {
            loadStudentsData();
        }
    }, [deleteModal.isOpen, showModal, loadStudentsData]);

    if (!canManageClasses) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-[70vh]">
                <AlertCircle size={64} className="text-error-500 mb-4" />
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Access Denied</h1>
                <p className="text-gray-600 max-w-md">You do not have permission to access classes management. This area is restricted to administrators and school management only.</p>
            </div>
        );
    }

    const handleChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    const resetForm = useCallback(() => {
        setFormData({
            grade: '',
            numberOfSections: '1',
            capacity: '30',
        });
        setEditingClass(null);
        setShowModal(false);
    }, []);

    const handleEdit = useCallback((classItem) => {
        const classSections = classSectionsMap.get(classItem.id) || [];
        setEditingClass(classItem);
        setFormData({
            grade: classItem.grade,
            numberOfSections: classSections.length.toString(),
            capacity: classSections[0]?.capacity?.toString() || '30',
        });
        setShowModal(true);
    }, [classSectionsMap]);

    // Optimized submit with better error handling and optimistic updates
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();

        if (!formData.grade || !formData.numberOfSections) {
            toast.error('Please fill in all required fields', { duration: 2000 });
            return;
        }

        const numSections = parseInt(formData.numberOfSections);
        if (numSections < 1 || numSections > 26) {
            toast.error('Number of sections must be between 1 and 26', { duration: 2000 });
            return;
        }

        const capacity = parseInt(formData.capacity) || 30;
        if (capacity < 10 || capacity > 100) {
            toast.error('Capacity must be between 10 and 100', { duration: 2000 });
            return;
        }

        setSubmitting(true);
        const loadingToast = toast.loading(editingClass ? 'Updating class...' : 'Creating class...');

        try {
            // Auto-generate class name with next available number
            const className = generateClassName(formData.grade, classes);

            if (editingClass) {
                // Update class details
                const classData = {
                    grade: formData.grade,
                    name: className,
                    displayName: className,
                };
                
                const classResponse = await classesService.update(editingClass.id, classData);
                if (!classResponse.success) {
                    toast.error(classResponse.error || 'Failed to update class', { id: loadingToast });
                    return;
                }

                // Handle section addition/removal
                const existingSections = classSectionsMap.get(editingClass.id) || [];
                const targetSectionCount = numSections;
                const currentSectionCount = existingSections.length;

                if (targetSectionCount !== currentSectionCount) {
                    const sectionLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                    
                    if (targetSectionCount > currentSectionCount) {
                        // Add new sections in parallel
                        const sectionPromises = [];
                        for (let i = currentSectionCount; i < targetSectionCount; i++) {
                            const sectionData = {
                                classId: editingClass.id,
                                name: sectionLetters[i],
                                capacity: capacity,
                            };
                            sectionPromises.push(sectionsService.create(sectionData));
                        }
                        await Promise.all(sectionPromises);
                    } else {
                        // Delete excess sections (from the end)
                        const sectionsToDelete = [...existingSections]
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .slice(targetSectionCount);
                        
                        // Ensure students are loaded for validation
                        if (!studentsLoadedRef.current) {
                            await loadStudentsData();
                        }
                        
                        // Check for students in sections to delete
                        for (const section of sectionsToDelete) {
                            const sectionStudents = students.filter(s => s.sectionId === section.id);
                            if (sectionStudents.length > 0) {
                                toast.error(`Cannot delete section ${section.name} as it has ${sectionStudents.length} student(s). Please reassign students first.`, { id: loadingToast });
                                setSubmitting(false);
                                return;
                            }
                        }

                        // Delete sections in parallel
                        const deletePromises = sectionsToDelete.map(section => 
                            sectionsService.delete(section.id)
                        );
                        await Promise.all(deletePromises);
                    }
                }

                toast.success('Class updated successfully!', { id: loadingToast, duration: 2000 });
                await loadData();
                resetForm();
            } else {
                // Create class
                const classData = {
                    grade: formData.grade,
                    name: className,
                    displayName: className,
                };
                
                const classResponse = await classesService.create(classData);
                if (!classResponse.success || !classResponse.data) {
                    toast.error(classResponse.error || 'Failed to create class', { id: loadingToast });
                    return;
                }

                const newClass = classResponse.data;

                // Create sections in parallel for better performance
                const sectionLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                const sectionPromises = [];
                for (let i = 0; i < numSections; i++) {
                    const sectionData = {
                        classId: newClass.id,
                        name: sectionLetters[i],
                        capacity: capacity,
                    };
                    sectionPromises.push(sectionsService.create(sectionData));
                }
                await Promise.all(sectionPromises);

                toast.success(`Class created with ${numSections} section(s)!`, { id: loadingToast, duration: 2000 });
                await loadData();
                resetForm();
            }
        } catch (error) {
            console.error('Failed to save class:', error);
            toast.error(error.response?.data?.message || 'Failed to save class', { id: loadingToast });
        } finally {
            setSubmitting(false);
        }
    }, [editingClass, formData, classSectionsMap, students, loadData, resetForm, generateClassName, classes, loadStudentsData]);

    const handleDeleteClick = useCallback((classItem) => {
        // Ensure students are loaded for validation
        if (!studentsLoadedRef.current) {
            loadStudentsData();
        }
        
        const studentCount = studentCountMap.get(classItem.id) || 0;
        if (studentCount > 0) {
            toast.error(`Cannot delete class "${classItem.name}" as it has ${studentCount} student(s). Please remove or reassign students first.`, { duration: 3000 });
            return;
        }
        setDeleteModal({ 
            isOpen: true, 
            classId: classItem.id, 
            className: classItem.name 
        });
    }, [studentCountMap, loadStudentsData]);

    const handleDeleteConfirm = useCallback(async () => {
        if (!deleteModal.classId) return;

        setDeleteLoading(true);
        const loadingToast = toast.loading('Deleting class...');
        
        try {
            const response = await classesService.delete(deleteModal.classId);
            if (response.success) {
                toast.success('Class deleted successfully', { id: loadingToast, duration: 2000 });
                setDeleteModal({ isOpen: false, classId: null, className: null });
                await loadData();
            } else {
                toast.error(response.error || 'Failed to delete class', { id: loadingToast });
            }
        } catch (error) {
            console.error('Failed to delete class:', error);
            toast.error(error.response?.data?.message || 'Failed to delete class', { id: loadingToast });
        } finally {
            setDeleteLoading(false);
        }
    }, [deleteModal, loadData]);

    const getClassSections = useCallback((classId) => {
        return classSectionsMap.get(classId) || [];
    }, [classSectionsMap]);

    const getStudentCount = useCallback((classId) => {
        return studentCountMap.get(classId) || 0;
    }, [studentCountMap]);

    const handleExportReport = useCallback(() => {
        const data = classes.map(cls => ({
            name: cls.name,
            grade: cls.grade,
            sections: getClassSections(cls.id).map(s => s.name).join(', '),
            students: getStudentCount(cls.id),
            capacity: (getClassSections(cls.id)[0]?.capacity || 30) * getClassSections(cls.id).length
        }));

        printTable({
            title: 'School Classes & Sections Report',
            columns: [
                { header: 'Class Name', accessor: 'name' },
                { header: 'Grade', accessor: 'grade' },
                { header: 'Sections', accessor: 'sections' },
                { header: 'Total Students', accessor: 'students' },
                { header: 'Total Capacity', accessor: 'capacity' }
            ],
            data: data
        });
    }, [classes, getClassSections, getStudentCount]);

    // Memoize class cards to prevent unnecessary re-renders
    const classCards = useMemo(() => {
        return classes.map((classItem) => {
            const classSections = getClassSections(classItem.id);
            const studentCount = getStudentCount(classItem.id);

            return (
                <div key={classItem.id} className="class-card">
                    <div className="class-card-header">
                        <div className="class-icon">
                            <BookOpen size={32} />
                        </div>
                        <div className="class-actions">
                            <button className="icon-btn" onClick={() => handleEdit(classItem)} title="Edit">
                                <Edit size={18} />
                            </button>
                            <button className="icon-btn icon-btn-danger" onClick={() => handleDeleteClick(classItem)} title="Delete">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="class-card-body">
                        <h3 className="class-name">{classItem.name}</h3>
                        <p className="class-grade">Grade: {classItem.grade}</p>

                        <div className="class-sections">
                            <p className="sections-title">Sections ({classSections.length}):</p>
                            <div className="sections-list">
                                {classSections.map(section => (
                                    <span key={section.id} className="section-badge">
                                        {section.name}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="class-stats">
                            <div className="stat-item">
                                <Users size={16} />
                                <span>{studentCount} Students</span>
                            </div>
                            <div className="stat-item">
                                <span>Capacity: {classSections[0]?.capacity || 30}/section</span>
                            </div>
                        </div>
                    </div>
                </div>
            );
        });
    }, [classes, getClassSections, getStudentCount, handleEdit, handleDeleteClick]);

    // Auto-generated class name preview
    const previewClassName = useMemo(() => {
        return generateClassName(formData.grade, classes);
    }, [formData.grade, classes, generateClassName]);
    
    const previewSections = useMemo(() => {
        return Array.from({ length: parseInt(formData.numberOfSections) || 0 }, (_, i) =>
            String.fromCharCode(65 + i)
        ).join(', ');
    }, [formData.numberOfSections]);

    // Show skeleton loaders during initial load
    if (loading && classes.length === 0) {
        return (
            <div className="page">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Classes Management</h1>
                        <p className="page-subtitle">Manage classes and auto-generate sections</p>
                    </div>
                    <div className="flex gap-md">
                        <button className="btn btn-outline" disabled>
                            <Download size={20} />
                            Download PDF
                        </button>
                        <button className="btn btn-primary" disabled>
                            <Plus size={20} />
                            Add Class
                        </button>
                    </div>
                </div>
                <div className="classes-grid">
                    {[...Array(6)].map((_, i) => (
                        <ClassCardSkeleton key={i} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Classes Management</h1>
                    <p className="page-subtitle">Manage classes and auto-generate sections</p>
                </div>
                <div className="flex gap-md">
                    <button className="btn btn-outline" onClick={handleExportReport} title="Download Report">
                        <Download size={20} />
                        Download PDF
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={20} />
                        Add Class
                    </button>
                </div>
            </div>

            {/* Classes Grid */}
            <div className="classes-grid">
                {classCards}

                {classes.length === 0 && !loading && (
                    <div className="empty-state">
                        <BookOpen size={64} />
                        <h3>No Classes Added</h3>
                        <p>Add a class to start managing students</p>
                    </div>
                )}
            </div>

            {/* Add/Edit Class Modal - Using Modal Component */}
            <Modal
                isOpen={showModal}
                onClose={resetForm}
                title={editingClass ? 'Edit Class' : 'Add New Class'}
                size="md"
                footer={
                    <div className="flex gap-md justify-end">
                        <button 
                            type="button" 
                            className="btn btn-secondary" 
                            onClick={resetForm}
                            disabled={submitting}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            form="class-form"
                            className="btn btn-primary" 
                            disabled={submitting}
                        >
                            {submitting ? 'Saving...' : (editingClass ? 'Update Class' : 'Create Class')}
                        </button>
                    </div>
                }
            >
                <form id="class-form" onSubmit={handleSubmit} className="class-form">
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label required">Grade/Level</label>
                            <input
                                type="text"
                                name="grade"
                                value={formData.grade}
                                onChange={handleChange}
                                className="input"
                                placeholder="e.g., 1, 9, 11"
                                required
                                disabled={submitting}
                            />
                            <small className="form-hint">Enter the numeric grade level</small>
                        </div>

                        <div className="form-group">
                            <label className="form-label required">Number of Sections</label>
                            <input
                                type="number"
                                name="numberOfSections"
                                value={formData.numberOfSections}
                                onChange={handleChange}
                                className="input"
                                min="1"
                                max="26"
                                required
                                disabled={submitting}
                            />
                            <small className="form-hint">
                                {editingClass ? 'Reducing sections will delete excess sections (if empty)' : 'Sections will be auto-generated (A, B, C...)'}
                            </small>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Capacity per Section</label>
                            <input
                                type="number"
                                name="capacity"
                                value={formData.capacity}
                                onChange={handleChange}
                                className="input"
                                min="10"
                                max="100"
                                placeholder="30"
                                disabled={submitting}
                            />
                            <small className="form-hint">Maximum students per section</small>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Class Name (Auto-generated)</label>
                            <input
                                type="text"
                                value={previewClassName}
                                className="input"
                                disabled
                                style={{ backgroundColor: 'var(--gray-50)', cursor: 'not-allowed' }}
                            />
                            <small className="form-hint">
                                {editingClass 
                                    ? 'Class name will remain the same when editing'
                                    : 'Class name is automatically generated with the next available number'}
                            </small>
                        </div>
                    </div>

                    <div className="preview-section">
                        <p className="preview-title">Preview:</p>
                        <p className="preview-text">
                            <strong>{previewClassName || 'Class Name'}</strong> will have{' '}
                            <strong>{formData.numberOfSections || '0'}</strong> section(s):{' '}
                            {previewSections || 'None'}
                        </p>
                    </div>
                </form>
            </Modal>

            {/* Delete Warning Modal */}
            <DeleteWarningModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, classId: null, className: null })}
                onConfirm={handleDeleteConfirm}
                title="Delete Class"
                itemName={deleteModal.className}
                message={`Are you sure you want to delete the class "${deleteModal.className}"? This will also delete all associated sections.`}
                warningText="This action cannot be undone! All sections belonging to this class will be permanently deleted."
                isLoading={deleteLoading}
            />

            <style>{`
                .classes-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                    gap: var(--spacing-xl);
                    margin-top: var(--spacing-xl);
                }

                .class-card {
                    background: var(--bg-card);
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--border-color);
                    overflow: hidden;
                    transition: all 0.3s ease;
                }

                .class-card:hover {
                    box-shadow: var(--shadow-lg);
                    transform: translateY(-4px);
                }

                .class-card-header {
                    padding: var(--spacing-lg);
                    background: linear-gradient(135deg, var(--primary-50), var(--secondary-50));
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .class-icon {
                    width: 60px;
                    height: 60px;
                    background: var(--bg-card);
                    border-radius: var(--radius-md);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--primary-600);
                }

                .class-actions {
                    display: flex;
                    gap: var(--spacing-sm);
                }

                .class-card-body {
                    padding: var(--spacing-lg);
                }

                .class-name {
                    font-size: 1.5rem;
                    font-weight: 600;
                    color: var(--text-primary);
                    margin-bottom: var(--spacing-xs);
                }

                .class-grade {
                    color: var(--text-secondary);
                    font-size: 0.875rem;
                    margin-bottom: var(--spacing-lg);
                }

                .class-sections {
                    background: var(--gray-50);
                    padding: var(--spacing-md);
                    border-radius: var(--radius-md);
                    margin-bottom: var(--spacing-md);
                }

                .sections-title {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: var(--text-primary);
                    margin-bottom: var(--spacing-sm);
                }

                .sections-list {
                    display: flex;
                    flex-wrap: wrap;
                    gap: var(--spacing-xs);
                }

                .section-badge {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    min-width: 32px;
                    height: 32px;
                    padding: 0 var(--spacing-sm);
                    background: var(--primary-100);
                    color: var(--primary-700);
                    border-radius: var(--radius-md);
                    font-weight: 600;
                    font-size: 0.875rem;
                }

                .class-stats {
                    display: flex;
                    flex-direction: column;
                    gap: var(--spacing-sm);
                }

                .stat-item {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-xs);
                    color: var(--text-primary);
                    font-size: 0.875rem;
                }

                .class-form {
                    width: 100%;
                }

                .form-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: var(--spacing-lg);
                }

                @media (max-width: 768px) {
                    .form-grid {
                        grid-template-columns: 1fr;
                    }
                }

                .form-hint {
                    display: block;
                    font-size: 0.75rem;
                    color: var(--gray-500);
                    margin-top: var(--spacing-xs);
                }

                .preview-section {
                    background: var(--primary-50);
                    padding: var(--spacing-md);
                    border-radius: var(--radius-md);
                    margin-top: var(--spacing-lg);
                }

                .preview-title {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: var(--primary-700);
                    margin-bottom: var(--spacing-xs);
                }

                .preview-text {
                    font-size: 0.875rem;
                    color: var(--text-primary);
                    margin: 0;
                }

                .required::after {
                    content: ' *';
                    color: var(--danger-600);
                }

                /* Skeleton loader styles */
                .skeleton {
                    opacity: 0.7;
                }

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

export default ClassesManagementPage;
