import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, CheckCircle, XCircle, Clock, Download, Filter, CheckSquare, Square, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store';
import { USER_ROLES } from '../../constants';
import { classesService, sectionsService, studentsService } from '../../services/api';
import { formatDate, exportToCSV } from '../../utils';
import { printTable } from '../../utils/printUtils';
import Breadcrumb from '../../components/common/Breadcrumb';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';

const AttendancePage = () => {
    const { user } = useAuthStore();
    const canManageAttendance = [USER_ROLES.ADMIN, USER_ROLES.MANAGEMENT, USER_ROLES.TEACHER, USER_ROLES.SUPER_ADMIN].includes(user?.role);

    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [viewMode, setViewMode] = useState('take'); // 'take', 'report', 'summary'

    // Data states
    const [classes, setClasses] = useState([]);
    const [sections, setSections] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);

    // Load initial data
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [classesRes, sectionsRes] = await Promise.all([
                    classesService.getAll(),
                    sectionsService.getAll()
                ]);

                if (classesRes.success) setClasses(classesRes.data.data || classesRes.data || []);
                if (sectionsRes.success) setSections(sectionsRes.data.data || sectionsRes.data || []);
            } catch (error) {
                console.error("Failed to load classes/sections", error);
            }
        };
        loadInitialData();
    }, []);

    // Load students when class/section changes
    useEffect(() => {
        if (selectedClass && selectedSection) {
            const loadStudents = async () => {
                try {
                    // API should support filtering by class/section
                    const res = await studentsService.getAll({ classId: selectedClass, sectionId: selectedSection });
                    if (res.success) {
                        const count = res.data.data?.length || res.data?.length || 0;
                        setStudents(res.data.data || res.data || []);
                    }
                } catch (error) {
                    toast.error('Failed to load students');
                }
            }
            loadStudents();
        } else {
            setStudents([]);
        }
    }, [selectedClass, selectedSection]);

    // map studentId -> status ('present', 'absent', 'leave')
    const [attendance, setAttendance] = useState({});

    // For summary view
    const [submissionSummary, setSubmissionSummary] = useState(null);

    if (!canManageAttendance) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-[70vh]">
                <AlertCircle size={64} className="text-error-500 mb-4" />
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Access Denied</h1>
                <p className="text-gray-600 max-w-md">You do not have permission to access attendance management. This area is restricted to staff only.</p>
            </div>
        );
    }


    const breadcrumbItems = [
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Attendance', path: null },
    ];

    // Memoize filtered sections and students for performance
    const filteredSections = useMemo(() => 
        sections.filter(s => s.classId === selectedClass),
        [sections, selectedClass]
    );
    
    const filteredStudents = useMemo(() => 
        students.filter(s =>
            s.classId === selectedClass && s.sectionId === selectedSection
        ),
        [students, selectedClass, selectedSection]
    );

    const handleAttendanceChange = (studentId, checked) => {
        setAttendance(prev => ({
            ...prev,
            [studentId]: checked ? 'present' : 'absent'
        }));
    };

    const handleMarkAllPresent = () => {
        const newAttendance = {};
        filteredStudents.forEach(s => {
            newAttendance[s.id] = 'present';
        });
        setAttendance(newAttendance);
        toast.success('Marked all as Present');
    };

    const handleSubmitAttendance = async () => {
        try {
            if (!selectedClass || !selectedSection) {
                toast.error('Please select class and section');
                return;
            }

            // Validate that students exist in the class
            if (filteredStudents.length === 0) {
                toast.error('Cannot submit attendance: No students found in this class and section');
                return;
            }

            const total = filteredStudents.length;
            // Default to absent if not marked
            const finalAttendance = { ...attendance };
            filteredStudents.forEach(s => {
                if (!finalAttendance[s.id]) {
                    finalAttendance[s.id] = 'absent';
                }
            });

            const present = Object.values(finalAttendance).filter(s => s === 'present').length;
            const absent = Object.values(finalAttendance).filter(s => s === 'absent').length;
            const leave = Object.values(finalAttendance).filter(s => s === 'leave').length;

            const summary = {
                date: selectedDate,
                classId: selectedClass,
                sectionId: selectedSection,
                total,
                present,
                absent,
                leave,
                details: finalAttendance
            };

            // TODO: Call attendance API when available
            // For now, just show summary
            setSubmissionSummary(summary);
            setViewMode('summary');
            toast.success('Attendance submitted successfully');
        } catch (error) {
            console.error('Attendance submission error:', error);
            toast.error('Failed to submit attendance');
        }
    };

    const handleExport = () => {
        const exportData = filteredStudents.map(student => ({
            'Roll Number': student.rollNumber,
            'Name': student.name,
            'Status': attendance[student.id] || 'Not Marked',
            'Date': selectedDate,
        }));

        exportToCSV(exportData, `attendance_${selectedDate}.csv`);
        toast.success('Attendance exported successfully');
    };

    const handleExportPDF = () => {
        const data = filteredStudents.map(student => ({
            roll: student.rollNumber,
            name: student.name,
            status: (attendance[student.id] || 'Not Marked').toUpperCase(),
            date: selectedDate
        }));

        printTable({
            title: `Attendance Report - ${selectedDate}`,
            columns: [
                { header: 'Roll No', accessor: 'roll' },
                { header: 'Student Name', accessor: 'name' },
                { header: 'Status', accessor: 'status' },
                { header: 'Date', accessor: 'date' }
            ],
            data: data
        });
    };

    const isStudentPresent = (id) => attendance[id] === 'present';

    return (
        <div className="attendance-page">
            <Breadcrumb items={breadcrumbItems} />

            <div className="page-header">
                <div>
                    <h1>Attendance Management</h1>
                    <p className="text-gray-600">Track and manage student attendance</p>
                </div>
                <div className="flex gap-md">
                    <button className="btn btn-outline" onClick={handleExportPDF} disabled={!selectedClass || !selectedSection}>
                        <Download size={18} />
                        <span>PDF</span>
                    </button>
                    <button className="btn btn-outline" onClick={handleExport} disabled={!selectedClass || !selectedSection}>
                        <Download size={18} />
                        <span>CSV</span>
                    </button>
                    <div className="h-8 w-px bg-gray-300 mx-2"></div>
                    <button
                        className={`btn ${viewMode === 'take' || viewMode === 'summary' ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => { setViewMode('take'); setSubmissionSummary(null); }}
                    >
                        Take Attendance
                    </button>
                    <button
                        className={`btn ${viewMode === 'report' ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setViewMode('report')}
                    >
                        View Reports
                    </button>
                </div>
            </div>

            {viewMode === 'summary' && submissionSummary ? (
                <div className="card max-w-2xl mx-auto">
                    <div className="card-header text-center block">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">Attendance Submitted!</h2>
                        <p className="text-gray-500 mt-2">
                            Summary for {mockData.classes.find(c => c.id === submissionSummary.classId)?.name} - Section {mockData.sections.find(s => s.id === submissionSummary.sectionId)?.name}
                        </p>
                        <p className="text-gray-500">{formatDate(new Date(submissionSummary.date))}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-4 p-6 bg-gray-50 rounded-lg mt-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{submissionSummary.present}</div>
                            <div className="text-sm text-gray-500">Present</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">{submissionSummary.absent}</div>
                            <div className="text-sm text-gray-500">Absent</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-yellow-600">{submissionSummary.leave}</div>
                            <div className="text-sm text-gray-500">Leave</div>
                        </div>
                    </div>

                    <div className="p-6 border-t border-gray-100 mt-4 flex justify-center">
                        <button className="btn btn-primary" onClick={() => {
                            setAttendance({});
                            setViewMode('take');
                            setSubmissionSummary(null);
                        }}>
                            Take Another Attendance
                        </button>
                    </div>
                </div>
            ) : viewMode === 'take' ? (
                <>
                    {/* Filters */}
                    <div className="card mb-lg">
                        <div className="filters-grid">
                            <div className="form-group mb-0">
                                <label className="form-label">Date</label>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="input"
                                />
                            </div>

                            <div className="form-group mb-0">
                                <label className="form-label">Class</label>
                                <select
                                    value={selectedClass}
                                    onChange={(e) => {
                                        setSelectedClass(e.target.value);
                                        setSelectedSection('');
                                    }}
                                    className="select"
                                >
                                    <option value="">Select Class</option>
                                    {classes.map(cls => (
                                        <option key={cls.id} value={cls.id}>{cls.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group mb-0">
                                <label className="form-label">Section</label>
                                <select
                                    value={selectedSection}
                                    onChange={(e) => setSelectedSection(e.target.value)}
                                    className="select"
                                    disabled={!selectedClass}
                                >
                                    <option value="">Select Section</option>
                                    {filteredSections.map(section => (
                                        <option key={section.id} value={section.id}>{section.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Attendance List */}
                    {selectedClass && selectedSection ? (
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">Mark Attendance - {formatDate(new Date(selectedDate))}</h3>
                                <div className="flex gap-md">
                                    <button className="btn btn-primary btn-sm" onClick={handleMarkAllPresent}>
                                        <CheckCircle size={16} />
                                        <span>Mark All Present</span>
                                    </button>
                                    <button className="btn btn-success btn-sm" onClick={handleSubmitAttendance}>
                                        Submit Attendance
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Roll No</th>
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Student Name</th>
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Status (Present?)</th>
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Remarks</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {filteredStudents.map(student => (
                                            <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="py-3 px-4 text-sm text-gray-900">{student.rollNumber}</td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold">
                                                            {student.name.charAt(0)}
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-900">{student.name}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <label className="flex items-center cursor-pointer gap-2">
                                                        <input
                                                            type="checkbox"
                                                            className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                                            checked={isStudentPresent(student.id)}
                                                            onChange={(e) => handleAttendanceChange(student.id, e.target.checked)}
                                                        />
                                                        <span className={`text-sm font-medium ${isStudentPresent(student.id) ? 'text-green-600' : 'text-gray-400'}`}>
                                                            {isStudentPresent(student.id) ? 'Present' : 'Absent'}
                                                        </span>
                                                    </label>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <input
                                                        type="text"
                                                        placeholder="Optional remark"
                                                        className="input input-sm w-full"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {filteredStudents.length === 0 && (
                                <div className="p-8 text-center text-gray-500">
                                    No students found in this class/section.
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="card">
                            <div className="empty-state">
                                <div className="empty-state-icon">📋</div>
                                <h3 className="empty-state-title">Select Class and Section</h3>
                                <p className="empty-state-description">
                                    Please select a class and section to mark attendance
                                </p>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Attendance Reports</h3>
                    </div>
                    <div className="empty-state">
                        <div className="empty-state-icon">📊</div>
                        <h3 className="empty-state-title">Reports Coming Soon</h3>
                        <p className="empty-state-description">
                            Detailed attendance reports and analytics will be available here.
                        </p>
                    </div>
                </div>
            )}

            <style>{`
        .attendance-page {
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

        .filters-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--spacing-lg);
          padding: var(--spacing-lg);
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

export default AttendancePage;
