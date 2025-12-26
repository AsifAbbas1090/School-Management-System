import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { User, Calendar, Award, FileText, TrendingUp, AlertCircle, BookOpen } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuthStore, useStudentsStore, useExamsStore, useAttendanceStore, useAnnouncementsStore } from '../../store';
import { examsService, attendanceService, announcementsService } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils';
import { USER_ROLES } from '../../constants';
import Loading from '../../components/common/Loading';
import Breadcrumb from '../../components/common/Breadcrumb';
import toast from 'react-hot-toast';

const StudentDashboard = () => {
  const { user } = useAuthStore();
  const { students } = useStudentsStore();
  const { results } = useExamsStore();
  const { attendanceRecords } = useAttendanceStore();
  const { announcements: allAnnouncements } = useAnnouncementsStore();

  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState(null);
  const [myResults, setMyResults] = useState([]);
  const [myAttendance, setMyAttendance] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  const isAuthorized = user?.role === USER_ROLES.STUDENT;

  const loadData = useCallback(async () => {
    if (!isAuthorized || !user?.id) return;

    setLoading(true);
    try {
      // Find current student
      const currentStudent = students.find(s => s.userId === user.id || s.id === user.id);
      if (!currentStudent) {
        toast.error('Student profile not found');
        setLoading(false);
        return;
      }

      setStudentData(currentStudent);

      // Load results, attendance, and announcements in parallel
      const [resultsRes, attendanceRes, announcementsRes] = await Promise.all([
        examsService.getAll({ studentId: currentStudent.id }),
        attendanceService.getByStudent(currentStudent.id),
        announcementsService.getAll({ targetRoles: ['STUDENT'] }),
      ]);

      if (resultsRes.success && resultsRes.data) {
        const resultsData = resultsRes.data.data || resultsRes.data;
        setMyResults(Array.isArray(resultsData) ? resultsData : []);
      }

      if (attendanceRes.success && attendanceRes.data) {
        const attendanceData = attendanceRes.data.data || attendanceRes.data || [];
        setMyAttendance(Array.isArray(attendanceData) ? attendanceData : []);
      } else {
        setMyAttendance([]);
      }

      if (announcementsRes.success && announcementsRes.data) {
        const announcementsData = announcementsRes.data.data || announcementsRes.data || [];
        setAnnouncements(Array.isArray(announcementsData) ? announcementsData : []);
      } else {
        setAnnouncements([]);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [user?.id, students, isAuthorized]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[70vh]">
        <AlertCircle size={64} className="text-error-500 mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600 max-w-md">Only students can view the student dashboard.</p>
      </div>
    );
  }

  const breadcrumbItems = [{ label: 'Dashboard', path: null }];

  // Calculate statistics
  const stats = useMemo(() => {
    if (!studentData) return null;

    const totalExams = myResults.length;
    const passedExams = myResults.filter(r => {
      const percentage = (r.marksObtained / r.totalMarks) * 100;
      return percentage >= 40; // Assuming 40% is passing
    }).length;

    const totalAttendance = myAttendance.length;
    const presentDays = myAttendance.filter(a => a.status === 'PRESENT').length;
    const attendanceRate = totalAttendance > 0 ? ((presentDays / totalAttendance) * 100).toFixed(1) : 0;

    const averageMarks = totalExams > 0
      ? (myResults.reduce((sum, r) => sum + ((r.marksObtained / r.totalMarks) * 100), 0) / totalExams).toFixed(1)
      : 0;

    return {
      totalExams,
      passedExams,
      attendanceRate: parseFloat(attendanceRate),
      averageMarks: parseFloat(averageMarks),
    };
  }, [studentData, myResults, myAttendance]);

  // Prepare chart data
  const resultsChartData = useMemo(() => {
    return myResults.slice(0, 10).map(result => ({
      name: result.examName || 'Exam',
      marks: result.marksObtained,
      total: result.totalMarks,
      percentage: ((result.marksObtained / result.totalMarks) * 100).toFixed(1),
    }));
  }, [myResults]);

  const attendanceChartData = useMemo(() => {
    const last30Days = myAttendance.slice(0, 30);
    return last30Days.map(record => ({
      date: formatDate(record.date, 'MMM dd'),
      present: record.status === 'PRESENT' ? 1 : 0,
      absent: record.status === 'ABSENT' ? 1 : 0,
    }));
  }, [myAttendance]);

  if (loading) {
    return <Loading fullScreen />;
  }

  if (!studentData) {
    return (
      <div className="dashboard-page">
        <Breadcrumb items={breadcrumbItems} />
        <div className="flex flex-col items-center justify-center p-12 text-center h-[70vh]">
          <AlertCircle size={64} className="text-warning-500 mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Student Profile Not Found</h1>
          <p className="text-gray-600 max-w-md">Please contact the school administration.</p>
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
          <p className="text-gray-600">Student Dashboard - {studentData.rollNumber}</p>
        </div>
      </div>

      {/* Stats Cards */}
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
                <p className="text-sm text-gray-600">Average Marks</p>
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
                <h3 className="text-2xl font-bold">{stats.passedExams}/{stats.totalExams}</h3>
              </div>
              <Award className="text-success-500" size={32} />
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg mb-lg">
        {/* Results Chart */}
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

        {/* Attendance Chart */}
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

      {/* Recent Results and Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        {/* Recent Results */}
        <div className="card">
          <h3 className="card-title">Recent Results</h3>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Exam</th>
                  <th>Subject</th>
                  <th>Marks</th>
                  <th>Grade</th>
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
                  myResults.slice(0, 5).map((result, index) => (
                    <tr key={index}>
                      <td>{result.examName || 'Exam'}</td>
                      <td>{result.subjectName || 'Subject'}</td>
                      <td>{result.marksObtained}/{result.totalMarks}</td>
                      <td>
                        <span className="badge badge-success">
                          {((result.marksObtained / result.totalMarks) * 100).toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Announcements */}
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

