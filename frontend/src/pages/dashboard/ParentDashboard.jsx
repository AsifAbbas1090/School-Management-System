import React, { useEffect, useState, useMemo } from 'react';
import { User, Calendar, DollarSign, FileText, Award, TrendingUp, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useAuthStore, useStudentsStore, useClassesStore, useExamsStore, useFeesStore, useAttendanceStore, useAnnouncementsStore } from '../../store';
import { formatCurrency, formatDate } from '../../utils';
import Loading from '../../components/common/Loading';
import Breadcrumb from '../../components/common/Breadcrumb';
import Avatar from '../../components/common/Avatar';

const ParentDashboard = () => {
  const { user } = useAuthStore();
  const { students } = useStudentsStore();
  const { classes, sections } = useClassesStore();
  const { feePayments } = useFeesStore();
  const { results } = useExamsStore();
  const { attendanceRecords } = useAttendanceStore();
  const { announcements: allAnnouncements } = useAnnouncementsStore();

  const [loading, setLoading] = useState(true);
  const [selectedChildId, setSelectedChildId] = useState(null);

  // Get children for this parent
  const myChildren = useMemo(() => {
    return students.filter(s => s.parentId === user?.id);
  }, [students, user?.id]);

  useEffect(() => {
    if (myChildren.length > 0 && !selectedChildId) {
      setSelectedChildId(myChildren[0].id);
    }

    // Simulate loading
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, [myChildren, selectedChildId]);

  const selectedChild = useMemo(() => {
    return myChildren.find(c => c.id === selectedChildId);
  }, [myChildren, selectedChildId]);

  const breadcrumbItems = [{ label: 'Dashboard', path: null }];

  // Prepare dynamic data for the selected child
  const childClass = useMemo(() => {
    if (!selectedChild) return null;
    const cls = classes.find(c => c.id === selectedChild.classId);
    const sec = sections.find(s => s.id === selectedChild.sectionId);
    return cls ? `${cls.name}-${sec?.name || ''}` : 'N/A';
  }, [selectedChild, classes, sections]);

  const childAttendance = useMemo(() => {
    if (!selectedChildId) return [{ name: 'N/A', value: 0, color: '#e5e7eb' }];
    const childRecords = attendanceRecords.filter(r => r.studentId === selectedChildId);
    if (childRecords.length === 0) return [
      { name: 'Present', value: 100, color: '#10b981' },
      { name: 'Absent', value: 0, color: '#ef4444' },
      { name: 'Leave', value: 0, color: '#f59e0b' },
    ];

    const present = childRecords.filter(r => r.status === 'present').length;
    const absent = childRecords.filter(r => r.status === 'absent').length;
    const leave = childRecords.filter(r => r.status === 'leave').length;
    const total = childRecords.length;

    return [
      { name: 'Present', value: Math.round((present / total) * 100), color: '#10b981' },
      { name: 'Absent', value: Math.round((absent / total) * 100), color: '#ef4444' },
      { name: 'Leave', value: Math.round((leave / total) * 100), color: '#f59e0b' },
    ];
  }, [selectedChildId, attendanceRecords]);

  const childFees = useMemo(() => {
    if (!selectedChildId) return { totalFee: 0, paid: 0, pending: 0, dueDate: 'N/A' };
    const childPayments = feePayments.filter(p => p.studentId === selectedChildId);

    const totalFee = childPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const paid = childPayments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
    const pending = totalFee - paid;

    // Find latest due date
    const nextDue = childPayments
      .filter(p => p.status !== 'paid')
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];

    return {
      totalFee,
      paid,
      pending,
      dueDate: nextDue ? formatDate(nextDue.dueDate) : 'No pending dues',
    };
  }, [selectedChildId, feePayments]);

  const childGrades = useMemo(() => {
    if (!selectedChildId) return [];
    return results
      .filter(r => r.studentId === selectedChildId)
      .slice(0, 5) // Last 5 results
      .map(r => ({
        subject: r.subjectName || 'Subject',
        marks: r.obtainedMarks,
        total: r.totalMarks,
        grade: r.grade || 'N/A'
      }));
  }, [selectedChildId, results]);

  const academicProgress = useMemo(() => {
    // Mock academic progress based on last 5 results
    if (childGrades.length === 0) return [
      { month: 'Aug', score: 70 },
      { month: 'Sep', score: 75 },
      { month: 'Oct', score: 80 },
    ];

    return childGrades.map((g, i) => ({
      month: `Exam ${i + 1}`,
      score: Math.round((g.marks / g.total) * 100)
    }));
  }, [childGrades]);

  // Fallback if no children linked
  if (!loading && myChildren.length === 0) {
    return (
      <div className="dashboard-page">
        <Breadcrumb items={breadcrumbItems} />
        <div className="flex flex-col items-center justify-center p-12 text-center h-[70vh]">
          <AlertCircle size={64} className="text-warning-500 mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">No Students Linked</h1>
          <p className="text-gray-600 max-w-md">There are no students linked to your account. Please contact the school administration to link your children to your profile.</p>
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

      <div className="dashboard-header flex justify-between items-end mb-xl">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Parent Dashboard</h1>
          <p className="text-gray-600">Track your child's academic progress and activities</p>
        </div>

        {myChildren.length > 1 && (
          <div className="child-selector">
            <label className="text-xs font-semibold text-gray-500 block mb-1">SWITCH CHILD</label>
            <select
              className="select select-sm border-2 border-primary-100 rounded-lg px-3 py-1 outline-none focus:border-primary-500"
              value={selectedChildId}
              onChange={(e) => setSelectedChildId(e.target.value)}
            >
              {myChildren.map(child => (
                <option key={child.id} value={child.id}>{child.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Student Profile Card */}
      <div className="card mb-xl">
        <div className="student-profile p-lg flex items-center gap-xl">
          <Avatar name={selectedChild?.name} src={selectedChild?.avatar} size="xl" />
          <div className="student-info flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedChild?.name}</h2>
            <div className="flex items-center gap-md text-sm text-gray-600">
              <span><strong>Roll No:</strong> {selectedChild?.rollNumber}</span>
              <span className="text-gray-300">•</span>
              <span><strong>Class:</strong> {childClass}</span>
            </div>
          </div>
          <div className="student-stats flex gap-lg">
            <div className="stat-box flex items-center gap-md p-md bg-gray-50 rounded-xl">
              <div className="stat-icon w-10 h-10 rounded-lg flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                <TrendingUp size={20} />
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900">
                  {childGrades.length > 0
                    ? Math.round(childGrades.reduce((acc, g) => acc + (g.marks / g.total), 0) / childGrades.length * 100) + '%'
                    : 'N/A'}
                </div>
                <div className="text-xs text-gray-500">Average Score</div>
              </div>
            </div>
            <div className="stat-box flex items-center gap-md p-md bg-gray-50 rounded-xl">
              <div className="stat-icon w-10 h-10 rounded-lg flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                <Award size={20} />
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900">Active</div>
                <div className="text-xs text-gray-500">Status</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-xl mb-xl">
        {/* Attendance Overview */}
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
                    <div className="w-3 h-3 rounded-full" style={{ background: item.color }}></div>
                    <span className="text-gray-600">{item.name}</span>
                  </div>
                  <span className="font-bold">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Fee Status */}
        <div className="card">
          <div className="card-header p-md border-b">
            <h3 className="font-bold">Fee Status</h3>
          </div>
          <div className="p-md">
            <div className="flex flex-col gap-md">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Total Fee</span>
                <span className="font-bold">{formatCurrency(childFees.totalFee)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Paid</span>
                <span className="font-bold text-success-600">{formatCurrency(childFees.paid)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Pending</span>
                <span className="font-bold text-error-600">{formatCurrency(childFees.pending)}</span>
              </div>

              <div className="mt-md">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-gradient-to-r from-success-500 to-success-600 transition-all duration-500"
                    style={{ width: `${childFees.totalFee > 0 ? (childFees.paid / childFees.totalFee) * 100 : 0}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 text-center">
                  {childFees.totalFee > 0 ? Math.round((childFees.paid / childFees.totalFee) * 100) : 0}% of fees cleared
                </div>
              </div>

              <div className="bg-warning-50 p-sm rounded-lg flex justify-between items-center mt-md text-sm">
                <span className="text-warning-700">Next Due:</span>
                <span className="font-bold text-warning-900">{childFees.dueDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Academic Progress */}
        <div className="card">
          <div className="card-header p-md border-b">
            <h3 className="font-bold">Academic Progress</h3>
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
            <div className="text-center text-xs text-gray-500 mt-md italic">
              Performance trend over recent examinations
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl">
        {/* Recent Grades */}
        <div className="card">
          <div className="card-header p-md border-b">
            <h3 className="font-bold">Recent Grades</h3>
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
              <tbody className="divide-y divide-gray-100">
                {childGrades.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="px-md py-xl text-center text-gray-400">No results found for {selectedChild?.name}</td>
                  </tr>
                ) : (
                  childGrades.map((grade, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-md py-sm font-medium text-gray-900">{grade.subject}</td>
                      <td className="px-md py-sm text-center text-gray-600">{grade.marks}/{grade.total}</td>
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

        {/* Announcements */}
        <div className="card">
          <div className="card-header p-md border-b">
            <h3 className="font-bold">School Announcements</h3>
          </div>
          <div className="p-md space-y-md">
            {allAnnouncements.filter(a => a.targetRoles.includes('parent')).slice(0, 3).map((ann) => (
              <div key={ann.id} className="p-md border rounded-xl hover:border-primary-300 transition-all cursor-pointer group">
                <div className="flex justify-between items-start mb-sm">
                  <h4 className="font-bold text-gray-900 group-hover:text-primary-600 transition-colors">{ann.title}</h4>
                  <span className="text-[10px] bg-primary-50 text-primary-700 px-2 py-1 rounded-full uppercase font-bold">Latest</span>
                </div>
                <p className="text-sm text-gray-600 mb-xs line-clamp-2">{ann.content}</p>
                <div className="text-[11px] text-gray-400 flex items-center gap-xs">
                  <Calendar size={12} />
                  {formatDate(ann.publishDate)}
                </div>
              </div>
            ))}
            {allAnnouncements.filter(a => a.targetRoles.includes('parent')).length === 0 && (
              <div className="text-center py-xl text-gray-400 italic">No recent announcements</div>
            )}
            <button className="w-full text-center text-sm font-bold text-primary-600 py-sm hover:text-primary-700 transition-colors">
              View All Announcements
            </button>
          </div>
        </div>
      </div>

      <style>{`
                .dashboard-page {
                    animation: fadeIn 0.4s ease-out;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .card {
                    background: white;
                    border-radius: 1rem;
                    border: 1px solid var(--gray-200);
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                    overflow: hidden;
                    transition: transform 0.2s;
                }
                
                .card:hover {
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                }

                .badge {
                    border-radius: 0.5rem;
                    font-weight: 600;
                }
                
                .badge-success { background: var(--success-50); color: var(--success-700); }
            `}</style>
    </div>
  );
};

export default ParentDashboard;
