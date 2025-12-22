import React, { useState, useEffect } from 'react';
import { Plus, FileText, Award, TrendingUp, Download, Upload, BookOpen } from 'lucide-react';
import { useAuthStore, useClassesStore, useStudentsStore, useTeachersStore } from '../../store';
import { calculateGrade, formatDate, exportToCSV } from '../../utils';
import { USER_ROLES } from '../../constants';
import Breadcrumb from '../../components/common/Breadcrumb';
import Modal from '../../components/common/Modal';
import CSVImport from '../../components/common/CSVImport';
import toast from 'react-hot-toast';

const ExamsPage = () => {
    const { user } = useAuthStore();
    const { classes, sections } = useClassesStore();
    const { students } = useStudentsStore();
    const { teachers } = useTeachersStore();

    // Access control: Authorized roles for full management
    const isAuthorized = [USER_ROLES.ADMIN, USER_ROLES.MANAGEMENT, USER_ROLES.SUPER_ADMIN].includes(user?.role);
    const isTeacher = user?.role === USER_ROLES.TEACHER;
    const isStudent = user?.role === USER_ROLES.STUDENT;
    const isParent = user?.role === USER_ROLES.PARENT;

    const [viewMode, setViewMode] = useState('exams'); // 'exams' or 'results'
    const [showExamModal, setShowExamModal] = useState(false);
    const [showMarksModal, setShowMarksModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);

    const [selectedExam, setSelectedExam] = useState(null);
    const [selectedClass, setSelectedClass] = useState(null);
    const [selectedSection, setSelectedSection] = useState(null);
    const [selectedSubject, setSelectedSubject] = useState(null);

    // For marks entry
    const [marksData, setMarksData] = useState([]);

    // Exam creation form
    const [examFormData, setExamFormData] = useState({
        name: '',
        type: 'midterm',
        classId: '',
        examDate: '',
        totalMarks: '100',
        passingMarks: '40',
        description: '',
    });

    // Mock exams - in real app, this would come from a store
    const [exams, setExams] = useState([
        {
            id: 'e1',
            name: 'Midterm Exam',
            type: 'midterm',
            classId: null,
            examDate: new Date('2024-12-15'),
            totalMarks: 100,
            passingMarks: 40
        },
    ]);

    // Mock results - in real app, from store
    const [results] = useState([]);

    // Get teacher's assigned subjects (if logged in as teacher)
    const getTeacherSubjects = () => {
        if (user?.role !== USER_ROLES.TEACHER) {
            return []; // Not a teacher, return empty
        }

        // Find current logged-in teacher
        const currentTeacher = teachers.find(t => t.email === user.email);
        if (!currentTeacher || !currentTeacher.subjects) {
            return [];
        }

        // Return teacher's assigned subjects
        return currentTeacher.subjects || [];
    };

    const teacherSubjects = getTeacherSubjects();

    // Get students for selected class and section
    const getClassStudents = () => {
        if (!selectedClass || !selectedSection) return [];

        return students.filter(s =>
            s.classId === selectedClass &&
            s.sectionId === selectedSection
        );
    };

    const classStudents = getClassStudents();

    // Get sections for selected class
    const getClassSections = () => {
        if (!selectedClass) return [];
        return sections.filter(s => s.classId === selectedClass);
    };

    const classSections = getClassSections();

    const breadcrumbItems = [
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Exams & Results', path: null },
    ];

    // Exam creation handlers
    const handleExamFormChange = (e) => {
        const { name, value } = e.target;
        setExamFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCreateExam = (e) => {
        e.preventDefault();

        if (!examFormData.name || !examFormData.examDate) {
            toast.error('Please fill in all required fields');
            return;
        }

        const newExam = {
            id: `e${Date.now()}`,
            name: examFormData.name,
            type: examFormData.type,
            classId: examFormData.classId || null,
            examDate: new Date(examFormData.examDate),
            totalMarks: parseInt(examFormData.totalMarks),
            passingMarks: parseInt(examFormData.passingMarks),
            description: examFormData.description,
        };

        setExams(prev => [...prev, newExam]);
        toast.success('Exam created successfully!');
        setShowExamModal(false);

        // Reset form
        setExamFormData({
            name: '',
            type: 'midterm',
            classId: '',
            examDate: '',
            totalMarks: '100',
            passingMarks: '40',
            description: '',
        });
    };

    const handleClassChange = (classId) => {
        setSelectedClass(classId);
        setSelectedSection(null);
        setSelectedSubject(null);
        setMarksData([]);
    };

    const handleSectionChange = (sectionId) => {
        setSelectedSection(sectionId);
        setSelectedSubject(null);
        initializeMarksData(sectionId);
    };

    const handleSubjectChange = (subject) => {
        setSelectedSubject(subject);
    };

    const initializeMarksData = (sectionId) => {
        const studentsInClass = students.filter(s =>
            s.classId === selectedClass &&
            s.sectionId === sectionId
        );

        const initialData = studentsInClass.map(student => ({
            studentId: student.id,
            rollNumber: student.rollNumber,
            name: student.name,
            subject: '',
            marksObtained: '',
        }));

        setMarksData(initialData);
    };

    const handleEnterMarks = (exam) => {
        if (user?.role === USER_ROLES.TEACHER && teacherSubjects.length === 0) {
            toast.error('You are not assigned to any subjects. Contact admin.');
            return;
        }

        setSelectedExam(exam);
        setShowMarksModal(true);
    };

    const handleMarksChange = (studentId, field, value) => {
        setMarksData(prev =>
            prev.map(m =>
                m.studentId === studentId
                    ? { ...m, [field]: value }
                    : m
            )
        );
    };

    const handleSubmitMarks = () => {
        if (!selectedClass || !selectedSection || !selectedSubject) {
            toast.error('Please select class, section, and subject');
            return;
        }

        // Validate that all students have marks
        const incomplete = marksData.some(m =>
            m.marksObtained === '' || m.marksObtained === null
        );

        if (incomplete) {
            toast.error('Please enter marks for all students');
            return;
        }

        // Validate marks don't exceed total
        const invalid = marksData.some(m =>
            parseFloat(m.marksObtained) > selectedExam.totalMarks
        );

        if (invalid) {
            toast.error(`Marks cannot exceed ${selectedExam.totalMarks}`);
            return;
        }

        // In real app, save to store
        // Submitting marks for student: examId, classId, sectionId, subject, marks

        toast.success('Marks submitted successfully!');
        setShowMarksModal(false);
        resetMarksEntry();
    };

    const resetMarksEntry = () => {
        setSelectedClass(null);
        setSelectedSection(null);
        setSelectedSubject(null);
        setMarksData([]);
    };

    const handleImportMarks = (importedData) => {
        // CSV format: rollNumber, subject, marks
        // Map to existing students
        const updatedMarks = marksData.map(existing => {
            const imported = importedData.find(imp =>
                imp.rollNumber === existing.rollNumber
            );

            if (imported) {
                return {
                    ...existing,
                    subject: imported.subject || existing.subject,
                    marksObtained: imported.marks || existing.marksObtained,
                };
            }

            return existing;
        });

        setMarksData(updatedMarks);
        toast.success(`Imported marks for ${importedData.length} students`);
        setShowImportModal(false);
    };

    const handleExportMarksTemplate = () => {
        if (!selectedExam) {
            toast.error('No exam selected');
            return;
        }

        const template = marksData.map(m => ({
            rollNumber: m.rollNumber,
            studentName: m.name,
            subject: selectedSubject || '',
            [`marks (out of ${selectedExam.totalMarks})`]: '',
        }));

        exportToCSV(template, `marks_template_${selectedClass}_${selectedSubject}_${Date.now()}.csv`);
        toast.success(`Template downloaded! Total marks: ${selectedExam.totalMarks}`);
    };

    const canTeacherAddMarksForSubject = (subject) => {
        if (user?.role !== USER_ROLES.TEACHER) {
            return true; // Admin/Management can add for all subjects
        }

        return teacherSubjects.includes(subject);
    };

    const availableSubjects = user?.role === USER_ROLES.TEACHER
        ? teacherSubjects
        : ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Urdu', 'Computer Science', 'Islamiat'];

    return (
        <div className="exams-page">
            <Breadcrumb items={breadcrumbItems} />

            <div className="page-header">
                <div>
                    <h1>Exams & Results</h1>
                    <p className="text-gray-600">
                        {user?.role === USER_ROLES.TEACHER
                            ? `Manage exams and enter marks for: ${teacherSubjects.join(', ') || 'No subjects assigned'}`
                            : 'Manage exams, enter marks, and generate results'
                        }
                    </p>
                </div>
                <div className="flex gap-md">
                    <button
                        className={`btn ${viewMode === 'exams' ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setViewMode('exams')}
                    >
                        <FileText size={18} />
                        <span>Exams</span>
                    </button>
                    <button
                        className={`btn ${viewMode === 'results' ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setViewMode('results')}
                    >
                        <Award size={18} />
                        <span>Results</span>
                    </button>
                    {isAuthorized && (
                        <button className="btn btn-success" onClick={() => setShowExamModal(true)}>
                            <Plus size={18} />
                            <span>Create Exam</span>
                        </button>
                    )}
                </div>
            </div>

            {viewMode === 'exams' ? (
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Exam Schedule</h3>
                    </div>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Exam Name</th>
                                    <th>Type</th>
                                    <th>Exam Date</th>
                                    <th>Total Marks</th>
                                    <th>Passing Marks</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {exams.map((exam) => (
                                    <tr key={exam.id}>
                                        <td className="font-medium">{exam.name}</td>
                                        <td>
                                            <span className="badge badge-primary capitalize">{exam.type}</span>
                                        </td>
                                        <td>{formatDate(exam.examDate)}</td>
                                        <td>{exam.totalMarks}</td>
                                        <td>{exam.passingMarks}</td>
                                        <td>
                                            {(isAuthorized || isTeacher) && (
                                                <button
                                                    className="btn btn-sm btn-primary"
                                                    onClick={() => handleEnterMarks(exam)}
                                                >
                                                    <TrendingUp size={16} />
                                                    <span>Enter Marks</span>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Student Results</h3>
                    </div>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Student</th>
                                    <th>Roll Number</th>
                                    <th>Class</th>
                                    <th>Exam</th>
                                    <th>Subject</th>
                                    <th>Marks</th>
                                    <th>Grade</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="text-center text-gray-500">
                                            No results available yet
                                        </td>
                                    </tr>
                                ) : (
                                    results.filter(result => {
                                        if (isParent) {
                                            const student = students.find(s => s.id === result.studentId);
                                            return student && student.parentId === user?.id;
                                        }
                                        if (isStudent) {
                                            return result.studentId === user?.id;
                                        }
                                        return true;
                                    }).map((result, index) => (
                                        <tr key={index}>
                                            <td>{result.studentName}</td>
                                            <td>{result.rollNumber}</td>
                                            <td>{result.className}</td>
                                            <td>{result.examName}</td>
                                            <td>{result.subject}</td>
                                            <td>{result.marksObtained}/{result.totalMarks}</td>
                                            <td>
                                                <span className={`badge badge-success`}>
                                                    {calculateGrade(result.marksObtained, result.totalMarks)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Enter Marks Modal - Step-by-Step */}
            <Modal
                isOpen={showMarksModal}
                onClose={() => {
                    setShowMarksModal(false);
                    resetMarksEntry();
                }}
                title={`Enter Marks - ${selectedExam?.name}`}
                size="xl"
            >
                <div className="marks-entry-wizard">
                    {/* Step 1: Select Class */}
                    <div className="wizard-step">
                        <h4 className="step-title">
                            <span className="step-number">1</span>
                            Select Class
                        </h4>
                        <select
                            className="select"
                            value={selectedClass || ''}
                            onChange={(e) => handleClassChange(e.target.value)}
                        >
                            <option value="">-- Select Class --</option>
                            {classes.map(cls => (
                                <option key={cls.id} value={cls.id}>{cls.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Step 2: Select Section */}
                    {selectedClass && (
                        <div className="wizard-step">
                            <h4 className="step-title">
                                <span className="step-number">2</span>
                                Select Section
                            </h4>
                            <select
                                className="select"
                                value={selectedSection || ''}
                                onChange={(e) => handleSectionChange(e.target.value)}
                            >
                                <option value="">-- Select Section --</option>
                                {classSections.map(sec => (
                                    <option key={sec.id} value={sec.id}>Section {sec.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Step 3: Select Subject */}
                    {selectedSection && (
                        <div className="wizard-step">
                            <h4 className="step-title">
                                <span className="step-number">3</span>
                                Select Subject
                            </h4>
                            <select
                                className="select"
                                value={selectedSubject || ''}
                                onChange={(e) => handleSubjectChange(e.target.value)}
                            >
                                <option value="">-- Select Subject --</option>
                                {availableSubjects.map((subject, idx) => (
                                    <option key={idx} value={subject}>{subject}</option>
                                ))}
                            </select>
                            {user?.role === USER_ROLES.TEACHER && (
                                <p className="text-sm text-gray-500 mt-2">
                                    You can only enter marks for subjects you teach
                                </p>
                            )}
                        </div>
                    )}

                    {/* Step 4: Enter Marks */}
                    {selectedSubject && (
                        <div className="wizard-step">
                            <div className="step-header">
                                <h4 className="step-title">
                                    <span className="step-number">4</span>
                                    Enter Marks for {selectedSubject}
                                </h4>
                                <div className="flex gap-sm">
                                    <button
                                        className="btn btn-outline btn-sm"
                                        onClick={handleExportMarksTemplate}
                                    >
                                        <Download size={16} />
                                        Download Template
                                    </button>
                                    <button
                                        className="btn btn-outline btn-sm"
                                        onClick={() => setShowImportModal(true)}
                                    >
                                        <Upload size={16} />
                                        Import CSV
                                    </button>
                                </div>
                            </div>

                            <div className="table-container mt-md">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Roll No</th>
                                            <th>Student Name</th>
                                            <th>Marks (out of {selectedExam?.totalMarks})</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {marksData.map((student) => (
                                            <tr key={student.studentId}>
                                                <td>{student.rollNumber}</td>
                                                <td>{student.name}</td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        className="input"
                                                        placeholder="0"
                                                        min="0"
                                                        max={selectedExam?.totalMarks}
                                                        value={student.marksObtained}
                                                        onChange={(e) =>
                                                            handleMarksChange(student.studentId, 'marksObtained', e.target.value)
                                                        }
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {marksData.length === 0 && (
                                    <div className="text-center p-4 text-gray-500">
                                        No students in this class/section
                                    </div>
                                )}
                            </div>

                            <div className="modal-footer">
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setShowMarksModal(false);
                                        resetMarksEntry();
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-success"
                                    onClick={handleSubmitMarks}
                                    disabled={marksData.length === 0}
                                >
                                    Submit Marks
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Create Exam Modal */}
            <Modal
                isOpen={showExamModal}
                onClose={() => setShowExamModal(false)}
                title="Create New Exam"
                size="lg"
            >
                <form onSubmit={handleCreateExam}>
                    <div className="grid grid-cols-2">
                        <div className="form-group">
                            <label className="form-label">Exam Name *</label>
                            <input
                                type="text"
                                name="name"
                                className="input"
                                placeholder="e.g., Midterm Exam, Final Exam"
                                value={examFormData.name}
                                onChange={handleExamFormChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Exam Type *</label>
                            <select
                                name="type"
                                className="select"
                                value={examFormData.type}
                                onChange={handleExamFormChange}
                            >
                                <option value="midterm">Midterm</option>
                                <option value="final">Final</option>
                                <option value="quiz">Quiz</option>
                                <option value="assignment">Assignment</option>
                                <option value="test">Class Test</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Class (Optional)</label>
                            <select
                                name="classId"
                                className="select"
                                value={examFormData.classId}
                                onChange={handleExamFormChange}
                            >
                                <option value="">-- All Classes --</option>
                                {classes.map(cls => (
                                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Total Marks *</label>
                            <input
                                type="number"
                                name="totalMarks"
                                className="input"
                                placeholder="100"
                                min="1"
                                value={examFormData.totalMarks}
                                onChange={handleExamFormChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Passing Marks *</label>
                            <input
                                type="number"
                                name="passingMarks"
                                className="input"
                                placeholder="40"
                                min="1"
                                value={examFormData.passingMarks}
                                onChange={handleExamFormChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Exam Date *</label>
                            <input
                                type="date"
                                name="examDate"
                                className="input"
                                value={examFormData.examDate}
                                onChange={handleExamFormChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Description (Optional)</label>
                        <textarea
                            name="description"
                            className="textarea"
                            placeholder="Add exam description or instructions"
                            rows="3"
                            value={examFormData.description}
                            onChange={handleExamFormChange}
                        />
                    </div>

                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setShowExamModal(false)}
                        >
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-success">
                            <Plus size={18} />
                            Create Exam
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Import Marks CSV Modal */}
            {showImportModal && (
                <CSVImport
                    type="examMarks"
                    expectedFields={['rollNumber', 'subject', 'marks']}
                    onImport={handleImportMarks}
                    onClose={() => setShowImportModal(false)}
                />
            )}

            <style>{`
                .exams-page {
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

                .marks-entry-wizard {
                    display: flex;
                    flex-direction: column;
                    gap: var(--spacing-xl);
                }

                .wizard-step {
                    background: var(--gray-50);
                    padding: var(--spacing-lg);
                    border-radius: var(--radius-lg);
                    border: 2px solid var(--gray-200);
                }

                .step-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: var(--spacing-md);
                }

                .step-title {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-md);
                    font-size: 1.125rem;
                    font-weight: 600;
                    color: var(--gray-900);
                    margin-bottom: var(--spacing-md);
                }

                .step-number {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 32px;
                    height:32px;
                    background: var(--primary-600);
                    color: white;
                    border-radius: var(--radius-full);
                    font-weight: 700;
                }

                .modal-footer {
                    display: flex;
                    justify-content: flex-end;
                    gap: var(--spacing-md);
                    margin-top: var(--spacing-lg);
                    padding-top: var(--spacing-lg);
                    border-top: 1px solid var(--border-color);
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

export default ExamsPage;
