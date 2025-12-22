import { generateId } from '../utils';
import { USER_ROLES, USER_STATUS, ATTENDANCE_STATUS, FEE_STATUS, LEAVE_STATUS } from '../constants';

/**
 * Mock Data Service
 * In production, replace with actual API calls
 */

// Mock Users
export const mockUsers = [
    {
        id: '0',
        email: 'superadmin@school.com',
        password: 'superadmin123',
        name: 'System Super Admin',
        role: USER_ROLES.SUPER_ADMIN,
        status: USER_STATUS.ACTIVE,
        avatar: null,
        phone: '+0000000000',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
    },
    {
        id: '1',
        email: 'admin@school.com',
        password: 'admin123',
        name: 'Admin User',
        role: USER_ROLES.ADMIN,
        status: USER_STATUS.ACTIVE,
        avatar: null,
        phone: '+1234567890',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
    },
    {
        id: '2',
        email: 'principal@school.com',
        password: 'principal123',
        name: 'Dr. Sarah Johnson',
        role: USER_ROLES.MANAGEMENT,
        status: USER_STATUS.ACTIVE,
        avatar: null,
        phone: '+1234567891',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
    },
    {
        id: '3',
        email: 'teacher@school.com',
        password: 'teacher123',
        name: 'John Smith',
        role: USER_ROLES.TEACHER,
        status: USER_STATUS.ACTIVE,
        avatar: null,
        phone: '+1234567892',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
    },
    {
        id: '4',
        email: 'parent@school.com',
        password: 'parent123',
        name: 'Michael Brown',
        role: USER_ROLES.PARENT,
        status: USER_STATUS.ACTIVE,
        avatar: null,
        phone: '+1234567893',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
    },
];

// Mock Classes
export const mockClasses = [
    { id: 'c1', name: 'Class 1', grade: '1', sectionIds: ['s1', 's2'], capacity: 60, createdAt: new Date(), updatedAt: new Date() },
    { id: 'c2', name: 'Class 2', grade: '2', sectionIds: ['s3', 's4'], capacity: 60, createdAt: new Date(), updatedAt: new Date() },
    { id: 'c3', name: 'Class 3', grade: '3', sectionIds: ['s5', 's6'], capacity: 60, createdAt: new Date(), updatedAt: new Date() },
    { id: 'c4', name: 'Class 4', grade: '4', sectionIds: ['s7', 's8'], capacity: 60, createdAt: new Date(), updatedAt: new Date() },
    { id: 'c5', name: 'Class 5', grade: '5', sectionIds: ['s9', 's10'], capacity: 60, createdAt: new Date(), updatedAt: new Date() },
];

// Mock Sections
export const mockSections = [
    { id: 's1', name: 'A', classId: 'c1', classTeacherId: '3', capacity: 30, createdAt: new Date(), updatedAt: new Date() },
    { id: 's2', name: 'B', classId: 'c1', classTeacherId: null, capacity: 30, createdAt: new Date(), updatedAt: new Date() },
    { id: 's3', name: 'A', classId: 'c2', classTeacherId: null, capacity: 30, createdAt: new Date(), updatedAt: new Date() },
    { id: 's4', name: 'B', classId: 'c2', classTeacherId: null, capacity: 30, createdAt: new Date(), updatedAt: new Date() },
    { id: 's5', name: 'A', classId: 'c3', classTeacherId: null, capacity: 30, createdAt: new Date(), updatedAt: new Date() },
    { id: 's6', name: 'B', classId: 'c3', classTeacherId: null, capacity: 30, createdAt: new Date(), updatedAt: new Date() },
    { id: 's7', name: 'A', classId: 'c4', classTeacherId: null, capacity: 30, createdAt: new Date(), updatedAt: new Date() },
    { id: 's8', name: 'B', classId: 'c4', classTeacherId: null, capacity: 30, createdAt: new Date(), updatedAt: new Date() },
    { id: 's9', name: 'A', classId: 'c5', classTeacherId: null, capacity: 30, createdAt: new Date(), updatedAt: new Date() },
    { id: 's10', name: 'B', classId: 'c5', classTeacherId: null, capacity: 30, createdAt: new Date(), updatedAt: new Date() },
];

// Mock Subjects
export const mockSubjects = [
    { id: 'sub1', name: 'Mathematics', code: 'MATH', classIds: ['c1', 'c2', 'c3', 'c4', 'c5'], description: 'Mathematics', createdAt: new Date(), updatedAt: new Date() },
    { id: 'sub2', name: 'English', code: 'ENG', classIds: ['c1', 'c2', 'c3', 'c4', 'c5'], description: 'English Language', createdAt: new Date(), updatedAt: new Date() },
    { id: 'sub3', name: 'Science', code: 'SCI', classIds: ['c1', 'c2', 'c3', 'c4', 'c5'], description: 'General Science', createdAt: new Date(), updatedAt: new Date() },
    { id: 'sub4', name: 'Social Studies', code: 'SS', classIds: ['c1', 'c2', 'c3', 'c4', 'c5'], description: 'Social Studies', createdAt: new Date(), updatedAt: new Date() },
    { id: 'sub5', name: 'Computer Science', code: 'CS', classIds: ['c3', 'c4', 'c5'], description: 'Computer Science', createdAt: new Date(), updatedAt: new Date() },
];

// Mock Students
export const mockStudents = [
    {
        id: 'st1',
        name: 'Emma Wilson',
        rollNumber: 'STU001',
        email: 'emma.wilson@student.com',
        classId: 'c1',
        sectionId: 's1',
        parentId: '4',
        gender: 'female',
        dateOfBirth: new Date('2015-05-15'),
        avatar: null,
        phone: null,
        address: '123 Main St, City',
        status: USER_STATUS.ACTIVE,
        admissionDate: new Date('2024-01-01'),
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        id: 'st2',
        name: 'Liam Johnson',
        rollNumber: 'STU002',
        email: 'liam.johnson@student.com',
        classId: 'c1',
        sectionId: 's1',
        parentId: null,
        gender: 'male',
        dateOfBirth: new Date('2015-08-20'),
        avatar: null,
        phone: null,
        address: '456 Oak Ave, City',
        status: USER_STATUS.ACTIVE,
        admissionDate: new Date('2024-01-01'),
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        id: 'st3',
        name: 'Olivia Davis',
        rollNumber: 'STU003',
        email: 'olivia.davis@student.com',
        classId: 'c2',
        sectionId: 's3',
        parentId: null,
        gender: 'female',
        dateOfBirth: new Date('2014-03-10'),
        avatar: null,
        phone: null,
        address: '789 Pine Rd, City',
        status: USER_STATUS.ACTIVE,
        admissionDate: new Date('2024-01-01'),
        createdAt: new Date(),
        updatedAt: new Date(),
    },
];

// Mock Teachers
export const mockTeachers = [
    {
        id: '3',
        name: 'John Smith',
        email: 'john.smith@school.com',
        employeeId: 'EMP001',
        gender: 'male',
        dateOfBirth: new Date('1985-06-15'),
        avatar: null,
        phone: '+1234567892',
        address: '321 Teacher Lane, City',
        subjectIds: ['sub1', 'sub5'],
        classIds: ['c1', 'c2'],
        status: USER_STATUS.ACTIVE,
        joiningDate: new Date('2020-01-01'),
        salary: 50000,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        id: 't2',
        name: 'Emily Brown',
        email: 'emily.brown@school.com',
        employeeId: 'EMP002',
        gender: 'female',
        dateOfBirth: new Date('1988-09-22'),
        avatar: null,
        phone: '+1234567894',
        address: '654 Faculty St, City',
        subjectIds: ['sub2', 'sub4'],
        classIds: ['c1', 'c2', 'c3'],
        status: USER_STATUS.ACTIVE,
        joiningDate: new Date('2019-08-01'),
        salary: 48000,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
];

// Mock Parents
export const mockParents = [
    {
        id: '4',
        name: 'Michael Brown',
        email: 'michael.brown@parent.com',
        phone: '+1234567893',
        address: '123 Main St, City',
        studentIds: ['st1'],
        occupation: 'Engineer',
        status: USER_STATUS.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
];

// Mock Announcements
export const mockAnnouncements = [
    {
        id: 'a1',
        title: 'School Reopening Notice',
        content: 'School will reopen on January 15th, 2025. All students are requested to attend regularly.',
        targetRoles: [USER_ROLES.STUDENT, USER_ROLES.PARENT, USER_ROLES.TEACHER],
        targetClassIds: [],
        createdBy: '1',
        publishDate: new Date(),
        expiryDate: new Date('2025-01-15'),
        isPinned: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        id: 'a2',
        title: 'Parent-Teacher Meeting',
        content: 'Parent-teacher meeting scheduled for next Saturday at 10 AM. All parents are requested to attend.',
        targetRoles: [USER_ROLES.PARENT, USER_ROLES.TEACHER],
        targetClassIds: [],
        createdBy: '2',
        publishDate: new Date(),
        expiryDate: null,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
];

// Mock Fee Structures
export const mockFeeStructures = [
    {
        id: 'fs1',
        classId: 'c1',
        name: 'Tuition Fee',
        amount: 5000,
        frequency: 'monthly',
        description: 'Monthly tuition fee',
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        id: 'fs2',
        classId: 'c1',
        name: 'Annual Fee',
        amount: 10000,
        frequency: 'yearly',
        description: 'Annual development fee',
        createdAt: new Date(),
        updatedAt: new Date(),
    },
];

// Mock Fee Payments
export const mockFeePayments = [
    {
        id: 'fp1',
        studentId: 'st1',
        feeStructureId: 'fs1',
        amount: 5000,
        paidAmount: 5000,
        dueAmount: 0,
        status: FEE_STATUS.PAID,
        dueDate: new Date('2024-12-01'),
        paidDate: new Date('2024-11-28'),
        paymentMethod: 'card',
        transactionId: 'TXN123456',
        receiptNumber: 'RCP241128001',
        remarks: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        id: 'fp2',
        studentId: 'st2',
        feeStructureId: 'fs1',
        amount: 5000,
        paidAmount: 0,
        dueAmount: 5000,
        status: FEE_STATUS.UNPAID,
        dueDate: new Date('2024-12-01'),
        paidDate: null,
        paymentMethod: null,
        transactionId: null,
        receiptNumber: null,
        remarks: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
];

/**
 * Authentication Service
 */
export const authService = {
    login: async (email, password, schoolId = null) => {
        // Simulate API call
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // First check mock users
                let user = mockUsers.find(
                    (u) => u.email === email && u.password === password
                );

                // If not found in mock users, check school-specific users from localStorage
                if (!user) {
                    const allSchoolData = [];
                    // Get all school data from localStorage
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key && key.startsWith('school_data_')) {
                            try {
                                const data = JSON.parse(localStorage.getItem(key));
                                if (data.teachers) allSchoolData.push(...data.teachers);
                                if (data.parents) allSchoolData.push(...data.parents);
                            } catch (e) {
                                console.warn('Error parsing school data:', e);
                            }
                        }
                    }
                    
                    // Check admin users
                    const adminUsers = JSON.parse(localStorage.getItem('admin-users') || '[]');
                    allSchoolData.push(...adminUsers);
                    
                    // Also check management users
                    const managementUsers = JSON.parse(localStorage.getItem('management-users') || '[]');
                    allSchoolData.push(...managementUsers);
                    
                    user = allSchoolData.find(
                        (u) => u.email === email && u.password === password
                    );
                }

                if (user) {
                    const { password: pwd, ...userData } = user;
                    // If schoolId provided, verify user belongs to that school
                    if (schoolId && userData.schoolId && userData.schoolId !== schoolId) {
                        reject({ success: false, message: 'User does not belong to this school' });
                        return;
                    }
                    resolve({ success: true, data: userData });
                } else {
                    reject({ success: false, message: 'Invalid credentials' });
                }
            }, 500);
        });
    },

    forgotPassword: async (email) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ success: true, message: 'Password reset link sent to your email' });
            }, 500);
        });
    },
};

/**
 * Students Service
 */
export const studentsService = {
    getAll: async () => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ success: true, data: mockStudents });
            }, 300);
        });
    },

    getById: async (id) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                const student = mockStudents.find((s) => s.id === id);
                resolve({ success: true, data: student });
            }, 300);
        });
    },

    create: async (studentData) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                const newStudent = {
                    ...studentData,
                    id: generateId(),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };
                mockStudents.push(newStudent);
                resolve({ success: true, data: newStudent });
            }, 300);
        });
    },

    update: async (id, studentData) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                const index = mockStudents.findIndex((s) => s.id === id);
                if (index !== -1) {
                    mockStudents[index] = {
                        ...mockStudents[index],
                        ...studentData,
                        updatedAt: new Date(),
                    };
                    resolve({ success: true, data: mockStudents[index] });
                }
            }, 300);
        });
    },

    delete: async (id) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                const index = mockStudents.findIndex((s) => s.id === id);
                if (index !== -1) {
                    mockStudents.splice(index, 1);
                }
                resolve({ success: true });
            }, 300);
        });
    },
};

/**
 * Dashboard Service
 */
export const dashboardService = {
    getStats: async (role) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                const stats = {
                    totalStudents: mockStudents.length,
                    totalTeachers: mockTeachers.length,
                    totalParents: mockParents.length,
                    totalClasses: mockClasses.length,
                    feeCollected: 50000,
                    feePending: 25000,
                    presentToday: 150,
                    absentToday: 10,
                };
                resolve({ success: true, data: stats });
            }, 300);
        });
    },
};

// Export all mock data
export const mockData = {
    users: mockUsers,
    classes: mockClasses,
    sections: mockSections,
    subjects: mockSubjects,
    students: mockStudents,
    teachers: mockTeachers,
    parents: mockParents,
    announcements: mockAnnouncements,
    feeStructures: mockFeeStructures,
    feePayments: mockFeePayments,
};
