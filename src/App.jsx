import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store';
import { USER_ROLES } from './constants';

// Layouts
import DashboardLayout from './components/layout/DashboardLayout';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import SuperAdminLoginPage from './pages/auth/SuperAdminLoginPage';

// Dashboard Pages
import AdminDashboard from './pages/dashboard/AdminDashboard';
import SuperAdminDashboard from './pages/dashboard/SuperAdminDashboard';
import ManagementDashboard from './pages/dashboard/ManagementDashboard';
import TeacherDashboard from './pages/dashboard/TeacherDashboard';
import ParentDashboard from './pages/dashboard/ParentDashboard';

// Module Pages
import StudentsPage from './pages/students/StudentsPage';
import TeachersPage from './pages/teachers/TeachersPage';
import ParentsPage from './pages/parents/ParentsPage';
import AttendancePage from './pages/attendance/AttendancePage';
import FeesPage from './pages/fees/FeesPage';
import ExamsPage from './pages/exams/ExamsPage';
import TimetablePage from './pages/timetable/TimetablePage';
import AnnouncementsPage from './pages/announcements/AnnouncementsPage';
import MessagesPage from './pages/messaging/MessagesPage';
import LeavePage from './pages/leave/LeavePage';
import SettingsPage from './pages/settings/SettingsPage';
import StaffPerformancePage from './pages/admin/StaffPerformancePage';
import SupportStaffPage from './pages/staff/SupportStaffPage';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Public Route Component (redirects to dashboard if already logged in)
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Dashboard Router - routes to correct dashboard based on user role
const DashboardRouter = () => {
  const { user } = useAuthStore();

  switch (user?.role) {
    case USER_ROLES.ADMIN:
      return <AdminDashboard />;
    case USER_ROLES.SUPER_ADMIN:
      return <SuperAdminDashboard />;
    case USER_ROLES.MANAGEMENT:
      return <ManagementDashboard />;
    case USER_ROLES.TEACHER:
      return <TeacherDashboard />;
    case USER_ROLES.PARENT:
      return <ParentDashboard />;
    default:
      return <AdminDashboard />;
  }
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />

        {/* Super Admin Login */}
        <Route
          path="/super-admin/login"
          element={
            <PublicRoute>
              <SuperAdminLoginPage />
            </PublicRoute>
          }
        />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardRouter />} />

          {/* Module Routes */}
          <Route path="students" element={<StudentsPage />} />
          <Route path="teachers" element={<TeachersPage />} />
          <Route path="parents" element={<ParentsPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="fees" element={<FeesPage />} />
          <Route path="exams" element={<ExamsPage />} />
          <Route path="timetable" element={<TimetablePage />} />
          <Route path="announcements" element={<AnnouncementsPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="staff-performance" element={<StaffPerformancePage />} />
          <Route path="support-staff" element={<SupportStaffPage />} />
          <Route path="leave" element={<LeavePage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* 404 Route */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
