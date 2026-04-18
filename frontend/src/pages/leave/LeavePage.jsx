import React, { useState, useEffect, useCallback } from 'react';
import { Plus, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useLeaveStore, useAuthStore, useStudentsStore } from '../../store';
import { leaveService } from '../../services/api';
import { formatDate } from '../../utils';
import { USER_ROLES } from '../../constants';
import Breadcrumb from '../../components/common/Breadcrumb';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';

/** Normalize Prisma leave row for table display */
function mapLeaveRow(l) {
    if (!l) return l;
    const u = l.User_LeaveRequest_requestedByUserIdToUser;
    return {
        ...l,
        userName: u?.name ?? '—',
        userRole: u?.role ?? l.role,
        leaveType: l.type,
        startDate: l.fromDate,
        endDate: l.toDate,
    };
}

const LeavePage = () => {
    const { user } = useAuthStore();
    const { leaves, addLeave, updateLeave, setLeaves } = useLeaveStore();
    const { students } = useStudentsStore();
    const [showModal, setShowModal] = useState(false);
    const [filterStatus, setFilterStatus] = useState('');
    const [formData, setFormData] = useState({
        leaveType: 'SICK',
        startDate: '',
        endDate: '',
        reason: '',
        studentId: '',
    });

    const breadcrumbItems = [
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Leave Management', path: null },
    ];

    const userRole = user?.role?.toUpperCase();

    const canApprove = [
        USER_ROLES.SUPER_ADMIN,
        USER_ROLES.ADMIN,
        USER_ROLES.MANAGEMENT,
    ].includes(userRole);

    const canRequestLeave = [USER_ROLES.TEACHER, USER_ROLES.SUPPORT_STAFF, USER_ROLES.PARENT].includes(userRole);

    const isParent = userRole === USER_ROLES.PARENT;

    const loadData = useCallback(async () => {
        try {
            const response = canApprove
                ? await leaveService.getPendingLeave({ pageSize: 100 })
                : await leaveService.getMyLeave({ pageSize: 100 });

            if (response.success && response.data) {
                const body = response.data;
                const raw = Array.isArray(body.data) ? body.data : [];
                setLeaves(raw.map(mapLeaveRow));
            }
        } catch (error) {
            console.error('Failed to load leaves:', error);
        }
    }, [canApprove, setLeaves]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleApprove = async (leaveId) => {
        try {
            const response = await leaveService.approveLeave(leaveId);
            if (response.success && response.data) {
                updateLeave(leaveId, mapLeaveRow(response.data));
                toast.success('Leave approved');
                loadData();
            } else {
                toast.error(response.error || 'Failed to approve leave');
            }
        } catch (error) {
            toast.error('Failed to approve leave');
        }
    };

    const handleReject = async (leaveId) => {
        try {
            const response = await leaveService.rejectLeave(leaveId);
            if (response.success && response.data) {
                updateLeave(leaveId, mapLeaveRow(response.data));
                toast.success('Leave rejected');
                loadData();
            } else {
                toast.error(response.error || 'Failed to reject leave');
            }
        } catch (error) {
            toast.error('Failed to reject leave');
        }
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmitLeave = async (e) => {
        e.preventDefault();

        if (!formData.startDate || !formData.endDate || !formData.reason) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            const leaveData = {
                type: formData.leaveType,
                fromDate: formData.startDate,
                toDate: formData.endDate,
                reason: formData.reason,
            };

            if (isParent && formData.studentId) {
                leaveData.requestedForStudentId = formData.studentId;
            }

            const response = await leaveService.createLeave(leaveData);
            if (response.success && response.data) {
                addLeave(mapLeaveRow(response.data));
                toast.success('Leave request submitted successfully');
                setShowModal(false);
                setFormData({
                    leaveType: 'SICK',
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
            toast.error('Failed to submit leave request');
        }
    };

    const visibleLeaves = leaves.filter((leave) => {
        const st = leave.status?.toLowerCase() || '';
        const matchesStatus = !filterStatus || st === filterStatus.toLowerCase();
        return matchesStatus;
    });

    const stats = {
        pending: visibleLeaves.filter((l) => l.status?.toLowerCase() === 'pending').length,
        approved: visibleLeaves.filter((l) => l.status?.toLowerCase() === 'approved').length,
        rejected: visibleLeaves.filter((l) => l.status?.toLowerCase() === 'rejected').length,
    };

    const myChildren = isParent ? students.filter((s) => s.parentId === user?.id) : [];

    return (
        <div className="leave-page">
            <Breadcrumb items={breadcrumbItems} />

            <div className="page-header">
                <div>
                    <h1 className="page-title">Leave Management</h1>
                    <p className="text-gray-600">
                        {canApprove
                            ? 'Review and approve or reject pending leave requests.'
                            : canRequestLeave
                              ? 'View and submit your leave requests.'
                              : 'View your leave requests.'}
                    </p>
                </div>
                {canRequestLeave && (
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={18} />
                        <span>Request Leave</span>
                    </button>
                )}
            </div>

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

            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">
                        {canApprove ? 'Pending leave applications' : 'My leave applications'}
                    </h3>
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
                                visibleLeaves.map((leave) => {
                                    const leaveStatus = leave.status?.toLowerCase() || 'pending';
                                    const isPending = leaveStatus === 'pending';

                                    return (
                                        <tr key={leave.id}>
                                            <td className="font-medium">{leave.userName}</td>
                                            <td className="capitalize">{leave.userRole}</td>
                                            <td className="capitalize">{leave.leaveType || leave.type}</td>
                                            <td>
                                                {formatDate(leave.startDate || leave.fromDate)} -{' '}
                                                {formatDate(leave.endDate || leave.toDate)}
                                            </td>
                                            <td className="text-sm">{leave.reason}</td>
                                            <td>
                                                <span
                                                    className={`badge badge-${
                                                        leaveStatus === 'approved'
                                                            ? 'success'
                                                            : leaveStatus === 'rejected'
                                                              ? 'error'
                                                              : 'warning'
                                                    }`}
                                                >
                                                    {leave.status || 'Pending'}
                                                </span>
                                            </td>
                                            <td>
                                                {isPending && canApprove ? (
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
                                                        {!isPending ? 'Processed' : 'Waiting'}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {canRequestLeave && (
                <Modal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    title={isParent ? "Apply for Child's Leave" : 'Apply for Leave'}
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
                                    {myChildren.map((child) => (
                                        <option key={child.id} value={child.id}>
                                            {child.name}
                                        </option>
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
                                <option value="SICK">Sick Leave</option>
                                <option value="VACATION">Vacation</option>
                                <option value="PERSONAL">Personal</option>
                                <option value="EMERGENCY">Emergency Leave</option>
                                <option value="OTHER">Other</option>
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
            )}

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
          color: var(--text-primary);
          margin-bottom: var(--spacing-xs);
        }

        .stat-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
          box-shadow: var(--shadow-sm);
          display: flex;
          gap: var(--spacing-md);
          align-items: center;
          transition: box-shadow var(--transition-base);
        }
        .stat-card:hover { box-shadow: var(--shadow-md); }

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
          color: var(--text-primary);
        }

        .stat-label {
          font-size: 0.875rem;
          color: var(--text-secondary);
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
