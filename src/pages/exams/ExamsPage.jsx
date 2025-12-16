import React, { useState } from 'react';
import { Plus, FileText, Award, TrendingUp, Download, Upload } from 'lucide-react';
import { mockData } from '../../services/mockData';
import { calculateGrade, formatDate } from '../../utils';
import { printTable } from '../../utils/printUtils';
import Breadcrumb from '../../components/common/Breadcrumb';
import Modal from '../../components/common/Modal';
import CSVImport from '../../components/common/CSVImport';
import toast from 'react-hot-toast';

const ExamsPage = () => {
    const [viewMode, setViewMode] = useState('exams'); // 'exams' or 'results'
    const [showExamModal, setShowExamModal] = useState(false);
    const [showMarksModal, setShowMarksModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [selectedExam, setSelectedExam] = useState(null);

    // Students list for Marks Entry - defaults to mock students, but can be imported
    const [examStudents, setExamStudents] = useState([]);

    const students = mockData.students;
    const subjects = mockData.subjects;

    const exams = [
        { id: 'e1', name: 'Midterm Exam', type: 'midterm', startDate: new Date('2024-12-15'), endDate: new Date('2024-12-20'), totalMarks: 100, passingMarks: 40 },
        { id: 'e2', name: 'Final Exam', type: 'final', startDate: new Date('2025-01-10'), endDate: new Date('2025-01-20'), totalMarks: 100, passingMarks: 40 },
        { id: 'e3', name: 'Unit Test 1', type: 'quiz', startDate: new Date('2024-11-01'), endDate: new Date('2024-11-05'), totalMarks: 50, passingMarks: 20 },
    ];

    const results = [
        { studentId: 'st1', examId: 'e1', subjectId: 'sub1', marksObtained: 92, totalMarks: 100 },
        { studentId: 'st1', examId: 'e1', subjectId: 'sub2', marksObtained: 88, totalMarks: 100 },
        { studentId: 'st1', examId: 'e1', subjectId: 'sub3', marksObtained: 85, totalMarks: 100 },
        { studentId: 'st2', examId: 'e1', subjectId: 'sub1', marksObtained: 78, totalMarks: 100 },
        { studentId: 'st2', examId: 'e1', subjectId: 'sub2', marksObtained: 82, totalMarks: 100 },
    ];

    const breadcrumbItems = [
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Exams & Results', path: null },
    ];

    const handleCreateExam = () => {
        toast.success('Exam created successfully');
        setShowExamModal(false);
    };

    const handleEnterMarks = (exam) => {
        setSelectedExam(exam);
        // Default: Load all students or empty. Let's load mock for now.
        setExamStudents(students.slice(0, 5));
        setShowMarksModal(true);
    };

    const handleSubmitMarks = () => {
        toast.success('Marks submitted successfully');
        setShowMarksModal(false);
    };

    const handleImportStudents = (importedData) => {
        // Map imported data to student structure
        // Expects: studentName, rollNumber
        const newStudents = importedData.map((record, index) => ({
            id: `imported_${Date.now()}_${index}`,
            name: record.studentName,
            rollNumber: record.rollNumber,
            // ... other fields default or empty
        }));

        setExamStudents(newStudents);
        // setShowImportModal(false) handled by CSVImport onClose or we close it here? 
        // CSVImport calls onImport then we might want to close it? 
        // Logic in CSVImport: onImport(preview); toast...; onClose();
        // So onClose is called inside CSVImport but it triggers the prop onClose.
    };

    const handleExportResultsPDF = () => {
        // Flat list of all results
        const data = results.map(r => {
            const student = students.find(s => s.id === r.studentId);
            const exam = exams.find(e => e.id === r.examId);
            const subject = subjects.find(s => s.id === r.subjectId);
            return {
                student: student?.name || 'Unknown',
                roll: student?.rollNumber || '',
                exam: exam?.name || '',
                subject: subject?.name || '',
                marks: `${r.marksObtained} / ${r.totalMarks}`,
                grade: calculateGrade((r.marksObtained / r.totalMarks) * 100)
            };
        });

        printTable({
            title: 'Examination Results Report',
            columns: [
                { header: 'Student Name', accessor: 'student' },
                { header: 'Roll No', accessor: 'roll' },
                { header: 'Exam', accessor: 'exam' },
                { header: 'Subject', accessor: 'subject' },
                { header: 'Marks Obtained', accessor: 'marks' },
                { header: 'Grade', accessor: 'grade' }
            ],
            data: data
        });
    };

    return (
        <div className="exams-page">
            <Breadcrumb items={breadcrumbItems} />

            <div className="page-header">
                <div>
                    <h1>Exams & Results</h1>
                    <p className="text-gray-600">Manage exams, enter marks, and generate results</p>
                </div>
                <div className="flex gap-md">
                    {viewMode === 'results' && (
                        <button className="btn btn-outline" onClick={handleExportResultsPDF}>
                            <Download size={18} />
                            <span>Export Data</span>
                        </button>
                    )}
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
                    <button className="btn btn-success" onClick={() => setShowExamModal(true)}>
                        <Plus size={18} />
                        <span>Create Exam</span>
                    </button>
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
                                    <th>Start Date</th>
                                    <th>End Date</th>
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
                                        <td>{formatDate(exam.startDate)}</td>
                                        <td>{formatDate(exam.endDate)}</td>
                                        <td>{exam.totalMarks}</td>
                                        <td>{exam.passingMarks}</td>
                                        <td>
                                            <div className="flex gap-sm">
                                                <button
                                                    className="btn btn-sm btn-primary"
                                                    onClick={() => handleEnterMarks(exam)}
                                                >
                                                    <TrendingUp size={16} />
                                                    <span>Enter Marks</span>
                                                </button>
                                                <button className="btn btn-sm btn-outline">
                                                    <FileText size={16} />
                                                    <span>View</span>
                                                </button>
                                            </div>
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
                        <button className="btn btn-outline btn-sm">
                            <Download size={16} />
                            <span>Download Report Cards</span>
                        </button>
                    </div>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Student</th>
                                    <th>Roll Number</th>
                                    <th>Exam</th>
                                    <th>Subject</th>
                                    <th>Marks</th>
                                    <th>Grade</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.map((result, index) => {
                                    const student = students.find(s => s.id === result.studentId);
                                    const exam = exams.find(e => e.id === result.examId);
                                    const subject = subjects.find(s => s.id === result.subjectId);
                                    const grade = calculateGrade(result.marksObtained, result.totalMarks);

                                    return (
                                        <tr key={index}>
                                            <td className="font-medium">{student?.name}</td>
                                            <td>{student?.rollNumber}</td>
                                            <td>{exam?.name}</td>
                                            <td>{subject?.name}</td>
                                            <td>{result.marksObtained}/{result.totalMarks}</td>
                                            <td>
                                                <span className={`badge badge-${grade.startsWith('A') ? 'success' :
                                                    grade.startsWith('B') ? 'primary' :
                                                        grade.startsWith('C') ? 'warning' :
                                                            'error'
                                                    }`}>
                                                    {grade}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Create Exam Modal */}
            <Modal
                isOpen={showExamModal}
                onClose={() => setShowExamModal(false)}
                title="Create New Exam"
                size="lg"
                footer={
                    <>
                        <button className="btn btn-outline" onClick={() => setShowExamModal(false)}>
                            Cancel
                        </button>
                        <button className="btn btn-success" onClick={handleCreateExam}>
                            Create Exam
                        </button>
                    </>
                }
            >
                <form className="exam-form">
                    <div className="grid grid-cols-2">
                        <div className="form-group">
                            <label className="form-label">Exam Name *</label>
                            <input type="text" className="input" placeholder="Enter exam name" />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Exam Type *</label>
                            <select className="select">
                                <option value="midterm">Midterm</option>
                                <option value="final">Final</option>
                                <option value="quiz">Quiz</option>
                                <option value="assignment">Assignment</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Start Date *</label>
                            <input type="date" className="input" />
                        </div>

                        <div className="form-group">
                            <label className="form-label">End Date *</label>
                            <input type="date" className="input" />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Total Marks *</label>
                            <input type="number" className="input" placeholder="100" />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Passing Marks *</label>
                            <input type="number" className="input" placeholder="40" />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea className="textarea" placeholder="Add exam description" rows="3" />
                    </div>
                </form>
            </Modal>

            {/* Enter Marks Modal */}
            <Modal
                isOpen={showMarksModal}
                onClose={() => setShowMarksModal(false)}
                title={`Enter Marks - ${selectedExam?.name}`}
                size="xl"
                footer={
                    <>
                        <button className="btn btn-outline" onClick={() => setShowMarksModal(false)}>
                            Cancel
                        </button>
                        <button className="btn btn-success" onClick={handleSubmitMarks}>
                            Submit Marks
                        </button>
                    </>
                }
            >
                <div className="marks-entry">
                    <div className="flex justify-end mb-4">
                        <button className="btn btn-outline btn-sm" onClick={() => setShowImportModal(true)}>
                            <Upload size={16} />
                            <span>Import Student List (CSV)</span>
                        </button>
                    </div>

                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Roll No</th>
                                    <th>Student Name</th>
                                    <th>Subject</th>
                                    <th>Marks Obtained</th>
                                </tr>
                            </thead>
                            <tbody>
                                {examStudents.map((student) => (
                                    <tr key={student.id}>
                                        <td>{student.rollNumber}</td>
                                        <td>{student.name}</td>
                                        <td>
                                            <select className="select">
                                                {subjects.map(sub => (
                                                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                className="input"
                                                placeholder="0"
                                                max={selectedExam?.totalMarks}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {examStudents.length === 0 && (
                            <div className="text-center p-4 text-gray-500">
                                No students loaded. Import from CSV or select manually.
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

            {/* Import Modal */}
            {showImportModal && (
                <CSVImport
                    type="examMarks"
                    onImport={handleImportStudents}
                    onClose={() => setShowImportModal(false)}
                />
            )}

            <style jsx>{`
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

        .exam-form {
          max-height: 60vh;
          overflow-y: auto;
        }

        .marks-entry {
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

export default ExamsPage;
