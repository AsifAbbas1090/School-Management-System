import React, { useState } from 'react';
import { Calendar, Plus, Edit, Trash2 } from 'lucide-react';
import { mockData } from '../../services/mockData';
import { DAYS_OF_WEEK, PERIODS } from '../../constants';
import Breadcrumb from '../../components/common/Breadcrumb';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';

const TimetablePage = () => {
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);

    const classes = mockData.classes;
    const sections = mockData.sections;
    const subjects = mockData.subjects;
    const teachers = mockData.teachers;

    const breadcrumbItems = [
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Timetable', path: null },
    ];

    const timetableData = {
        Monday: {
            '1': { subject: 'Mathematics', teacher: 'John Smith', room: '101' },
            '2': { subject: 'English', teacher: 'Emily Brown', room: '102' },
            '3': { subject: 'Science', teacher: 'John Smith', room: 'Lab 1' },
            '4': { subject: 'Social Studies', teacher: 'Emily Brown', room: '103' },
            '5': { subject: 'Computer Science', teacher: 'John Smith', room: 'Lab 2' },
        },
        Tuesday: {
            '1': { subject: 'English', teacher: 'Emily Brown', room: '102' },
            '2': { subject: 'Mathematics', teacher: 'John Smith', room: '101' },
            '3': { subject: 'Science', teacher: 'John Smith', room: 'Lab 1' },
            '5': { subject: 'Social Studies', teacher: 'Emily Brown', room: '103' },
        },
    };

    const handleSlotClick = (day, period) => {
        if (period.id.startsWith('break')) return;
        setSelectedSlot({ day, period });
        setShowModal(true);
    };

    const handleSaveTimetable = () => {
        toast.success('Timetable updated successfully');
        setShowModal(false);
    };

    const filteredSections = sections.filter(s => s.classId === selectedClass);

    return (
        <div className="timetable-page">
            <Breadcrumb items={breadcrumbItems} />

            <div className="page-header">
                <div>
                    <h1>Timetable Management</h1>
                    <p className="text-gray-600">Create and manage class schedules</p>
                </div>
                <button className="btn btn-primary">
                    <Calendar size={18} />
                    <span>Print Timetable</span>
                </button>
            </div>

            {/* Class Selection */}
            <div className="card mb-lg">
                <div className="filters-grid">
                    <div className="form-group mb-0">
                        <label className="form-label">Select Class</label>
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
                        <label className="form-label">Select Section</label>
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

            {/* Timetable Grid */}
            {selectedClass && selectedSection ? (
                <div className="card">
                    <div className="timetable-grid">
                        <div className="timetable-header">
                            <div className="header-cell">Time</div>
                            {DAYS_OF_WEEK.map(day => (
                                <div key={day} className="header-cell">{day}</div>
                            ))}
                        </div>

                        {PERIODS.map(period => (
                            <div key={period.id} className="timetable-row">
                                <div className="time-cell">
                                    <div className="period-name">{period.name}</div>
                                    <div className="period-time">{period.startTime} - {period.endTime}</div>
                                </div>

                                {DAYS_OF_WEEK.map(day => (
                                    <div
                                        key={day}
                                        className={`timetable-cell ${period.id.startsWith('break') ? 'break-cell' : 'class-cell'}`}
                                        onClick={() => handleSlotClick(day, period)}
                                    >
                                        {period.id.startsWith('break') ? (
                                            <div className="break-label">{period.name}</div>
                                        ) : (
                                            timetableData[day]?.[period.id] ? (
                                                <div className="class-info">
                                                    <div className="subject-name">{timetableData[day][period.id].subject}</div>
                                                    <div className="teacher-name">{timetableData[day][period.id].teacher}</div>
                                                    <div className="room-number">{timetableData[day][period.id].room}</div>
                                                </div>
                                            ) : (
                                                <div className="empty-slot">
                                                    <Plus size={16} />
                                                    <span>Add Class</span>
                                                </div>
                                            )
                                        )}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-state-icon">📅</div>
                        <h3 className="empty-state-title">Select Class and Section</h3>
                        <p className="empty-state-description">
                            Please select a class and section to view or edit the timetable
                        </p>
                    </div>
                </div>
            )}

            {/* Edit Slot Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={`Edit Timetable - ${selectedSlot?.day} ${selectedSlot?.period?.name}`}
                footer={
                    <>
                        <button className="btn btn-outline" onClick={() => setShowModal(false)}>
                            Cancel
                        </button>
                        <button className="btn btn-primary" onClick={handleSaveTimetable}>
                            Save
                        </button>
                    </>
                }
            >
                <form className="timetable-form">
                    <div className="form-group">
                        <label className="form-label">Subject *</label>
                        <select className="select">
                            <option value="">Select Subject</option>
                            {subjects.map(sub => (
                                <option key={sub.id} value={sub.id}>{sub.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Teacher *</label>
                        <select className="select">
                            <option value="">Select Teacher</option>
                            {teachers.map(teacher => (
                                <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Room</label>
                        <input type="text" className="input" placeholder="Enter room number" />
                    </div>
                </form>
            </Modal>

            <style jsx>{`
        .timetable-page {
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
          grid-template-columns: repeat(2, 1fr);
          gap: var(--spacing-lg);
          padding: var(--spacing-lg);
        }

        .timetable-grid {
          overflow-x: auto;
        }

        .timetable-header {
          display: grid;
          grid-template-columns: 150px repeat(6, 1fr);
          gap: 1px;
          background: var(--gray-200);
          border: 1px solid var(--gray-200);
        }

        .header-cell {
          background: var(--primary-50);
          padding: var(--spacing-md);
          font-weight: 600;
          color: var(--primary-900);
          text-align: center;
        }

        .timetable-row {
          display: grid;
          grid-template-columns: 150px repeat(6, 1fr);
          gap: 1px;
          background: var(--gray-200);
          border: 1px solid var(--gray-200);
          border-top: none;
        }

        .time-cell {
          background: var(--gray-50);
          padding: var(--spacing-md);
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .period-name {
          font-weight: 600;
          color: var(--gray-900);
          font-size: 0.875rem;
        }

        .period-time {
          font-size: 0.75rem;
          color: var(--gray-600);
          margin-top: 0.25rem;
        }

        .timetable-cell {
          background: white;
          padding: var(--spacing-md);
          min-height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .class-cell {
          cursor: pointer;
          transition: all var(--transition-base);
        }

        .class-cell:hover {
          background: var(--primary-50);
        }

        .break-cell {
          background: var(--warning-50);
        }

        .break-label {
          font-weight: 600;
          color: var(--warning-700);
          text-align: center;
        }

        .class-info {
          text-align: center;
          width: 100%;
        }

        .subject-name {
          font-weight: 600;
          color: var(--gray-900);
          font-size: 0.875rem;
          margin-bottom: 0.25rem;
        }

        .teacher-name {
          font-size: 0.75rem;
          color: var(--gray-600);
          margin-bottom: 0.25rem;
        }

        .room-number {
          font-size: 0.75rem;
          color: var(--primary-600);
          font-weight: 500;
        }

        .empty-slot {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
          color: var(--gray-400);
          font-size: 0.75rem;
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

export default TimetablePage;
