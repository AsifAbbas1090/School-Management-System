import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Plus, Trash2, Save } from 'lucide-react';
import { useAuthStore } from '../../store';
import { DAYS_OF_WEEK, PERIODS } from '../../constants';
import { USER_ROLES } from '../../constants';
import Breadcrumb from '../../components/common/Breadcrumb';
import Modal from '../../components/common/Modal';
import { AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { classesService, sectionsService, subjectsService, usersService, timetableService } from '../../services/api';
import { printTable } from '../../utils/printUtils';

const TimetablePage = () => {
    const { user } = useAuthStore();
    const canManageTimetable = [USER_ROLES.ADMIN, USER_ROLES.MANAGEMENT, USER_ROLES.SUPER_ADMIN].includes(user?.role);
    const canViewTimetable = [USER_ROLES.ADMIN, USER_ROLES.MANAGEMENT, USER_ROLES.TEACHER, USER_ROLES.STUDENT, USER_ROLES.SUPER_ADMIN].includes(user?.role);

    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null); // { day, period }
    const [saving, setSaving] = useState(false);
    const [loadingTimetable, setLoadingTimetable] = useState(false);

    // Lookup data
    const [classes, setClasses] = useState([]);
    const [sections, setSections] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [teachers, setTeachers] = useState([]);

    // Live timetable data: { day -> { periodId -> { subjectId, subjectName, teacherId, teacherName, room } } }
    const [timetableData, setTimetableData] = useState({});

    // Modal form state
    const [slotSubjectId, setSlotSubjectId] = useState('');
    const [slotTeacherId, setSlotTeacherId] = useState('');
    const [slotRoom, setSlotRoom] = useState('');

    useEffect(() => {
        const load = async () => {
            const [cr, sr, subr, tr] = await Promise.all([
                classesService.getAll(),
                sectionsService.getAll(),
                subjectsService.getAll(),
                usersService.getTeachers(),
            ]);
            if (cr.success) setClasses(cr.data.data || cr.data || []);
            if (sr.success) setSections(sr.data.data || sr.data || []);
            if (subr.success) setSubjects(subr.data.data || subr.data || []);
            if (tr.success) setTeachers(tr.data.data || tr.data || []);
        };
        load();
    }, []);

    // Load timetable from backend when class/section changes
    const loadTimetable = useCallback(async () => {
        if (!selectedClass || !selectedSection) { setTimetableData({}); return; }
        setLoadingTimetable(true);
        try {
            const res = await timetableService.get(selectedClass, selectedSection);
            if (res.success) {
                setTimetableData(res.data.timetable || {});
            }
        } catch { /* silent */ }
        finally { setLoadingTimetable(false); }
    }, [selectedClass, selectedSection]);

    useEffect(() => { loadTimetable(); }, [loadTimetable]);

    const filteredSections = sections.filter(s => s.classId === selectedClass);

    const handleSlotClick = (day, period) => {
        if (!canManageTimetable || period.id.startsWith('break')) return;
        const existing = timetableData[day]?.[period.id] || {};
        setSelectedSlot({ day, period });
        setSlotSubjectId(existing.subjectId || '');
        setSlotTeacherId(existing.teacherId || '');
        setSlotRoom(existing.room || '');
        setShowModal(true);
    };

    const handleSaveSlot = async () => {
        if (!selectedSlot || !selectedClass || !selectedSection) return;
        setSaving(true);
        try {
            const res = await timetableService.save({
                classId: selectedClass,
                sectionId: selectedSection,
                slots: [{
                    day: selectedSlot.day,
                    periodId: selectedSlot.period.id,
                    subjectId: slotSubjectId || undefined,
                    teacherId: slotTeacherId || undefined,
                    room: slotRoom || undefined,
                }],
            });
            if (res.success) {
                setTimetableData(res.data.timetable || {});
                toast.success('Slot saved');
                setShowModal(false);
            } else {
                toast.error(res.error || 'Failed to save');
            }
        } finally { setSaving(false); }
    };

    const handleClearSlot = async () => {
        if (!selectedSlot) return;
        setSaving(true);
        try {
            const res = await timetableService.clearSlot(selectedClass, selectedSection, selectedSlot.day, selectedSlot.period.id);
            if (res.success) {
                // Remove from local state
                setTimetableData(prev => {
                    const copy = { ...prev };
                    if (copy[selectedSlot.day]) {
                        const dayCopy = { ...copy[selectedSlot.day] };
                        delete dayCopy[selectedSlot.period.id];
                        copy[selectedSlot.day] = dayCopy;
                    }
                    return copy;
                });
                toast.success('Slot cleared');
                setShowModal(false);
            }
        } finally { setSaving(false); }
    };

    const handlePrint = () => {
        // Flatten timetable into printable rows
        const rows = [];
        PERIODS.filter(p => !p.id.startsWith('break')).forEach(period => {
            const row = { period: `${period.name} (${period.startTime}-${period.endTime})` };
            DAYS_OF_WEEK.forEach(day => {
                const slot = timetableData[day]?.[period.id];
                row[day] = slot ? `${slot.subjectName || '—'}\n${slot.teacherName || ''}` : '—';
            });
            rows.push(row);
        });
        printTable({
            title: `Timetable — ${classes.find(c => c.id === selectedClass)?.name} / ${sections.find(s => s.id === selectedSection)?.name}`,
            columns: [
                { header: 'Period', accessor: 'period' },
                ...DAYS_OF_WEEK.map(d => ({ header: d, accessor: d })),
            ],
            data: rows,
        });
    };

    if (!canViewTimetable) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center" style={{ minHeight: '60vh' }}>
                <AlertCircle size={64} className="text-error-500 mb-4" />
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Access Denied</h1>
                <p className="text-gray-600 max-w-md">You do not have permission to access the timetable.</p>
            </div>
        );
    }

    return (
        <div className="container">
            <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Timetable' }]} />

            <div className="page-header">
                <div>
                    <h1 className="page-title">Timetable Management</h1>
                    <p className="text-gray-600">Create and manage class schedules</p>
                </div>
                <button className="btn btn-outline" onClick={handlePrint} disabled={!selectedClass || !selectedSection}>
                    <Calendar size={18} /> <span>Print</span>
                </button>
            </div>

            {/* Class Selection */}
            <div className="card mb-md">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-md" style={{ padding: '1rem' }}>
                    <div className="form-group mb-0">
                        <label className="form-label">Class</label>
                        <select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedSection(''); }} className="select">
                            <option value="">Select Class</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group mb-0">
                        <label className="form-label">Section</label>
                        <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)} className="select" disabled={!selectedClass}>
                            <option value="">Select Section</option>
                            {filteredSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Timetable Grid */}
            {selectedClass && selectedSection ? (
                <div className="card" style={{ overflowX: 'auto' }}>
                    {loadingTimetable && <div className="text-center py-md text-gray-500 text-sm">Loading timetable...</div>}
                    {canManageTimetable && (
                        <p className="text-xs text-gray-400" style={{ padding: '0.5rem 1rem 0' }}>Click any cell to edit. Changes are saved immediately.</p>
                    )}
                    <div className="timetable-grid">
                        {/* Header row */}
                        <div className="timetable-header">
                            <div className="header-cell">Time</div>
                            {DAYS_OF_WEEK.map(day => <div key={day} className="header-cell">{day}</div>)}
                        </div>

                        {PERIODS.map(period => (
                            <div key={period.id} className="timetable-row">
                                <div className="time-cell">
                                    <div className="period-name">{period.name}</div>
                                    <div className="period-time">{period.startTime} – {period.endTime}</div>
                                </div>
                                {DAYS_OF_WEEK.map(day => {
                                    const slot = timetableData[day]?.[period.id];
                                    const isBreak = period.id.startsWith('break');
                                    return (
                                        <div
                                            key={day}
                                            className={`timetable-cell ${isBreak ? 'break-cell' : 'class-cell'}`}
                                            onClick={() => handleSlotClick(day, period)}
                                        >
                                            {isBreak ? (
                                                <div className="break-label">{period.name}</div>
                                            ) : slot ? (
                                                <div className="class-info">
                                                    <div className="subject-name">{slot.subjectName || '—'}</div>
                                                    {slot.teacherName && <div className="teacher-name">{slot.teacherName}</div>}
                                                    {slot.room && <div className="room-number">{slot.room}</div>}
                                                </div>
                                            ) : (
                                                canManageTimetable && (
                                                    <div className="empty-slot">
                                                        <Plus size={14} />
                                                        <span>Add</span>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-state-icon">📅</div>
                        <h3 className="empty-state-title">Select Class and Section</h3>
                        <p className="empty-state-description">Choose a class and section to view or edit the timetable</p>
                    </div>
                </div>
            )}

            {/* Edit Slot Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={`${selectedSlot?.day} — ${selectedSlot?.period?.name}`}
                footer={
                    <>
                        <button className="btn btn-outline" style={{ color: 'var(--error-600)', borderColor: 'var(--error-300)' }} onClick={handleClearSlot} disabled={saving}>
                            <Trash2 size={14} /> Clear
                        </button>
                        <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSaveSlot} disabled={saving}>
                            <Save size={14} /> {saving ? 'Saving...' : 'Save'}
                        </button>
                    </>
                }
            >
                <div className="form-group">
                    <label className="form-label">Subject</label>
                    <select className="select" value={slotSubjectId} onChange={e => setSlotSubjectId(e.target.value)}>
                        <option value="">No subject</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Teacher</label>
                    <select className="select" value={slotTeacherId} onChange={e => setSlotTeacherId(e.target.value)}>
                        <option value="">No teacher</option>
                        {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Room</label>
                    <input type="text" className="input" value={slotRoom} onChange={e => setSlotRoom(e.target.value)} placeholder="e.g. Room 101, Lab 2" />
                </div>
            </Modal>

            <style>{`
                .timetable-grid { overflow-x: auto; }
                .timetable-header {
                    display: grid;
                    grid-template-columns: 140px repeat(6, 1fr);
                    gap: 1px;
                    background: var(--border-color);
                    border: 1px solid var(--border-color);
                }
                .header-cell {
                    background: var(--primary-50);
                    padding: 0.75rem;
                    font-weight: 600;
                    color: var(--primary-900);
                    text-align: center;
                    font-size: 0.875rem;
                }
                .timetable-row {
                    display: grid;
                    grid-template-columns: 140px repeat(6, 1fr);
                    gap: 1px;
                    background: var(--border-color);
                    border: 1px solid var(--border-color);
                    border-top: none;
                }
                .time-cell {
                    background: var(--bg-body);
                    padding: 0.75rem;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }
                .period-name { font-weight: 600; font-size: 0.8rem; color: var(--text-primary); }
                .period-time { font-size: 0.7rem; color: var(--text-secondary); margin-top: 2px; }
                .timetable-cell {
                    background: var(--bg-card);
                    padding: 0.5rem;
                    min-height: 72px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .class-cell { cursor: pointer; transition: background 0.15s; }
                .class-cell:hover { background: var(--primary-50); }
                .break-cell { background: var(--warning-50); }
                .break-label { font-weight: 600; color: var(--warning-700); font-size: 0.75rem; text-align: center; }
                .class-info { text-align: center; width: 100%; }
                .subject-name { font-weight: 600; font-size: 0.8rem; color: var(--text-primary); }
                .teacher-name { font-size: 0.7rem; color: var(--text-secondary); margin-top: 2px; }
                .room-number { font-size: 0.7rem; color: var(--primary-600); font-weight: 500; }
                .empty-slot { display: flex; flex-direction: column; align-items: center; gap: 2px; color: var(--text-tertiary, #9ca3af); font-size: 0.7rem; }
            `}</style>
        </div>
    );
};

export default TimetablePage;
