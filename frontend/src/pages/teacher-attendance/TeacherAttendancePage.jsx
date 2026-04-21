import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Search, Edit, Trash2, Download, Clock, UserCheck, AlertCircle } from 'lucide-react';
import { useAuthStore, useSchoolStore } from '../../store';
import { teacherAttendanceService, usersService } from '../../services/api';
import { USER_ROLES } from '../../constants';
import { formatDate } from '../../utils';
import Breadcrumb from '../../components/common/Breadcrumb';
import Modal from '../../components/common/Modal';
import Autocomplete from '../../components/common/Autocomplete';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

const TeacherAttendancePage = () => {
    const { user } = useAuthStore();
    const { currentSchool } = useSchoolStore();
    
    // Only Management can access this page
    const canManage = [USER_ROLES.ADMIN, USER_ROLES.MANAGEMENT].includes(user?.role);
    
    if (!canManage) {
        return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3rem", textAlign: "center", minHeight: "60vh" }}>
                <AlertCircle size={64} className="text-error-500 mb-4" />
                <h1 className="page-title">Access Denied</h1>
                <p className="text-gray-600 max-w-md">You do not have permission to access teacher attendance management.</p>
            </div>
        );
    }

    const [attendance, setAttendance] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

    const [formData, setFormData] = useState({
        teacherName: '',
        teacherId: '',
        date: new Date().toISOString().split('T')[0],
        status: 'PRESENT',
        entryTime: '',
        exitTime: '',
        notes: '',
    });

    const [errors, setErrors] = useState({});

    // Load data
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [attendanceRes, teachersRes] = await Promise.all([
                teacherAttendanceService.getAll({ 
                    startDate: filterDate,
                    endDate: filterDate,
                }),
                usersService.getTeachers(),
            ]);

            if (attendanceRes.success && attendanceRes.data) {
                const data = attendanceRes.data.data || attendanceRes.data;
                setAttendance(Array.isArray(data) ? data : []);
            }

            if (teachersRes.success && teachersRes.data) {
                const teachersData = Array.isArray(teachersRes.data) ? teachersRes.data : [];
                setTeachers(teachersData);
            }
        } catch (error) {
            console.error('Failed to load data:', error);
            toast.error('Failed to load attendance data');
        } finally {
            setLoading(false);
        }
    }, [filterDate]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Filter teachers by name for autocomplete
    const filteredTeachers = useMemo(() => {
        if (!formData.teacherName || formData.teacherName.trim() === '') {
            return teachers.slice(0, 10);
        }
        const term = formData.teacherName.toLowerCase();
        return teachers
            .filter(t => t.name.toLowerCase().includes(term))
            .slice(0, 10);
    }, [formData.teacherName, teachers]);

    // Handle teacher selection from autocomplete
    const handleTeacherSelect = useCallback((teacherName) => {
        const teacher = teachers.find(t => t.name === teacherName);
        if (teacher) {
            setFormData(prev => ({
                ...prev,
                teacherName: teacher.name,
                teacherId: teacher.id,
            }));
        }
    }, [teachers]);

    /** Roster view: one row per teacher on the selected date. Teachers without a record
     *  show as "Not Marked" with a quick-record button — this is what the old view was
     *  missing (it only listed teachers who already had a record for that date). */
    const roster = useMemo(() => {
        const byTeacher = new Map();
        for (const rec of attendance) {
            if (rec.teacherId) byTeacher.set(rec.teacherId, rec);
        }
        const rows = teachers.map((t) => {
            const rec = byTeacher.get(t.id);
            return {
                teacherId: t.id,
                teacher: t,
                record: rec || null,
                status: rec?.status || 'NOT_MARKED',
            };
        });
        return rows.filter((row) => {
            const matchesSearch = !searchTerm ||
                row.teacher.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                row.teacher.email?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = !filterStatus || row.status === filterStatus;
            return matchesSearch && matchesStatus;
        });
    }, [teachers, attendance, searchTerm, filterStatus]);

    /** Back-compat alias so the rest of the component keeps working without refactor. */
    const filteredAttendance = roster;

    /** Quick-mark: record PRESENT / ABSENT / PERMITTED_LEAVE for an unmarked teacher
     *  directly from the roster row, without opening the modal. */
    const handleQuickMark = useCallback(async (teacherId, status) => {
        try {
            const res = await teacherAttendanceService.create({
                teacherId,
                date: filterDate,
                status,
            });
            if (res.success) {
                toast.success('Attendance recorded');
                loadData();
            } else {
                toast.error(res.error || 'Failed to record attendance');
            }
        } catch (err) {
            console.error('Quick-mark failed:', err);
            toast.error('Failed to record attendance');
        }
    }, [filterDate, loadData]);

    const handleOpenModal = (record = null) => {
        if (record) {
            setSelectedRecord(record);
            setFormData({
                teacherName: record.Teacher?.name || '',
                teacherId: record.teacherId,
                date: formatDate(record.date, 'yyyy-MM-dd'),
                status: record.status,
                entryTime: record.entryTime ? new Date(record.entryTime).toISOString().slice(0, 16) : '',
                exitTime: record.exitTime ? new Date(record.exitTime).toISOString().slice(0, 16) : '',
                notes: record.notes || '',
            });
        } else {
            setSelectedRecord(null);
            setFormData({
                teacherName: '',
                teacherId: '',
                date: new Date().toISOString().split('T')[0],
                status: 'PRESENT',
                entryTime: '',
                exitTime: '',
                notes: '',
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedRecord(null);
        setFormData({
            teacherName: '',
            teacherId: '',
            date: new Date().toISOString().split('T')[0],
            status: 'PRESENT',
            entryTime: '',
            exitTime: '',
            notes: '',
        });
        setErrors({});
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.teacherId) newErrors.teacherId = 'Teacher is required';
        if (!formData.date) newErrors.date = 'Date is required';
        if (!formData.status) newErrors.status = 'Status is required';
        
        if (formData.entryTime && formData.exitTime) {
            const entry = new Date(formData.entryTime);
            const exit = new Date(formData.exitTime);
            if (exit <= entry) {
                newErrors.exitTime = 'Exit time must be after entry time';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        try {
            const attendanceData = {
                teacherId: formData.teacherId,
                date: formData.date,
                status: formData.status,
                entryTime: formData.entryTime || undefined,
                exitTime: formData.exitTime || undefined,
                notes: formData.notes || undefined,
            };

            let response;
            if (selectedRecord) {
                response = await teacherAttendanceService.update(selectedRecord.id, attendanceData);
            } else {
                response = await teacherAttendanceService.create(attendanceData);
            }

            if (response.success && response.data) {
                toast.success(selectedRecord ? 'Attendance updated successfully' : 'Attendance recorded successfully');
                handleCloseModal();
                loadData();
            } else {
                toast.error(response.error || 'Failed to save attendance');
            }
        } catch (error) {
            console.error('Failed to save attendance:', error);
            toast.error('Failed to save attendance');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this attendance record?')) return;

        try {
            const response = await teacherAttendanceService.delete(id);
            if (response.success) {
                toast.success('Attendance record deleted successfully');
                loadData();
            } else {
                toast.error(response.error || 'Failed to delete attendance');
            }
        } catch (error) {
            console.error('Failed to delete attendance:', error);
            toast.error('Failed to delete attendance');
        }
    };

    const breadcrumbItems = [
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Teacher Attendance', path: null },
    ];

    if (loading && attendance.length === 0) {
        return <Loading fullScreen />;
    }

    return (
        <div className="teacher-attendance-page">
            <Breadcrumb items={breadcrumbItems} />

            <div className="page-header">
                <div>
                    <h1>Teacher Attendance</h1>
                    <p className="text-gray-600">Track and manage teacher attendance</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => handleOpenModal()}
                >
                    <Plus size={18} />
                    Record Attendance
                </button>
            </div>

            {/* Filters */}
            <div className="filters-section card mb-lg">
                <div className="filters-grid">
                    <div className="search-box">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search teachers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input"
                        />
                    </div>

                    <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="input"
                    />

                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="select"
                    >
                        <option value="">All Teachers</option>
                        <option value="PRESENT">Present</option>
                        <option value="ABSENT">Absent</option>
                        <option value="PERMITTED_LEAVE">Permitted Leave</option>
                        <option value="NOT_MARKED">Not Marked</option>
                    </select>
                </div>
            </div>

            {/* Attendance Table */}
            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Teacher</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Entry Time</th>
                            <th>Exit Time</th>
                            <th>Recorded By</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAttendance.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="text-center text-gray-500 py-8">
                                    {teachers.length === 0
                                        ? 'No teachers found in this school yet.'
                                        : 'No teachers match the current filters.'}
                                </td>
                            </tr>
                        ) : (
                            filteredAttendance.map((row) => {
                                const record = row.record;
                                const status = row.status;
                                return (
                                    <tr key={row.teacherId}>
                                        <td>
                                            <div className="flex items-center gap-md">
                                                <div>
                                                    <div className="font-medium">{row.teacher?.name}</div>
                                                    <div className="text-sm text-gray-500">{row.teacher?.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{formatDate(filterDate)}</td>
                                        <td>
                                            {status === 'NOT_MARKED' ? (
                                                <span className="badge badge-outline" style={{ opacity: 0.8 }}>
                                                    Not Marked
                                                </span>
                                            ) : (
                                                <span className={`badge badge-${
                                                    status === 'PRESENT' ? 'success' :
                                                    status === 'ABSENT' ? 'error' : 'warning'
                                                }`}>
                                                    {status.replace('_', ' ')}
                                                </span>
                                            )}
                                        </td>
                                        <td>{record?.entryTime ? formatDate(record.entryTime, 'HH:mm') : '-'}</td>
                                        <td>{record?.exitTime ? formatDate(record.exitTime, 'HH:mm') : '-'}</td>
                                        <td>{record?.RecordedBy?.name || '-'}</td>
                                        <td>
                                            <div className="flex gap-sm">
                                                {record ? (
                                                    <>
                                                        <button
                                                            className="btn btn-sm btn-outline"
                                                            onClick={() => handleOpenModal(record)}
                                                            title="Edit attendance"
                                                        >
                                                            <Edit size={14} />
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-danger"
                                                            onClick={() => handleDelete(record.id)}
                                                            title="Delete attendance"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            className="btn btn-sm btn-success"
                                                            onClick={() => handleQuickMark(row.teacherId, 'PRESENT')}
                                                            title="Mark present"
                                                        >
                                                            Present
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-danger"
                                                            onClick={() => handleQuickMark(row.teacherId, 'ABSENT')}
                                                            title="Mark absent"
                                                        >
                                                            Absent
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-outline"
                                                            onClick={() => {
                                                                setFormData((prev) => ({
                                                                    ...prev,
                                                                    teacherName: row.teacher?.name || '',
                                                                    teacherId: row.teacherId,
                                                                    date: filterDate,
                                                                    status: 'PRESENT',
                                                                }));
                                                                setSelectedRecord(null);
                                                                setShowModal(true);
                                                            }}
                                                            title="Record with details"
                                                        >
                                                            …
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Record/Edit Attendance Modal */}
            <Modal
                isOpen={showModal}
                onClose={handleCloseModal}
                title={selectedRecord ? 'Edit Attendance' : 'Record Attendance'}
                size="lg"
            >
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Teacher Name *</label>
                        <Autocomplete
                            options={teachers.map(t => t.name)}
                            value={formData.teacherName}
                            onChange={(value) => {
                                setFormData(prev => ({ ...prev, teacherName: value }));
                                const teacher = teachers.find(t => t.name === value);
                                if (teacher) {
                                    setFormData(prev => ({ ...prev, teacherId: teacher.id }));
                                }
                            }}
                            placeholder="Type teacher name..."
                            className="w-full"
                        />
                        {errors.teacherId && <span className="form-error">{errors.teacherId}</span>}
                    </div>

                    <div className="grid grid-cols-2 gap-md">
                        <div className="form-group">
                            <label className="form-label">Date *</label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                                className={`input ${errors.date ? 'input-error' : ''}`}
                                required
                            />
                            {errors.date && <span className="form-error">{errors.date}</span>}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Status *</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                                className={`select ${errors.status ? 'input-error' : ''}`}
                                required
                            >
                                <option value="PRESENT">Present</option>
                                <option value="ABSENT">Absent</option>
                                <option value="PERMITTED_LEAVE">Permitted Leave</option>
                            </select>
                            {errors.status && <span className="form-error">{errors.status}</span>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-md">
                        <div className="form-group">
                            <label className="form-label">Entry Time (Optional)</label>
                            <input
                                type="datetime-local"
                                value={formData.entryTime}
                                onChange={(e) => setFormData(prev => ({ ...prev, entryTime: e.target.value }))}
                                className="input"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Exit Time (Optional)</label>
                            <input
                                type="datetime-local"
                                value={formData.exitTime}
                                onChange={(e) => setFormData(prev => ({ ...prev, exitTime: e.target.value }))}
                                className={`input ${errors.exitTime ? 'input-error' : ''}`}
                            />
                            {errors.exitTime && <span className="form-error">{errors.exitTime}</span>}
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Notes (Optional)</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            className="textarea"
                            rows="3"
                            placeholder="Additional notes..."
                        />
                    </div>

                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={handleCloseModal}
                        >
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                            {selectedRecord ? 'Update' : 'Record'} Attendance
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default TeacherAttendancePage;

