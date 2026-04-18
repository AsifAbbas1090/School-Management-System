import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CheckCircle, Download, AlertCircle, BarChart2 } from 'lucide-react';
import { useAuthStore } from '../../store';
import { USER_ROLES, MONTHS } from '../../constants';
import { classesService, sectionsService, studentsService, studentAttendanceService } from '../../services/api';
import { formatDate, exportToCSV } from '../../utils';
import { printTable } from '../../utils/printUtils';
import Breadcrumb from '../../components/common/Breadcrumb';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = [
    { value: 'PRESENT', label: 'Present', color: 'text-green-600' },
    { value: 'ABSENT', label: 'Absent', color: 'text-red-600' },
    { value: 'LATE', label: 'Late', color: 'text-yellow-600' },
    { value: 'LEAVE', label: 'Leave', color: 'text-blue-600' },
];

const AttendancePage = () => {
    const { user } = useAuthStore();
    const canManageAttendance = [USER_ROLES.ADMIN, USER_ROLES.MANAGEMENT, USER_ROLES.TEACHER, USER_ROLES.SUPPORT_STAFF, USER_ROLES.SUPER_ADMIN].includes(user?.role);

    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [viewMode, setViewMode] = useState('take'); // 'take' | 'summary' | 'report'
    const [submitting, setSubmitting] = useState(false);

    // Data
    const [classes, setClasses] = useState([]);
    const [sections, setSections] = useState([]);
    const [students, setStudents] = useState([]);
    const [loadingStudents, setLoadingStudents] = useState(false);

    // attendance map: studentId -> { status, remarks }
    const [attendance, setAttendance] = useState({});

    // After submit
    const [submissionSummary, setSubmissionSummary] = useState(null);
    const [showConfirm, setShowConfirm] = useState(false);

    // Report state
    const [reportStudentId, setReportStudentId] = useState('');
    const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
    const [reportYear, setReportYear] = useState(new Date().getFullYear());
    const [reportData, setReportData] = useState(null);
    const [loadingReport, setLoadingReport] = useState(false);

    useEffect(() => {
        const load = async () => {
            const [cr, sr] = await Promise.all([classesService.getAll(), sectionsService.getAll()]);
            if (cr.success) setClasses(cr.data.data || cr.data || []);
            if (sr.success) setSections(sr.data.data || sr.data || []);
        };
        load();
    }, []);

    useEffect(() => {
        if (!selectedClass || !selectedSection) { setStudents([]); return; }
        const load = async () => {
            setLoadingStudents(true);
            try {
                const res = await studentsService.getAll({ classId: selectedClass, sectionId: selectedSection, pageSize: 500 });
                if (res.success) setStudents(res.data.data || res.data || []);
            } catch { toast.error('Failed to load students'); }
            finally { setLoadingStudents(false); }
        };
        load();
    }, [selectedClass, selectedSection]);

    // When date/class/section changes, try to load existing attendance from backend
    useEffect(() => {
        if (!selectedClass || !selectedSection || !selectedDate) return;
        const loadExisting = async () => {
            const res = await studentAttendanceService.getSummary(selectedClass, selectedSection, selectedDate);
            if (res.success && res.data?.records?.length > 0) {
                const map = {};
                res.data.records.forEach(r => {
                    map[r.studentId] = { status: r.status, remarks: r.remarks || '' };
                });
                setAttendance(map);
            }
        };
        loadExisting();
    }, [selectedClass, selectedSection, selectedDate]);

    const filteredSections = useMemo(() => sections.filter(s => s.classId === selectedClass), [sections, selectedClass]);
    const filteredStudents = useMemo(() => students.filter(s => s.classId === selectedClass && s.sectionId === selectedSection), [students, selectedClass, selectedSection]);

    const handleStatusChange = useCallback((studentId, status) => {
        setAttendance(prev => ({ ...prev, [studentId]: { ...prev[studentId], status } }));
    }, []);

    const handleRemarksChange = useCallback((studentId, remarks) => {
        setAttendance(prev => ({ ...prev, [studentId]: { ...prev[studentId], remarks } }));
    }, []);

    const handleMarkAll = useCallback((status) => {
        const map = {};
        filteredStudents.forEach(s => { map[s.id] = { status, remarks: '' }; });
        setAttendance(map);
        toast.success(`Marked all as ${status}`);
    }, [filteredStudents]);

    const handleSubmit = async () => {
        if (!selectedClass || !selectedSection) { toast.error('Select class and section'); return; }
        if (filteredStudents.length === 0) { toast.error('No students in this class/section'); return; }

        setSubmitting(true);
        try {
            const entries = filteredStudents.map(s => ({
                studentId: s.id,
                status: attendance[s.id]?.status || 'ABSENT',
                remarks: attendance[s.id]?.remarks || undefined,
            }));

            const res = await studentAttendanceService.bulkSubmit({
                classId: selectedClass,
                sectionId: selectedSection,
                date: selectedDate,
                entries,
            });

            if (res.success) {
                const counts = entries.reduce((acc, e) => {
                    acc[e.status] = (acc[e.status] || 0) + 1;
                    return acc;
                }, {});
                setSubmissionSummary({
                    date: selectedDate,
                    classId: selectedClass,
                    sectionId: selectedSection,
                    total: entries.length,
                    present: counts.PRESENT || 0,
                    absent: counts.ABSENT || 0,
                    late: counts.LATE || 0,
                    leave: counts.LEAVE || 0,
                });
                setViewMode('summary');
                toast.success('Attendance saved successfully');
            } else {
                toast.error(res.error || 'Failed to save attendance');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleExportCSV = () => {
        const data = filteredStudents.map(s => ({
            'Roll Number': s.rollNumber,
            'Name': s.name,
            'Status': attendance[s.id]?.status || 'ABSENT',
            'Remarks': attendance[s.id]?.remarks || '',
            'Date': selectedDate,
        }));
        exportToCSV(data, `attendance_${selectedDate}.csv`);
        toast.success('Exported successfully');
    };

    const handleExportPDF = () => {
        printTable({
            title: `Attendance Report - ${selectedDate}`,
            columns: [
                { header: 'Roll No', accessor: 'roll' },
                { header: 'Student Name', accessor: 'name' },
                { header: 'Status', accessor: 'status' },
            ],
            data: filteredStudents.map(s => ({
                roll: s.rollNumber,
                name: s.name,
                status: attendance[s.id]?.status || 'ABSENT',
            })),
        });
    };

    const handleLoadReport = async () => {
        if (!reportStudentId) { toast.error('Select a student'); return; }
        setLoadingReport(true);
        try {
            const res = await studentAttendanceService.getStudentReport(reportStudentId, reportMonth, reportYear);
            if (res.success) setReportData(res.data);
            else toast.error(res.error || 'Failed to load report');
        } finally { setLoadingReport(false); }
    };

    if (!canManageAttendance) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center" style={{ minHeight: '60vh' }}>
                <AlertCircle size={64} className="text-error-500 mb-4" />
                <h1 className="page-title">Access Denied</h1>
                <p className="text-gray-600 max-w-md">You do not have permission to access attendance management.</p>
            </div>
        );
    }

    return (
        <div className="container">
            <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Attendance' }]} />

            <div className="page-header">
                <div>
                    <h1 className="page-title">Attendance Management</h1>
                    <p className="text-gray-600">Track and manage student attendance</p>
                </div>
                <div className="flex gap-md">
                    <button className="btn btn-outline" onClick={handleExportPDF} disabled={!selectedClass || !selectedSection || filteredStudents.length === 0}>
                        <Download size={18} /> <span>PDF</span>
                    </button>
                    <button className="btn btn-outline" onClick={handleExportCSV} disabled={!selectedClass || !selectedSection || filteredStudents.length === 0}>
                        <Download size={18} /> <span>CSV</span>
                    </button>
                    <div style={{ width: 1, background: 'var(--border-color)', margin: '0 4px' }} />
                    <button className={`btn ${viewMode !== 'report' ? 'btn-primary' : 'btn-outline'}`} onClick={() => { setViewMode('take'); setSubmissionSummary(null); }}>
                        Take Attendance
                    </button>
                    <button className={`btn ${viewMode === 'report' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setViewMode('report')}>
                        <BarChart2 size={18} /> <span>Reports</span>
                    </button>
                </div>
            </div>

            {/* ── SUMMARY VIEW ── */}
            {viewMode === 'summary' && submissionSummary && (
                <div className="card" style={{ maxWidth: 600, margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                        <div style={{ width: 64, height: 64, background: 'var(--success-100)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                            <CheckCircle size={32} style={{ color: 'var(--success-600)' }} />
                        </div>
                        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>Attendance Saved!</h2>
                        <p className="text-gray-500 mt-sm">
                            {classes.find(c => c.id === submissionSummary.classId)?.name || 'Class'} — Section {sections.find(s => s.id === submissionSummary.sectionId)?.name || ''}
                        </p>
                        <p className="text-gray-500">{formatDate(new Date(submissionSummary.date))}</p>
                    </div>

                    <div className="grid grid-cols-4 gap-md" style={{ background: 'var(--bg-body)', padding: '1rem', borderRadius: 'var(--radius-lg)', margin: '0 1.5rem' }}>
                        {[
                            { label: 'Present', value: submissionSummary.present, color: '#16a34a' },
                            { label: 'Absent', value: submissionSummary.absent, color: '#dc2626' },
                            { label: 'Late', value: submissionSummary.late, color: '#d97706' },
                            { label: 'Leave', value: submissionSummary.leave, color: '#2563eb' },
                        ].map(item => (
                            <div key={item.label} style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: item.color }}>{item.value}</div>
                                <div className="text-sm text-gray-500">{item.label}</div>
                            </div>
                        ))}
                    </div>

                    <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                        <button className="btn btn-primary" onClick={() => { setAttendance({}); setViewMode('take'); setSubmissionSummary(null); }}>
                            Take Another
                        </button>
                    </div>
                </div>
            )}

            {/* ── TAKE ATTENDANCE ── */}
            {viewMode === 'take' && (
                <>
                    <div className="card mb-md">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-md" style={{ padding: '1rem' }}>
                            <div className="form-group mb-0">
                                <label className="form-label">Date</label>
                                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="input" />
                            </div>
                            <div className="form-group mb-0">
                                <label className="form-label">Class</label>
                                <select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedSection(''); setAttendance({}); }} className="select">
                                    <option value="">Select Class</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group mb-0">
                                <label className="form-label">Section</label>
                                <select value={selectedSection} onChange={e => { setSelectedSection(e.target.value); setAttendance({}); }} className="select" disabled={!selectedClass}>
                                    <option value="">Select Section</option>
                                    {filteredSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {selectedClass && selectedSection ? (
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">
                                    Mark Attendance — {formatDate(new Date(selectedDate))}
                                    {loadingStudents && <span className="text-sm text-gray-400 ml-sm">Loading...</span>}
                                </h3>
                                <div className="flex gap-sm">
                                    <button className="btn btn-sm btn-outline" onClick={() => handleMarkAll('PRESENT')}>All Present</button>
                                    <button className="btn btn-sm btn-outline" onClick={() => handleMarkAll('ABSENT')}>All Absent</button>
                                    <button className="btn btn-sm btn-primary" onClick={() => setShowConfirm(true)} disabled={submitting || loadingStudents || filteredStudents.length === 0}>
                                        {submitting ? 'Saving...' : 'Submit'}
                                    </button>
                                </div>
                            </div>
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Roll No</th>
                                            <th>Student</th>
                                            <th>Status</th>
                                            <th>Remarks</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredStudents.length === 0 ? (
                                            <tr><td colSpan={4} className="text-center text-gray-500 py-lg">No students found</td></tr>
                                        ) : filteredStudents.map(s => {
                                            const current = attendance[s.id]?.status || '';
                                            return (
                                                <tr key={s.id}>
                                                    <td className="font-mono text-sm">{s.rollNumber}</td>
                                                    <td>
                                                        <div className="flex items-center gap-sm">
                                                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary-100)', color: 'var(--primary-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
                                                                {s.name.charAt(0)}
                                                            </div>
                                                            <span className="font-medium">{s.name}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="flex gap-sm flex-wrap">
                                                            {STATUS_OPTIONS.map(opt => (
                                                                <button
                                                                    key={opt.value}
                                                                    onClick={() => handleStatusChange(s.id, opt.value)}
                                                                    className={`btn btn-sm ${current === opt.value ? 'btn-primary' : 'btn-outline'}`}
                                                                    style={{ minWidth: 70 }}
                                                                >
                                                                    {opt.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            className="input"
                                                            style={{ minWidth: 140 }}
                                                            placeholder="Optional remark"
                                                            value={attendance[s.id]?.remarks || ''}
                                                            onChange={e => handleRemarksChange(s.id, e.target.value)}
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="card">
                            <div className="empty-state">
                                <div className="empty-state-icon">📋</div>
                                <h3 className="empty-state-title">Select Class and Section</h3>
                                <p className="empty-state-description">Choose a class and section above to mark attendance</p>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ── REPORT VIEW ── */}
            {viewMode === 'report' && (
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Student Attendance Report</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-md mb-md" style={{ padding: '1rem 1rem 0' }}>
                        <div className="form-group mb-0">
                            <label className="form-label">Student</label>
                            <select className="select" value={reportStudentId} onChange={e => { setReportStudentId(e.target.value); setReportData(null); }}>
                                <option value="">Select Student</option>
                                {students.length > 0
                                    ? students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.rollNumber})</option>)
                                    : <option disabled>Select class first</option>
                                }
                            </select>
                        </div>
                        <div className="form-group mb-0">
                            <label className="form-label">Class (to load students)</label>
                            <select className="select" value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedSection(''); setReportStudentId(''); setReportData(null); }}>
                                <option value="">All Classes</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group mb-0">
                            <label className="form-label">Month</label>
                            <select className="select" value={reportMonth} onChange={e => setReportMonth(Number(e.target.value))}>
                                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                            </select>
                        </div>
                        <div className="form-group mb-0">
                            <label className="form-label">Year</label>
                            <select className="select" value={reportYear} onChange={e => setReportYear(Number(e.target.value))}>
                                {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                    </div>
                    <div style={{ padding: '0 1rem 1rem' }}>
                        <button className="btn btn-primary" onClick={handleLoadReport} disabled={loadingReport}>
                            {loadingReport ? 'Loading...' : 'Load Report'}
                        </button>
                    </div>

                    {reportData && (
                        <div style={{ padding: '0 1rem 1.5rem' }}>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-md mb-md">
                                {[
                                    { label: 'Total Days', value: reportData.total, color: '#374151' },
                                    { label: 'Present', value: reportData.present, color: '#16a34a' },
                                    { label: 'Absent', value: reportData.absent, color: '#dc2626' },
                                    { label: 'Late', value: reportData.late, color: '#d97706' },
                                    { label: 'Attendance %', value: `${reportData.attendancePercentage}%`, color: reportData.attendancePercentage >= 75 ? '#16a34a' : '#dc2626' },
                                ].map(item => (
                                    <div key={item.label} className="card" style={{ textAlign: 'center', padding: '1rem' }}>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: item.color }}>{item.value}</div>
                                        <div className="text-sm text-gray-500">{item.label}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr><th>Date</th><th>Status</th><th>Remarks</th></tr>
                                    </thead>
                                    <tbody>
                                        {reportData.records.map(r => (
                                            <tr key={r.id}>
                                                <td>{formatDate(new Date(r.date))}</td>
                                                <td>
                                                    <span className={`badge ${r.status === 'PRESENT' ? 'badge-success' : r.status === 'ABSENT' ? 'badge-error' : 'badge-warning'}`}>
                                                        {r.status}
                                                    </span>
                                                </td>
                                                <td>{r.remarks || '—'}</td>
                                            </tr>
                                        ))}
                                        {reportData.records.length === 0 && (
                                            <tr><td colSpan={3} className="text-center text-gray-500 py-md">No records for this period</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
            {/* Confirm Submit Dialog */}
            {showConfirm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="card" style={{ maxWidth: 420, width: '100%', padding: '1.5rem', margin: '1rem' }}>
                        <h3 className="text-lg font-bold mb-sm">Confirm Submission</h3>
                        <p className="text-gray-600 mb-md">
                            Submit attendance for <strong>{filteredStudents.length} students</strong> on <strong>{selectedDate}</strong>?
                        </p>
                        <p className="text-sm text-warning-600 mb-lg">
                            Students without a status selected will be marked as <strong>ABSENT</strong>.
                        </p>
                        <div className="flex gap-sm justify-end">
                            <button className="btn btn-outline" onClick={() => setShowConfirm(false)}>Cancel</button>
                            <button className="btn btn-primary" disabled={submitting} onClick={async () => { setShowConfirm(false); await handleSubmit(); }}>
                                {submitting ? 'Saving...' : 'Confirm & Submit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendancePage;
