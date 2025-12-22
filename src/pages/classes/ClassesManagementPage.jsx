import React, { useState } from 'react';
import { Plus, BookOpen, Trash2, Edit, Users, Download } from 'lucide-react';
import { useClassesStore, useStudentsStore, useAuthStore } from '../../store';
import { generateId } from '../../utils';
import { printTable } from '../../utils/printUtils';
import { AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const ClassesManagementPage = () => {
    const { user } = useAuthStore();
    const canManageClasses = ['admin', 'management', 'super_admin'].includes(user?.role);

    const { classes, sections, setClasses, setSections, addClass, addSection } = useClassesStore();
    const { students } = useStudentsStore();

    if (!canManageClasses) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-[70vh]">
                <AlertCircle size={64} className="text-error-500 mb-4" />
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Access Denied</h1>
                <p className="text-gray-600 max-w-md">You do not have permission to access classes management. This area is restricted to administrators and school management only.</p>
            </div>
        );
    }
    const [showModal, setShowModal] = useState(false);
    const [editingClass, setEditingClass] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        grade: '',
        numberOfSections: '1',
        capacity: '30',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
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

        const classId = editingClass ? editingClass.id : generateId();

        const classData = {
            id: classId,
            name: formData.name,
            grade: formData.grade,
            sectionIds: [],
            capacity: parseInt(formData.capacity),
            createdAt: editingClass ? editingClass.createdAt : new Date(),
            updatedAt: new Date(),
        };

        const sectionLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const newSections = [];

        for (let i = 0; i < numSections; i++) {
            const sectionLetter = sectionLetters[i];
            const sectionId = generateId();

            newSections.push({
                id: sectionId,
                name: sectionLetter,
                classId: classId,
                classTeacherId: null,
                capacity: parseInt(formData.capacity) || 30,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            classData.sectionIds.push(sectionId);
        }

        if (editingClass) {
            const updatedClasses = classes.map(c =>
                c.id === classId ? classData : c
            );
            setClasses(updatedClasses);

            const filteredSections = sections.filter(s => s.classId !== classId);
            setSections([...filteredSections, ...newSections]);

            toast.success('Class updated successfully!');
        } else {
            addClass(classData);
            newSections.forEach(section => addSection(section));
            toast.success(`Class created with ${numSections} section(s)!`);
        }

        resetForm();
    };

    const resetForm = () => {
        setFormData({
            name: '',
            grade: '',
            numberOfSections: '1',
            capacity: '30',
        });
        setEditingClass(null);
        setShowModal(false);
    };

    const handleEdit = (classItem) => {
        const classSections = sections.filter(s => s.classId === classItem.id);

        setEditingClass(classItem);
        setFormData({
            name: classItem.name,
            grade: classItem.grade,
            numberOfSections: classSections.length.toString(),
            capacity: classItem.capacity?.toString() || '30',
        });
        setShowModal(true);
    };

    const handleDelete = (classId) => {
        if (window.confirm('Are you sure you want to delete this class? All sections will also be deleted.')) {
            const updatedClasses = classes.filter(c => c.id !== classId);
            const updatedSections = sections.filter(s => s.classId !== classId);

            setClasses(updatedClasses);
            setSections(updatedSections);

            toast.success('Class deleted successfully!');
        }
    };

    const getClassSections = (classId) => {
        return sections.filter(s => s.classId === classId);
    };

    const getStudentCount = (classId) => {
        return students.filter(s => s.classId === classId).length;
    };

    const handleExportReport = () => {
        const data = classes.map(cls => ({
            name: cls.name,
            grade: cls.grade,
            sections: sections.filter(s => s.classId === cls.id).map(s => s.name).join(', '),
            students: getStudentCount(cls.id),
            capacity: (cls.capacity || 30) * sections.filter(s => s.classId === cls.id).length
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
    };

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
                                    <button className="icon-btn icon-btn-danger" onClick={() => handleDelete(classItem.id)} title="Delete">
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
                                        <span>Capacity: {classItem.capacity}/section</span>
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
                <div className="modal-overlay" onClick={() => resetForm()}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingClass ? 'Edit Class' : 'Add New Class'}</h2>
                            <button className="modal-close" onClick={() => resetForm()}>×</button>
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
                                    <small className="form-hint">Sections will be auto-generated (A, B, C...)</small>
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
                                <button type="button" className="btn btn-secondary" onClick={() => resetForm()}>
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
