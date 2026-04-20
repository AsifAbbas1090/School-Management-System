import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Calendar,
    Plus,
    Trash2,
    Save,
    Settings as SettingsIcon,
    Copy,
    AlertTriangle,
    Upload,
    AlertCircle,
    X,
} from 'lucide-react';
import { useAuthStore } from '../../store';
import { DAYS_OF_WEEK, USER_ROLES } from '../../constants';
import {
    PAKISTAN_SUBJECT_CATALOG,
    PAKISTAN_SUBJECT_GRADE_GROUPS,
} from '../../constants/pakistanSubjects';
import Breadcrumb from '../../components/common/Breadcrumb';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';
import {
    classesService,
    sectionsService,
    subjectsService,
    usersService,
    timetableService,
} from '../../services/api';
import { printTable } from '../../utils/printUtils';

/**
 * The page is deliberately self-contained: settings, periods, slots,
 * drag-drop and copy-day all live here because the editing surface is
 * tightly coupled to the grid shape. Anything that another screen would
 * reuse lives in `services/api.js` or `constants/pakistanSubjects.js`.
 */
const TimetablePage = () => {
    const { user } = useAuthStore();
    const canManageTimetable = [
        USER_ROLES.ADMIN,
        USER_ROLES.MANAGEMENT,
        USER_ROLES.SUPER_ADMIN,
    ].includes(user?.role);
    const canViewTimetable = [
        USER_ROLES.ADMIN,
        USER_ROLES.MANAGEMENT,
        USER_ROLES.TEACHER,
        USER_ROLES.STUDENT,
        USER_ROLES.SUPER_ADMIN,
    ].includes(user?.role);

    // --- Selection ---
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSection, setSelectedSection] = useState('');

    // --- Lookups ---
    const [classes, setClasses] = useState([]);
    const [sections, setSections] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [teachers, setTeachers] = useState([]);

    // --- Schedule settings + derived periods ---
    const [settings, setSettings] = useState({
        startTime: '08:00',
        endTime: '14:00',
        lectureDuration: 40,
        breaks: [{ name: 'Break', startTime: '10:15', endTime: '10:30' }],
    });
    const [periods, setPeriods] = useState([]);
    const [showSettings, setShowSettings] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);

    // --- Slot data + editor state ---
    const [timetableData, setTimetableData] = useState({});
    const [loadingTimetable, setLoadingTimetable] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null); // { day, period }
    const [slotSubjectId, setSlotSubjectId] = useState('');
    const [slotTeacherId, setSlotTeacherId] = useState('');
    const [slotRoom, setSlotRoom] = useState('');
    const [showSlotModal, setShowSlotModal] = useState(false);
    const [savingSlot, setSavingSlot] = useState(false);

    // --- Subject catalog import ---
    const [showSubjectCatalog, setShowSubjectCatalog] = useState(false);
    const [importingSubjects, setImportingSubjects] = useState(false);

    // --- Conflicts ---
    const [conflicts, setConflicts] = useState([]);

    // --- Drag state ---
    const [draggingSlot, setDraggingSlot] = useState(null); // { day, periodId, slot }

    // -----------------------------------------------------------------
    // Initial load: lookups + settings
    // -----------------------------------------------------------------
    const loadLookups = useCallback(async () => {
        const [cr, sr, subr, tr] = await Promise.all([
            classesService.getAll(),
            sectionsService.getAll(),
            subjectsService.getAll({ pageSize: 500 }),
            usersService.getTeachers(),
        ]);
        if (cr.success) setClasses(cr.data.data || cr.data || []);
        if (sr.success) setSections(sr.data.data || sr.data || []);
        if (subr.success) setSubjects(subr.data.data || subr.data || []);
        if (tr.success) setTeachers(tr.data.data || tr.data || []);
    }, []);

    const loadSettings = useCallback(async () => {
        const res = await timetableService.getSettings();
        if (res.success && res.data) {
            if (res.data.settings) setSettings(res.data.settings);
            if (Array.isArray(res.data.periods)) setPeriods(res.data.periods);
        }
    }, []);

    useEffect(() => {
        loadLookups();
        loadSettings();
    }, [loadLookups, loadSettings]);

    // -----------------------------------------------------------------
    // Load timetable + conflicts when class/section changes
    // -----------------------------------------------------------------
    const loadTimetable = useCallback(async () => {
        if (!selectedClass || !selectedSection) {
            setTimetableData({});
            setConflicts([]);
            return;
        }
        setLoadingTimetable(true);
        try {
            const [tt, cf] = await Promise.all([
                timetableService.get(selectedClass, selectedSection),
                canManageTimetable
                    ? timetableService.getConflicts(selectedClass, selectedSection)
                    : Promise.resolve({ success: true, data: [] }),
            ]);
            if (tt.success) setTimetableData(tt.data.timetable || {});
            if (cf.success) setConflicts(Array.isArray(cf.data) ? cf.data : []);
        } finally {
            setLoadingTimetable(false);
        }
    }, [selectedClass, selectedSection, canManageTimetable]);

    useEffect(() => {
        loadTimetable();
    }, [loadTimetable]);

    const filteredSections = useMemo(
        () => sections.filter((s) => s.classId === selectedClass),
        [sections, selectedClass],
    );

    // -----------------------------------------------------------------
    // Settings save
    // -----------------------------------------------------------------
    const handleSaveSettings = async () => {
        /** Basic sanity check before round-trip so we don't trigger a server 400. */
        if (settings.startTime >= settings.endTime) {
            toast.error('School end time must be after start time');
            return;
        }
        setSavingSettings(true);
        try {
            const res = await timetableService.saveSettings(settings);
            if (res.success && res.data) {
                if (res.data.settings) setSettings(res.data.settings);
                if (Array.isArray(res.data.periods)) setPeriods(res.data.periods);
                toast.success('Schedule updated');
                setShowSettings(false);
            } else {
                toast.error(res.error || 'Failed to save settings');
            }
        } finally {
            setSavingSettings(false);
        }
    };

    const handleAddBreak = () => {
        setSettings((s) => ({
            ...s,
            breaks: [
                ...(s.breaks || []),
                { name: 'Break', startTime: '12:00', endTime: '12:30' },
            ],
        }));
    };

    const handleUpdateBreak = (idx, patch) => {
        setSettings((s) => ({
            ...s,
            breaks: s.breaks.map((b, i) => (i === idx ? { ...b, ...patch } : b)),
        }));
    };

    const handleRemoveBreak = (idx) => {
        setSettings((s) => ({ ...s, breaks: s.breaks.filter((_, i) => i !== idx) }));
    };

    // -----------------------------------------------------------------
    // Subject catalog import
    // -----------------------------------------------------------------
    const handleImportSubjects = async () => {
        if (importingSubjects) return;
        setImportingSubjects(true);
        try {
            const res = await subjectsService.bulkCreate(PAKISTAN_SUBJECT_CATALOG);
            if (res.success && res.data) {
                const { created, skipped } = res.data;
                toast.success(`Imported ${created} subject(s)${skipped ? `, skipped ${skipped}` : ''}`);
                const refreshed = await subjectsService.getAll({ pageSize: 500 });
                if (refreshed.success) setSubjects(refreshed.data.data || refreshed.data || []);
                setShowSubjectCatalog(false);
            } else {
                toast.error(res.error || 'Failed to import subjects');
            }
        } finally {
            setImportingSubjects(false);
        }
    };

    // -----------------------------------------------------------------
    // Slot editor
    // -----------------------------------------------------------------
    const openSlotEditor = (day, period) => {
        if (!canManageTimetable || period.kind === 'BREAK') return;
        const existing = timetableData[day]?.[period.id] || {};
        setSelectedSlot({ day, period });
        setSlotSubjectId(existing.subjectId || '');
        setSlotTeacherId(existing.teacherId || '');
        setSlotRoom(existing.room || '');
        setShowSlotModal(true);
    };

    const mergeSlotIntoState = useCallback((day, periodId, slot) => {
        setTimetableData((prev) => {
            const copy = { ...prev };
            const dayCopy = { ...(copy[day] || {}) };
            if (slot === null) {
                delete dayCopy[periodId];
            } else {
                dayCopy[periodId] = slot;
            }
            copy[day] = dayCopy;
            return copy;
        });
    }, []);

    const handleSaveSlot = async () => {
        if (!selectedSlot || !selectedClass || !selectedSection) return;
        setSavingSlot(true);

        const subject = subjects.find((s) => s.id === slotSubjectId);
        const teacher = teachers.find((t) => t.id === slotTeacherId);

        /** Optimistic: show the change immediately; the API call reconciles in the background. */
        mergeSlotIntoState(selectedSlot.day, selectedSlot.period.id, {
            subjectId: slotSubjectId || null,
            subjectName: subject?.name || null,
            subjectCode: subject?.code || null,
            teacherId: slotTeacherId || null,
            teacherName: teacher?.name || null,
            room: slotRoom || null,
        });
        setShowSlotModal(false);

        try {
            const res = await timetableService.save({
                classId: selectedClass,
                sectionId: selectedSection,
                slots: [
                    {
                        day: selectedSlot.day,
                        periodId: selectedSlot.period.id,
                        subjectId: slotSubjectId || undefined,
                        teacherId: slotTeacherId || undefined,
                        room: slotRoom || undefined,
                    },
                ],
            });
            if (res.success) {
                if (res.data?.timetable) setTimetableData(res.data.timetable);
                if (Array.isArray(res.data?.conflicts)) setConflicts(res.data.conflicts);
                toast.success('Slot saved');
            } else {
                toast.error(res.error || 'Failed to save');
                loadTimetable();
            }
        } finally {
            setSavingSlot(false);
        }
    };

    const handleClearSlot = async () => {
        if (!selectedSlot) return;
        setSavingSlot(true);
        const { day, period } = selectedSlot;
        mergeSlotIntoState(day, period.id, null);
        setShowSlotModal(false);
        try {
            const res = await timetableService.clearSlot(
                selectedClass,
                selectedSection,
                day,
                period.id,
            );
            if (res.success) {
                toast.success('Slot cleared');
            } else {
                toast.error('Failed to clear slot');
                loadTimetable();
            }
        } finally {
            setSavingSlot(false);
        }
    };

    // -----------------------------------------------------------------
    // Copy day
    // -----------------------------------------------------------------
    const handleCopyDay = async (fromDay, toDay) => {
        if (!selectedClass || !selectedSection) return;
        if (fromDay === toDay) return;
        const ok = window.confirm(
            `Copy all ${fromDay} slots onto ${toDay}? Existing ${toDay} slots will be overwritten.`,
        );
        if (!ok) return;
        try {
            const res = await timetableService.copyDay({
                classId: selectedClass,
                sectionId: selectedSection,
                fromDay,
                toDay,
                overwrite: true,
            });
            if (res.success) {
                if (res.data?.timetable) setTimetableData(res.data.timetable);
                toast.success(`Copied ${fromDay} → ${toDay}`);
            } else {
                toast.error(res.error || 'Failed to copy day');
            }
        } catch {
            toast.error('Failed to copy day');
        }
    };

    // -----------------------------------------------------------------
    // Drag and drop
    // -----------------------------------------------------------------
    const onDragStart = (day, periodId, slot) => {
        if (!canManageTimetable || !slot) return;
        setDraggingSlot({ day, periodId, slot });
    };

    const onDragOver = (e) => {
        if (!draggingSlot) return;
        e.preventDefault();
    };

    const onDrop = async (targetDay, targetPeriodId, targetPeriod) => {
        if (!draggingSlot) return;
        if (targetPeriod.kind === 'BREAK') {
            setDraggingSlot(null);
            return;
        }
        const payload = draggingSlot.slot;
        if (
            draggingSlot.day === targetDay &&
            draggingSlot.periodId === targetPeriodId
        ) {
            setDraggingSlot(null);
            return;
        }

        /** Optimistic paste: plop the slot into the target cell right away. */
        mergeSlotIntoState(targetDay, targetPeriodId, { ...payload });
        setDraggingSlot(null);

        const res = await timetableService.save({
            classId: selectedClass,
            sectionId: selectedSection,
            slots: [
                {
                    day: targetDay,
                    periodId: targetPeriodId,
                    subjectId: payload.subjectId || undefined,
                    teacherId: payload.teacherId || undefined,
                    room: payload.room || undefined,
                },
            ],
        });
        if (res.success) {
            if (res.data?.timetable) setTimetableData(res.data.timetable);
            if (Array.isArray(res.data?.conflicts)) setConflicts(res.data.conflicts);
            toast.success('Pasted');
        } else {
            toast.error('Failed to paste');
            loadTimetable();
        }
    };

    // -----------------------------------------------------------------
    // Print
    // -----------------------------------------------------------------
    const handlePrint = () => {
        const rows = [];
        periods
            .filter((p) => p.kind !== 'BREAK')
            .forEach((period) => {
                const row = { period: `${period.name} (${period.startTime}-${period.endTime})` };
                DAYS_OF_WEEK.forEach((day) => {
                    const slot = timetableData[day]?.[period.id];
                    row[day] = slot ? `${slot.subjectName || '—'}\n${slot.teacherName || ''}` : '—';
                });
                rows.push(row);
            });
        printTable({
            title: `Timetable — ${classes.find((c) => c.id === selectedClass)?.name} / ${
                sections.find((s) => s.id === selectedSection)?.name
            }`,
            columns: [
                { header: 'Period', accessor: 'period' },
                ...DAYS_OF_WEEK.map((d) => ({ header: d, accessor: d })),
            ],
            data: rows,
        });
    };

    if (!canViewTimetable) {
        return (
            <div
                className="flex flex-col items-center justify-center p-12 text-center"
                style={{ minHeight: '60vh' }}
            >
                <AlertCircle size={64} className="text-error-500 mb-4" />
                <h1 className="page-title">Access Denied</h1>
                <p className="text-gray-600 max-w-md">
                    You do not have permission to access the timetable.
                </p>
            </div>
        );
    }

    return (
        <div className="container">
            <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Timetable' }]} />

            <div className="page-header">
                <div>
                    <h1 className="page-title">Timetable Management</h1>
                    <p className="text-gray-600">
                        Configure school timings, then build per-class schedules with drag-and-drop.
                    </p>
                </div>
                <div className="flex gap-sm flex-wrap">
                    {canManageTimetable && (
                        <>
                            <button
                                className="btn btn-outline"
                                onClick={() => setShowSubjectCatalog(true)}
                            >
                                <Upload size={18} /> <span>Subject Library</span>
                            </button>
                            <button
                                className="btn btn-outline"
                                onClick={() => setShowSettings(true)}
                            >
                                <SettingsIcon size={18} /> <span>Schedule Settings</span>
                            </button>
                        </>
                    )}
                    <button
                        className="btn btn-outline"
                        onClick={handlePrint}
                        disabled={!selectedClass || !selectedSection || periods.length === 0}
                    >
                        <Calendar size={18} /> <span>Print</span>
                    </button>
                </div>
            </div>

            {/* Quick summary of current settings */}
            <div className="card mb-md" style={{ padding: '0.75rem 1rem' }}>
                <div className="flex items-center gap-md flex-wrap" style={{ fontSize: '0.875rem' }}>
                    <strong>School day:</strong>
                    <span>
                        {settings.startTime} – {settings.endTime}
                    </span>
                    <span>•</span>
                    <span>
                        <strong>Lecture:</strong> {settings.lectureDuration} min
                    </span>
                    <span>•</span>
                    <span>
                        <strong>Breaks:</strong>{' '}
                        {(settings.breaks || []).length === 0
                            ? 'none'
                            : settings.breaks
                                  .map((b) => `${b.name || 'Break'} ${b.startTime}-${b.endTime}`)
                                  .join(', ')}
                    </span>
                    <span>•</span>
                    <span>
                        <strong>{periods.filter((p) => p.kind !== 'BREAK').length}</strong> lectures/day
                    </span>
                </div>
            </div>

            {/* Class/Section selector */}
            <div className="card mb-md">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-md" style={{ padding: '1rem' }}>
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
                            {classes.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
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
                            {filteredSections.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Conflict banner */}
            {canManageTimetable && conflicts.length > 0 && (
                <div
                    className="card mb-md"
                    style={{
                        padding: '0.75rem 1rem',
                        borderColor: 'var(--warning-300, #fcd34d)',
                        background: 'var(--warning-50, #fffbeb)',
                    }}
                >
                    <div className="flex items-center gap-sm" style={{ color: 'var(--warning-700, #b45309)' }}>
                        <AlertTriangle size={18} />
                        <strong>
                            {conflicts.length} teacher conflict{conflicts.length === 1 ? '' : 's'} detected
                        </strong>
                    </div>
                    <ul style={{ marginTop: '0.25rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        {conflicts.slice(0, 5).map((c, i) => (
                            <li key={i}>
                                {c.teacherName} — {c.day} / {c.periodId} ·{' '}
                                {c.entries.map((e) => `${e.className}-${e.sectionName}`).join(' vs ')}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Timetable grid */}
            {selectedClass && selectedSection ? (
                <div className="card" style={{ overflowX: 'auto' }}>
                    {loadingTimetable && (
                        <div className="text-center py-md text-gray-500 text-sm">Loading timetable...</div>
                    )}
                    {periods.length === 0 && (
                        <div className="empty-state" style={{ padding: '2rem' }}>
                            <h3 className="empty-state-title">No periods configured</h3>
                            <p className="empty-state-description">
                                Open <strong>Schedule Settings</strong> and set school timings to generate periods.
                            </p>
                        </div>
                    )}
                    {canManageTimetable && periods.length > 0 && (
                        <p className="text-xs text-gray-400" style={{ padding: '0.5rem 1rem 0' }}>
                            Click a cell to edit. Drag a filled cell onto another cell to move/copy a lecture. Use
                            "Copy →" beside a day to duplicate the whole day.
                        </p>
                    )}
                    {periods.length > 0 && (
                        <div className="timetable-grid">
                            <div className="timetable-header">
                                <div className="header-cell">Time</div>
                                {DAYS_OF_WEEK.map((day) => (
                                    <div key={day} className="header-cell">
                                        <div>{day}</div>
                                        {canManageTimetable && (
                                            <div style={{ marginTop: '0.25rem' }}>
                                                <CopyDayControl day={day} onCopy={handleCopyDay} />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {periods.map((period) => (
                                <div key={period.id} className="timetable-row">
                                    <div className="time-cell">
                                        <div className="period-name">{period.name}</div>
                                        <div className="period-time">
                                            {period.startTime} – {period.endTime}
                                        </div>
                                    </div>
                                    {DAYS_OF_WEEK.map((day) => {
                                        const slot = timetableData[day]?.[period.id];
                                        const isBreak = period.kind === 'BREAK';
                                        return (
                                            <div
                                                key={day}
                                                className={`timetable-cell ${isBreak ? 'break-cell' : 'class-cell'}`}
                                                onClick={() => openSlotEditor(day, period)}
                                                draggable={!isBreak && !!slot && canManageTimetable}
                                                onDragStart={() =>
                                                    onDragStart(day, period.id, slot)
                                                }
                                                onDragOver={onDragOver}
                                                onDrop={() => onDrop(day, period.id, period)}
                                            >
                                                {isBreak ? (
                                                    <div className="break-label">{period.name}</div>
                                                ) : slot ? (
                                                    <div className="class-info">
                                                        <div className="subject-name">{slot.subjectName || '—'}</div>
                                                        {slot.teacherName && (
                                                            <div className="teacher-name">{slot.teacherName}</div>
                                                        )}
                                                        {slot.room && (
                                                            <div className="room-number">{slot.room}</div>
                                                        )}
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
                    )}
                </div>
            ) : (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-state-icon">📅</div>
                        <h3 className="empty-state-title">Select Class and Section</h3>
                        <p className="empty-state-description">
                            Choose a class and section to view or edit the timetable
                        </p>
                    </div>
                </div>
            )}

            {/* Slot editor modal */}
            <Modal
                isOpen={showSlotModal}
                onClose={() => setShowSlotModal(false)}
                title={`${selectedSlot?.day} — ${selectedSlot?.period?.name}`}
                footer={
                    <>
                        <button
                            className="btn btn-outline"
                            style={{ color: 'var(--error-600)', borderColor: 'var(--error-300)' }}
                            onClick={handleClearSlot}
                            disabled={savingSlot}
                        >
                            <Trash2 size={14} /> Clear
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={() => setShowSlotModal(false)}
                        >
                            Cancel
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleSaveSlot}
                            disabled={savingSlot}
                        >
                            <Save size={14} /> {savingSlot ? 'Saving...' : 'Save'}
                        </button>
                    </>
                }
            >
                <div className="form-group">
                    <label className="form-label">Subject</label>
                    <select
                        className="select"
                        value={slotSubjectId}
                        onChange={(e) => setSlotSubjectId(e.target.value)}
                    >
                        <option value="">No subject</option>
                        {subjects.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name} ({s.code})
                            </option>
                        ))}
                    </select>
                    {subjects.length === 0 && (
                        <span className="text-xs text-gray-500 mt-xs">
                            No subjects yet. Click <strong>Subject Library</strong> to import standard Pakistan subjects.
                        </span>
                    )}
                </div>
                <div className="form-group">
                    <label className="form-label">Teacher</label>
                    <select
                        className="select"
                        value={slotTeacherId}
                        onChange={(e) => setSlotTeacherId(e.target.value)}
                    >
                        <option value="">No teacher</option>
                        {teachers.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Room</label>
                    <input
                        type="text"
                        className="input"
                        value={slotRoom}
                        onChange={(e) => setSlotRoom(e.target.value)}
                        placeholder="e.g. Room 101, Lab 2"
                    />
                </div>
            </Modal>

            {/* Schedule settings modal */}
            <Modal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                title="Schedule Settings"
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setShowSettings(false)}>
                            Cancel
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleSaveSettings}
                            disabled={savingSettings}
                        >
                            {savingSettings ? 'Saving...' : 'Save & Regenerate'}
                        </button>
                    </>
                }
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                    <div className="form-group">
                        <label className="form-label">School starts</label>
                        <input
                            type="time"
                            className="input"
                            value={settings.startTime}
                            onChange={(e) =>
                                setSettings((s) => ({ ...s, startTime: e.target.value }))
                            }
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">School ends</label>
                        <input
                            type="time"
                            className="input"
                            value={settings.endTime}
                            onChange={(e) =>
                                setSettings((s) => ({ ...s, endTime: e.target.value }))
                            }
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Lecture duration (minutes)</label>
                        <input
                            type="number"
                            className="input"
                            min={15}
                            max={180}
                            step={5}
                            value={settings.lectureDuration}
                            onChange={(e) =>
                                setSettings((s) => ({
                                    ...s,
                                    lectureDuration: Number(e.target.value) || 40,
                                }))
                            }
                        />
                    </div>
                </div>

                <div className="mt-md">
                    <div className="flex items-center justify-between mb-sm">
                        <label className="form-label mb-0">Breaks</label>
                        <button className="btn btn-sm btn-outline" onClick={handleAddBreak}>
                            <Plus size={14} /> Add break
                        </button>
                    </div>
                    {(settings.breaks || []).length === 0 && (
                        <p className="text-xs text-gray-500">No breaks configured.</p>
                    )}
                    {(settings.breaks || []).map((b, idx) => (
                        <div
                            key={idx}
                            className="flex gap-sm items-end mb-sm"
                            style={{ flexWrap: 'wrap' }}
                        >
                            <div className="form-group mb-0" style={{ flex: '1 1 140px' }}>
                                <label className="form-label">Label</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={b.name || ''}
                                    onChange={(e) => handleUpdateBreak(idx, { name: e.target.value })}
                                    placeholder="Break / Lunch"
                                />
                            </div>
                            <div className="form-group mb-0" style={{ flex: '0 0 130px' }}>
                                <label className="form-label">Start</label>
                                <input
                                    type="time"
                                    className="input"
                                    value={b.startTime}
                                    onChange={(e) => handleUpdateBreak(idx, { startTime: e.target.value })}
                                />
                            </div>
                            <div className="form-group mb-0" style={{ flex: '0 0 130px' }}>
                                <label className="form-label">End</label>
                                <input
                                    type="time"
                                    className="input"
                                    value={b.endTime}
                                    onChange={(e) => handleUpdateBreak(idx, { endTime: e.target.value })}
                                />
                            </div>
                            <button
                                className="btn btn-sm btn-danger"
                                onClick={() => handleRemoveBreak(idx)}
                                title="Remove break"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>

                <p className="text-xs text-gray-500 mt-sm">
                    Saving regenerates the period list. Existing slots whose period id stays valid are preserved.
                </p>
            </Modal>

            {/* Subject catalog modal */}
            <Modal
                isOpen={showSubjectCatalog}
                onClose={() => setShowSubjectCatalog(false)}
                title="Pakistan Standard Subjects"
                footer={
                    <>
                        <button
                            className="btn btn-secondary"
                            onClick={() => setShowSubjectCatalog(false)}
                        >
                            Close
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleImportSubjects}
                            disabled={importingSubjects}
                        >
                            {importingSubjects ? 'Importing...' : 'Import all (skip duplicates)'}
                        </button>
                    </>
                }
            >
                <p className="text-sm text-gray-600 mb-md">
                    One-click import of the standard curriculum subjects for Classes 1–12. Already-present codes are skipped.
                </p>
                {PAKISTAN_SUBJECT_GRADE_GROUPS.map((group) => {
                    const items = PAKISTAN_SUBJECT_CATALOG.filter((s) => s.grade === group.id);
                    if (items.length === 0) return null;
                    return (
                        <div key={group.id} className="mb-md">
                            <div className="font-semibold mb-xs">{group.label}</div>
                            <div className="flex flex-wrap gap-xs">
                                {items.map((s) => (
                                    <span
                                        key={s.code}
                                        className="badge badge-outline"
                                        style={{ fontSize: '0.75rem' }}
                                    >
                                        {s.name} ({s.code})
                                    </span>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </Modal>

            <style>{`
                .timetable-grid { overflow-x: auto; }
                .timetable-header {
                    display: grid;
                    grid-template-columns: 150px repeat(6, 1fr);
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
                    grid-template-columns: 150px repeat(6, 1fr);
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
                .class-cell[draggable="true"] { cursor: grab; }
                .class-cell[draggable="true"]:active { cursor: grabbing; }
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

/**
 * Tiny "Copy →" dropdown rendered into each day header. Kept inline because
 * it's only useful within the timetable grid.
 */
const CopyDayControl = ({ day, onCopy }) => {
    const [open, setOpen] = useState(false);
    return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
            <button
                type="button"
                className="btn btn-sm btn-ghost"
                style={{ fontSize: '0.7rem', padding: '0.125rem 0.375rem' }}
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen((v) => !v);
                }}
                title="Copy this day onto another"
            >
                <Copy size={12} /> Copy
            </button>
            {open && (
                <div
                    style={{
                        position: 'absolute',
                        zIndex: 50,
                        top: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        padding: '0.25rem',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        minWidth: '120px',
                    }}
                    onMouseLeave={() => setOpen(false)}
                >
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', padding: '0.25rem 0.5rem' }}>
                        Copy {day} to:
                    </div>
                    {DAYS_OF_WEEK.filter((d) => d !== day).map((d) => (
                        <button
                            key={d}
                            type="button"
                            className="btn btn-ghost"
                            style={{
                                width: '100%',
                                justifyContent: 'flex-start',
                                fontSize: '0.75rem',
                                padding: '0.25rem 0.5rem',
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                setOpen(false);
                                onCopy(day, d);
                            }}
                        >
                            {d}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TimetablePage;
