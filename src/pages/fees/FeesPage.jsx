import React, { useState } from 'react';
import { DollarSign, Download, Receipt, CreditCard, Search, Upload, Send, History } from 'lucide-react';
import { mockData } from '../../services/mockData';
import { formatCurrency, formatDate, generateReceiptNumber } from '../../utils';
import { printTable } from '../../utils/printUtils';
import Breadcrumb from '../../components/common/Breadcrumb';
import Modal from '../../components/common/Modal';
import CSVImport from '../../components/common/CSVImport';
import { useAuthStore, useFeesStore } from '../../store';
import toast from 'react-hot-toast';

const FeesPage = () => {
    const { user } = useAuthStore();
    const { handoverRecords, addHandoverRecord, addFeePayment } = useFeesStore();

    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showHandoverModal, setShowHandoverModal] = useState(false);

    const [selectedStudent, setSelectedStudent] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');

    const students = mockData.students;
    const feePayments = mockData.feePayments;

    const breadcrumbItems = [
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Fees Management', path: null },
    ];

    // Permission check
    const canViewRevenue = ['admin', 'management', 'super_admin'].includes(user?.role);
    const canManageFees = ['admin', 'management', 'super_admin'].includes(user?.role);

    const handlePaymentClick = (student) => {
        setSelectedStudent(student);
        setShowPaymentModal(true);
    };

    const handlePaymentSubmit = () => {
        if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        const receiptNumber = generateReceiptNumber();
        toast.success(`Payment received! Receipt: ${receiptNumber}`);
        setShowPaymentModal(false);
        setPaymentAmount('');
        setSelectedStudent(null);
    };

    const handleImportFees = (data) => {
        let successCount = 0;

        data.forEach((row, index) => {
            const student = students.find(s => s.rollNumber === row.rollNumber);
            if (student) {
                const amount = parseFloat(row.feeReceived);
                if (!isNaN(amount) && amount > 0) {
                    addFeePayment({
                        id: `import_${Date.now()}_${index}`,
                        studentId: student.id,
                        paidAmount: amount,
                        dueAmount: (student.totalFee || 5000) - amount, // Simplified logic
                        status: amount >= (student.totalFee || 5000) ? 'paid' : 'partial',
                        date: new Date(),
                        remarks: 'Imported via CSV'
                    });
                    successCount++;
                }
            }
        });

        if (successCount > 0) {
            toast.success(`Successfully imported ${successCount} fee records`);
            setShowImportModal(false);
        } else {
            toast.error('No valid records found matching existing students');
        }
    };

    const handleHandoverSubmit = () => {
        // Calculate amount to handover (e.g. today's collection)
        // For mock, just use a dummy amount
        const amount = 50000;

        addHandoverRecord({
            id: Date.now(),
            amount,
            submittedBy: user?.name || 'Unknown',
            date: new Date(),
            campusId: 'campus1', // dynamic in real app
        });

        toast.success(`Successfully handed over ${formatCurrency(amount)}`);
        setShowHandoverModal(false);
    };

    const getStudentFeeStatus = (studentId) => {
        const student = students.find(s => s.id === studentId);
        const totalFee = student?.totalFee || 5000; // Use variable fee or default
        const payment = feePayments.find(p => p.studentId === studentId);

        return payment
            ? { ...payment, amount: totalFee, dueAmount: totalFee - payment.paidAmount }
            : { status: 'unpaid', amount: totalFee, paidAmount: 0, dueAmount: totalFee };
    };

    const filteredStudents = students.filter((student) => {
        const feeStatus = getStudentFeeStatus(student.id);
        const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.rollNumber.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = !filterStatus || feeStatus.status === filterStatus;

        return matchesSearch && matchesStatus;
    });

    const totalCollected = feePayments.reduce((sum, p) => sum + p.paidAmount, 0);
    const totalPending = feePayments.reduce((sum, p) => sum + p.dueAmount, 0);

    const handleExportPDF = () => {
        const data = filteredStudents.map(s => {
            const status = getStudentFeeStatus(s.id);
            return {
                name: s.name,
                roll: s.rollNumber,
                total: formatCurrency(status.amount),
                paid: formatCurrency(status.paidAmount),
                due: formatCurrency(status.dueAmount),
                status: status.status.toUpperCase()
            };
        });

        printTable({
            title: 'Fee Collection Report',
            columns: [
                { header: 'Student Name', accessor: 'name' },
                { header: 'Roll No', accessor: 'roll' },
                { header: 'Total Fee', accessor: 'total' },
                { header: 'Paid', accessor: 'paid' },
                { header: 'Pending', accessor: 'due' },
                { header: 'Status', accessor: 'status' }
            ],
            data: data,
            footer: `Total Collected: ${formatCurrency(totalCollected)} | Pending: ${formatCurrency(totalPending)}`
        });
    };

    return (
        <div className="fees-page">
            <Breadcrumb items={breadcrumbItems} />

            <div className="page-header">
                <div>
                    <h1>Fees Management</h1>
                    <p className="text-gray-600">Manage fee collection and payment records</p>
                </div>
                {canManageFees && (
                    <div className="flex gap-md">
                        <button className="btn btn-outline" onClick={handleExportPDF}>
                            <Download size={18} />
                            <span>Export PDF</span>
                        </button>
                        <button className="btn btn-outline" onClick={() => setShowImportModal(true)}>
                            <Upload size={18} />
                            <span>Import via CSV</span>
                        </button>
                        <button className="btn btn-primary" onClick={() => setShowHandoverModal(true)}>
                            <Send size={18} />
                            <span>Submit Handover</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Stats Cards - Only for Admin/Management */}
            {canViewRevenue && (
                <div className="grid grid-cols-4 mb-xl gap-4">
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                            <DollarSign size={24} />
                        </div>
                        <div>
                            <div className="stat-value">{formatCurrency(totalCollected)}</div>
                            <div className="stat-label">Total Collected</div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                            <Receipt size={24} />
                        </div>
                        <div>
                            <div className="stat-value">{formatCurrency(totalPending)}</div>
                            <div className="stat-label">Total Pending</div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                            <CreditCard size={24} />
                        </div>
                        <div>
                            <div className="stat-value">{students.length}</div>
                            <div className="stat-label">Total Students</div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
                            <History size={24} />
                        </div>
                        <div>
                            <div className="stat-value">{handoverRecords?.length || 0}</div>
                            <div className="stat-label">Handovers</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="filters-section card mb-lg">
                <div className="filters-grid">
                    <div className="search-box">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search students..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input"
                        />
                    </div>

                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="select"
                    >
                        <option value="">All Status</option>
                        <option value="paid">Paid</option>
                        <option value="unpaid">Unpaid</option>
                        <option value="partial">Partial</option>
                        <option value="overdue">Overdue</option>
                    </select>
                </div>
            </div>

            {/* Fee Records Table */}
            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Student</th>
                            <th>Roll Number</th>
                            <th>Total Fee</th>
                            <th>Paid</th>
                            <th>Pending</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStudents.map((student) => {
                            const feeStatus = getStudentFeeStatus(student.id);
                            return (
                                <tr key={student.id}>
                                    <td className="font-medium">{student.name}</td>
                                    <td>{student.rollNumber}</td>
                                    <td>{formatCurrency(feeStatus.amount)}</td>
                                    <td className="text-success-600">{formatCurrency(feeStatus.paidAmount)}</td>
                                    <td className="text-error-600">{formatCurrency(feeStatus.dueAmount)}</td>
                                    <td>
                                        <span className={`badge badge-${feeStatus.status === 'paid' ? 'success' :
                                            feeStatus.status === 'partial' ? 'warning' :
                                                'error'
                                            }`}>
                                            {feeStatus.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex gap-sm">
                                            {canManageFees && (
                                                <button
                                                    className="btn btn-sm btn-primary"
                                                    onClick={() => handlePaymentClick(student)}
                                                    disabled={feeStatus.status === 'paid'}
                                                >
                                                    <DollarSign size={16} />
                                                    <span>Pay</span>
                                                </button>
                                            )}
                                            <button className="btn btn-sm btn-outline">
                                                <Receipt size={16} />
                                                <span>Receipt</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Payment Modal */}
            <Modal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                title="Collect Fee Payment"
                footer={
                    <>
                        <button className="btn btn-outline" onClick={() => setShowPaymentModal(false)}>
                            Cancel
                        </button>
                        <button className="btn btn-success" onClick={handlePaymentSubmit}>
                            <DollarSign size={18} />
                            <span>Collect Payment</span>
                        </button>
                    </>
                }
            >
                {selectedStudent && (
                    <div className="payment-form">
                        <div className="student-details">
                            <h4>Student Details</h4>
                            <p><strong>Name:</strong> {selectedStudent.name}</p>
                            <p><strong>Roll Number:</strong> {selectedStudent.rollNumber}</p>
                            <p><strong>Total Fee:</strong> {formatCurrency(getStudentFeeStatus(selectedStudent.id).amount)}</p>
                            <p><strong>Pending Due:</strong> {formatCurrency(getStudentFeeStatus(selectedStudent.id).dueAmount)}</p>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Payment Amount *</label>
                            <input
                                type="number"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                className="input"
                                placeholder="Enter amount"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Payment Method *</label>
                            <select
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                className="select"
                            >
                                <option value="cash">Cash</option>
                                <option value="card">Card</option>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="online">Online Payment</option>
                                <option value="cheque">Cheque</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Remarks</label>
                            <textarea
                                className="textarea"
                                placeholder="Add any remarks (optional)"
                                rows="3"
                            />
                        </div>
                    </div>
                )}
            </Modal>

            {/* Handover Modal */}
            <Modal
                isOpen={showHandoverModal}
                onClose={() => setShowHandoverModal(false)}
                title="Submit Fee Handover"
                footer={
                    <>
                        <button className="btn btn-outline" onClick={() => setShowHandoverModal(false)}>
                            Cancel
                        </button>
                        <button className="btn btn-primary" onClick={handleHandoverSubmit}>
                            Confirm Handover
                        </button>
                    </>
                }
            >
                <div className="p-4">
                    <p className="mb-4">You are about to submit the collected fees. This action cannot be undone.</p>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between mb-2">
                            <span className="text-gray-600">Total Collected Today:</span>
                            <span className="font-bold">{formatCurrency(50000)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Handover To:</span>
                            <span className="font-medium">Account / Admin</span>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Import Modal */}
            {showImportModal && (
                <CSVImport
                    type="feeCollection"
                    onImport={handleImportFees}
                    onClose={() => setShowImportModal(false)}
                />
            )}

            <style jsx>{`
        .fees-page {
          animation: fadeIn 0.3s ease-in-out;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
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

        .filters-section {
          padding: var(--spacing-lg);
        }

        .filters-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: var(--spacing-md);
        }

        .search-box {
          position: relative;
        }

        .search-icon {
          position: absolute;
          left: 0.875rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--gray-400);
        }

        .search-box input {
          padding-left: 2.75rem;
        }

        .payment-form {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }

        .student-details {
          padding: var(--spacing-md);
          background: var(--gray-50);
          border-radius: var(--radius-md);
        }

        .student-details h4 {
          font-size: 1rem;
          font-weight: 600;
          color: var(--gray-900);
          margin-bottom: var(--spacing-sm);
        }

        .student-details p {
          font-size: 0.875rem;
          color: var(--gray-700);
          margin-bottom: 0.25rem;
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

export default FeesPage;
