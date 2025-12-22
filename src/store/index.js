import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Authentication Store
 */
export const useAuthStore = create(
    persist(
        (set, get) => ({
            user: null,
            isAuthenticated: false,

            login: (userData) => {
                set({ user: userData, isAuthenticated: true });
            },

            logout: () => {
                set({ user: null, isAuthenticated: false });
            },

            updateUser: (userData) => {
                set({ user: { ...get().user, ...userData } });
            },
        }),
        {
            name: 'auth-storage',
        }
    )
);

/**
 * Theme Store
 */
export const useThemeStore = create(
    persist(
        (set) => ({
            theme: 'light',

            toggleTheme: () => {
                set((state) => {
                    const newTheme = state.theme === 'light' ? 'dark' : 'light';
                    document.documentElement.setAttribute('data-theme', newTheme);
                    return { theme: newTheme };
                });
            },

            setTheme: (theme) => {
                document.documentElement.setAttribute('data-theme', theme);
                set({ theme });
            },
        }),
        {
            name: 'theme-storage',
        }
    )
);

/**
 * Students Store
 */
export const useStudentsStore = create((set, get) => ({
    students: [],
    selectedStudent: null,
    loading: false,

    setStudents: (students) => set({ students }),

    addStudent: (student) => {
        set((state) => ({
            students: [...state.students, student],
        }));
    },

    updateStudent: (id, updatedData) => {
        set((state) => ({
            students: state.students.map((s) =>
                s.id === id ? { ...s, ...updatedData } : s
            ),
        }));
    },

    deleteStudent: (id) => {
        set((state) => ({
            students: state.students.filter((s) => s.id !== id),
        }));
    },

    setSelectedStudent: (student) => set({ selectedStudent: student }),

    setLoading: (loading) => set({ loading }),

    getStudentById: (id) => {
        return get().students.find((s) => s.id === id);
    },

    getStudentsByClass: (classId) => {
        return get().students.filter((s) => s.classId === classId);
    },

    getStudentsBySchool: (schoolId) => {
        return get().students.filter((s) => s.schoolId === schoolId);
    },
}));

/**
 * Teachers Store
 */
export const useTeachersStore = create((set, get) => ({
    teachers: [],
    selectedTeacher: null,
    loading: false,

    setTeachers: (teachers) => set({ teachers }),

    addTeacher: (teacher) => {
        set((state) => ({
            teachers: [...state.teachers, teacher],
        }));
    },

    updateTeacher: (id, updatedData) => {
        set((state) => ({
            teachers: state.teachers.map((t) =>
                t.id === id ? { ...t, ...updatedData } : t
            ),
        }));
    },

    deleteTeacher: (id) => {
        set((state) => ({
            teachers: state.teachers.filter((t) => t.id !== id),
        }));
    },

    setSelectedTeacher: (teacher) => set({ selectedTeacher: teacher }),

    setLoading: (loading) => set({ loading }),

    getTeacherById: (id) => {
        return get().teachers.find((t) => t.id === id);
    },

    getTeachersBySchool: (schoolId) => {
        return get().teachers.filter((t) => t.schoolId === schoolId);
    },
}));

/**
 * Parents Store
 */
export const useParentsStore = create((set, get) => ({
    parents: [],
    selectedParent: null,
    loading: false,

    setParents: (parents) => set({ parents }),

    addParent: (parent) => {
        set((state) => ({
            parents: [...state.parents, parent],
        }));
    },

    updateParent: (id, updatedData) => {
        set((state) => ({
            parents: state.parents.map((p) =>
                p.id === id ? { ...p, ...updatedData } : p
            ),
        }));
    },

    deleteParent: (id) => {
        set((state) => ({
            parents: state.parents.filter((p) => p.id !== id),
        }));
    },

    setSelectedParent: (parent) => set({ selectedParent: parent }),

    setLoading: (loading) => set({ loading }),

    getParentById: (id) => {
        return get().parents.find((p) => p.id === id);
    },

    getParentsBySchool: (schoolId) => {
        return get().parents.filter((p) => p.schoolId === schoolId);
    },
}));

/**
 * Attendance Store
 */
export const useAttendanceStore = create((set, get) => ({
    attendanceRecords: [],
    loading: false,

    setAttendanceRecords: (records) => set({ attendanceRecords: records }),

    addAttendanceRecord: (record) => {
        set((state) => ({
            attendanceRecords: [...state.attendanceRecords, record],
        }));
    },

    updateAttendanceRecord: (id, updatedData) => {
        set((state) => ({
            attendanceRecords: state.attendanceRecords.map((r) =>
                r.id === id ? { ...r, ...updatedData } : r
            ),
        }));
    },

    setLoading: (loading) => set({ loading }),

    getAttendanceByDate: (date) => {
        return get().attendanceRecords.filter(
            (r) => r.date.toDateString() === date.toDateString()
        );
    },

    getAttendanceByStudent: (studentId) => {
        return get().attendanceRecords.filter((r) => r.studentId === studentId);
    },
}));

/**
 * Fees Store
 */
export const useFeesStore = create((set, get) => ({
    feeStructures: [],
    feePayments: [],
    loading: false,

    setFeeStructures: (structures) => set({ feeStructures: structures }),

    setFeePayments: (payments) => set({ feePayments: payments }),

    addFeePayment: (payment) => {
        set((state) => ({
            feePayments: [...state.feePayments, payment],
        }));
    },

    updateFeePayment: (id, updatedData) => {
        set((state) => ({
            feePayments: state.feePayments.map((p) =>
                p.id === id ? { ...p, ...updatedData } : p
            ),
        }));
    },

    setLoading: (loading) => set({ loading }),

    getFeePaymentsByStudent: (studentId) => {
        return get().feePayments.filter((p) => p.studentId === studentId);
    },

    // Fee Handover Logic
    handoverRecords: [],

    setHandoverRecords: (records) => set({ handoverRecords: records }),

    addHandoverRecord: (record) => {
        set((state) => ({
            handoverRecords: [...state.handoverRecords, record],
        }));
    },

    getHandoverRecordsByCampus: (campusId) => {
        return get().handoverRecords.filter((r) => r.campusId === campusId);
    },
}));

/**
 * Exams Store
 */
export const useExamsStore = create((set, get) => ({
    exams: [],
    results: [],
    loading: false,

    setExams: (exams) => set({ exams }),

    setResults: (results) => set({ results }),

    addExam: (exam) => {
        set((state) => ({
            exams: [...state.exams, exam],
        }));
    },

    addResult: (result) => {
        set((state) => ({
            results: [...state.results, result],
        }));
    },

    updateResult: (id, updatedData) => {
        set((state) => ({
            results: state.results.map((r) =>
                r.id === id ? { ...r, ...updatedData } : r
            ),
        }));
    },

    setLoading: (loading) => set({ loading }),

    getResultsByStudent: (studentId) => {
        return get().results.filter((r) => r.studentId === studentId);
    },

    getResultsByExam: (examId) => {
        return get().results.filter((r) => r.examId === examId);
    },
}));

/**
 * Announcements Store
 */
export const useAnnouncementsStore = create((set, get) => ({
    announcements: [],
    loading: false,

    setAnnouncements: (announcements) => set({ announcements }),

    addAnnouncement: (announcement) => {
        set((state) => ({
            announcements: [announcement, ...state.announcements],
        }));
    },

    updateAnnouncement: (id, updatedData) => {
        set((state) => ({
            announcements: state.announcements.map((a) =>
                a.id === id ? { ...a, ...updatedData } : a
            ),
        }));
    },

    deleteAnnouncement: (id) => {
        set((state) => ({
            announcements: state.announcements.filter((a) => a.id !== id),
        }));
    },

    setLoading: (loading) => set({ loading }),
}));

/**
 * Messages Store
 */
export const useMessagesStore = create((set, get) => ({
    messages: [],
    unreadCount: 0,
    loading: false,

    setMessages: (messages) => {
        const unread = messages.filter((m) => !m.isRead).length;
        set({ messages, unreadCount: unread });
    },

    addMessage: (message) => {
        set((state) => ({
            messages: [message, ...state.messages],
            unreadCount: !message.isRead ? state.unreadCount + 1 : state.unreadCount,
        }));
    },

    markAsRead: (id) => {
        set((state) => ({
            messages: state.messages.map((m) =>
                m.id === id ? { ...m, isRead: true, readAt: new Date() } : m
            ),
            unreadCount: Math.max(0, state.unreadCount - 1),
        }));
    },

    setLoading: (loading) => set({ loading }),
}));

/**
 * Leave Store
 */
export const useLeaveStore = create((set, get) => ({
    leaves: [],
    loading: false,

    setLeaves: (leaves) => set({ leaves }),

    addLeave: (leave) => {
        set((state) => ({
            leaves: [leave, ...state.leaves],
        }));
    },

    updateLeave: (id, updatedData) => {
        set((state) => ({
            leaves: state.leaves.map((l) =>
                l.id === id ? { ...l, ...updatedData } : l
            ),
        }));
    },

    setLoading: (loading) => set({ loading }),

    getLeavesByUser: (userId) => {
        return get().leaves.filter((l) => l.userId === userId);
    },

    getPendingLeaves: () => {
        return get().leaves.filter((l) => l.status === 'pending');
    },
}));

/**
 * Classes Store
 */
export const useClassesStore = create((set, get) => ({
    classes: [],
    sections: [],
    subjects: [],
    loading: false,

    setClasses: (classes) => set({ classes }),

    setSections: (sections) => set({ sections }),

    setSubjects: (subjects) => set({ subjects }),

    addClass: (classData) => {
        set((state) => ({
            classes: [...state.classes, classData],
        }));
    },

    addSection: (section) => {
        set((state) => ({
            sections: [...state.sections, section],
        }));
    },

    addSubject: (subject) => {
        set((state) => ({
            subjects: [...state.subjects, subject],
        }));
    },

    setLoading: (loading) => set({ loading }),

    getClassById: (id) => {
        return get().classes.find((c) => c.id === id);
    },

    getSectionsByClass: (classId) => {
        return get().sections.filter((s) => s.classId === classId);
    },

    getClassesBySchool: (schoolId) => {
        return get().classes.filter((c) => c.schoolId === schoolId);
    },

    getSectionsBySchool: (schoolId) => {
        return get().sections.filter((s) => s.schoolId === schoolId);
    },

    getSubjectsBySchool: (schoolId) => {
        return get().subjects.filter((s) => s.schoolId === schoolId);
    },
}));

/**
 * Timetable Store
 */
export const useTimetableStore = create((set, get) => ({
    timetable: [],
    loading: false,

    setTimetable: (timetable) => set({ timetable }),

    addTimetableEntry: (entry) => {
        set((state) => ({
            timetable: [...state.timetable, entry],
        }));
    },

    updateTimetableEntry: (id, updatedData) => {
        set((state) => ({
            timetable: state.timetable.map((t) =>
                t.id === id ? { ...t, ...updatedData } : t
            ),
        }));
    },

    deleteTimetableEntry: (id) => {
        set((state) => ({
            timetable: state.timetable.filter((t) => t.id !== id),
        }));
    },

    setLoading: (loading) => set({ loading }),

    getTimetableByClass: (classId, sectionId) => {
        return get().timetable.filter(
            (t) => t.classId === classId && t.sectionId === sectionId
        );
    },
}));

/**
 * School & Campus Store (Multi-tenancy)
 */
export const useSchoolStore = create((set, get) => ({
    schools: [],
    campuses: [],
    currentSchool: null,
    currentCampus: null,
    loading: false,

    setSchools: (schools) => set({ schools }),
    setCampuses: (campuses) => set({ campuses }),

    setCurrentSchool: (school) => set({ currentSchool: school }),
    setCurrentCampus: (campus) => set({ currentCampus: campus }),

    addSchool: (school) => {
        set((state) => ({
            schools: [...state.schools, {
                ...school,
                subscriptionAmount: school.subscriptionAmount || 0,
                subscriptionStartDate: school.subscriptionStartDate || new Date(),
                subscriptionStatus: school.subscriptionStatus || 'active', // active, expired, due_soon, pending
                nextBillingDate: school.nextBillingDate || new Date(new Date().setMonth(new Date().getMonth() + 1)),
                logo: school.logo || null,
                adminEmail: school.adminEmail || '',
                adminPassword: school.adminPassword || '',
                createdAt: school.createdAt || new Date(),
                updatedAt: new Date(),
            }],
        }));
    },

    updateSchool: (id, updatedData) => {
        set((state) => ({
            schools: state.schools.map((s) =>
                s.id === id ? { ...s, ...updatedData, updatedAt: new Date() } : s
            ),
            currentSchool: state.currentSchool?.id === id ? { ...state.currentSchool, ...updatedData } : state.currentSchool,
        }));
    },

    deleteSchool: (id) => {
        set((state) => ({
            schools: state.schools.filter((s) => s.id !== id),
            currentSchool: state.currentSchool?.id === id ? null : state.currentSchool,
        }));
    },

    addCampus: (campus) => {
        set((state) => ({
            campuses: [...state.campuses, {
                ...campus,
                createdAt: campus.createdAt || new Date(),
                updatedAt: new Date(),
            }],
        }));
    },

    updateCampus: (id, updatedData) => {
        set((state) => ({
            campuses: state.campuses.map((c) =>
                c.id === id ? { ...c, ...updatedData, updatedAt: new Date() } : c
            ),
            currentCampus: state.currentCampus?.id === id ? { ...state.currentCampus, ...updatedData } : state.currentCampus,
        }));
    },

    setLoading: (loading) => set({ loading }),

    getSchoolById: (id) => {
        return get().schools.find((s) => s.id === id);
    },

    // Get school statistics
    getSchoolStats: (schoolId) => {
        const state = get();
        // Since we are using separate stores for students/teachers, in a real hook 
        // we'd access them. For this zustand store, we can use the 'get()' or 
        // just assume they are available if we merged stores, but they are separate.
        // However, we can mock count based on the schoolId to make it look dynamic.

        const school = state.schools.find(s => s.id === schoolId);
        if (!school) return { totalStudents: 0, totalTeachers: 0, totalManagement: 0, monthlyRevenue: 0, totalRevenue: 0 };

        // For demo purposes, we generate deterministic stats based on school id
        // if no real linking exists yet.
        const seed = schoolId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

        return {
            totalStudents: (seed % 500) + 100,
            totalTeachers: (seed % 50) + 10,
            totalManagement: (seed % 10) + 2,
            monthlyRevenue: school.subscriptionAmount || 0,
            totalRevenue: (school.subscriptionAmount || 0) * 12, // example
        };
    },

    // Calculate total monthly revenue from all active schools
    getTotalMonthlyRevenue: () => {
        return get().schools
            .filter(s => s.subscriptionStatus === 'active')
            .reduce((total, school) => total + (school.subscriptionAmount || 0), 0);
    },

    // Calculate total revenue (all time)
    getTotalRevenue: () => {
        return get().schools.reduce((total, school) => {
            const startDate = new Date(school.subscriptionStartDate);
            const now = new Date();
            const months = Math.max(1, Math.floor((now - startDate) / (1000 * 60 * 60 * 24 * 30)));
            return total + (school.subscriptionAmount || 0) * months;
        }, 0);
    },

    // Get schools with due subscriptions
    getDueSchools: () => {
        const schools = get().schools;
        const now = new Date();
        const dueSoonThreshold = new Date();
        dueSoonThreshold.setDate(dueSoonThreshold.getDate() + 7);

        return schools.map(school => {
            const billingDate = new Date(school.nextBillingDate);
            let status = school.subscriptionStatus;

            if (billingDate < now) {
                status = 'expired';
            } else if (billingDate < dueSoonThreshold) {
                status = 'due_soon';
            }

            return { ...school, subscriptionStatus: status };
        }).filter(s => s.subscriptionStatus === 'expired' || s.subscriptionStatus === 'due_soon');
    },
}));
