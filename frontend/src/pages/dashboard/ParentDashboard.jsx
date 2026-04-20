import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Calendar, DollarSign, TrendingUp, AlertCircle, FileText, ClipboardList, BookOpen } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import toast from 'react-hot-toast';
import { useClassesStore, useAnnouncementsStore } from '../../store';
import { studentsService, feesService, studentAttendanceService, examsService, leaveService } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils';
import Loading from '../../components/common/Loading';
import Breadcrumb from '../../components/common/Breadcrumb';
import Avatar from '../../components/common/Avatar';
import ChildSelector from '../../components/parent/ChildSelector';

const normStatus = (s) => (s == null ? '' : String(s)).toLowerCase();

const TABS = [
  { id: 'overview', label: 'Overview', icon: TrendingUp },
  { id: 'fees', label: 'Fees & invoices', icon: DollarSign },
  { id: 'results', label: 'Exam results', icon: BookOpen },
  { id: 'leave', label: 'Leave', icon: ClipboardList },
];

const LEAVE_TYPES = ['SICK', 'VACATION', 'PERSONAL', 'EMERGENCY', 'OTHER'];

function mapLeaveRow(l) {
  if (!l) return l;
  const u = l.User_LeaveRequest_requestedByUserIdToUser;
  return {
    ...l,
    userName: u?.name ?? '—',
    leaveType: l.type,
    startDate: l.fromDate,
    endDate: l.toDate,
  };
}

const ParentDashboard = () => {
  const { classes, sections } = useClassesStore();
  const { announcements: allAnnouncements } = useAnnouncementsStore();

  const [loading, setLoading] = useState(true);
  const [myChildren, setMyChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const [feeSummary, setFeeSummary] = useState(null);
  const [childAttendanceRecords, setChildAttendanceRecords] = useState([]);
  const [childExamResults, setChildExamResults] = useState([]);

  const [feeInvoices, setFeeInvoices] = useState([]);
  const [feeInvoicesLoading, setFeeInvoicesLoading] = useState(false);

  const [myLeaves, setMyLeaves] = useState([]);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    type: 'SICK',
    fromDate: '',
    toDate: '',
    reason: '',
  });

  const loadChildren = useCallback(async () => {
    try {
      const response = await studentsService.getMyChildren();
      if (response.success && response.data != null) {
        const raw = response.data;
        const arr = Array.isArray(raw) ? raw : raw?.data ?? [];
        setMyChildren(Array.isArray(arr) ? arr : []);
      } else {
        setMyChildren([]);
      }
    } catch {
      setMyChildren([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  useEffect(() => {
    if (myChildren.length > 0 && !selectedChildId) {
      setSelectedChildId(myChildren[0].id);
    }
  }, [myChildren, selectedChildId]);

  const loadMyLeaves = useCallback(async () => {
    setLeaveLoading(true);
    try {
      const res = await leaveService.getMyLeave({ pageSize: 100 });
      if (res.success && res.data) {
        const body = res.data;
        const raw = Array.isArray(body.data) ? body.data : [];
        setMyLeaves(raw.map(mapLeaveRow));
      } else {
        setMyLeaves([]);
      }
    } catch {
      setMyLeaves([]);
    } finally {
      setLeaveLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMyLeaves();
  }, [loadMyLeaves]);

  useEffect(() => {
    if (!selectedChildId) {
      setFeeSummary(null);
      setChildAttendanceRecords([]);
      setChildExamResults([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [feeRes, attRes, examRes] = await Promise.all([
          feesService.getStudentSummary(selectedChildId),
          studentAttendanceService.getAll({ studentId: selectedChildId, pageSize: 1000 }),
          examsService.getStudentResults({ studentId: selectedChildId }),
        ]);
        if (cancelled) return;
        if (feeRes.success && feeRes.data) setFeeSummary(feeRes.data);
        else setFeeSummary(null);

        if (attRes.success && attRes.data) {
          const body = attRes.data;
          const attendanceData = body.data ?? body ?? [];
          setChildAttendanceRecords(Array.isArray(attendanceData) ? attendanceData : []);
        } else setChildAttendanceRecords([]);

        if (examRes.success && examRes.data) {
          const payload = examRes.data;
          const rows = payload.results ?? payload.data?.results ?? [];
          setChildExamResults(Array.isArray(rows) ? rows : []);
        } else setChildExamResults([]);
      } catch {
        if (!cancelled) {
          setFeeSummary(null);
          setChildAttendanceRecords([]);
          setChildExamResults([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedChildId]);

  useEffect(() => {
    if (activeTab !== 'fees' || !selectedChildId) return;
    let cancelled = false;
    (async () => {
      setFeeInvoicesLoading(true);
      try {
        const res = await feesService.getInvoicesByStudent(selectedChildId, { pageSize: 100 });
        if (cancelled) return;
        if (res.success && res.data) {
          const body = res.data;
          const rows = body.data ?? body ?? [];
          setFeeInvoices(Array.isArray(rows) ? rows : []);
        } else {
          setFeeInvoices([]);
        }
      } catch {
        if (!cancelled) setFeeInvoices([]);
      } finally {
        if (!cancelled) setFeeInvoicesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, selectedChildId]);

  const selectedChild = useMemo(() => myChildren.find((c) => c.id === selectedChildId), [myChildren, selectedChildId]);

  const breadcrumbItems = [{ label: 'Dashboard', path: null }];

  const childClass = useMemo(() => {
    if (!selectedChild) return null;
    if (selectedChild.Class && selectedChild.Section) {
      return `${selectedChild.Class.name}-${selectedChild.Section.name}`;
    }
    const cls = classes.find((c) => c.id === selectedChild.classId);
    const sec = sections.find((s) => s.id === selectedChild.sectionId);
    return cls ? `${cls.name}-${sec?.name || ''}` : 'N/A';
  }, [selectedChild, classes, sections]);

  const childAttendance = useMemo(() => {
    if (!selectedChildId) return [{ name: 'N/A', value: 0, color: '#e5e7eb' }];
    const childRecords = childAttendanceRecords.filter((r) => r.studentId === selectedChildId);
    if (childRecords.length === 0)
      return [
        { name: 'Present', value: 100, color: '#10b981' },
        { name: 'Absent', value: 0, color: '#ef4444' },
        { name: 'Leave', value: 0, color: '#f59e0b' },
      ];

    const present = childRecords.filter((r) => normStatus(r.status) === 'present').length;
    const absent = childRecords.filter((r) => normStatus(r.status) === 'absent').length;
    const leave = childRecords.filter((r) => normStatus(r.status) === 'leave').length;
    const total = childRecords.length;

    return [
      { name: 'Present', value: Math.round((present / total) * 100), color: '#10b981' },
      { name: 'Absent', value: Math.round((absent / total) * 100), color: '#ef4444' },
      { name: 'Leave', value: Math.round((leave / total) * 100), color: '#f59e0b' },
    ];
  }, [selectedChildId, childAttendanceRecords]);

  const childFees = useMemo(() => {
    if (!feeSummary) {
      return {
        monthlyFee: 0,
        pendingDues: 0,
        totalDue: 0,
        totalPaid: 0,
        remaining: 0,
        isAdvance: false,
        lastPaymentDate: null,
      };
    }
    return {
      monthlyFee: Number(feeSummary.monthlyFee || 0),
      pendingDues: Number(feeSummary.pendingDues || 0),
      totalDue: Number(feeSummary.totalDue || 0),
      totalPaid: Number(feeSummary.totalPaid || 0),
      remaining: Number(feeSummary.remaining || 0),
      isAdvance: Boolean(feeSummary.isAdvance),
      lastPaymentDate: feeSummary.lastPaymentDate || null,
    };
  }, [feeSummary]);

  const getFeeStatus = useCallback((remaining, totalDue) => {
    if (remaining < 0) return 'Advance';
    if (remaining <= 0) return 'Paid';
    if (remaining < totalDue) return 'Partial';
    return 'Unpaid';
  }, []);

  const childGradesPreview = useMemo(() => {
    return childExamResults.slice(0, 5).map((r) => ({
      subject: r.Exam?.Subject?.name || 'Subject',
      marks: r.obtainedMarks,
      total: r.Exam?.totalMarks,
      grade: r.grade || 'N/A',
    }));
  }, [childExamResults]);

  const academicProgress = useMemo(() => {
    if (childGradesPreview.length === 0)
      return [
        { month: 'Aug', score: 70 },
        { month: 'Sep', score: 75 },
        { month: 'Oct', score: 80 },
      ];

    return childGradesPreview.map((g, i) => ({
      month: `Exam ${i + 1}`,
      score: g.total > 0 ? Math.round((g.marks / g.total) * 100) : 0,
    }));
  }, [childGradesPreview]);

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    if (!selectedChildId) {
      toast.error('Select a child first');
      return;
    }
    if (!leaveForm.fromDate || !leaveForm.toDate || !leaveForm.reason?.trim()) {
      toast.error('Please fill in dates and reason');
      return;
    }
    setLeaveSubmitting(true);
    try {
      const res = await leaveService.createLeave({
        requestedForStudentId: selectedChildId,
        type: leaveForm.type,
        fromDate: leaveForm.fromDate,
        toDate: leaveForm.toDate,
        reason: leaveForm.reason.trim(),
      });
      if (res.success) {
        toast.success('Leave request submitted');
        setLeaveForm({ type: 'SICK', fromDate: '', toDate: '', reason: '' });
        loadMyLeaves();
      } else {
        toast.error(res.error || 'Failed to submit');
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to submit leave');
    } finally {
      setLeaveSubmitting(false);
    }
  };

  if (!loading && myChildren.length === 0) {
    return (
      <div className="dashboard-page">
        <Breadcrumb items={breadcrumbItems} />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '3rem',
            textAlign: 'center',
            minHeight: '60vh',
          }}
        >
          <AlertCircle size={64} className="text-warning-500 mb-4" />
          <h1 className="page-title">No Students Linked</h1>
          <p className="text-gray-600 max-w-md">
            There are no students linked to your account. Please contact the school administration to link your children to your profile.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <Loading fullScreen />;
  }

  return (
    <div className="dashboard-page">
      <Breadcrumb items={breadcrumbItems} />

      <div className="dashboard-header flex flex-wrap justify-between items-end gap-4 mb-xl">
        <div>
          <h1 className="page-title">Parent Dashboard</h1>
          <p className="text-gray-600">Track your children&apos;s progress, fees, and leave</p>
        </div>
        <ChildSelector
          label="SELECT CHILD"
          students={myChildren}
          value={selectedChildId}
          onChange={setSelectedChildId}
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-xl border-b border-gray-200 pb-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                active
                  ? 'bg-primary-100 text-primary-800 border-2 border-primary-200'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-2 border-transparent'
              }`}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Profile strip (all tabs) */}
      <div className="card mb-xl">
        <div className="student-profile p-lg flex items-center gap-6">
          <div className="flex-shrink-0">
            <Avatar name={selectedChild?.name} src={selectedChild?.avatar} size="xl" />
          </div>
          <div className="student-info flex-1">
            <h2 className="page-title" style={{ textTransform: 'capitalize' }}>
              {selectedChild?.name}
            </h2>
            <div className="flex items-center gap-md text-sm text-gray-600">
              <span>
                <strong>Roll No:</strong> {selectedChild?.rollNumber}
              </span>
              <span className="text-gray-300">•</span>
              <span>
                <strong>Class:</strong> {childClass}
              </span>
            </div>
          </div>
        </div>
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-xl mb-xl">
            <div className="card">
              <div className="card-header p-md border-b">
                <h3 className="font-bold">Attendance</h3>
              </div>
              <div className="p-md">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={childAttendance}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {childAttendance.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-sm mt-md">
                  {childAttendance.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-sm">
                        <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                        <span className="text-gray-600">{item.name}</span>
                      </div>
                      <span className="font-bold">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header p-md border-b">
                <h3 className="font-bold">Fee status (summary)</h3>
              </div>
              <div className="p-md">
                <div className="flex flex-col gap-md">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Monthly Fee</span>
                    <span className="font-bold text-gray-900">{formatCurrency(childFees.monthlyFee)}</span>
                  </div>
                  {childFees.pendingDues > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Opening Dues</span>
                      <span className="font-bold text-gray-900">{formatCurrency(childFees.pendingDues)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Total Due</span>
                    <span className="font-bold text-gray-900">{formatCurrency(childFees.totalDue)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Total Paid</span>
                    <span className="font-bold text-success-600">{formatCurrency(childFees.totalPaid)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between items-center">
                    <span className="text-sm text-gray-700 font-medium">Remaining</span>
                    {childFees.remaining < 0 ? (
                      <span className="font-bold text-primary-700">{formatCurrency(Math.abs(childFees.remaining))} Advance Credit</span>
                    ) : (
                      <span className={`font-bold ${childFees.remaining > 0 ? 'text-error-600' : 'text-success-600'}`}>
                        {formatCurrency(childFees.remaining)}
                      </span>
                    )}
                  </div>
                  <div className="bg-gray-50 p-sm rounded-lg text-sm flex justify-between">
                    <span className="text-gray-600">Status</span>
                    <span className="font-bold">{getFeeStatus(childFees.remaining, childFees.totalDue)}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Last Payment: {childFees.lastPaymentDate ? formatDate(childFees.lastPaymentDate) : 'No payments yet'}
                  </div>
                  <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-md border border-gray-100">
                    Fee payments are recorded by the school office. Use <strong>Fees &amp; invoices</strong> for details and receipts.
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header p-md border-b">
                <h3 className="font-bold">Academic snapshot</h3>
              </div>
              <div className="p-md">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={academicProgress}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="month" hide />
                    <YAxis hide domain={[0, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: '#8b5cf6' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl">
            <div className="card">
              <div className="card-header p-md border-b">
                <h3 className="font-bold">Recent grades (preview)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                    <tr>
                      <th className="px-md py-md">Subject</th>
                      <th className="px-md py-md text-center">Marks</th>
                      <th className="px-md py-md text-right">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {childGradesPreview.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="px-md py-xl text-center text-gray-400">
                          No results yet
                        </td>
                      </tr>
                    ) : (
                      childGradesPreview.map((grade, index) => (
                        <tr key={index}>
                          <td className="px-md py-sm">{grade.subject}</td>
                          <td className="px-md py-sm text-center">
                            {grade.marks}/{grade.total}
                          </td>
                          <td className="px-md py-sm text-right">
                            <span className="badge badge-success px-sm py-xs text-xs">{grade.grade}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <div className="card-header p-md border-b">
                <h3 className="font-bold">School announcements</h3>
              </div>
              <div className="p-md space-y-md">
                {allAnnouncements
                  .filter((a) => a.targetRoles.includes('parent'))
                  .slice(0, 3)
                  .map((ann) => (
                    <div key={ann.id} className="p-md border rounded-xl">
                      <h4 className="font-bold text-gray-900">{ann.title}</h4>
                      <p className="text-sm text-gray-600 line-clamp-2">{ann.content}</p>
                      <div className="text-[11px] text-gray-400 mt-sm flex items-center gap-xs">
                        <Calendar size={12} />
                        {formatDate(ann.publishDate)}
                      </div>
                    </div>
                  ))}
                {allAnnouncements.filter((a) => a.targetRoles.includes('parent')).length === 0 && (
                  <div className="text-center py-xl text-gray-400 italic">No announcements</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'fees' && (
        <>
        <div className="card mb-xl">
          <div className="card-header p-md border-b">
            <h3 className="font-bold">Fee summary — {selectedChild?.name}</h3>
          </div>
          <div className="p-md flex flex-col gap-md">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Monthly Fee</span>
              <span className="font-bold">{formatCurrency(childFees.monthlyFee)}</span>
            </div>
            {childFees.pendingDues > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Opening Dues</span>
                <span className="font-bold">{formatCurrency(childFees.pendingDues)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Total Due</span>
              <span className="font-bold">{formatCurrency(childFees.totalDue)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Total Paid</span>
              <span className="font-bold text-success-600">{formatCurrency(childFees.totalPaid)}</span>
            </div>
            <div className="flex justify-between items-center text-sm border-t pt-2">
              <span className="text-gray-700 font-medium">Remaining</span>
              {childFees.remaining < 0 ? (
                <span className="font-bold text-primary-700">{formatCurrency(Math.abs(childFees.remaining))} Advance</span>
              ) : (
                <span className={`font-bold ${childFees.remaining > 0 ? 'text-error-600' : 'text-success-600'}`}>
                  {formatCurrency(childFees.remaining)}
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500">
              Status: <span className="font-semibold">{getFeeStatus(childFees.remaining, childFees.totalDue)}</span>
              {' · '}
              Last: {childFees.lastPaymentDate ? formatDate(childFees.lastPaymentDate) : 'No payments yet'}
            </div>
            <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-md border border-gray-100">
              Payments are entered by school staff only. Contact the office for fee deposits or corrections.
            </p>
          </div>
        </div>
        <div className="card">
          <div className="card-header p-md border-b flex justify-between items-center">
            <h3 className="font-bold flex items-center gap-2">
              <FileText size={20} />
              Fee invoices & payment status
            </h3>
            {feeInvoicesLoading && <span className="text-sm text-gray-500">Loading…</span>}
          </div>
          <div className="overflow-x-auto p-md">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                <tr>
                  <th className="px-md py-md">Due</th>
                  <th className="px-md py-md">Amount</th>
                  <th className="px-md py-md">Paid</th>
                  <th className="px-md py-md">Remaining</th>
                  <th className="px-md py-md">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {feeInvoices.length === 0 && !feeInvoicesLoading ? (
                  <tr>
                    <td colSpan="5" className="px-md py-xl text-center text-gray-400">
                      No invoices for this student
                    </td>
                  </tr>
                ) : (
                  feeInvoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="px-md py-sm">{formatDate(inv.dueDate)}</td>
                      <td className="px-md py-sm">{formatCurrency(inv.amount)}</td>
                      <td className="px-md py-sm text-success-700">{formatCurrency(inv.totalPaid ?? 0)}</td>
                      <td className="px-md py-sm">{formatCurrency(inv.remaining ?? 0)}</td>
                      <td className="px-md py-sm">
                        <span className="badge badge-success px-sm py-xs text-xs">{inv.calculatedStatus || inv.status}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      {activeTab === 'results' && (
        <div className="card">
          <div className="card-header p-md border-b">
            <h3 className="font-bold">Exam results for {selectedChild?.name}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                <tr>
                  <th className="px-md py-md">Exam / Subject</th>
                  <th className="px-md py-md">Date</th>
                  <th className="px-md py-md text-center">Marks</th>
                  <th className="px-md py-md text-right">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {childExamResults.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-md py-xl text-center text-gray-400">
                      No exam results yet
                    </td>
                  </tr>
                ) : (
                  childExamResults.map((r) => (
                    <tr key={r.id}>
                      <td className="px-md py-sm">
                        <div className="font-medium">{r.Exam?.name || 'Exam'}</div>
                        <div className="text-xs text-gray-500">{r.Exam?.Subject?.name}</div>
                      </td>
                      <td className="px-md py-sm text-gray-600">{formatDate(r.Exam?.date)}</td>
                      <td className="px-md py-sm text-center">
                        {r.obtainedMarks}/{r.Exam?.totalMarks}
                      </td>
                      <td className="px-md py-sm text-right">
                        <span className="badge badge-success px-sm py-xs text-xs">{r.grade || '—'}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'leave' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl">
          <div className="card">
            <div className="card-header p-md border-b">
              <h3 className="font-bold">Your leave requests</h3>
            </div>
            <div className="p-md">
              {leaveLoading ? (
                <p className="text-gray-500 text-sm">Loading…</p>
              ) : myLeaves.length === 0 ? (
                <p className="text-gray-400 text-sm">No leave requests yet</p>
              ) : (
                <ul className="space-y-md">
                  {myLeaves.map((lv) => (
                    <li key={lv.id} className="border rounded-lg p-md text-sm">
                      <div className="flex justify-between">
                        <span className="font-semibold capitalize">{lv.leaveType?.toLowerCase() || lv.type}</span>
                        <span
                          className={`text-xs uppercase px-2 py-0.5 rounded ${
                            lv.status === 'APPROVED'
                              ? 'bg-green-100 text-green-800'
                              : lv.status === 'REJECTED'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {lv.status}
                        </span>
                      </div>
                      {lv.Student && (
                        <div className="text-xs text-gray-500 mt-1">For: {lv.Student.name}</div>
                      )}
                      <div className="text-gray-600 mt-1">
                        {formatDate(lv.fromDate || lv.startDate)} → {formatDate(lv.toDate || lv.endDate)}
                      </div>
                      <p className="text-gray-500 mt-2">{lv.reason}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header p-md border-b">
              <h3 className="font-bold">Create leave for {selectedChild?.name}</h3>
            </div>
            <form className="p-md space-y-md" onSubmit={handleLeaveSubmit}>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Type</label>
                <select
                  className="w-full border rounded-lg px-3 py-2"
                  value={leaveForm.type}
                  onChange={(e) => setLeaveForm((f) => ({ ...f, type: e.target.value }))}
                >
                  {LEAVE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-md">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">From</label>
                  <input
                    type="date"
                    className="w-full border rounded-lg px-3 py-2"
                    value={leaveForm.fromDate}
                    onChange={(e) => setLeaveForm((f) => ({ ...f, fromDate: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">To</label>
                  <input
                    type="date"
                    className="w-full border rounded-lg px-3 py-2"
                    value={leaveForm.toDate}
                    onChange={(e) => setLeaveForm((f) => ({ ...f, toDate: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Reason</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 min-h-[100px]"
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm((f) => ({ ...f, reason: e.target.value }))}
                  placeholder="Reason for leave"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary w-full" disabled={leaveSubmitting || !selectedChildId}>
                {leaveSubmitting ? 'Submitting…' : 'Submit leave request'}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
                .dashboard-page {
                    animation: fadeIn 0.4s ease-out;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .card {
                    background: var(--bg-card);
                    border-radius: 1rem;
                    border: 1px solid var(--border-color);
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                    overflow: hidden;
                }
                .badge { border-radius: 0.5rem; font-weight: 600; }
                .badge-success { background: var(--success-50); color: var(--success-700); }
            `}</style>
    </div>
  );
};

export default ParentDashboard;
