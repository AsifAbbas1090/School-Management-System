import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DollarSign, Download, Receipt, Search, CheckCircle, AlertCircle, TrendingUp, Plus, Printer } from 'lucide-react';
import { feesService, studentsService, classesService } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils';
import Breadcrumb from '../../components/common/Breadcrumb';
import Modal from '../../components/common/Modal';
import { useAuthStore, useSchoolStore } from '../../store';
import { USER_ROLES } from '../../constants';
import { generatePaymentReceipt } from '../../utils/pdfGenerator';
import toast from 'react-hot-toast';

const FeesPage = () => {
    const { user } = useAuthStore();
    const { currentSchool } = useSchoolStore();

    // Check if user is admin/management
    const isAdmin = [USER_ROLES.ADMIN, USER_ROLES.MANAGEMENT, USER_ROLES.SUPER_ADMIN].includes(user?.role);
    const isParent = user?.role === USER_ROLES.PARENT;

    // State
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState([]);
    const [feePayments, setFeePayments] = useState([]);
    const [revenueStats, setRevenueStats] = useState(null);
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());
    const [filterPaid, setFilterPaid] = useState('all'); // 'all', 'paid', 'unpaid'
    const [filterClass, setFilterClass] = useState('');
    const [classes, setClasses] = useState([]);
    
    // Payment modal
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [discountPercentage, setDiscountPercentage] = useState(0);
    const [amountReceived, setAmountReceived] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [remarks, setRemarks] = useState('');

    // For parents: selected child
    const [selectedChildId, setSelectedChildId] = useState(null);

    // Receipt modal
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [receiptPayload, setReceiptPayload] = useState(null);
    const [loadingReceipt, setLoadingReceipt] = useState(false);

    // Handover state
    const [activeTab, setActiveTab] = useState('payments'); // 'payments' | 'handovers'
    const [handovers, setHandovers] = useState([]);
    const [handoverSummary, setHandoverSummary] = useState(null);
    const [showHandoverModal, setShowHandoverModal] = useState(false);
    const [handoverAmount, setHandoverAmount] = useState('');
    const [submittingHandover, setSubmittingHandover] = useState(false);

    // Load data
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // Load classes for filter
            const classesRes = await classesService.getAll();
            if (classesRes.success) setClasses(classesRes.data.data || classesRes.data || []);

            // Load students
            const studentsRes = await studentsService.getAll({ pageSize: 500, page: 1 });
            if (studentsRes.success) {
                let allStudents = studentsRes.data.data || studentsRes.data || [];
                
                // For parents, filter to their children only
                if (isParent) {
                    allStudents = allStudents.filter(s => s.parentId === user?.id);
                    if (allStudents.length > 0 && !selectedChildId) {
                        setSelectedChildId(allStudents[0].id);
                    }
                }
                
                setStudents(allStudents);
            }

            // Load payments
            const paymentsRes = await feesService.getFeePayments({ 
                month: filterMonth, 
                year: filterYear,
                pageSize: 500 
            });
            if (paymentsRes.success) {
                setFeePayments(paymentsRes.data.data || paymentsRes.data || []);
            }

            // Load revenue stats + handover summary (admin only)
            if (isAdmin) {
                const [statsRes, handoverSummaryRes, handoversRes] = await Promise.all([
                    feesService.getRevenueStats(filterMonth, filterYear),
                    feesService.getHandoverSummary(),
                    feesService.getFeeHandovers({ pageSize: 50 }),
                ]);
                if (statsRes.success) setRevenueStats(statsRes.data);
                if (handoverSummaryRes.success) setHandoverSummary(handoverSummaryRes.data);
                if (handoversRes.success) setHandovers(handoversRes.data?.data || []);
            }
        } catch (error) {
            console.error('Failed to load data:', error);
            toast.error('Failed to load fee data');
        } finally {
            setLoading(false);
        }
    }, [isAdmin, isParent, user?.id, filterMonth, filterYear, selectedChildId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Get student fee status
    const getStudentFeeStatus = useCallback((studentId) => {
        const student = students.find(s => s.id === studentId);
        if (!student) return { paid: false, amount: 0, monthlyFee: 0 };

        const monthlyFee = student.monthlyFee || 0;
        const payment = feePayments.find(
            p => p.studentId === studentId && p.month === filterMonth && p.year === filterYear
        );

        return {
            paid: !!payment,
            amount: monthlyFee,
            payment: payment || null,
            monthlyFee,
        };
    }, [students, feePayments, filterMonth, filterYear]);

    // Filtered students
    const filteredStudents = useMemo(() => {
        let filtered = students;

        // For parents, show only selected child
        if (isParent && selectedChildId) {
            filtered = filtered.filter(s => s.id === selectedChildId);
        }

        // Search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(s =>
                s.name.toLowerCase().includes(term) ||
                s.rollNumber.toLowerCase().includes(term) ||
                (s.Class?.name && s.Class.name.toLowerCase().includes(term))
            );
        }

        // Class filter
        if (filterClass) {
            filtered = filtered.filter(s => s.classId === filterClass);
        }

        // Paid/unpaid filter
        if (filterPaid !== 'all') {
            filtered = filtered.filter(s => {
                const status = getStudentFeeStatus(s.id);
                return filterPaid === 'paid' ? status.paid : !status.paid;
            });
        }

        return filtered;
    }, [students, searchTerm, filterPaid, filterClass, isParent, selectedChildId, getStudentFeeStatus]);

    // Handle payment submission
    const handlePaymentSubmit = async () => {
        if (!selectedStudent) {
            toast.error('No student selected');
            return;
        }

        const monthlyFee = selectedStudent.monthlyFee || 0;
        if (monthlyFee <= 0) {
            toast.error('Student has no monthly fee set');
            return;
        }

        // Validate amount received
        const amountValue = parseFloat(amountReceived);
        if (isNaN(amountValue) || amountValue <= 0) {
            toast.error('Please enter a valid amount received');
            return;
        }

        // Check if already paid
        const existingPayment = feePayments.find(
            p => p.studentId === selectedStudent.id && p.month === filterMonth && p.year === filterYear
        );

        if (existingPayment) {
            toast.error('Payment already recorded for this month');
            return;
        }

        try {
            const discountAmount = (monthlyFee * discountPercentage) / 100;
            const calculatedAmount = monthlyFee - discountAmount;
            
            // Use the actual amount received (can be different from calculated amount)
            const actualAmountPaid = amountValue;

            const paymentData = {
                studentId: selectedStudent.id,
                month: filterMonth,
                year: filterYear,
                originalAmount: monthlyFee,
                discountPercentage,
                amountPaid: actualAmountPaid, // Actual amount received
                paymentMethod,
                remarks: remarks || null,
            };

            const response = await feesService.createFeePayment(paymentData);
            if (response.success) {
                const remaining = calculatedAmount - actualAmountPaid;
                if (remaining > 0) {
                    toast.success(`Payment of ${formatCurrency(actualAmountPaid)} recorded! Remaining: ${formatCurrency(remaining)}`);
                } else if (remaining < 0) {
                    toast.success(`Payment of ${formatCurrency(actualAmountPaid)} recorded! Surplus: ${formatCurrency(Math.abs(remaining))} (can be applied to next month)`);
                } else {
                    toast.success(`Payment of ${formatCurrency(actualAmountPaid)} recorded successfully!`);
                }
                setShowPaymentModal(false);
                setSelectedStudent(null);
                setDiscountPercentage(0);
                setAmountReceived('');
                setPaymentMethod('CASH');
                setRemarks('');
                await loadData();
            } else {
                toast.error(response.error || 'Failed to record payment');
            }
        } catch (error) {
            console.error('Payment error:', error);
            toast.error('Failed to record payment');
        }
    };

    // Submit fee handover
    const handleHandoverSubmit = async () => {
        const amount = parseFloat(handoverAmount);
        if (isNaN(amount) || amount <= 0) { toast.error('Enter a valid amount'); return; }
        if (handoverSummary && amount > handoverSummary.availableAmount) {
            toast.error(`Cannot exceed available amount: ${formatCurrency(handoverSummary.availableAmount)}`);
            return;
        }
        setSubmittingHandover(true);
        try {
            const res = await feesService.createFeeHandover({ amountSubmitted: amount });
            if (res.success) {
                toast.success('Handover recorded successfully');
                setShowHandoverModal(false);
                setHandoverAmount('');
                await loadData();
            } else {
                toast.error(res.error || 'Failed to record handover');
            }
        } finally { setSubmittingHandover(false); }
    };

    // View receipt modal
    const handleViewReceipt = async (payment) => {
        setLoadingReceipt(true);
        setShowReceiptModal(true);
        try {
            const res = await feesService.getReceiptPayload(payment.id);
            if (res.success) {
                setReceiptPayload(res.data);
            } else {
                toast.error(res.error || 'Failed to load receipt');
                setShowReceiptModal(false);
            }
        } finally {
            setLoadingReceipt(false);
        }
    };

    // Download PDF receipt
    const handleDownloadPDF = async () => {
        if (!receiptPayload) return;
        const { payment, student, school } = receiptPayload;
        const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        const result = await generatePaymentReceipt(
            {
                receiptNumber: payment.receiptNumber,
                amount: payment.amount,
                originalAmount: payment.originalAmount,
                discountPercentage: payment.discountPercentage,
                discountAmount: payment.discountAmount,
                paidDate: payment.paidDate,
                paymentMethod: payment.paymentMethod,
                feeType: `Tuition Fee — ${months[(payment.month || 1) - 1]} ${payment.year}`,
                transactionId: payment.transactionId,
                remarks: payment.remarks,
            },
            student,
            school
        );
        if (result.success) {
            toast.success('Receipt downloaded');
        } else {
            toast.error('Failed to generate PDF');
        }
    };

    // Open payment modal
    const handleOpenPaymentModal = (student) => {
        const status = getStudentFeeStatus(student.id);
        if (status.paid) {
            toast.error('Payment already recorded for this month');
            return;
        }
        setSelectedStudent(student);
        setDiscountPercentage(0);
        const monthlyFee = student.monthlyFee || 0;
        setAmountReceived(monthlyFee.toFixed(2)); // Pre-fill with monthly fee
        setPaymentMethod('CASH');
        setRemarks('');
        setShowPaymentModal(true);
    };

    // Calculate totals for filtered students
    const totals = useMemo(() => {
        const totalExpected = filteredStudents.reduce((sum, s) => sum + (s.monthlyFee || 0), 0);
        const totalPaid = filteredStudents.reduce((sum, s) => {
            const status = getStudentFeeStatus(s.id);
            return sum + (status.paid ? (status.payment?.amountPaid || 0) : 0);
        }, 0);
        const totalPending = totalExpected - totalPaid;

        return { totalExpected, totalPaid, totalPending };
    }, [filteredStudents, getStudentFeeStatus]);

    // Get month name
    const getMonthName = (month) => {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        return months[month - 1] || '';
    };

    // Calculate discount and final amount for payment modal
    const paymentCalculations = useMemo(() => {
        if (!selectedStudent) return { original: 0, discount: 0, calculated: 0 };
        const original = selectedStudent.monthlyFee || 0;
        const discount = (original * discountPercentage) / 100;
        const calculated = original - discount;
        return { original, discount, calculated };
    }, [selectedStudent, discountPercentage]);

    const FeeRowSkeleton = () => (
        <tr>
            {[...Array(6)].map((_, i) => (
                <td key={i}><div className="skeleton-line" style={{ height: 14, borderRadius: 4, background: 'var(--gray-100)', animation: 'pulse 1.5s ease-in-out infinite', width: i === 0 ? '140px' : i === 5 ? '80px' : '80px' }} /></td>
            ))}
        </tr>
    );

    return (
        <div className="container">
            <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Fees Management' }]} />

            <div className="page-header">
                <h1 className="page-title">Fees Management</h1>
                <div className="flex gap-sm">
                    {isAdmin && user?.role === USER_ROLES.MANAGEMENT && activeTab === 'handovers' && (
                        <button className="btn btn-primary" onClick={() => setShowHandoverModal(true)}>
                            <Plus size={18} /> <span>New Handover</span>
                        </button>
                    )}
                    <button className="btn btn-outline" onClick={loadData}>
                        <TrendingUp size={18} /> <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Tabs */}
            {isAdmin && (
                <div className="flex gap-sm mb-md" style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: 0 }}>
                    {['payments', 'handovers'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                padding: '0.5rem 1.25rem',
                                fontWeight: 600,
                                fontSize: '0.875rem',
                                border: 'none',
                                background: 'none',
                                cursor: 'pointer',
                                borderBottom: activeTab === tab ? '2px solid var(--primary-600)' : '2px solid transparent',
                                color: activeTab === tab ? 'var(--primary-600)' : 'var(--text-secondary)',
                                marginBottom: -2,
                            }}
                        >
                            {tab === 'payments' ? 'Fee Collections' : 'Fee Handovers'}
                        </button>
                    ))}
                </div>
            )}

            {activeTab === 'payments' && (<>
            {/* Revenue Dashboard (Admin/Management only) */}
            {isAdmin && revenueStats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-md mb-lg">
                    <div className="card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm opacity-90">Expected Revenue</p>
                                <h3 className="text-2xl font-bold mt-xs">{formatCurrency(revenueStats.expectedRevenue || 0)}</h3>
                                <p className="text-xs opacity-75 mt-xs">{revenueStats.totalStudents || 0} students</p>
                            </div>
                            <TrendingUp size={32} className="opacity-80" />
                        </div>
                    </div>

                    <div className="card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm opacity-90">Collected Revenue</p>
                                <h3 className="text-2xl font-bold mt-xs">{formatCurrency(revenueStats.collectedRevenue || 0)}</h3>
                                <p className="text-xs opacity-75 mt-xs">{revenueStats.paidStudents || 0} paid</p>
                            </div>
                            <CheckCircle size={32} className="opacity-80" />
                        </div>
                    </div>

                    <div className="card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm opacity-90">Pending Revenue</p>
                                <h3 className="text-2xl font-bold mt-xs">{formatCurrency(revenueStats.pendingRevenue || 0)}</h3>
                                <p className="text-xs opacity-75 mt-xs">{revenueStats.unpaidStudents || 0} unpaid</p>
                            </div>
                            <AlertCircle size={32} className="opacity-80" />
                        </div>
                    </div>

                    <div className="card" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white' }}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm opacity-90">Collection Rate</p>
                                <h3 className="text-2xl font-bold mt-xs">
                                    {revenueStats.expectedRevenue > 0
                                        ? Math.round((revenueStats.collectedRevenue / revenueStats.expectedRevenue) * 100)
                                        : 0}%
                                </h3>
                                <p className="text-xs opacity-75 mt-xs">{getMonthName(filterMonth)} {filterYear}</p>
                            </div>
                            <DollarSign size={32} className="opacity-80" />
                        </div>
                    </div>
                </div>
            )}

            {/* Parent View - Child Selector */}
            {isParent && students.length > 1 && (
                <div className="card mb-md">
                    <label className="form-label">Select Child</label>
                    <select
                        className="select"
                        value={selectedChildId || ''}
                        onChange={(e) => setSelectedChildId(e.target.value)}
                    >
                        {students.map(student => (
                            <option key={student.id} value={student.id}>
                                {student.name} ({student.rollNumber})
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Filters */}
            <div className="card mb-md">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-md">
                    <div>
                        <label className="form-label">Search</label>
                        <div className="input-group">
                            <Search size={18} />
                            <input
                                type="text"
                                className="input"
                                placeholder="Search by name, roll number..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {isAdmin && (
                        <>
                            <div>
                                <label className="form-label">Month</label>
                                <select
                                    className="select"
                                    value={filterMonth}
                                    onChange={(e) => setFilterMonth(Number(e.target.value))}
                                >
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                        <option key={month} value={month}>
                                            {getMonthName(month)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="form-label">Year</label>
                                <select
                                    className="select"
                                    value={filterYear}
                                    onChange={(e) => setFilterYear(Number(e.target.value))}
                                >
                                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                                        <option key={year} value={year}>
                                            {year}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}

                    {isAdmin && (
                        <div>
                            <label className="form-label">Class</label>
                            <select className="select" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
                                <option value="">All Classes</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="form-label">Status</label>
                        <select
                            className="select"
                            value={filterPaid}
                            onChange={(e) => setFilterPaid(e.target.value)}
                        >
                            <option value="all">All</option>
                            <option value="paid">Paid</option>
                            <option value="unpaid">Unpaid</option>
                        </select>
                    </div>
                </div>

                {/* Totals for filtered results */}
                {isAdmin && (
                    <div className="mt-md pt-md border-t">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Filtered Results:</span>
                            <div className="flex gap-lg">
                                <span><strong>Expected:</strong> {formatCurrency(totals.totalExpected)}</span>
                                <span><strong>Collected:</strong> {formatCurrency(totals.totalPaid)}</span>
                                <span><strong>Pending:</strong> {formatCurrency(totals.totalPending)}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Students Table */}
            <div className="card">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Roll Number</th>
                                <th>Class</th>
                                <th>Monthly Fee</th>
                                <th>Status</th>
                                <th>Amount Paid</th>
                                {isAdmin && <th>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                [...Array(8)].map((_, i) => <FeeRowSkeleton key={i} />)
                            ) : filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan={isAdmin ? 7 : 6} className="text-center text-gray-500 py-lg">
                                        No students found
                                    </td>
                                </tr>
                            ) : (
                                filteredStudents.map(student => {
                                    const status = getStudentFeeStatus(student.id);
                                    return (
                                        <tr key={student.id}>
                                            <td>
                                                <div className="flex items-center gap-md">
                                                    <div>
                                                        <div className="font-medium">{student.name}</div>
                                                        {student.email && (
                                                            <div className="text-sm text-gray-500">{student.email}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{student.rollNumber}</td>
                                            <td>{student.Class?.name || 'N/A'}</td>
                                            <td>{formatCurrency(student.monthlyFee || 0)}</td>
                                            <td>
                                                {status.paid ? (
                                                    <span className="badge badge-success">
                                                        <CheckCircle size={14} />
                                                        Paid
                                                    </span>
                                                ) : (
                                                    <span className="badge badge-warning">
                                                        <AlertCircle size={14} />
                                                        Unpaid
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                {status.paid ? (
                                                    <div>
                                                        <div className="font-medium">{formatCurrency(status.payment?.amountPaid || 0)}</div>
                                                        {status.payment?.discountPercentage > 0 && (
                                                            <div className="text-xs text-gray-500">
                                                                Discount: {status.payment.discountPercentage}%
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                            {isAdmin && (
                                                <td>
                                                    {!status.paid ? (
                                                        <button
                                                            className="btn btn-sm btn-primary"
                                                            onClick={() => handleOpenPaymentModal(student)}
                                                        >
                                                            <Plus size={14} />
                                                            <span>Add Payment</span>
                                                        </button>
                                                    ) : (
                                                        <button
                                                            className="btn btn-sm btn-secondary"
                                                            onClick={() => handleViewReceipt(status.payment)}
                                                        >
                                                            <Receipt size={14} />
                                                            <span>Receipt</span>
                                                        </button>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            </>)}

            {/* Fee Handovers Tab */}
            {activeTab === 'handovers' && isAdmin && (
                <>
                    {/* Handover Summary Cards */}
                    {handoverSummary && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-md mb-lg">
                            <div className="card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                                <p className="text-sm opacity-90">Total Collected</p>
                                <h3 className="text-2xl font-bold mt-xs">{formatCurrency(handoverSummary.totalCollected)}</h3>
                                <p className="text-xs opacity-75 mt-xs">All time fee payments</p>
                            </div>
                            <div className="card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
                                <p className="text-sm opacity-90">Total Handed Over</p>
                                <h3 className="text-2xl font-bold mt-xs">{formatCurrency(handoverSummary.totalHandedOver)}</h3>
                                <p className="text-xs opacity-75 mt-xs">Submitted to admin</p>
                            </div>
                            <div className="card" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white' }}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm opacity-90">Available for Handover</p>
                                        <h3 className="text-2xl font-bold mt-xs">{formatCurrency(handoverSummary.availableAmount)}</h3>
                                        <p className="text-xs opacity-75 mt-xs">Ready to submit</p>
                                    </div>
                                    {user?.role === USER_ROLES.MANAGEMENT && handoverSummary.availableAmount > 0 && (
                                        <button
                                            className="btn btn-sm"
                                            style={{ background: 'rgba(255,255,255,0.25)', color: 'white', border: '1px solid rgba(255,255,255,0.5)' }}
                                            onClick={() => { setHandoverAmount(handoverSummary.availableAmount.toFixed(2)); setShowHandoverModal(true); }}
                                        >
                                            Submit
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Handover History Table */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Handover History</h3>
                            {user?.role === USER_ROLES.MANAGEMENT && (
                                <button className="btn btn-sm btn-primary" onClick={() => setShowHandoverModal(true)}>
                                    <Plus size={14} /> <span>New Handover</span>
                                </button>
                            )}
                        </div>
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Submitted By</th>
                                        <th>Amount Submitted</th>
                                        <th>Total Collected at Time</th>
                                        <th>Backup Remaining</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {handovers.length === 0 ? (
                                        <tr><td colSpan={5} className="text-center text-gray-500 py-lg">No handovers recorded yet</td></tr>
                                    ) : handovers.map(h => (
                                        <tr key={h.id}>
                                            <td>{formatDate(h.submittedAt)}</td>
                                            <td>
                                                <div className="font-medium">{h.User?.name || '—'}</div>
                                                <div className="text-sm text-gray-500">{h.User?.role}</div>
                                            </td>
                                            <td><span className="font-bold text-success-700">{formatCurrency(h.amountSubmitted)}</span></td>
                                            <td>{formatCurrency(h.totalCollectedAtTime)}</td>
                                            <td>{formatCurrency(h.backupAmount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Payment Modal */}
            <Modal
                isOpen={showPaymentModal}
                onClose={() => {
                    setShowPaymentModal(false);
                    setSelectedStudent(null);
                    setDiscountPercentage(0);
                    setAmountReceived('');
                    setPaymentMethod('CASH');
                    setRemarks('');
                }}
                title="Record Fee Payment"
                footer={
                    <>
                        <button
                            className="btn btn-secondary"
                            onClick={() => {
                                setShowPaymentModal(false);
                                setSelectedStudent(null);
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handlePaymentSubmit}
                        >
                            <DollarSign size={18} />
                            <span>Record Payment</span>
                        </button>
                    </>
                }
            >
                {selectedStudent && (
                    <div>
                        <div className="mb-md p-md bg-gray-50 rounded-lg">
                            <h4 className="font-semibold mb-sm">Student Details</h4>
                            <div className="grid grid-cols-2 gap-sm text-sm">
                                <div>
                                    <span className="text-gray-600">Name:</span>
                                    <div className="font-medium">{selectedStudent.name}</div>
                                </div>
                                <div>
                                    <span className="text-gray-600">Roll Number:</span>
                                    <div className="font-medium">{selectedStudent.rollNumber}</div>
                                </div>
                                <div>
                                    <span className="text-gray-600">Class:</span>
                                    <div className="font-medium">{selectedStudent.Class?.name || 'N/A'}</div>
                                </div>
                                <div>
                                    <span className="text-gray-600">Month/Year:</span>
                                    <div className="font-medium">{getMonthName(filterMonth)} {filterYear}</div>
                                </div>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Monthly Fee Amount</label>
                            <input
                                type="text"
                                className="input"
                                value={formatCurrency(paymentCalculations.original)}
                                disabled
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Discount Percentage (0-100)</label>
                            <input
                                type="number"
                                className="input"
                                min="0"
                                max="100"
                                step="0.01"
                                value={discountPercentage}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setDiscountPercentage(Math.min(100, Math.max(0, val)));
                                }}
                            />
                            {discountPercentage > 0 && (
                                <div className="text-sm text-gray-600 mt-xs">
                                    Discount Amount: {formatCurrency(paymentCalculations.discount)}
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Calculated Amount (After Discount)</label>
                            <input
                                type="text"
                                className="input"
                                value={formatCurrency(paymentCalculations.calculated)}
                                disabled
                                style={{ background: '#f9fafb', color: '#6b7280' }}
                            />
                            <span className="text-xs text-gray-500 mt-xs">Reference only - you can enter a different amount below</span>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Amount Received * (Actual amount paid by student)</label>
                            <input
                                type="number"
                                className="input font-bold text-lg"
                                min="0"
                                step="0.01"
                                value={amountReceived}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setAmountReceived(val);
                                }}
                                placeholder="Enter amount received"
                                style={{ background: '#f0f9ff', color: '#0369a1' }}
                            />
                            {amountReceived && parseFloat(amountReceived) > 0 && (
                                <div className="text-sm mt-xs">
                                    {parseFloat(amountReceived) < paymentCalculations.calculated ? (
                                        <span className="text-orange-600">
                                            Remaining: {formatCurrency(paymentCalculations.calculated - parseFloat(amountReceived))}
                                        </span>
                                    ) : parseFloat(amountReceived) > paymentCalculations.calculated ? (
                                        <span className="text-green-600">
                                            Surplus: {formatCurrency(parseFloat(amountReceived) - paymentCalculations.calculated)} (can be applied to next month)
                                        </span>
                                    ) : (
                                        <span className="text-green-600">Full payment received</span>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Payment Method *</label>
                            <select
                                className="select"
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                            >
                                <option value="CASH">Cash</option>
                                <option value="CARD">Card</option>
                                <option value="BANK_TRANSFER">Bank Transfer</option>
                                <option value="ONLINE">Online Payment</option>
                                <option value="CHEQUE">Cheque</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Remarks (Optional)</label>
                            <textarea
                                className="textarea"
                                rows="3"
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                placeholder="Add any remarks..."
                            />
                        </div>
                    </div>
                )}
            </Modal>

            {/* Handover Modal */}
            <Modal
                isOpen={showHandoverModal}
                onClose={() => { setShowHandoverModal(false); setHandoverAmount(''); }}
                title="Record Fee Handover"
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => { setShowHandoverModal(false); setHandoverAmount(''); }}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleHandoverSubmit} disabled={submittingHandover}>
                            {submittingHandover ? 'Submitting...' : 'Submit Handover'}
                        </button>
                    </>
                }
            >
                {handoverSummary && (
                    <div>
                        <div className="mb-md p-md bg-gray-50 rounded-lg">
                            <div className="grid grid-cols-2 gap-sm text-sm">
                                <div><span className="text-gray-500">Total Collected:</span> <strong>{formatCurrency(handoverSummary.totalCollected)}</strong></div>
                                <div><span className="text-gray-500">Already Handed Over:</span> <strong>{formatCurrency(handoverSummary.totalHandedOver)}</strong></div>
                                <div className="col-span-2"><span className="text-gray-500">Available to Submit:</span> <strong className="text-success-700 text-lg">{formatCurrency(handoverSummary.availableAmount)}</strong></div>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Amount to Submit *</label>
                            <input
                                type="number"
                                className="input"
                                min="0"
                                max={handoverSummary.availableAmount}
                                step="0.01"
                                value={handoverAmount}
                                onChange={e => setHandoverAmount(e.target.value)}
                                placeholder="Enter amount to hand over"
                            />
                            <p className="text-xs text-gray-500 mt-xs">Maximum: {formatCurrency(handoverSummary.availableAmount)}</p>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Receipt Modal */}
            <Modal
                isOpen={showReceiptModal}
                onClose={() => { setShowReceiptModal(false); setReceiptPayload(null); }}
                title="Fee Payment Receipt"
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => { setShowReceiptModal(false); setReceiptPayload(null); }}>
                            Close
                        </button>
                        <button className="btn btn-primary" onClick={handleDownloadPDF} disabled={!receiptPayload || loadingReceipt}>
                            <Download size={16} />
                            <span>Download PDF</span>
                        </button>
                    </>
                }
            >
                {loadingReceipt ? (
                    <div className="flex items-center justify-center py-xl">
                        <div className="loading-spinner" />
                    </div>
                ) : receiptPayload ? (
                    <div>
                        {/* School Info */}
                        <div className="text-center mb-md pb-md" style={{ borderBottom: '2px solid var(--border-color)' }}>
                            <h3 className="font-bold text-lg">{receiptPayload.school?.name}</h3>
                            {receiptPayload.school?.address && <p className="text-sm text-gray-500">{receiptPayload.school.address}</p>}
                            {receiptPayload.school?.phone && <p className="text-sm text-gray-500">{receiptPayload.school.phone}</p>}
                        </div>

                        <div className="text-center mb-md">
                            <span className="badge badge-success" style={{ fontSize: '0.9rem', padding: '0.4rem 1rem' }}>
                                Receipt #{receiptPayload.payment?.receiptNumber}
                            </span>
                        </div>

                        {/* Student Info */}
                        <div className="mb-md p-md bg-gray-50 rounded-lg">
                            <h4 className="font-semibold mb-sm text-sm text-gray-600 uppercase">Student</h4>
                            <div className="grid grid-cols-2 gap-sm text-sm">
                                <div><span className="text-gray-500">Name:</span> <strong>{receiptPayload.student?.name}</strong></div>
                                <div><span className="text-gray-500">Roll No:</span> <strong>{receiptPayload.student?.rollNumber}</strong></div>
                                <div><span className="text-gray-500">Class:</span> <strong>{receiptPayload.student?.className}</strong></div>
                                <div><span className="text-gray-500">Father:</span> <strong>{receiptPayload.student?.fatherName}</strong></div>
                            </div>
                        </div>

                        {/* Payment Info */}
                        <div className="mb-md p-md bg-gray-50 rounded-lg">
                            <h4 className="font-semibold mb-sm text-sm text-gray-600 uppercase">Payment</h4>
                            <div className="grid grid-cols-2 gap-sm text-sm">
                                <div><span className="text-gray-500">Month/Year:</span> <strong>{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][(receiptPayload.payment?.month||1)-1]} {receiptPayload.payment?.year}</strong></div>
                                <div><span className="text-gray-500">Method:</span> <strong>{receiptPayload.payment?.paymentMethod}</strong></div>
                                <div><span className="text-gray-500">Original Fee:</span> <strong>{formatCurrency(receiptPayload.payment?.originalAmount || 0)}</strong></div>
                                {receiptPayload.payment?.discountPercentage > 0 && (
                                    <div><span className="text-gray-500">Discount ({receiptPayload.payment.discountPercentage}%):</span> <strong className="text-success-600">-{formatCurrency(receiptPayload.payment.discountAmount)}</strong></div>
                                )}
                                <div><span className="text-gray-500">Paid On:</span> <strong>{formatDate(receiptPayload.payment?.paidDate)}</strong></div>
                                {receiptPayload.payment?.transactionId && (
                                    <div><span className="text-gray-500">Txn ID:</span> <strong>{receiptPayload.payment.transactionId}</strong></div>
                                )}
                            </div>
                            {receiptPayload.payment?.remarks && (
                                <div className="mt-sm text-sm"><span className="text-gray-500">Remarks:</span> {receiptPayload.payment.remarks}</div>
                            )}
                        </div>

                        {/* Total */}
                        <div className="flex items-center justify-between p-md rounded-lg" style={{ background: 'linear-gradient(135deg, var(--primary-50), var(--primary-100))' }}>
                            <span className="font-bold text-lg">Amount Paid</span>
                            <span className="font-bold text-2xl" style={{ color: 'var(--primary-700)' }}>{formatCurrency(receiptPayload.payment?.amount || 0)}</span>
                        </div>
                    </div>
                ) : null}
            </Modal>
        </div>
    );
};

export default FeesPage;
