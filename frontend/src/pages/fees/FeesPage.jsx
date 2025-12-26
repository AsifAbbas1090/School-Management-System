import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DollarSign, Download, Receipt, CreditCard, Search, Upload, Send, History } from 'lucide-react';
import { feesService, studentsService } from '../../services/api';
import { formatCurrency, formatDate, generateReceiptNumber } from '../../utils';
import { printTable } from '../../utils/printUtils';
import { generatePaymentReceipt } from '../../utils/pdfGenerator';
import Breadcrumb from '../../components/common/Breadcrumb';
import Modal from '../../components/common/Modal';
import CSVImport from '../../components/common/CSVImport';
import { useAuthStore, useFeesStore, useSchoolStore } from '../../store';
import { USER_ROLES } from '../../constants';
import toast from 'react-hot-toast';

const FeesPage = () => {
    const { user } = useAuthStore();
    const { handoverRecords, addHandoverRecord, addFeePayment, feePayments: storePayments } = useFeesStore();
    const { currentSchool, schools } = useSchoolStore();

    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showHandoverModal, setShowHandoverModal] = useState(false);

    const [selectedStudent, setSelectedStudent] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [handoverAmount, setHandoverAmount] = useState('');

    const [students, setStudents] = useState([]);
    const [feePayments, setFeePayments] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // Load data in parallel for better performance
            const [studentsRes, paymentsRes] = await Promise.all([
                studentsService.getAll(),
                feesService.getFeePayments()
            ]);
            
            if (studentsRes.success) {
                setStudents(studentsRes.data.data || studentsRes.data || []);
            }

            if (paymentsRes.success) {
                setFeePayments(paymentsRes.data.data || paymentsRes.data || []);
            }
        } catch (error) {
            console.error('Failed to load data:', error);
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    }, [setStudents, setFeePayments]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Calculate totals based on fetched data
    const totalCollected = feePayments.reduce((sum, p) => sum + (p.amountPaid || p.paidAmount || 0), 0);
    // Note: Pending calculation is complex without full invoice data, simplified here:
    // This is a rough estimate or needs invoice fetching. For now, we will sum dueAmounts if available.
    const totalPending = students.reduce((sum, s) => sum + (s.totalFee || 5000), 0) - totalCollected;


    const breadcrumbItems = [
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Fees Management', path: null },
    ];

    // Permission check
    const canViewRevenue = [USER_ROLES.ADMIN, USER_ROLES.MANAGEMENT, USER_ROLES.SUPER_ADMIN].includes(user?.role);
    const canManageFees = [USER_ROLES.ADMIN, USER_ROLES.MANAGEMENT, USER_ROLES.SUPER_ADMIN].includes(user?.role);
    const canHandover = user?.role === USER_ROLES.MANAGEMENT; // Only Management can hand over
    const canViewHandovers = user?.role === USER_ROLES.ADMIN; // Only Admin can view handovers

    const handlePaymentClick = (student) => {
        setSelectedStudent(student);
        setShowPaymentModal(true);
    };

    const handlePaymentSubmit = async () => {
        if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        if (!selectedStudent) {
            toast.error('No student selected');
            return;
        }

        try {
            // Get fee invoices for student
            const invoicesResponse = await feesService.getFeeInvoices({ studentId: selectedStudent.id });
            const invoices = invoicesResponse.success && invoicesResponse.data ?
                (invoicesResponse.data.data || invoicesResponse.data) : [];

            // Find pending invoice
            let pendingInvoice = invoices.find(inv => inv.status === 'PENDING' || inv.status === 'PARTIAL');

            // If no pending invoice exists, create one automatically
            if (!pendingInvoice) {
                try {
                    // Get fee structures for student's class
                    const feeStructuresResponse = await feesService.getFeeStructures({ classId: selectedStudent.classId });
                    const feeStructures = feeStructuresResponse.success && feeStructuresResponse.data ?
                        (feeStructuresResponse.data.data || feeStructuresResponse.data) : [];
                    
                    if (feeStructures.length === 0) {
                        toast.error('No fee structure found for this student\'s class. Please create a fee structure first.');
                        return;
                    }

                    // Use the first fee structure (or find monthly one)
                    const feeStructure = feeStructures.find(fs => fs.frequency === 'MONTHLY') || feeStructures[0];
                    
                    // Create invoice for current month
                    const today = new Date();
                    const dueDate = new Date(today.getFullYear(), today.getMonth() + 1, 1); // First day of next month
                    
                    const invoiceResponse = await feesService.createFeeInvoice({
                        studentId: selectedStudent.id,
                        feeStructureId: feeStructure.id,
                        amount: feeStructure.amount,
                        dueDate: dueDate.toISOString().split('T')[0],
                    });

                    if (invoiceResponse.success && invoiceResponse.data) {
                        pendingInvoice = invoiceResponse.data;
                        toast.success('Invoice created automatically');
                    } else {
                        toast.error('Failed to create invoice. Please create one manually first.');
                        return;
                    }
                } catch (error) {
                    console.error('Invoice creation error:', error);
                    toast.error('Failed to create invoice. Please create one manually first.');
                    return;
                }
            }

            const paymentData = {
                studentId: selectedStudent.id,
                invoiceId: pendingInvoice.id,
                amountPaid: parseFloat(paymentAmount),
                paymentMethod: paymentMethod.toUpperCase().replace('_', ''),
                remarks: 'Payment collected',
            };

            const response = await feesService.createFeePayment(paymentData);
            if (response.success && response.data) {
                toast.success(`Payment received! Receipt: ${response.data.receiptNumber || 'N/A'}`);
                setShowPaymentModal(false);
                setPaymentAmount('');
                setSelectedStudent(null);
                loadData();
            } else {
                toast.error(response.error || 'Failed to record payment');
            }
        } catch (error) {
            // Silently handle errors - toast shows user message
            toast.error('Failed to record payment');
        }
    };

    const handleDownloadReceipt = async (student) => {
        try {
            const feeStatus = getStudentFeeStatus(student.id);

            // Get student's class info - would need to load from API
            const studentClass = null; // TODO: Load from classes API
            const studentSection = null; // TODO: Load from sections API
            const parent = null; // TODO: Load from parents API

            // Get latest payment record (prioritize paid payments)
            const studentPayments = feePayments
                .filter(p => p.studentId === student.id && (p.paidAmount > 0 || p.status === 'paid'))
                .sort((a, b) => {
                    const dateA = a.paidDate || a.date || a.createdAt || new Date(0);
                    const dateB = b.paidDate || b.date || b.createdAt || new Date(0);
                    return new Date(dateB) - new Date(dateA);
                });

            const payment = studentPayments[0];

            // If no payment found but there's paid amount in status, create a mock payment
            const paymentData = {
                receiptNumber: payment?.receiptNumber || generateReceiptNumber(),
                amount: payment?.paidAmount || feeStatus.paidAmount || 0,
                paidDate: payment?.paidDate || payment?.date || payment?.createdAt || new Date(),
                paymentMethod: payment?.paymentMethod || 'Cash',
                feeType: 'Monthly Tuition Fee',
                transactionId: payment?.transactionId || null,
                remarks: payment?.remarks || null,
            };

            const studentData = {
                name: student.name,
                rollNumber: student.rollNumber,
                className: studentClass ? `Class ${studentClass.grade}${studentSection ? ` - Section ${studentSection.name}` : ''}` : 'N/A',
                fatherName: parent?.name || 'N/A',
                phone: parent?.phone || student.phone || 'N/A',
                contact: parent?.phone || student.phone || 'N/A',
            };

            // Get school data for PDF
            const schoolData = currentSchool || schools[0] || null;
            const schoolInfo = schoolData ? {
                name: schoolData.name,
                logo: schoolData.logo,
                principalName: schoolData.principalName,
                ownerName: schoolData.ownerName,
                address: schoolData.address,
                phone: schoolData.phone,
                email: schoolData.email,
            } : null;

            // Generate and download PDF
            const result = await generatePaymentReceipt(paymentData, studentData, schoolInfo);

            if (result.success) {
                toast.success('Receipt downloaded successfully!');
            } else {
                toast.error('Failed to generate receipt: ' + (result.error || 'Unknown error'));
            }
        } catch (error) {
            // Silently handle errors - toast shows user message
            toast.error('Failed to generate receipt. Please try again.');
        }
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

    const handleHandoverSubmit = async () => {
        const submittedAmount = parseFloat(handoverAmount);

        if (isNaN(submittedAmount) || submittedAmount <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        if (submittedAmount > totalCollected) {
            toast.error('Cannot submit more than collected amount');
            return;
        }

        try {
            const handoverData = {
                amountSubmitted: submittedAmount,
            };

            const response = await feesService.createFeeHandover(handoverData);
            if (response.success && response.data) {
                addHandoverRecord(response.data);
                toast.success(`Successfully handed over ${formatCurrency(submittedAmount)}`);
                setShowHandoverModal(false);
                setHandoverAmount('');
                loadData();
            } else {
                toast.error(response.error || 'Failed to create handover');
            }
        } catch (error) {
            // Silently handle errors - toast shows user message
            toast.error('Failed to create handover');
        }
    };

    const getStudentFeeStatus = (studentId) => {
        const student = students.find(s => s.id === studentId);
        if (!student) {
            return { status: 'unpaid', amount: 0, paidAmount: 0, dueAmount: 0 };
        }

        // Get all payments for this student
        const studentPayments = feePayments.filter(p => p.studentId === studentId);
        const totalPaid = studentPayments.reduce((sum, p) => sum + (p.amountPaid || p.paidAmount || 0), 0);

        // Get invoices for this student
        // For now, use a default fee amount - in production, load from fee structures
        const totalFee = student.monthlyFee || 5000;
        const dueAmount = Math.max(0, totalFee - totalPaid);

        let status = 'unpaid';
        if (totalPaid >= totalFee) {
            status = 'paid';
        } else if (totalPaid > 0) {
            status = 'partial';
        }

        return {
            status,
            amount: totalFee,
            paidAmount: totalPaid,
            dueAmount: dueAmount,
        };
    };

    const filteredStudents = students.filter((student) => {
        // If parent, only show their children
        if (user?.role === USER_ROLES.PARENT) {
            if (student.parentId !== user.id) return false;
        }

        const feeStatus = getStudentFeeStatus(student.id);
        const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.rollNumber.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = !filterStatus || feeStatus.status === filterStatus;

        return matchesSearch && matchesStatus;
    });



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
                        {canHandover && (
                            <button className="btn btn-primary" onClick={() => setShowHandoverModal(true)}>
                                <Send size={18} />
                                <span>Submit Handover</span>
                            </button>
                        )}
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

            {/* Handover Records - Admin View */}
            {canViewHandovers && handoverRecords && handoverRecords.length > 0 && (
                <div className="card mb-lg">
                    <div className="card-header">
                        <h3 className="card-title">Handover Records</h3>
                        <p className="text-sm text-gray-600">Money received from Management</p>
                    </div>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Date & Time</th>
                                    <th>Handed Over By</th>
                                    <th>Amount</th>
                                    <th>Total Collected</th>
                                    <th>Backup Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {handoverRecords
                                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                                    .map((record) => (
                                        <tr key={record.id}>
                                            <td>{formatDate(record.date)}</td>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                                                        <span className="text-primary-600 font-semibold text-xs">
                                                            {record.submittedBy?.charAt(0) || 'M'}
                                                        </span>
                                                    </div>
                                                    <span className="font-medium">{record.submittedBy || 'Management'}</span>
                                                </div>
                                            </td>
                                            <td className="font-semibold text-success-600">
                                                {formatCurrency(record.amount)}
                                            </td>
                                            <td>{formatCurrency(record.collectedTotal || 0)}</td>
                                            <td className="text-gray-600">
                                                {formatCurrency(record.backupAmount || 0)}
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="card-footer">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">
                                Total Handovers: {handoverRecords.length}
                            </span>
                            <span className="text-sm font-semibold text-success-600">
                                Total Received: {formatCurrency(
                                    handoverRecords.reduce((sum, r) => sum + (r.amount || 0), 0)
                                )}
                            </span>
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
                                            <button
                                                className="btn btn-sm btn-outline"
                                                onClick={() => handleDownloadReceipt(student)}
                                                disabled={feeStatus.paidAmount === 0}
                                                title={feeStatus.paidAmount === 0 ? 'No payment recorded yet' : 'Download Receipt'}
                                            >
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
                    <p className="mb-4 text-gray-600">Please enter the amount you want to submit from the collected fees.</p>

                    <div className="bg-gray-50 p-4 rounded-lg mb-4">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-600">Total Collected:</span>
                            <span className="font-bold text-lg">{formatCurrency(totalCollected)}</span>
                        </div>
                    </div>

                    <div className="form-group mb-4">
                        <label className="form-label">Amount to Submit</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">PKR</span>
                            <input
                                type="number"
                                className="input pl-12"
                                placeholder="0"
                                value={handoverAmount}
                                onChange={(e) => setHandoverAmount(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Dynamic Backup Calculation */}
                    <div className="flex justify-between items-center p-3 border rounded-md bg-white">
                        <span className="text-gray-600">Remaining (Backup):</span>
                        <span className={`font-bold ${(totalCollected - (parseFloat(handoverAmount) || 0)) < 0 ? 'text-error-600' : 'text-success-600'
                            }`}>
                            {formatCurrency(totalCollected - (parseFloat(handoverAmount) || 0))}
                        </span>
                    </div>

                    <div className="flex justify-between mt-4">
                        <span className="text-gray-700 font-medium">Handover To:</span>
                        <span className="font-semibold text-primary-700">School Admin</span>
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

            <style>{`
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

        .card-header {
          padding: var(--spacing-lg);
          border-bottom: 1px solid var(--gray-200);
        }

        .card-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--gray-900);
          margin-bottom: var(--spacing-xs);
        }

        .card-footer {
          padding: var(--spacing-lg);
          border-top: 1px solid var(--gray-200);
          background: var(--gray-50);
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
