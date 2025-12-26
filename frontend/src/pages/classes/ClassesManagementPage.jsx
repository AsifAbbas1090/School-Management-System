import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, BookOpen, Trash2, Edit, Users, Download } from 'lucide-react';
import { useClassesStore, useStudentsStore, useAuthStore, useSchoolStore } from '../../store';
import { USER_ROLES } from '../../constants';
import { classesService, sectionsService, studentsService } from '../../services/api';
import { printTable } from '../../utils/printUtils';
import { AlertCircle } from 'lucide-react';
import DeleteWarningModal from '../../components/common/DeleteWarningModal';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

const ClassesManagementPage = () => {
    const { user } = useAuthStore();
    const canManageClasses = [USER_ROLES.ADMIN, USER_ROLES.MANAGEMENT, USER_ROLES.SUPER_ADMIN].includes(user?.role);

    const { classes, sections, setClasses, setSections } = useClassesStore();
    const { students, setStudents } = useStudentsStore();
    const { currentSchool } = useSchoolStore();
    
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingClass, setEditingClass] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        grade: '',
        numberOfSections: '1',
        capacity: '30',
    });
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, classId: null, className: null });
    const [deleteLoading, setDeleteLoading] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [classesResponse, sectionsResponse, studentsResponse] = await Promise.all([
                classesService.getAll(),
                sectionsService.getAll(),
                studentsService.getAll()
            ]);

            if (classesResponse.success && classesResponse.data) {
                const classesData = classesResponse.data.data || classesResponse.data;
                setClasses(Array.isArray(classesData) ? classesData : []);
            }

            if (sectionsResponse.success && sectionsResponse.data) {
                const sectionsData = sectionsResponse.data.data || sectionsResponse.data;
                setSections(Array.isArray(sectionsData) ? sectionsData : []);
            }

            if (studentsResponse.success && studentsResponse.data) {
                const studentsData = studentsResponse.data.data || studentsResponse.data;
                setStudents(Array.isArray(studentsData) ? studentsData : []);
            }
        } catch (error) {
            console.error('Failed to load data:', error);
            toast.error('Failed to load classes and sections');
            setClasses([]);
            setSections([]);
            setStudents([]);
        } finally {
            setLoading(false);
        }
    }, [setClasses, setSections, setStudents]);

    useEffect(() => {
        loadData();
    }, [loadData, currentSchool]);

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
            name: '',
            grade: '',
            numberOfSections: '1',
            capacity: '30',
        });
        setEditingClass(null);
        setShowModal(false);
    }, []);

    const handleEdit = useCallback((classItem) => {
        const classSections = sections.filter(s => s.classId === classItem.id && !s.deletedAt);
        setEditingClass(classItem);
        setFormData({
            name: classItem.name,
            grade: classItem.grade,
            numberOfSections: classSections.length.toString(),
            capacity: '30',
        });
        setShowModal(true);
    }, [sections]);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();

        if (!formData.name || !formData.grade || !formData.numberOfSections) {
            toast.error('Please fill in all required fields');
            return;
        }

        const numSections = parseInt(formData.numberOfSections);
        if (numSections < 1 || numSections > 26) {
            toast.error('Number of sections must be between 1 and 26');
            return;
        }

        try {
            if (editingClass) {
                // Update class details
                const classData = {
                    name: formData.name,
                    grade: formData.grade,
                    displayName: formData.name,
                };
                const classResponse = await classesService.update(editingClass.id, classData);
                if (!classResponse.success) {
                    toast.error(classResponse.error || 'Failed to update class');
                    return;
                }

                // Handle section addition/removal
                const existingSections = sections.filter(s => s.classId === editingClass.id && !s.deletedAt);
                const targetSectionCount = numSections;
                const currentSectionCount = existingSections.length;

                if (targetSectionCount !== currentSectionCount) {
                    const sectionLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                    
                    if (targetSectionCount > currentSectionCount) {
                        // Add new sections
                        for (let i = currentSectionCount; i < targetSectionCount; i++) {
                            const sectionData = {
                                classId: editingClass.id,
                                name: sectionLetters[i],
                                capacity: parseInt(formData.capacity) || 30,
                            };
                            await sectionsService.create(sectionData);
                        }
                    } else {
                        // Delete excess sections (from the end)
                        const sectionsToDelete = existingSections
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .slice(targetSectionCount);
                        
                        for (const section of sectionsToDelete) {
                            // Check if section has students
                            const sectionStudents = students.filter(s => s.sectionId === section.id);
                            if (sectionStudents.length > 0) {
                                toast.error(`Cannot delete section ${section.name} as it has ${sectionStudents.length} student(s). Please reassign students first.`);
                                continue;
                            }
                            await sectionsService.delete(section.id);
                        }
                    }
                }

                toast.success('Class updated successfully!');
                await loadData();
                resetForm();
            } else {
                // Create class
                const classData = {
                    name: formData.name,
                    grade: formData.grade,
                    displayName: formData.name,
                };
                const classResponse = await classesService.create(classData);
                if (!classResponse.success || !classResponse.data) {
                    toast.error(classResponse.error || 'Failed to create class');
                    return;
                }

                const newClass = classResponse.data;

                // Create sections
                const sectionLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                for (let i = 0; i < numSections; i++) {
                    const sectionData = {
                        classId: newClass.id,
                        name: sectionLetters[i],
                        capacity: parseInt(formData.capacity) || 30,
                    };
                    await sectionsService.create(sectionData);
                }

                toast.success(`Class created with ${numSections} section(s)!`);
                await loadData();
                resetForm();
            }
        } catch (error) {
            console.error('Failed to save class:', error);
            toast.error(error.response?.data?.message || 'Failed to save class');
        }
    }, [editingClass, formData, sections, students, loadData, resetForm]);

    const handleDeleteClick = useCallback((classItem) => {
        const classStudents = students.filter(s => s.classId === classItem.id);
        if (classStudents.length > 0) {
            toast.error(`Cannot delete class "${classItem.name}" as it has ${classStudents.length} student(s). Please remove or reassign students first.`);
            return;
        }
        setDeleteModal({ 
            isOpen: true, 
            classId: classItem.id, 
            className: classItem.name 
        });
    }, [students]);

    const handleDeleteConfirm = useCallback(async () => {
        if (!deleteModal.classId) return;

        setDeleteLoading(true);
        try {
            const response = await classesService.delete(deleteModal.classId);
            if (response.success) {
                toast.success('Class deleted successfully');
                setDeleteModal({ isOpen: false, classId: null, className: null });
                await loadData();
            } else {
                toast.error(response.error || 'Failed to delete class');
            }
        } catch (error) {
            console.error('Failed to delete class:', error);
            toast.error(error.response?.data?.message || 'Failed to delete class');
        } finally {
            setDeleteLoading(false);
        }
    }, [deleteModal, loadData]);

    const getClassSections = useCallback((classId) => {
        return sections.filter(s => s.classId === classId && !s.deletedAt);
    }, [sections]);

    const getStudentCount = useCallback((classId) => {
        return students.filter(s => s.classId === classId).length;
    }, [students]);

    const handleExportReport = useCallback(() => {
        const data = classes.map(cls => ({
            name: cls.name,
            grade: cls.grade,
            sections: getClassSections(cls.id).map(s => s.name).join(', '),
            students: getStudentCount(cls.id),
            capacity: 30 * getClassSections(cls.id).length
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

    if (loading) {
        return <Loading fullScreen />;
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
                {classes.map((classItem) => {
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
                                        <span>Capacity: 30/section</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {classes.length === 0 && (
                    <div className="empty-state">
                        <BookOpen size={64} />
                        <h3>No Classes Added</h3>
                        <p>Add a class to start managing students</p>
                    </div>
                )}
            </div>

            {/* Add/Edit Class Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={resetForm}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingClass ? 'Edit Class' : 'Add New Class'}</h2>
                            <button className="modal-close" onClick={resetForm}>×</button>
                        </div>

                        <form onSubmit={handleSubmit} className="modal-body">
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label required">Class Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="input"
                                        placeholder="e.g., Class 1, IX-A, FSc Part 1"
                                        required
                                    />
                                    <small className="form-hint">Enter the full class name as displayed</small>
                                </div>

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
                                    />
                                    <small className="form-hint">Numeric grade level</small>
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
                                    />
                                    <small className="form-hint">Maximum students per section</small>
                                </div>
                            </div>

                            <div className="preview-section">
                                <p className="preview-title">Preview:</p>
                                <p className="preview-text">
                                    <strong>{formData.name || 'Class Name'}</strong> will have{' '}
                                    <strong>{formData.numberOfSections || '0'}</strong> section(s):{' '}
                                    {Array.from({ length: parseInt(formData.numberOfSections) || 0 }, (_, i) =>
                                        String.fromCharCode(65 + i)
                                    ).join(', ')}
                                </p>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {editingClass ? 'Update Class' : 'Create Class'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

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
                    background: white;
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--gray-200);
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
                    background: white;
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
                    color: var(--gray-900);
                    margin-bottom: var(--spacing-xs);
                }

                .class-grade {
                    color: var(--gray-600);
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
                    color: var(--gray-700);
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
                    color: var(--gray-700);
                    font-size: 0.875rem;
                }

                .form-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: var(--spacing-lg);
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
                    color: var(--gray-700);
                    margin: 0;
                }

                .required::after {
                    content: ' *';
                    color: var(--danger-600);
                }
            `}</style>
        </div>
    );
};

export default ClassesManagementPage;
