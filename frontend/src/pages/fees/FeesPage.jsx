import React, { useState, useEffect, useMemo, useCallback } from 'react';

const FEES_STUDENTS_PAGE_SIZE = 50;
const FEE_PAYMENTS_PAGE_SIZE = 25;
const MONEY_EPS = 0.01;

/** Fee is due from the student's admission month onward (calendar month periods). */
function isLiableForFeePeriod(student, month, year) {
    if (!student?.admissionDate) return true;
    const adm = new Date(student.admissionDate);
    const periodIdx = year * 12 + (month - 1);
    const admIdx = adm.getFullYear() * 12 + adm.getMonth();
    return periodIdx >= admIdx;
}

/** Amount due for that month once a payment row exists (respects discount on file). */
function expectedAmountForPeriod(student, payment) {
    const mf = Number(student?.monthlyFee) || 0;
    if (!payment) return mf;
    const orig = Number(payment.originalAmount) || 0;
    const disc = Number(payment.discountAmount) || 0;
    return Math.max(0, orig - disc);
}

/** Compare amountPaid vs expected — fixes "Paid" badge when only partial was received. */
function feeRowStatus(student, payment, month, year) {
    if (!isLiableForFeePeriod(student, month, year)) {
        return { kind: 'na', liable: false, expected: 0, paid: 0, remaining: 0, payment: null };
    }
    const expected = expectedAmountForPeriod(student, payment);
    const paidNum = payment ? Number(payment.amountPaid) || 0 : 0;
    if (!payment || paidNum <= MONEY_EPS) {
        return { kind: 'unpaid', liable: true, expected, paid: 0, remaining: expected, payment: null };
    }
    if (paidNum + MONEY_EPS < expected) {
        return {
            kind: 'partial',
            liable: true,
            expected,
            paid: paidNum,
            remaining: Math.max(0, expected - paidNum),
            payment,
        };
    }
    if (paidNum > expected + MONEY_EPS) {
        return { kind: 'overpaid', liable: true, expected, paid: paidNum, remaining: paidNum - expected, payment };
    }
    return { kind: 'paid', liable: true, expected, paid: paidNum, remaining: 0, payment };
}

/** Merge all payment pages for a month/year (parents must pass studentId for API). */
async function fetchAllFeePaymentsForMonth(feesService, month, year, studentId) {
    let page = 1;
    const all = [];
    let totalPages = 1;
    do {
        const res = await feesService.getFeePayments({
            month,
            year,
            page,
            pageSize: FEE_PAYMENTS_PAGE_SIZE,
            ...(studentId ? { studentId } : {}),
        });
        if (!res.success) break;
        const body = res.data;
        const chunk = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [];
        const meta = body?.meta;
        all.push(...chunk);
        totalPages = meta?.totalPages ?? 1;
        page += 1;
    } while (page <= totalPages);
    return all;
}
import { DollarSign, Download, Receipt, Search, CheckCircle, AlertCircle, TrendingUp, Plus, Printer, Upload } from 'lucide-react';
import { feesService, studentsService, classesService } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils';
import Breadcrumb from '../../components/common/Breadcrumb';
import Modal from '../../components/common/Modal';
import CSVImport from '../../components/common/CSVImport';
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
    const [studentsPage, setStudentsPage] = useState(1);
    const [studentsMeta, setStudentsMeta] = useState({
        total: 0,
        page: 1,
        pageSize: FEES_STUDENTS_PAGE_SIZE,
        totalPages: 1,
    });
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    /** Lightweight lookup for admin (pageSize 20); does not load until 2+ characters. */
    const [studentPickerQuery, setStudentPickerQuery] = useState('');
    const [debouncedPickerQuery, setDebouncedPickerQuery] = useState('');
    const [studentPickerOptions, setStudentPickerOptions] = useState([]);
    
    // Payment modal
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [discountPercentage, setDiscountPercentage] = useState(0);
    const [amountReceived, setAmountReceived] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [remarks, setRemarks] = useState('');
    /** Independent of page-level fee table filters (filterMonth / filterYear). */
    const [paymentMonth, setPaymentMonth] = useState(() => new Date().getMonth() + 1);
    const [paymentYear, setPaymentYear] = useState(() => new Date().getFullYear());
    /** When set, PUT top-up / correct total for that month instead of POST. */
    const [editingPaymentId, setEditingPaymentId] = useState(null);

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
    const [showFeeImportModal, setShowFeeImportModal] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
        return () => clearTimeout(t);
    }, [searchTerm]);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedPickerQuery(studentPickerQuery.trim()), 300);
        return () => clearTimeout(t);
    }, [studentPickerQuery]);

    useEffect(() => {
        if (!isAdmin || debouncedPickerQuery.length < 2) {
            setStudentPickerOptions([]);
            return;
        }
        let cancelled = false;
        (async () => {
            const res = await studentsService.getAll({
                search: debouncedPickerQuery,
                pageSize: 20,
                page: 1,
            });
            if (cancelled || !res.success) return;
            const payload = res.data;
            const list = payload?.data ?? payload;
            setStudentPickerOptions(Array.isArray(list) ? list : []);
        })();
        return () => {
            cancelled = true;
        };
    }, [isAdmin, debouncedPickerQuery]);

    // Load core: classes, students (paginated / my-children), all payment rows for month (chunked)
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const classesRes = await classesService.getAll();
            if (classesRes.success) setClasses(classesRes.data.data || classesRes.data || []);

            if (isParent) {
                const ch = await studentsService.getMyChildren();
                if (ch.success) {
                    const list = Array.isArray(ch.data) ? ch.data : [];
                    setStudents(list);
                    setStudentsMeta({
                        total: list.length,
                        page: 1,
                        pageSize: FEES_STUDENTS_PAGE_SIZE,
                        totalPages: 1,
                    });
                    const childId = selectedChildId || list[0]?.id || null;
                    if (list.length > 0 && !selectedChildId) {
                        setSelectedChildId(list[0].id);
                    }
                    const payAll = childId
                        ? await fetchAllFeePaymentsForMonth(feesService, filterMonth, filterYear, childId)
                        : [];
                    setFeePayments(payAll);
                } else {
                    setFeePayments([]);
                }
            } else {
                const searchQ = debouncedSearchTerm.trim();
                const searchParam = searchQ.length >= 2 ? searchQ : undefined;
                const studentsRes = await studentsService.getAll({
                    page: studentsPage,
                    pageSize: FEES_STUDENTS_PAGE_SIZE,
                    ...(searchParam && { search: searchParam }),
                    ...(filterClass && { classId: filterClass }),
                });
                if (studentsRes.success) {
                    const payload = studentsRes.data;
                    const list = payload?.data ?? payload;
                    const meta = payload?.meta;
                    setStudents(Array.isArray(list) ? list : []);
                    if (meta && typeof meta.total === 'number') {
                        setStudentsMeta(meta);
                    }
                }
                const payAll = await fetchAllFeePaymentsForMonth(feesService, filterMonth, filterYear);
                setFeePayments(payAll);
            }
        } catch (error) {
            console.error('Failed to load data:', error);
            toast.error('Failed to load fee data');
        } finally {
            setLoading(false);
        }
    }, [isParent, filterMonth, filterYear, debouncedSearchTerm, studentsPage, filterClass, selectedChildId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleFeeImportResult = useCallback(
        (result) => {
            if (!result?.success) {
                toast.error(result?.error || 'Import failed');
                return;
            }
            const d = result.data;
            if (!d) return;
            const ok = typeof d.success === 'number' ? d.success : 0;
            const skipped = typeof d.skipped === 'number' ? d.skipped : 0;
            const fail = typeof d.failed === 'number' ? d.failed : 0;
            toast.success(`Imported ${ok} payment(s). ${skipped} skipped. ${fail} failed.`, { duration: 5000 });
            if (Array.isArray(d.skippedDetails) && d.skippedDetails.length > 0) {
                toast(d.skippedDetails.slice(0, 12).join('\n'), { duration: 18000 });
            }
            if (Array.isArray(d.errors) && d.errors.length > 0) {
                toast.error(d.errors.slice(0, 8).join(' · '), { duration: 12000 });
            }
            loadData();
        },
        [loadData],
    );

    // Revenue stats after main fee data is ready (not blocking first paint of the table)
    useEffect(() => {
        if (!isAdmin || loading) return;
        let cancelled = false;
        (async () => {
            try {
                const statsRes = await feesService.getRevenueStats(filterMonth, filterYear);
                if (!cancelled && statsRes.success) setRevenueStats(statsRes.data);
            } catch (e) {
                console.error(e);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isAdmin, loading, filterMonth, filterYear]);

    // Handovers: load only when admin opens that tab
    useEffect(() => {
        if (!isAdmin || activeTab !== 'handovers') return;
        let cancelled = false;
        (async () => {
            try {
                const [handoverSummaryRes, handoversRes] = await Promise.all([
                    feesService.getHandoverSummary(),
                    feesService.getFeeHandovers({ pageSize: 50 }),
                ]);
                if (cancelled) return;
                if (handoverSummaryRes.success) setHandoverSummary(handoverSummaryRes.data);
                if (handoversRes.success) setHandovers(handoversRes.data?.data || []);
            } catch (e) {
                console.error(e);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isAdmin, activeTab]);

    // Per-period fee status (partial vs paid uses amountPaid vs expected after discount)
    const getStudentFeeStatus = useCallback((studentId) => {
        const student = students.find((s) => s.id === studentId);
        if (!student) {
            return {
                paid: false,
                monthlyFee: 0,
                payment: null,
                row: { kind: 'unpaid', liable: true, expected: 0, paid: 0, remaining: 0, payment: null },
            };
        }
        const payment = feePayments.find(
            (p) => p.studentId === studentId && p.month === filterMonth && p.year === filterYear,
        );
        const row = feeRowStatus(student, payment, filterMonth, filterYear);
        const paidFilter = row.kind === 'paid' || row.kind === 'overpaid';
        return {
            paid: paidFilter,
            monthlyFee: student.monthlyFee || 0,
            payment: row.payment,
            row,
        };
    }, [students, feePayments, filterMonth, filterYear]);

    // Filtered students (search/class for admin are server-side; parent list is small — client filters)
    const filteredStudents = useMemo(() => {
        let filtered = students;

        if (isParent && selectedChildId) {
            filtered = filtered.filter(s => s.id === selectedChildId);
        }

        if (isParent) {
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                filtered = filtered.filter(s =>
                    s.name.toLowerCase().includes(term) ||
                    s.rollNumber.toLowerCase().includes(term) ||
                    (s.Class?.name && s.Class.name.toLowerCase().includes(term))
                );
            }
            if (filterClass) {
                filtered = filtered.filter(s => s.classId === filterClass);
            }
        }

        if (filterPaid !== 'all') {
            filtered = filtered.filter(s => {
                const status = getStudentFeeStatus(s.id);
                return filterPaid === 'paid' ? status.paid : !status.paid;
            });
        }

        return filtered;
    }, [students, searchTerm, filterPaid, filterClass, isParent, selectedChildId, getStudentFeeStatus]);

    useEffect(() => {
        setStudentsPage(1);
    }, [debouncedSearchTerm, filterClass, filterMonth, filterYear]);

    const feesTotalPages = isParent ? 1 : studentsMeta.totalPages;

    // Handle payment submission — POST first payment for a month, or PUT to set new cumulative total (partial top-up)
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

        const amountValue = parseFloat(amountReceived);
        if (isNaN(amountValue) || amountValue <= 0) {
            toast.error('Please enter an amount greater than zero');
            return;
        }

        const existingPayment = feePayments.find(
            (p) => p.studentId === selectedStudent.id && p.month === paymentMonth && p.year === paymentYear,
        );

        try {
            if (editingPaymentId) {
                const response = await feesService.updateFeePayment(editingPaymentId, {
                    amountPaid: amountValue,
                    paymentMethod,
                    remarks: remarks || null,
                });
                if (response.success) {
                    toast.success('Payment updated successfully');
                    setShowPaymentModal(false);
                    setSelectedStudent(null);
                    setEditingPaymentId(null);
                    setDiscountPercentage(0);
                    setAmountReceived('');
                    setPaymentMethod('CASH');
                    setRemarks('');
                    await loadData();
                } else {
                    toast.error(response.error || 'Failed to update payment');
                }
                return;
            }

            if (existingPayment) {
                toast.error(
                    'A payment already exists for this month. Close and use Pay remainder / Add payment from the row to update the total.',
                );
                return;
            }

            const discountAmount = (monthlyFee * (isParent ? 0 : discountPercentage)) / 100;
            const calculatedAmount = monthlyFee - discountAmount;
            const actualAmountPaid = amountValue;

            const paymentData = {
                studentId: selectedStudent.id,
                month: paymentMonth,
                year: paymentYear,
                originalAmount: monthlyFee,
                discountPercentage: isParent ? 0 : discountPercentage,
                amountPaid: actualAmountPaid,
                paymentMethod,
                remarks: remarks || null,
            };

            const response = await feesService.createFeePayment(paymentData);
            if (response.success) {
                const remaining = calculatedAmount - actualAmountPaid;
                if (remaining > MONEY_EPS) {
                    toast.success(
                        `Payment of ${formatCurrency(actualAmountPaid)} recorded. Remaining this month: ${formatCurrency(remaining)}`,
                    );
                } else if (remaining < -MONEY_EPS) {
                    toast.success(
                        `Payment of ${formatCurrency(actualAmountPaid)} recorded. Surplus: ${formatCurrency(Math.abs(remaining))} (credit toward other months)`,
                    );
                } else {
                    toast.success(`Payment of ${formatCurrency(actualAmountPaid)} recorded successfully`);
                }
                setShowPaymentModal(false);
                setSelectedStudent(null);
                setEditingPaymentId(null);
                setDiscountPercentage(0);
                setAmountReceived('');
                setPaymentMethod('CASH');
                setRemarks('');
                const nAfterPay = new Date();
                setPaymentMonth(nAfterPay.getMonth() + 1);
                setPaymentYear(nAfterPay.getFullYear());
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
                if (isAdmin) {
                    const [handoverSummaryRes, handoversRes] = await Promise.all([
                        feesService.getHandoverSummary(),
                        feesService.getFeeHandovers({ pageSize: 50 }),
                    ]);
                    if (handoverSummaryRes.success) setHandoverSummary(handoverSummaryRes.data);
                    if (handoversRes.success) setHandovers(handoversRes.data?.data || []);
                }
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

    // Open payment modal — modal month/year default to table filter; change there to pay a future month early
    const handleOpenPaymentModal = (student) => {
        const st = getStudentFeeStatus(student.id);
        if (st.row.kind === 'na') {
            toast.error('No fee for this calendar month (student was not yet admitted).');
            return;
        }
        if (st.row.kind === 'paid') {
            toast.error(
                'This month is already paid in full. Change the Month filter above to record a payment for another period (e.g. next month in advance).',
            );
            return;
        }
        if (st.row.kind === 'overpaid') {
            toast.error('This month shows a surplus. Contact the school to adjust, or pay a different month using the filters.');
            return;
        }

        setPaymentMonth(filterMonth);
        setPaymentYear(filterYear);
        setSelectedStudent(student);
        setDiscountPercentage(st.row.payment ? st.row.payment.discountPercentage || 0 : 0);
        const expected = st.row.expected || student.monthlyFee || 0;

        if (st.row.kind === 'partial' && st.row.payment) {
            setEditingPaymentId(st.row.payment.id);
            setAmountReceived(expected.toFixed(2));
            setPaymentMethod(st.row.payment.paymentMethod || 'CASH');
            setRemarks(st.row.payment.remarks || '');
        } else {
            setEditingPaymentId(null);
            setAmountReceived(expected.toFixed(2));
            setPaymentMethod('CASH');
            setRemarks('');
        }
        setShowPaymentModal(true);
    };

    // Calculate totals for filtered students (respects partial payments and admission month)
    const totals = useMemo(() => {
        const totalExpected = filteredStudents.reduce((sum, s) => {
            const st = getStudentFeeStatus(s.id);
            if (st.row.kind === 'na') return sum;
            return sum + (st.row.expected || 0);
        }, 0);
        const totalPaid = filteredStudents.reduce((sum, s) => {
            const st = getStudentFeeStatus(s.id);
            if (st.row.kind === 'na') return sum;
            return sum + (st.row.payment ? st.row.paid : 0);
        }, 0);
        const totalPending = Math.max(0, totalExpected - totalPaid);

        return { totalExpected, totalPaid, totalPending };
    }, [filteredStudents, getStudentFeeStatus]);

    // Get month name
    const getMonthName = (month) => {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        return months[month - 1] || '';
    };

    // Discount / due for payment modal (use saved row when topping up)
    const paymentCalculations = useMemo(() => {
        if (!selectedStudent) return { original: 0, discount: 0, calculated: 0 };
        const pay = editingPaymentId ? feePayments.find((p) => p.id === editingPaymentId) : null;
        if (pay) {
            const original = Number(pay.originalAmount) || selectedStudent.monthlyFee || 0;
            const discAmt = Number(pay.discountAmount) || 0;
            const calculated = Math.max(0, original - discAmt);
            return { original, discount: discAmt, calculated };
        }
        const original = selectedStudent.monthlyFee || 0;
        const discount = (original * discountPercentage) / 100;
        const calculated = original - discount;
        return { original, discount, calculated };
    }, [selectedStudent, discountPercentage, editingPaymentId, feePayments]);

    /** Five options from (current year − 3) through (current year + 1), covering the requested end year. */
    const paymentYearOptions = useMemo(() => {
        const cy = new Date().getFullYear();
        return [cy - 3, cy - 2, cy - 1, cy, cy + 1];
    }, []);

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
                    {isAdmin && activeTab === 'payments' && (
                        <button type="button" className="btn btn-outline" onClick={() => setShowFeeImportModal(true)}>
                            <Upload size={18} /> <span>Import payments (CSV)</span>
                        </button>
                    )}
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

                    {(isAdmin || isParent) && (
                        <>
                            <div>
                                <label className="form-label">Fee month</label>
                                <select
                                    className="select"
                                    value={filterMonth}
                                    onChange={(e) => setFilterMonth(Number(e.target.value))}
                                >
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
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
                                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map((year) => (
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

                {isParent && (
                    <p className="text-xs text-gray-500 mt-md">
                        Fees are tracked by <strong>calendar month</strong>. The student owes from their <strong>admission month</strong> onward. Use Fee month/Year to see or pay any period — including paying next month early (same record is kept under that future month).
                    </p>
                )}

                {isAdmin && (
                    <div className="mt-md pt-md border-t">
                        <label className="form-label">Find student (optional, 2+ characters)</label>
                        <div className="flex gap-sm flex-wrap items-end">
                            <input
                                type="text"
                                className="input"
                                style={{ minWidth: '200px', flex: 1 }}
                                placeholder="Type to search…"
                                value={studentPickerQuery}
                                onChange={(e) => setStudentPickerQuery(e.target.value)}
                            />
                            <select
                                className="select"
                                style={{ minWidth: '220px' }}
                                value=""
                                onChange={(e) => {
                                    const id = e.target.value;
                                    if (!id) return;
                                    const s = studentPickerOptions.find((x) => x.id === id);
                                    if (s) {
                                        setStudentsPage(1);
                                        setSearchTerm(s.rollNumber || s.name);
                                    }
                                }}
                            >
                                <option value="">Select from results…</option>
                                {studentPickerOptions.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name} ({s.rollNumber})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

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
                                {(isAdmin || isParent) && <th>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                [...Array(8)].map((_, i) => <FeeRowSkeleton key={i} />)
                            ) : filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan={isAdmin || isParent ? 7 : 6} className="text-center text-gray-500 py-lg">
                                        No students found
                                    </td>
                                </tr>
                            ) : (
                                filteredStudents.map((student) => {
                                    const status = getStudentFeeStatus(student.id);
                                    const row = status.row;
                                    const statusBadge = () => {
                                        if (row.kind === 'na') {
                                            return (
                                                <span className="badge badge-gray">
                                                    <AlertCircle size={14} /> N/A
                                                </span>
                                            );
                                        }
                                        if (row.kind === 'unpaid') {
                                            return (
                                                <span className="badge badge-warning">
                                                    <AlertCircle size={14} />
                                                    Unpaid
                                                </span>
                                            );
                                        }
                                        if (row.kind === 'partial') {
                                            return (
                                                <span className="badge badge-warning" style={{ background: '#fff7ed', color: '#c2410c' }}>
                                                    <AlertCircle size={14} />
                                                    Partial
                                                </span>
                                            );
                                        }
                                        if (row.kind === 'overpaid') {
                                            return (
                                                <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                                                    <CheckCircle size={14} />
                                                    Advance
                                                </span>
                                            );
                                        }
                                        return (
                                            <span className="badge badge-success">
                                                <CheckCircle size={14} />
                                                Paid
                                            </span>
                                        );
                                    };
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
                                            <td>{statusBadge()}</td>
                                            <td>
                                                {row.kind === 'na' ? (
                                                    <span className="text-gray-400">—</span>
                                                ) : (
                                                    <div>
                                                        <div className="font-medium">
                                                            {formatCurrency(row.paid || 0)}
                                                            {row.kind === 'partial' && (
                                                                <span className="text-xs text-orange-600 ml-sm">
                                                                    {' '}
                                                                    / {formatCurrency(row.expected)} due
                                                                </span>
                                                            )}
                                                        </div>
                                                        {status.payment?.discountPercentage > 0 && (
                                                            <div className="text-xs text-gray-500">
                                                                Discount: {status.payment.discountPercentage}%
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            {(isAdmin || isParent) && (
                                                <td>
                                                    <div className="flex flex-wrap gap-xs">
                                                        {(row.kind === 'unpaid' || row.kind === 'partial') && row.liable && (
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-primary"
                                                                onClick={() => handleOpenPaymentModal(student)}
                                                            >
                                                                <Plus size={14} />
                                                                <span>{row.kind === 'partial' ? 'Pay remainder' : 'Add payment'}</span>
                                                            </button>
                                                        )}
                                                        {status.payment && (
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-secondary"
                                                                onClick={() => handleViewReceipt(status.payment)}
                                                            >
                                                                <Receipt size={14} />
                                                                <span>Receipt</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination (admin: server-driven student list) */}
                {!isParent && feesTotalPages > 1 && (
                    <div className="pagination-bar">
                        <span className="pagination-info">
                            Page {studentsPage} of {feesTotalPages} ({studentsMeta.total} students)
                        </span>
                        <div className="pagination-controls">
                            <button
                                type="button"
                                className="btn btn-sm btn-outline"
                                onClick={() => setStudentsPage((p) => Math.max(1, p - 1))}
                                disabled={studentsPage <= 1}
                            >
                                Previous
                            </button>
                            <button
                                type="button"
                                className="btn btn-sm btn-outline"
                                onClick={() => setStudentsPage((p) => Math.min(feesTotalPages, p + 1))}
                                disabled={studentsPage >= feesTotalPages}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
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
                    setEditingPaymentId(null);
                    setDiscountPercentage(0);
                    setAmountReceived('');
                    setPaymentMethod('CASH');
                    setRemarks('');
                    const n = new Date();
                    setPaymentMonth(n.getMonth() + 1);
                    setPaymentYear(n.getFullYear());
                }}
                title={editingPaymentId ? 'Update payment (top-up)' : 'Record fee payment'}
                footer={
                    <>
                        <button
                            className="btn btn-secondary"
                            onClick={() => {
                                setShowPaymentModal(false);
                                setSelectedStudent(null);
                                setEditingPaymentId(null);
                                const n = new Date();
                                setPaymentMonth(n.getMonth() + 1);
                                setPaymentYear(n.getFullYear());
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handlePaymentSubmit}
                        >
                            <DollarSign size={18} />
                            <span>{editingPaymentId ? 'Save total' : 'Record payment'}</span>
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
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Payment month & year *</label>
                            <div className="flex gap-sm flex-wrap">
                                <select
                                    className="select"
                                    style={{ minWidth: '160px', flex: 1 }}
                                    value={paymentMonth}
                                    disabled={!!editingPaymentId}
                                    onChange={(e) => setPaymentMonth(Number(e.target.value))}
                                >
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                        <option key={m} value={m}>
                                            {getMonthName(m)}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    className="select"
                                    style={{ minWidth: '100px', flex: 1 }}
                                    value={paymentYear}
                                    disabled={!!editingPaymentId}
                                    onChange={(e) => setPaymentYear(Number(e.target.value))}
                                >
                                    {paymentYearOptions.map((y) => (
                                        <option key={y} value={y}>
                                            {y}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <span className="text-xs text-gray-500 mt-xs">
                                Pick the fee period this money is for (e.g. pay April on March 29 by choosing April here). Table filters only change the list, not this field.
                            </span>
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

                        {isAdmin && (
                            <>
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
                                    <span className="text-xs text-gray-500 mt-xs">Reference only — you can enter a different amount below</span>
                                </div>
                            </>
                        )}

                        {isParent && (
                            <div className="form-group">
                                <label className="form-label">Amount due for this period (after discount)</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formatCurrency(paymentCalculations.calculated)}
                                    disabled
                                    style={{ background: '#f9fafb', color: '#6b7280' }}
                                />
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">
                                {editingPaymentId
                                    ? 'Total amount recorded for this month * (cumulative — increase to complete payment)'
                                    : 'Amount received * (for this month; can be partial or more than due)'}
                            </label>
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

            {showFeeImportModal && isAdmin && (
                <CSVImport
                    type="feePayments"
                    serverImportFn={feesService.bulkImportFeePayments}
                    onServerImportResult={handleFeeImportResult}
                    onClose={() => setShowFeeImportModal(false)}
                />
            )}

            <style>{`
                .pagination-bar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0.75rem 1rem;
                    border-top: 1px solid var(--border-color);
                    background: var(--bg-card);
                    border-radius: 0 0 var(--radius-lg) var(--radius-lg);
                }
                .pagination-info { font-size: 0.875rem; color: var(--text-secondary); }
                .pagination-controls { display: flex; gap: 4px; align-items: center; }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
            `}</style>
        </div>
    );
};

export default FeesPage;
