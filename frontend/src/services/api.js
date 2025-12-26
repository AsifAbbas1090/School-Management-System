/**
 * API Service - Connects frontend to backend
 * Base URL: http://localhost:3000/api
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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
    // Use AbortController to handle timeouts and connection errors gracefully
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(url, {
      ...config,
      signal: controller.signal,
    }).catch((fetchError) => {
      clearTimeout(timeoutId);
      // Immediately catch and handle ALL network errors silently
      const isNetworkError =
        fetchError.name === 'TypeError' ||
        fetchError.name === 'AbortError' ||
        fetchError.message?.includes('Failed to fetch') ||
        fetchError.message?.includes('ERR_CONNECTION_REFUSED') ||
        fetchError.message?.includes('ERR_NETWORK_CHANGED') ||
        fetchError.message?.includes('NetworkError') ||
        fetchError.message === 'CONNECTION_REFUSED' ||
        fetchError.message?.includes('aborted');

      if (isNetworkError) {
        // Return error response silently - no console logging
        return {
          success: false,
          error: 'Backend server is not running. Please start the backend server.',
          data: null
        };
      }
      // For other errors, return them silently too
      return {
        success: false,
        error: fetchError.message || 'An error occurred',
        data: null
      };
    });

    clearTimeout(timeoutId);

    // If response is already an error object (from catch above), return it
    if (response && typeof response === 'object' && 'success' in response && !response.success) {
      return response;
    }

    // Handle network errors (backend not running)
    if (!response || !response.ok) {
      if (response && response.status === 0) {
        return { success: false, error: 'Backend server is not running. Please start the backend server.', data: null };
      }

      // Handle 401 Unauthorized - user needs to login
      if (response && response.status === 401) {
        // Silently handle 401 - don't log to console
        // Clear invalid token and redirect to login
        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
          try {
            const parsed = JSON.parse(authStorage);
            if (parsed?.state?.user || parsed?.user) {
              // Clear auth and redirect (only if not already on login page)
              const currentPath = window.location.pathname;
              if (currentPath !== '/login' && currentPath !== '/super-admin/login' && !currentPath.includes('/signin')) {
                localStorage.removeItem('auth-storage');
                // Use setTimeout to avoid navigation during render
                setTimeout(() => {
                  window.location.href = '/login';
                }, 100);
              }
            }
          } catch (e) {
            // Silently handle parse errors
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
    // Silently handle ALL errors - no console logging
    const isNetworkError =
      error.message === 'CONNECTION_REFUSED' ||
      error.name === 'TypeError' ||
      error.message?.includes('Failed to fetch') ||
      error.message?.includes('ERR_CONNECTION_REFUSED') ||
      error.message?.includes('ERR_NETWORK_CHANGED') ||
      error.message?.includes('NetworkError');

    if (isNetworkError) {
      return { success: false, error: 'Backend server is not running. Please start the backend server.', data: null };
    }

    // Return error silently - no console logging
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

  create: async (data) => {
    return apiRequest('/super-admin/schools', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

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

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Import failed');
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

  getParents: async () => {
    return apiRequest('/school/users/parents');
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
};

/**
 * Attendance Service
 */
export const attendanceService = {
  getAll: async (query = {}) => {
    const params = new URLSearchParams(query);
    return apiRequest(`/school/attendance?${params}`);
  },

  getById: async (id) => {
    return apiRequest(`/school/attendance/${id}`);
  },

  create: async (data) => {
    return apiRequest('/school/attendance', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id, data) => {
    return apiRequest(`/school/attendance/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id) => {
    return apiRequest(`/school/attendance/${id}`, {
      method: 'DELETE',
    });
  },

  getByStudent: async (studentId, query = {}) => {
    const params = new URLSearchParams(query);
    return apiRequest(`/school/attendance/student/${studentId}?${params}`);
  },
};

/**
 * Leave Service
 */
export const leaveService = {
  getAll: async (query = {}) => {
    const params = new URLSearchParams(query);
    return apiRequest(`/school/leave?${params}`);
  },

  getById: async (id) => {
    return apiRequest(`/school/leave/${id}`);
  },

  create: async (data) => {
    return apiRequest('/school/leave', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id, data) => {
    return apiRequest(`/school/leave/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
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
  getAll: async (query = {}) => {
    const params = new URLSearchParams(query);
    return apiRequest(`/school/messages?${params}`);
  },

  create: async (data) => {
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

  update: async (id, data) => {
    return apiRequest(`/school/exams/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id) => {
    return apiRequest(`/school/exams/${id}`, {
      method: 'DELETE',
    });
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
  getDashboardStats: async () => {
    return apiRequest('/school/analytics/dashboard');
  },

  getSuperAdminStats: async () => {
    return apiRequest('/super-admin/analytics/overview');
  },
};

/**
 * File Upload Service
 */
export const fileUploadService = {
  uploadExpenseReceipt: async (file) => {
    const token = getAuthToken();
    const formData = new FormData();
    formData.append('file', file);

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

  uploadSchoolLogo: async (file) => {
    const token = getAuthToken();
    const formData = new FormData();
    formData.append('file', file);

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

