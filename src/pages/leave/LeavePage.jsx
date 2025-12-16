import React, { useState } from 'react';
import { Plus, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useLeaveStore } from '../../store';
import { formatDate, getRelativeTime } from '../../utils';
import Breadcrumb from '../../components/common/Breadcrumb';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';

const LeavePage = () => {
    const { leaves, setLeaves, addLeave, updateLeave } = useLeaveStore();
    const [showModal, setShowModal] = useState(false);
    const [filterStatus, setFilterStatus] = useState('');

    const breadcrumbItems = [
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Leave Management', path: null },
    ];

    React.useEffect(() => {
        setLeaves([
            {
                id: '1',
                userId: 'teacher1',
                userName: 'John Smith',
                userRole: 'teacher',
                leaveType: 'sick',
                startDate: new Date('2024-12-20'),
                endDate: new Date('2024-12-22'),
                reason: 'Medical checkup',
                status: 'pending',
                appliedAt: new Date(Date.now() - 3600000),
            },
            {
                id: '2',
                userId: 'student1',
                userName: 'Emma Wilson',
                userRole: 'student',
                leaveType: 'casual',
                startDate: new Date('2024-12-18'),
                endDate: new Date('2024-12-18'),
                reason: 'Family function',
                status: 'approved',
                appliedAt: new Date(Date.now() - 86400000),
                approvedBy: 'Admin',
                approvedAt: new Date(),
            },
        ]);
    }, []);

    const handleApprove = (leaveId) => {
        updateLeave(leaveId, { status: 'approved', approvedBy: 'Admin', approvedAt: new Date() });
        toast.success('Leave approved');
    };

    const handleReject = (leaveId) => {
        updateLeave(leaveId, { status: 'rejected', rejectedBy: 'Admin', rejectedAt: new Date() });
        toast.error('Leave rejected');
    };

    const handleSubmitLeave = () => {
        toast.success('Leave application submitted');
        setShowModal(false);
    };

    const filteredLeaves = leaves.filter(leave =>
        !filterStatus || leave.status === filterStatus
    );

    const stats = {
        pending: leaves.filter(l => l.status === 'pending').length,
        approved: leaves.filter(l => l.status === 'approved').length,
        rejected: leaves.filter(l => l.status === 'rejected').length,
    };

    return (
        <div className="leave-page">
            <Breadcrumb items={breadcrumbItems} />

            <div className="page-header">
                <div>
                    <h1>Leave Management</h1>
                    <p className="text-gray-600">Manage leave applications and approvals</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={18} />
                    <span>Apply Leave</span>
                </button>
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
                            {filteredLeaves.map((leave) => (
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
                                        {leave.status === 'pending' && (
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
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Apply Leave Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="Apply for Leave"
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
                    <div className="form-group">
                        <label className="form-label">Leave Type *</label>
                        <select className="select">
                            <option value="sick">Sick Leave</option>
                            <option value="casual">Casual Leave</option>
                            <option value="emergency">Emergency Leave</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2">
                        <div className="form-group">
                            <label className="form-label">Start Date *</label>
                            <input type="date" className="input" />
                        </div>

                        <div className="form-group">
                            <label className="form-label">End Date *</label>
                            <input type="date" className="input" />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Reason *</label>
                        <textarea
                            className="textarea"
                            placeholder="Explain the reason for leave"
                            rows="4"
                        />
                    </div>
                </form>
            </Modal>

            <style jsx>{`
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
