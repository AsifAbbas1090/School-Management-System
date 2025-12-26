import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useLeaveStore, useAuthStore, useStudentsStore } from '../../store';
import { leaveService, studentsService } from '../../services/api';
import { formatDate, getRelativeTime } from '../../utils';
import Breadcrumb from '../../components/common/Breadcrumb';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';

const LeavePage = () => {
    const { user } = useAuthStore();
    const { leaves, addLeave, updateLeave } = useLeaveStore();
    const { students } = useStudentsStore();
    const [showModal, setShowModal] = useState(false);
    const [filterStatus, setFilterStatus] = useState('');
    const [formData, setFormData] = useState({
        leaveType: 'sick',
        startDate: '',
        endDate: '',
        reason: '',
        studentId: '', // For parents applying for children
    });

    const breadcrumbItems = [
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Leave Management', path: null },
    ];

    const canApprove = ['admin', 'management', 'super_admin'].includes(user?.role);
    const isParent = user?.role === 'parent';
    const isTeacher = user?.role === 'teacher';

    const handleApprove = async (leaveId) => {
        try {
            const response = await leaveService.update(leaveId, { status: 'APPROVED' });
            if (response.success && response.data) {
                updateLeave(leaveId, response.data);
                toast.success('Leave approved');
                loadData();
            } else {
                toast.error(response.error || 'Failed to approve leave');
            }
        } catch (error) {
            // Silently handle errors - toast shows user message
            toast.error('Failed to approve leave');
        }
    };

    const handleReject = async (leaveId) => {
        try {
            const response = await leaveService.update(leaveId, { status: 'REJECTED' });
            if (response.success && response.data) {
                updateLeave(leaveId, response.data);
                toast.success('Leave rejected');
                loadData();
            } else {
                toast.error(response.error || 'Failed to reject leave');
            }
        } catch (error) {
            // Silently handle errors - toast shows user message
            toast.error('Failed to reject leave');
        }
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmitLeave = async (e) => {
        e.preventDefault();

        if (!formData.startDate || !formData.endDate || !formData.reason) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            // For teachers, don't send studentId (they request for themselves)
            const leaveData = {
                type: formData.leaveType.toUpperCase(),
                fromDate: formData.startDate,
                toDate: formData.endDate,
                reason: formData.reason,
            };

            // Only add studentId for parents
            if (isParent && formData.studentId) {
                leaveData.requestedForStudentId = formData.studentId;
            }

            const response = await leaveService.create(leaveData);
            if (response.success && response.data) {
                addLeave(response.data);
                toast.success('Leave request submitted successfully');
                setShowModal(false);
                setFormData({
                    leaveType: 'sick',
                    startDate: '',
                    endDate: '',
                    reason: '',
                    studentId: '',
                });
                loadData();
            } else {
                toast.error(response.error || 'Failed to submit leave request');
            }
        } catch (error) {
            // Silently handle errors - toast shows user message
            toast.error('Failed to submit leave request');
        }
    };

    // Filter logic: Admins see all, users see their own
    const visibleLeaves = leaves.filter(leave => {
        const matchesStatus = !filterStatus || leave.status === filterStatus;
        const matchesUser = canApprove || leave.userId === user?.id;
        return matchesStatus && matchesUser;
    });

    const stats = {
        pending: visibleLeaves.filter(l => l.status === 'pending').length,
        approved: visibleLeaves.filter(l => l.status === 'approved').length,
        rejected: visibleLeaves.filter(l => l.status === 'rejected').length,
    };

    // For parent: find their children from students store
    const myChildren = isParent ? students.filter(s => s.parentId === user?.id) : [];

    return (
        <div className="leave-page">
            <Breadcrumb items={breadcrumbItems} />

            <div className="page-header">
                <div>
                    <h1>Leave Management</h1>
                    <p className="text-gray-600">
                        {canApprove ? 'Manage and approve leave applications' : 'View and track your leave requests'}
                    </p>
                </div>
                {!canApprove && (
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={18} />
                        <span>Request Leave</span>
                    </button>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 mb-xl">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                        <Clock size={24} />
                    </div>
                    <div>
                        <div className="stat-value">{stats.pending}</div>
                        <div className="stat-label">Pending</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                        <CheckCircle size={24} />
                    </div>
                    <div>
                        <div className="stat-value">{stats.approved}</div>
                        <div className="stat-label">Approved</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                        <XCircle size={24} />
                    </div>
                    <div>
                        <div className="stat-value">{stats.rejected}</div>
                        <div className="stat-label">Rejected</div>
                    </div>
                </div>
            </div>

            {/* Filter */}
            <div className="card mb-lg">
                <div className="filters-grid">
                    <div className="form-group mb-0">
                        <label className="form-label">Filter by Status</label>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="select"
                        >
                            <option value="">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Leave Applications */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">Leave Applications</h3>
                </div>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Applicant</th>
                                <th>Role</th>
                                <th>Leave Type</th>
                                <th>Duration</th>
                                <th>Reason</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleLeaves.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-8 text-gray-500">
                                        No leave requests found.
                                    </td>
                                </tr>
                            ) : (
                                visibleLeaves.map((leave) => (
                                    <tr key={leave.id}>
                                        <td className="font-medium">{leave.userName}</td>
                                        <td className="capitalize">{leave.userRole}</td>
                                        <td className="capitalize">{leave.leaveType}</td>
                                        <td>
                                            {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                                        </td>
                                        <td className="text-sm">{leave.reason}</td>
                                        <td>
                                            <span className={`badge badge-${leave.status === 'approved' ? 'success' :
                                                leave.status === 'rejected' ? 'error' :
                                                    'warning'
                                                }`}>
                                                {leave.status}
                                            </span>
                                        </td>
                                        <td>
                                            {leave.status === 'pending' && canApprove ? (
                                                <div className="flex gap-sm">
                                                    <button
                                                        className="btn btn-sm btn-success"
                                                        onClick={() => handleApprove(leave.id)}
                                                    >
                                                        <CheckCircle size={16} />
                                                        <span>Approve</span>
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-danger"
                                                        onClick={() => handleReject(leave.id)}
                                                    >
                                                        <XCircle size={16} />
                                                        <span>Reject</span>
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-gray-400">
                                                    {leave.status !== 'pending' ? 'Processed' : 'Waiting'}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Apply Leave Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={isParent ? "Apply for Child's Leave" : "Apply for Leave"}
                footer={
                    <>
                        <button className="btn btn-outline" onClick={() => setShowModal(false)}>
                            Cancel
                        </button>
                        <button className="btn btn-primary" onClick={handleSubmitLeave}>
                            Submit Application
                        </button>
                    </>
                }
            >
                <form>
                    {isParent && (
                        <div className="form-group">
                            <label className="form-label">Select Child *</label>
                            <select
                                name="studentId"
                                className="select"
                                value={formData.studentId}
                                onChange={handleFormChange}
                                required
                            >
                                <option value="">Select Child</option>
                                {myChildren.map(child => (
                                    <option key={child.id} value={child.id}>{child.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Leave Type *</label>
                        <select
                            name="leaveType"
                            className="select"
                            value={formData.leaveType}
                            onChange={handleFormChange}
                        >
                            <option value="sick">Sick Leave</option>
                            <option value="casual">Casual Leave</option>
                            <option value="emergency">Emergency Leave</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2">
                        <div className="form-group">
                            <label className="form-label">Start Date *</label>
                            <input
                                type="date"
                                name="startDate"
                                className="input"
                                value={formData.startDate}
                                onChange={handleFormChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">End Date *</label>
                            <input
                                type="date"
                                name="endDate"
                                className="input"
                                value={formData.endDate}
                                onChange={handleFormChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Reason *</label>
                        <textarea
                            name="reason"
                            className="textarea"
                            placeholder="Explain the reason for leave"
                            rows="4"
                            value={formData.reason}
                            onChange={handleFormChange}
                            required
                        />
                    </div>
                </form>
            </Modal>

            <style>{`
        .leave-page {
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

        .stat-card {
          background: white;
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
          box-shadow: var(--shadow-sm);
          display: flex;
          gap: var(--spacing-md);
          align-items: center;
        }

        .stat-icon {
          width: 56px;
          height: 56px;
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
        }

        .stat-value {
          font-size: 1.875rem;
          font-weight: 700;
          color: var(--gray-900);
        }

        .stat-label {
          font-size: 0.875rem;
          color: var(--gray-600);
        }

        .filters-grid {
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

export default LeavePage;
