/**
 * Application Constants
 */

export const USER_ROLES = {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin',
    MANAGEMENT: 'management',
    TEACHER: 'teacher',
    PARENT: 'parent',
    STUDENT: 'student',
    SUPPORT_STAFF: 'support_staff',
};

export const USER_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    SUSPENDED: 'suspended',
};

export const ATTENDANCE_STATUS = {
    PRESENT: 'present',
    ABSENT: 'absent',
    LEAVE: 'leave',
    LATE: 'late',
};

export const FEE_STATUS = {
    PAID: 'paid',
    UNPAID: 'unpaid',
    PARTIAL: 'partial',
    OVERDUE: 'overdue',
};

export const LEAVE_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
};

export const LEAVE_TYPES = {
    SICK: 'sick',
    CASUAL: 'casual',
    EMERGENCY: 'emergency',
    VACATION: 'vacation',
    OTHER: 'other',
};

export const DAYS_OF_WEEK = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
];

export const PERIODS = [
    { id: '1', name: 'Period 1', startTime: '08:00', endTime: '08:45' },
    { id: '2', name: 'Period 2', startTime: '08:45', endTime: '09:30' },
    { id: '3', name: 'Period 3', startTime: '09:30', endTime: '10:15' },
    { id: 'break1', name: 'Break', startTime: '10:15', endTime: '10:30' },
    { id: '4', name: 'Period 4', startTime: '10:30', endTime: '11:15' },
    { id: '5', name: 'Period 5', startTime: '11:15', endTime: '12:00' },
    { id: '6', name: 'Period 6', startTime: '12:00', endTime: '12:45' },
    { id: 'break2', name: 'Lunch', startTime: '12:45', endTime: '01:30' },
    { id: '7', name: 'Period 7', startTime: '01:30', endTime: '02:15' },
    { id: '8', name: 'Period 8', startTime: '02:15', endTime: '03:00' },
    { id: '9', name: 'Period 9', startTime: '03:00', endTime: '03:45' },
];

export const GRADE_SCALE = [
    { grade: 'A+', min: 90, max: 100, gpa: 4.0 },
    { grade: 'A', min: 85, max: 89, gpa: 3.7 },
    { grade: 'A-', min: 80, max: 84, gpa: 3.3 },
    { grade: 'B+', min: 75, max: 79, gpa: 3.0 },
    { grade: 'B', min: 70, max: 74, gpa: 2.7 },
    { grade: 'B-', min: 65, max: 69, gpa: 2.3 },
    { grade: 'C+', min: 60, max: 64, gpa: 2.0 },
    { grade: 'C', min: 55, max: 59, gpa: 1.7 },
    { grade: 'C-', min: 50, max: 54, gpa: 1.3 },
    { grade: 'D', min: 40, max: 49, gpa: 1.0 },
    { grade: 'F', min: 0, max: 39, gpa: 0.0 },
];

export const PAYMENT_METHODS = {
    CASH: 'cash',
    CARD: 'card',
    BANK_TRANSFER: 'bank_transfer',
    ONLINE: 'online',
    CHEQUE: 'cheque',
};

export const EXAM_TYPES = {
    MIDTERM: 'midterm',
    FINAL: 'final',
    QUIZ: 'quiz',
    ASSIGNMENT: 'assignment',
    PRACTICAL: 'practical',
};

export const NAVIGATION_ITEMS = {
    super_admin: [
        { id: 'dashboard', label: 'Super Dashboard', icon: 'LayoutDashboard', path: '/dashboard' },
        { id: 'schools', label: 'Schools', icon: 'Building', path: '/schools' },
        { id: 'analytics', label: 'Global Analytics', icon: 'BarChart2', path: '/analytics' },
        { id: 'settings', label: 'System Settings', icon: 'Settings', path: '/settings' },
    ],
    admin: [
        { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/dashboard' },
        { id: 'classes', label: 'Classes', icon: 'BookOpen', path: '/classes' },
        { id: 'students', label: 'Students', icon: 'Users', path: '/students' },
        { id: 'teachers', label: 'Teachers', icon: 'UserCheck', path: '/teachers' },
        { id: 'parents', label: 'Parents', icon: 'UserCircle', path: '/parents' },
        { id: 'support_staff', label: 'Support Staff', icon: 'UserCog', path: '/support-staff' },
        { id: 'attendance', label: 'Attendance', icon: 'ClipboardCheck', path: '/attendance' },
        { id: 'fees', label: 'Fees & Revenue', icon: 'DollarSign', path: '/fees' },
        { id: 'exams', label: 'Exams & Results', icon: 'FileText', path: '/exams' },
        { id: 'timetable', label: 'Timetable', icon: 'Calendar', path: '/timetable' },
        { id: 'announcements', label: 'Announcements', icon: 'Megaphone', path: '/announcements' },
        { id: 'messages', label: 'Messages', icon: 'MessageSquare', path: '/messages' },
        { id: 'performance', label: 'Staff Performance', icon: 'TrendingUp', path: '/staff-performance' },
        { id: 'leave', label: 'Leave Management', icon: 'CalendarX', path: '/leave' },
        { id: 'settings', label: 'Settings', icon: 'Settings', path: '/settings' },
    ],
    management: [
        { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/dashboard' },
        { id: 'classes', label: 'Classes', icon: 'BookOpen', path: '/classes' },
        { id: 'students', label: 'Students', icon: 'Users', path: '/students' },
        { id: 'teachers', label: 'Teachers', icon: 'UserCheck', path: '/teachers' },
        { id: 'support_staff', label: 'Support Staff', icon: 'UserCog', path: '/support-staff' },
        { id: 'attendance', label: 'Attendance', icon: 'ClipboardCheck', path: '/attendance' },
        { id: 'fees', label: 'Fees Collection', icon: 'DollarSign', path: '/fees' },
        { id: 'exams', label: 'Exams & Results', icon: 'FileText', path: '/exams' },
        { id: 'announcements', label: 'Announcements', icon: 'Megaphone', path: '/announcements' },
        { id: 'messages', label: 'Messages', icon: 'MessageSquare', path: '/messages' },
        { id: 'leave', label: 'Leave Management', icon: 'CalendarX', path: '/leave' },
    ],
    teacher: [
        { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/dashboard' },
        { id: 'exams', label: 'Marks Entry', icon: 'FileText', path: '/exams' },
        { id: 'messages', label: 'Messages', icon: 'MessageSquare', path: '/messages' },
        { id: 'leave', label: 'My Leave', icon: 'CalendarX', path: '/leave' },
    ],
    parent: [
        { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/dashboard' },
        { id: 'fees', label: 'Fees', icon: 'DollarSign', path: '/fees' },
        { id: 'results', label: 'Results', icon: 'FileText', path: '/exams' },
        { id: 'messages', label: 'Messages', icon: 'MessageSquare', path: '/messages' },
        { id: 'leave', label: 'Leave Request', icon: 'CalendarX', path: '/leave' },
    ],
    student: [
        { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/dashboard' },
        { id: 'attendance', label: 'My Attendance', icon: 'ClipboardCheck', path: '/attendance' },
        { id: 'results', label: 'My Results', icon: 'FileText', path: '/exams' },
        { id: 'timetable', label: 'Timetable', icon: 'Calendar', path: '/timetable' },
    ],
    support_staff: [
        { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/dashboard' },
        { id: 'attendance', label: 'Attendance', icon: 'ClipboardCheck', path: '/attendance' },
        { id: 'messages', label: 'Messages', icon: 'MessageSquare', path: '/messages' },
        { id: 'leave', label: 'My Leave', icon: 'CalendarX', path: '/leave' },
    ],
};

export const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export const TOAST_DURATION = 3000;

export const ITEMS_PER_PAGE = 10;

export const DATE_FORMAT = 'MMM dd, yyyy';
export const DATE_TIME_FORMAT = 'MMM dd, yyyy hh:mm a';
export const TIME_FORMAT = 'hh:mm a';

export const SUBSCRIPTION_STATUS = {
    ACTIVE: 'active',
    EXPIRED: 'expired',
    DUE_SOON: 'due_soon',
    PENDING: 'pending',
};

export const SCHOOL_INFO = {
    name: 'AL-ABBAS COLLEGE OF SCIENCE AND ARTS Shah Jamal',
    tagline: 'Excellence in Education, Building Tomorrow\'s Leaders',
    address: 'Shah Jamal, Lahore',
    phone: '+92 300 1234567',
    email: 'info@alabbascollege.edu.pk',
    website: 'www.alabbascollege.edu.pk',
};
