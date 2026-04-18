/**
 * API Service - Connects frontend to backend
 * Base URL: http://localhost:3000/api
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/** Client-side fetch timeout (ms). Short timeouts falsely report "backend not running" when the API is slow or cold. */
const REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS) || 60000;

/** Default page size for list endpoints (keep small for fast responses; backend max is 1000). */
export const API_LIST_PAGE_SIZE = 50;

/**
 * Human-readable error from Promise.allSettled + apiRequest result.
 * Use this instead of `.reason` — that is only set when the promise rejects, not when the API returns { success: false }.
 */
export function formatSettledApiError(settled) {
  if (settled.status === 'rejected') {
    const r = settled.reason;
    if (r == null) return 'Unknown error';
    return typeof r === 'string' ? r : r.message || String(r);
  }
  const v = settled.value;
  if (v?.success) return null;
  return v?.error || 'Request failed';
}

/**
 * Get auth token from localStorage
 */
const getAuthToken = () => {
  const authStorage = localStorage.getItem('auth-storage');
  if (authStorage) {
    try {
      const parsed = JSON.parse(authStorage);
      return parsed?.state?.user?.accessToken || parsed?.user?.accessToken;
    } catch (e) {
      return null;
    }
  }
  return null;
};

const getRefreshToken = () => {
  const authStorage = localStorage.getItem('auth-storage');
  if (authStorage) {
    try {
      const parsed = JSON.parse(authStorage);
      return parsed?.state?.user?.refreshToken || parsed?.user?.refreshToken;
    } catch (e) {
      return null;
    }
  }
  return null;
};

/** Update persisted Zustand user.accessToken after a successful /auth/refresh. */
function persistAccessToken(accessToken) {
  const raw = localStorage.getItem('auth-storage');
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (parsed.state?.user) {
      parsed.state.user.accessToken = accessToken;
    } else if (parsed.user) {
      parsed.user.accessToken = accessToken;
    }
    localStorage.setItem('auth-storage', JSON.stringify(parsed));
  } catch (e) {
    // ignore
  }
}

function redirectToLoginClearingAuth() {
  const currentPath = window.location.pathname;
  if (currentPath !== '/login' && currentPath !== '/super-admin/login' && !currentPath.includes('/signin')) {
    localStorage.removeItem('auth-storage');
    setTimeout(() => {
      window.location.href = '/login';
    }, 100);
  }
}

/** Single in-flight refresh so parallel 401s share one token rotation. */
let refreshInFlight = null;

async function refreshAccessTokenOnce() {
  if (refreshInFlight) return refreshInFlight;
  const rt = getRefreshToken();
  if (!rt) return false;

  refreshInFlight = (async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) return false;
      const data = await res.json();
      if (!data?.accessToken) return false;
      persistAccessToken(data.accessToken);
      return true;
    } catch {
      clearTimeout(timeoutId);
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

/**
 * Get school ID from auth storage
 */
const getSchoolId = () => {
  const authStorage = localStorage.getItem('auth-storage');
  if (authStorage) {
    try {
      const parsed = JSON.parse(authStorage);
      return parsed?.state?.user?.schoolId || parsed?.user?.schoolId;
    } catch (e) {
      return null;
    }
  }
  return null;
};

/**
 * Make API request
 */
const apiRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const url = `${API_BASE_URL}${endpoint}`;

  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(url, {
      ...config,
      signal: controller.signal,
    }).catch((fetchError) => {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        return {
          success: false,
          error:
            'Request timed out. The server may be busy—try again. If this persists, confirm the API URL (VITE_API_URL) matches your backend port.',
          data: null,
        };
      }
      const isUnreachable =
        fetchError.name === 'TypeError' ||
        fetchError.message?.includes('Failed to fetch') ||
        fetchError.message?.includes('ERR_CONNECTION_REFUSED') ||
        fetchError.message?.includes('ERR_NETWORK_CHANGED') ||
        fetchError.message?.includes('NetworkError') ||
        fetchError.message === 'CONNECTION_REFUSED';

      if (isUnreachable) {
        return {
          success: false,
          error:
            'Cannot reach the API. Start the backend and ensure VITE_API_URL points to it (e.g. http://localhost:3001/api).',
          data: null,
        };
      }
      return {
        success: false,
        error: fetchError.message || 'An error occurred',
        data: null,
      };
    });

    clearTimeout(timeoutId);

    // If response is already an error object (from catch above), return it
    if (response && typeof response === 'object' && 'success' in response && !response.success) {
      return response;
    }

    if (!response || !response.ok) {
      if (response && response.status === 0) {
        return {
          success: false,
          error:
            'Cannot reach the API. Start the backend and ensure VITE_API_URL matches the server (e.g. http://localhost:3001/api).',
          data: null,
        };
      }

      // Handle 401: try refresh once, then clear session and redirect to login
      if (response && response.status === 401) {
        const skipRefresh =
          options._authRetry ||
          options.skipAuthRefresh ||
          endpoint === '/auth/login' ||
          endpoint === '/auth/refresh';

        if (!skipRefresh) {
          const refreshed = await refreshAccessTokenOnce();
          if (refreshed) {
            return apiRequest(endpoint, { ...options, _authRetry: true });
          }
        }

        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
          try {
            const parsed = JSON.parse(authStorage);
            if (parsed?.state?.user || parsed?.user) {
              redirectToLoginClearingAuth();
            }
          } catch (e) {
            // ignore parse errors
          }
        }
        return { success: false, error: 'Unauthorized. Please login again.', data: null };
      }

      // Try to parse error response
      try {
        const data = await response.json();
        return { success: false, error: data.message || `HTTP error! status: ${response.status}`, data: null };
      } catch {
        return { success: false, error: `HTTP error! status: ${response?.status || 'unknown'}`, data: null };
      }
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    if (error.name === 'AbortError') {
      return {
        success: false,
        error:
          'Request timed out. The server may be busy—try again. Confirm VITE_API_URL matches your backend.',
        data: null,
      };
    }
    const isUnreachable =
      error.message === 'CONNECTION_REFUSED' ||
      error.name === 'TypeError' ||
      error.message?.includes('Failed to fetch') ||
      error.message?.includes('ERR_CONNECTION_REFUSED') ||
      error.message?.includes('ERR_NETWORK_CHANGED') ||
      error.message?.includes('NetworkError');

    if (isUnreachable) {
      return {
        success: false,
        error:
          'Cannot reach the API. Start the backend and ensure VITE_API_URL points to it (e.g. http://localhost:3001/api).',
        data: null,
      };
    }

    return { success: false, error: error.message || 'An error occurred', data: null };
  }
};

/**
 * Auth Service
 */
export const authService = {
  login: async (email, password, schoolId = null) => {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, schoolId }),
    });
    return response;
  },

  /** Exchange refresh token for a new access token (uses skipAuthRefresh to avoid 401 retry loops). */
  refreshToken: async (refreshToken) => {
    return apiRequest('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
      skipAuthRefresh: true,
    });
  },

  getMe: async () => {
    return apiRequest('/auth/me');
  },
};

/**
 * Schools Service (Super Admin)
 */
export const schoolsService = {
  getAll: async (query = {}) => {
    const params = new URLSearchParams(query);
    return apiRequest(`/super-admin/schools?${params}`);
  },

  getById: async (id) => {
    return apiRequest(`/super-admin/schools/${id}`);
  },

  /** School admin / management: current school from JWT (GET /school/profile). */
  getMySchoolProfile: async () => {
    return apiRequest('/school/profile');
  },

  /** School admin / management: PATCH /school/profile */
  updateMySchoolProfile: async (data) => {
    return apiRequest('/school/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  create: async (data) => {
    return apiRequest('/super-admin/schools', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** Super admin only: PATCH /super-admin/schools/:id */
  update: async (id, data) => {
    return apiRequest(`/super-admin/schools/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id) => {
    return apiRequest(`/super-admin/schools/${id}`, {
      method: 'DELETE',
    });
  },
};

/**
 * Students Service
 */
export const studentsService = {
  getAll: async (query = {}) => {
    const params = new URLSearchParams(query);
    return apiRequest(`/school/students?${params}`);
  },

  getMyChildren: async () => {
    return apiRequest('/school/students/my-children');
  },

  /** Lightweight school-wide student total (allowed for TEACHER; avoids GET /students list). */
  getSchoolStudentCount: async () => {
    return apiRequest('/school/students/count');
  },

  /** Slim student rows for Parents page (names + parent links). */
  getForParentsUi: async () => {
    return apiRequest('/school/students/for-parents-ui');
  },

  getById: async (id) => {
    return apiRequest(`/school/students/${id}`);
  },

  create: async (data) => {
    return apiRequest('/school/students', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id, data) => {
    return apiRequest(`/school/students/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  bulkUpdateParent: async (data) => {
    return apiRequest('/school/students/bulk-update-parent', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id) => {
    return apiRequest(`/school/students/${id}`, {
      method: 'DELETE',
    });
  },

  calculateFeeDues: async (id) => {
    return apiRequest(`/school/students/${id}/fee-dues`);
  },

  bulkImport: async (file) => {
    const token = getAuthToken();
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/school/students/bulk-import`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    if (!response.ok) {
      return {
        success: false,
        error: data?.message || data?.error || `Import failed (HTTP ${response.status})`,
        data: null,
      };
    }
    return { success: true, data };
  },
};

/**
 * Classes Service
 */
export const classesService = {
  getAll: async (query = {}) => {
    const params = new URLSearchParams(query);
    return apiRequest(`/school/classes?${params}`);
  },

  getById: async (id) => {
    return apiRequest(`/school/classes/${id}`);
  },

  create: async (data) => {
    return apiRequest('/school/classes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id, data) => {
    return apiRequest(`/school/classes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id) => {
    return apiRequest(`/school/classes/${id}`, {
      method: 'DELETE',
    });
  },
};

/**
 * Sections Service
 */
export const sectionsService = {
  getAll: async (query = {}) => {
    const params = new URLSearchParams(query);
    return apiRequest(`/school/sections?${params}`);
  },

  getById: async (id) => {
    return apiRequest(`/school/sections/${id}`);
  },

  create: async (data) => {
    return apiRequest('/school/sections', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id, data) => {
    return apiRequest(`/school/sections/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id) => {
    return apiRequest(`/school/sections/${id}`, {
      method: 'DELETE',
    });
  },
};

/**
 * Subjects Service
 */
export const subjectsService = {
  getAll: async (query = {}) => {
    const params = new URLSearchParams(query);
    return apiRequest(`/school/subjects?${params}`);
  },

  getById: async (id) => {
    return apiRequest(`/school/subjects/${id}`);
  },

  create: async (data) => {
    return apiRequest('/school/subjects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id, data) => {
    return apiRequest(`/school/subjects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id) => {
    return apiRequest(`/school/subjects/${id}`, {
      method: 'DELETE',
    });
  },
};

/**
 * Users Service (Teachers, Parents, Management)
 */
export const usersService = {
  createParent: async (data) => {
    return apiRequest('/school/users/parents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  createTeacher: async (data) => {
    return apiRequest('/school/users/teachers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  createManagement: async (data) => {
    return apiRequest('/school/users/management', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getParents: async ({ page = 1, limit = 25, search = '', status } = {}) => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (search && search.trim()) params.set('search', search.trim());
    if (status && String(status).trim()) params.set('status', String(status).trim());
    return apiRequest(`/school/users/parents?${params}`);
  },

  getParentsCount: async () => {
    return apiRequest('/school/users/parents/count');
  },

  getTeachersCount: async () => {
    return apiRequest('/school/users/teachers/count');
  },

  getTeachers: async () => {
    return apiRequest('/school/users/teachers');
  },

  getManagement: async () => {
    return apiRequest('/school/users/management');
  },

  updateUser: async (id, data) => {
    return apiRequest(`/school/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deleteUser: async (id) => {
    return apiRequest(`/school/users/${id}`, {
      method: 'DELETE',
    });
  },
};

/**
 * Fees Service
 */
export const feesService = {
  // Fee Structures
  getFeeStructures: async (query = {}) => {
    const params = new URLSearchParams(query);
    return apiRequest(`/school/fees/structures?${params}`);
  },

  createFeeStructure: async (data) => {
    return apiRequest('/school/fees/structures', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateFeeStructure: async (id, data) => {
    return apiRequest(`/school/fees/structures/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deleteFeeStructure: async (id) => {
    return apiRequest(`/school/fees/structures/${id}`, {
      method: 'DELETE',
    });
  },

  // Fee Invoices
  getFeeInvoices: async (query = {}) => {
    const params = new URLSearchParams(query);
    return apiRequest(`/school/fees/invoices?${params}`);
  },

  /** Parent: school-scoped list for one child (backend requires studentId for PARENT). */
  getInvoicesByStudent: async (studentId, query = {}) => {
    const params = new URLSearchParams({
      studentId,
      pageSize: String(query.pageSize || 100),
    });
    return apiRequest(`/school/fees/invoices?${params}`);
  },

  createFeeInvoice: async (data) => {
    return apiRequest('/school/fees/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Fee Payments
  getFeePayments: async (query = {}) => {
    const params = new URLSearchParams(query);
    return apiRequest(`/school/fees/payments?${params}`);
  },

  createFeePayment: async (data) => {
    return apiRequest('/school/fees/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** Top-up or correct amount for an existing month record (parents: amountPaid + method + remarks only). */
  updateFeePayment: async (id, data) => {
    return apiRequest(`/school/fees/payments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  bulkImportFeePayments: async (file) => {
    const token = getAuthToken();
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE_URL}/school/fees/payments/bulk-import`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });
    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    if (!response.ok) {
      return {
        success: false,
        error: data?.message || data?.error || `Import failed (HTTP ${response.status})`,
        data: null,
      };
    }
    return { success: true, data };
  },

  // Get revenue statistics (expected, collected, pending)
  getRevenueStats: async (month, year) => {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (year) params.append('year', year);
    return apiRequest(`/school/fees/payments/revenue/stats?${params}`);
  },

  // Get student fee summary
  getStudentFeeSummary: async (studentId) => {
    return apiRequest(`/school/fees/payments/student/${studentId}/summary`);
  },

  getStudentSummary: async (studentId) => {
    return apiRequest(`/school/fees/payments/student/${studentId}/summary`);
  },

  // Receipt payload for PDF generation
  getReceiptPayload: async (paymentId) => {
    return apiRequest(`/school/fees/payments/${paymentId}/receipt-payload`);
  },

  // Fee Handovers
  getFeeHandovers: async (query = {}) => {
    const params = new URLSearchParams(query);
    return apiRequest(`/school/fees/handovers?${params}`);
  },

  createFeeHandover: async (data) => {
    return apiRequest('/school/fees/handovers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getHandoverSummary: async () => {
    return apiRequest('/school/fees/handovers/summary');
  },
};

/**
 * Leave Service (matches backend LeaveController)
 */
export const leaveService = {
  getMyLeave: async (query = {}) => {
    const params = new URLSearchParams(query);
    return apiRequest(`/school/leave/my?${params}`);
  },

  getPendingLeave: async (query = {}) => {
    const params = new URLSearchParams(query);
    return apiRequest(`/school/leave/pending?${params}`);
  },

  getLeaveById: async (id) => {
    return apiRequest(`/school/leave/${id}`);
  },

  createLeave: async (data) => {
    return apiRequest('/school/leave', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  approveLeave: async (id) => {
    return apiRequest(`/school/leave/${id}/approve`, {
      method: 'PATCH',
    });
  },

  rejectLeave: async (id) => {
    return apiRequest(`/school/leave/${id}/reject`, {
      method: 'PATCH',
    });
  },
};

/**
 * Announcements Service
 */
export const announcementsService = {
  getAll: async (query = {}) => {
    const params = new URLSearchParams(query);
    return apiRequest(`/school/announcements?${params}`);
  },

  getById: async (id) => {
    return apiRequest(`/school/announcements/${id}`);
  },

  create: async (data) => {
    return apiRequest('/school/announcements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id, data) => {
    return apiRequest(`/school/announcements/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id) => {
    return apiRequest(`/school/announcements/${id}`, {
      method: 'DELETE',
    });
  },
};

/**
 * Messages Service
 */
export const messagesService = {
  // getAll is aliased to inbox — backend only exposes GET /inbox
  getAll: async (query = {}) => {
    const params = new URLSearchParams(query);
    return apiRequest(`/school/messages/inbox?${params}`);
  },

  getInbox: async (query = {}) => {
    const params = new URLSearchParams(query);
    return apiRequest(`/school/messages/inbox?${params}`);
  },

  create: async (data) => {
    return apiRequest('/school/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  reply: async (data) => {
    return apiRequest('/school/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  markAsRead: async (id) => {
    return apiRequest(`/school/messages/${id}/read`, {
      method: 'PATCH',
    });
  },
};

/**
 * Student Attendance Service
 */
export const studentAttendanceService = {
  // Bulk submit attendance for a class/section on a date
  bulkSubmit: async (data) => {
    return apiRequest('/school/student-attendance/bulk', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get records with filters (classId, sectionId, date, studentId, etc.)
  getAll: async (query = {}) => {
    const params = new URLSearchParams(query);
    return apiRequest(`/school/student-attendance?${params}`);
  },

  // Get summary for a class/section on a date
  getSummary: async (classId, sectionId, date) => {
    return apiRequest(`/school/student-attendance/summary?classId=${classId}&sectionId=${sectionId}&date=${date}`);
  },

  // Get monthly report for a student
  getStudentReport: async (studentId, month, year) => {
    return apiRequest(`/school/student-attendance/student/${studentId}/report?month=${month}&year=${year}`);
  },
};

/**
 * Teacher Attendance Service
 */
export const teacherAttendanceService = {
  getAll: async (query = {}) => {
    const params = new URLSearchParams(query);
    return apiRequest(`/school/teacher-attendance?${params}`);
  },

  getById: async (id) => {
    return apiRequest(`/school/teacher-attendance/${id}`);
  },

  create: async (data) => {
    return apiRequest('/school/teacher-attendance', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id, data) => {
    return apiRequest(`/school/teacher-attendance/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id) => {
    return apiRequest(`/school/teacher-attendance/${id}`, {
      method: 'DELETE',
    });
  },

  getStats: async (query = {}) => {
    const params = new URLSearchParams(query);
    return apiRequest(`/school/teacher-attendance/stats?${params}`);
  },

  getTeacherStats: async (teacherId, query = {}) => {
    const params = new URLSearchParams(query);
    return apiRequest(`/school/teacher-attendance/teacher/${teacherId}/stats?${params}`);
  },
};

/**
 * Timetable Service
 */
export const timetableService = {
  get: async (classId, sectionId) => {
    return apiRequest(`/school/timetable?classId=${classId}&sectionId=${sectionId}`);
  },

  save: async (data) => {
    return apiRequest('/school/timetable', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  clearSlot: async (classId, sectionId, day, periodId) => {
    return apiRequest(`/school/timetable/slot?classId=${classId}&sectionId=${sectionId}&day=${day}&periodId=${periodId}`, {
      method: 'DELETE',
    });
  },
};

/**
 * Exams Service
 */
export const examsService = {
  getAll: async (query = {}) => {
    const params = new URLSearchParams(query);
    return apiRequest(`/school/exams?${params}`);
  },

  getById: async (id) => {
    return apiRequest(`/school/exams/${id}`);
  },

  create: async (data) => {
    return apiRequest('/school/exams', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // No PATCH/DELETE /school/exams/:id in backend — removed to avoid 404s if called.

  getStudentResults: async (params = {}) => {
    const q = new URLSearchParams(params);
    return apiRequest(`/school/exams/results?${q}`);
  },

  addBulkResults: async (examId, data) => {
    return apiRequest(`/school/exams/${examId}/results/bulk`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

/**
 * Expenses Service
 */
export const expensesService = {
  getAll: async (query = {}) => {
    const params = new URLSearchParams(query);
    return apiRequest(`/school/expenses?${params}`);
  },

  getById: async (id) => {
    return apiRequest(`/school/expenses/${id}`);
  },

  create: async (data) => {
    return apiRequest('/school/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id, data) => {
    return apiRequest(`/school/expenses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id) => {
    return apiRequest(`/school/expenses/${id}`, {
      method: 'DELETE',
    });
  },
};

/**
 * Analytics Service
 */
export const analyticsService = {
  getDashboardStats: async (query = {}) => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v != null && v !== '') params.append(k, String(v));
    });
    const qs = params.toString();
    return apiRequest(`/school/analytics/dashboard${qs ? `?${qs}` : ''}`);
  },

  getSuperAdminStats: async () => {
    return apiRequest('/super-admin/analytics/overview');
  },
};

/**
 * File Upload Service
 */
export const fileUploadService = {
  uploadExpenseReceipt: async (file, schoolId) => {
    const token = getAuthToken();
    const formData = new FormData();
    formData.append('file', file);
    if (schoolId) formData.append('schoolId', schoolId);

    const response = await fetch(`${API_BASE_URL}/files/expense-receipt`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Upload failed');
    }
    return { success: true, data };
  },

  uploadSchoolLogo: async (file, schoolId) => {
    const token = getAuthToken();
    const formData = new FormData();
    formData.append('file', file);
    if (schoolId) formData.append('schoolId', schoolId);

    const response = await fetch(`${API_BASE_URL}/files/school-logo`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Upload failed');
    }
    return { success: true, data };
  },
};

