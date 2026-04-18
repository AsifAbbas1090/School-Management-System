import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { Calendar, Award, FileText, TrendingUp, AlertCircle, BookOpen } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuthStore, useStudentsStore } from '../../store';
import { examsService, studentAttendanceService, announcementsService } from '../../services/api';
import { formatDate } from '../../utils';
import { USER_ROLES } from '../../constants';
import Loading from '../../components/common/Loading';
import Breadcrumb from '../../components/common/Breadcrumb';
import toast from 'react-hot-toast';

const VIEWER_ROLES = [
  USER_ROLES.SUPER_ADMIN,
  USER_ROLES.ADMIN,
  USER_ROLES.MANAGEMENT,
  USER_ROLES.TEACHER,
  USER_ROLES.PARENT,
];

function canViewerAccessStudent(user, student) {
  if (!user || !student) return false;
  const role = user.role;
  if ([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.MANAGEMENT, USER_ROLES.TEACHER].includes(role)) {
    return true;
  }
  if (role === USER_ROLES.PARENT && student.parentId === user.id) {
    return true;
  }
  return false;
}

/** ExamResult row helpers (nested Exam from API) */
function resultPct(r) {
  const total = r?.Exam?.totalMarks;
  const got = r?.obtainedMarks;
  if (!total || total <= 0) return 0;
  return (got / total) * 100;
}

const StudentDashboard = ({ studentId: studentIdProp }) => {
  const { studentId: routeStudentId } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const { students } = useStudentsStore();

  const effectiveStudentId =
    studentIdProp || routeStudentId || searchParams.get('studentId') || '';

  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState(null);
  const [myResults, setMyResults] = useState([]);
  const [gpa, setGpa] = useState(null);
  const [myAttendance, setMyAttendance] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  const viewerOk = user && VIEWER_ROLES.includes(user.role);

  const loadData = useCallback(async () => {
    if (!viewerOk || !effectiveStudentId) {
      setLoading(false);
      return;
    }

    const currentStudent = students.find((s) => s.id === effectiveStudentId);
    if (!currentStudent) {
      toast.error('Student not found in loaded data');
      setStudentData(null);
      setLoading(false);
      return;
    }

    if (!canViewerAccessStudent(user, currentStudent)) {
      toast.error('You do not have access to this student');
      setStudentData(null);
      setLoading(false);
      return;
    }

    setStudentData(currentStudent);
    setLoading(true);
    try {
      const [resultsRes, attendanceRes, announcementsRes] = await Promise.all([
        examsService.getStudentResults({ studentId: effectiveStudentId }),
        studentAttendanceService.getAll({ studentId: effectiveStudentId, pageSize: 1000 }),
        announcementsService.getAll({ targetRoles: ['STUDENT', 'PARENT'] }),
      ]);

      if (resultsRes.success && resultsRes.data) {
        const payload = resultsRes.data;
        const rows = payload.results ?? payload.data?.results ?? [];
        setMyResults(Array.isArray(rows) ? rows : []);
        setGpa(payload.gpa != null ? payload.gpa : null);
      } else {
        setMyResults([]);
        setGpa(null);
      }

      if (attendanceRes.success && attendanceRes.data) {
        const body = attendanceRes.data;
        const attendanceData = body.data ?? body ?? [];
        setMyAttendance(Array.isArray(attendanceData) ? attendanceData : []);
      } else {
        setMyAttendance([]);
      }

      if (announcementsRes.success && announcementsRes.data) {
        const raw = announcementsRes.data.data ?? announcementsRes.data ?? [];
        setAnnouncements(Array.isArray(raw) ? raw : []);
      } else {
        setAnnouncements([]);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [viewerOk, effectiveStudentId, students, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!viewerOk) {
    return (
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
        <AlertCircle size={64} className="text-error-500 mb-4" />
        <h1 className="page-title">Access Denied</h1>
        <p className="text-gray-600 max-w-md">You do not have permission to view this dashboard.</p>
      </div>
    );
  }

  if (!effectiveStudentId) {
    return (
      <div className="dashboard-page">
        <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Student', path: null }]} />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '3rem',
            textAlign: 'center',
            minHeight: '50vh',
          }}
        >
          <BookOpen size={48} className="text-gray-400 mb-4" />
          <h2 className="page-title">No student selected</h2>
          <p className="text-gray-600 max-w-md">
            Pass <code className="text-sm bg-gray-100 px-1 rounded">studentId</code> as a prop, route param, or{' '}
            <code className="text-sm bg-gray-100 px-1 rounded">?studentId=...</code> query.
          </p>
        </div>
      </div>
    );
  }

  const stats = useMemo(() => {
    if (!studentData) return null;

    const totalExams = myResults.length;
    const passedExams = myResults.filter((r) => resultPct(r) >= 40).length;

    const totalAttendance = myAttendance.length;
    const presentDays = myAttendance.filter((a) => a.status === 'PRESENT').length;
    const attendanceRate =
      totalAttendance > 0 ? ((presentDays / totalAttendance) * 100).toFixed(1) : 0;

    const averageMarks =
      totalExams > 0
        ? (
            myResults.reduce((sum, r) => sum + resultPct(r), 0) / totalExams
          ).toFixed(1)
        : 0;

    return {
      totalExams,
      passedExams,
      attendanceRate: parseFloat(attendanceRate),
      averageMarks: parseFloat(averageMarks),
    };
  }, [studentData, myResults, myAttendance]);

  const resultsChartData = useMemo(() => {
    return myResults.slice(0, 10).map((r) => ({
      name: r.Exam?.name || 'Exam',
      marks: r.obtainedMarks,
      total: r.Exam?.totalMarks ?? 0,
      percentage: resultPct(r).toFixed(1),
    }));
  }, [myResults]);

  const attendanceChartData = useMemo(() => {
    const sorted = [...myAttendance].sort((a, b) => new Date(b.date) - new Date(a.date));
    return sorted.slice(0, 30).map((record) => ({
      date: formatDate(record.date, 'MMM dd'),
      present: record.status === 'PRESENT' ? 1 : 0,
      absent: record.status === 'ABSENT' ? 1 : 0,
    }));
  }, [myAttendance]);

  const breadcrumbItems = [{ label: 'Dashboard', path: '/dashboard' }, { label: 'Student', path: null }];

  if (loading) {
    return <Loading fullScreen />;
  }

  if (!studentData) {
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
          <h1 className="page-title">Student not available</h1>
          <p className="text-gray-600 max-w-md">Check student id or reload students list.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <Breadcrumb items={breadcrumbItems} />

      <div className="page-header">
        <div>
          <h1>Welcome, {studentData.name}!</h1>
          <p className="text-gray-600">
            Student overview — {studentData.rollNumber}
            {gpa != null && (
              <span className="ml-2">
                · GPA <strong>{gpa}</strong>
              </span>
            )}
          </p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-lg mb-lg">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Exams</p>
                <h3 className="text-2xl font-bold">{stats.totalExams}</h3>
              </div>
              <FileText className="text-primary-500" size={32} />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average %</p>
                <h3 className="text-2xl font-bold">{stats.averageMarks}%</h3>
              </div>
              <TrendingUp className="text-success-500" size={32} />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Attendance Rate</p>
                <h3 className="text-2xl font-bold">{stats.attendanceRate}%</h3>
              </div>
              <Calendar className="text-primary-500" size={32} />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Passed Exams</p>
                <h3 className="text-2xl font-bold">
                  {stats.passedExams}/{stats.totalExams}
                </h3>
              </div>
              <Award className="text-success-500" size={32} />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg mb-lg">
        {resultsChartData.length > 0 && (
          <div className="card">
            <h3 className="card-title">Recent Exam Results</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={resultsChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="marks" fill="#3b82f6" name="Marks Obtained" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {attendanceChartData.length > 0 && (
          <div className="card">
            <h3 className="card-title">Attendance Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={attendanceChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="present" stroke="#10b981" name="Present" />
                <Line type="monotone" dataKey="absent" stroke="#ef4444" name="Absent" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        <div className="card">
          <h3 className="card-title">Recent Results</h3>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Exam</th>
                  <th>Subject</th>
                  <th>Marks</th>
                  <th>%</th>
                </tr>
              </thead>
              <tbody>
                {myResults.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center text-gray-500 py-8">
                      No results available yet
                    </td>
                  </tr>
                ) : (
                  myResults.slice(0, 5).map((r) => (
                    <tr key={r.id}>
                      <td>{r.Exam?.name || '—'}</td>
                      <td>{r.Exam?.Subject?.name || '—'}</td>
                      <td>
                        {r.obtainedMarks}/{r.Exam?.totalMarks ?? '—'}
                      </td>
                      <td>
                        <span className="badge badge-success">{resultPct(r).toFixed(0)}%</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">Recent Announcements</h3>
          <div className="space-y-md">
            {announcements.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No announcements</p>
            ) : (
              announcements.slice(0, 5).map((announcement) => (
                <div key={announcement.id} className="p-md border border-gray-200 rounded-lg">
                  <h4 className="font-semibold mb-sm">{announcement.title}</h4>
                  <p className="text-sm text-gray-600 mb-sm">{announcement.content}</p>
                  <p className="text-xs text-gray-500">{formatDate(announcement.publishDate)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
