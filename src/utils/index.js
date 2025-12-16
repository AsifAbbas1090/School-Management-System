import { format, parseISO, isValid } from 'date-fns';
import { GRADE_SCALE } from '../constants';

/**
 * Format date to readable string
 * @param {Date|string} date
 * @param {string} formatStr
 * @returns {string}
 */
export const formatDate = (date, formatStr = 'MMM dd, yyyy') => {
    if (!date) return '';

    try {
        const dateObj = typeof date === 'string' ? parseISO(date) : date;
        return isValid(dateObj) ? format(dateObj, formatStr) : '';
    } catch (error) {
        console.error('Error formatting date:', error);
        return '';
    }
};

/**
 * Calculate grade based on marks
 * @param {number} marks
 * @param {number} totalMarks
 * @returns {string}
 */
export const calculateGrade = (marks, totalMarks) => {
    const percentage = (marks / totalMarks) * 100;

    for (const scale of GRADE_SCALE) {
        if (percentage >= scale.min && percentage <= scale.max) {
            return scale.grade;
        }
    }

    return 'F';
};

/**
 * Calculate GPA based on marks
 * @param {number} marks
 * @param {number} totalMarks
 * @returns {number}
 */
export const calculateGPA = (marks, totalMarks) => {
    const percentage = (marks / totalMarks) * 100;

    for (const scale of GRADE_SCALE) {
        if (percentage >= scale.min && percentage <= scale.max) {
            return scale.gpa;
        }
    }

    return 0.0;
};

/**
 * Calculate overall GPA from multiple subjects
 * @param {Array<{marks: number, totalMarks: number}>} subjects
 * @returns {number}
 */
export const calculateOverallGPA = (subjects) => {
    if (!subjects || subjects.length === 0) return 0;

    const totalGPA = subjects.reduce((sum, subject) => {
        return sum + calculateGPA(subject.marks, subject.totalMarks);
    }, 0);

    return (totalGPA / subjects.length).toFixed(2);
};

/**
 * Calculate attendance percentage
 * @param {number} present
 * @param {number} total
 * @returns {number}
 */
export const calculateAttendancePercentage = (present, total) => {
    if (total === 0) return 0;
    return Math.round((present / total) * 100);
};

/**
 * Generate unique ID
 * @returns {string}
 */
export const generateId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Validate email
 * @param {string} email
 * @returns {boolean}
 */
export const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Validate phone number
 * @param {string} phone
 * @returns {boolean}
 */
export const isValidPhone = (phone) => {
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
};

/**
 * Format currency
 * @param {number} amount
 * @param {string} currency
 * @returns {string}
 */
export const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
    }).format(amount);
};

/**
 * Truncate text
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
export const truncateText = (text, maxLength = 50) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
};

/**
 * Get initials from name
 * @param {string} name
 * @returns {string}
 */
export const getInitials = (name) => {
    if (!name) return '';

    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();

    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

/**
 * Get random color for avatar
 * @param {string} str
 * @returns {string}
 */
export const getAvatarColor = (str) => {
    const colors = [
        '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
        '#10b981', '#06b6d4', '#6366f1', '#ef4444',
    ];

    if (!str) return colors[0];

    const hash = str.split('').reduce((acc, char) => {
        return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);

    return colors[Math.abs(hash) % colors.length];
};

/**
 * Debounce function
 * @param {Function} func
 * @param {number} wait
 * @returns {Function}
 */
export const debounce = (func, wait = 300) => {
    let timeout;

    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };

        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

/**
 * Group array by key
 * @param {Array} array
 * @param {string} key
 * @returns {Object}
 */
export const groupBy = (array, key) => {
    return array.reduce((result, item) => {
        const group = item[key];
        if (!result[group]) {
            result[group] = [];
        }
        result[group].push(item);
        return result;
    }, {});
};

/**
 * Sort array by key
 * @param {Array} array
 * @param {string} key
 * @param {string} order
 * @returns {Array}
 */
export const sortBy = (array, key, order = 'asc') => {
    return [...array].sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];

        if (aVal < bVal) return order === 'asc' ? -1 : 1;
        if (aVal > bVal) return order === 'asc' ? 1 : -1;
        return 0;
    });
};

/**
 * Filter array by search term
 * @param {Array} array
 * @param {string} searchTerm
 * @param {Array<string>} keys
 * @returns {Array}
 */
export const filterBySearch = (array, searchTerm, keys) => {
    if (!searchTerm) return array;

    const lowerSearch = searchTerm.toLowerCase();

    return array.filter((item) => {
        return keys.some((key) => {
            const value = item[key];
            if (!value) return false;
            return value.toString().toLowerCase().includes(lowerSearch);
        });
    });
};

/**
 * Paginate array
 * @param {Array} array
 * @param {number} page
 * @param {number} perPage
 * @returns {Object}
 */
export const paginate = (array, page = 1, perPage = 10) => {
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;

    return {
        data: array.slice(startIndex, endIndex),
        currentPage: page,
        totalPages: Math.ceil(array.length / perPage),
        totalItems: array.length,
        perPage,
    };
};

/**
 * Download file
 * @param {string} content
 * @param {string} filename
 * @param {string} mimeType
 */
export const downloadFile = (content, filename, mimeType = 'text/plain') => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Export to CSV
 * @param {Array<Object>} data
 * @param {string} filename
 */
export const exportToCSV = (data, filename = 'export.csv') => {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map((row) =>
            headers.map((header) => {
                const value = row[header];
                return typeof value === 'string' && value.includes(',')
                    ? `"${value}"`
                    : value;
            }).join(',')
        ),
    ].join('\n');

    downloadFile(csvContent, filename, 'text/csv');
};

/**
 * Check if user has permission
 * @param {string} userRole
 * @param {Array<string>} allowedRoles
 * @returns {boolean}
 */
export const hasPermission = (userRole, allowedRoles) => {
    return allowedRoles.includes(userRole);
};

/**
 * Get days between dates
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {number}
 */
export const getDaysBetween = (startDate, endDate) => {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.round(Math.abs((endDate - startDate) / oneDay));
};

/**
 * Check if date is today
 * @param {Date} date
 * @returns {boolean}
 */
export const isToday = (date) => {
    const today = new Date();
    return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
    );
};

/**
 * Get relative time string
 * @param {Date} date
 * @returns {string}
 */
export const getRelativeTime = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;

    return formatDate(date);
};

/**
 * Capitalize first letter
 * @param {string} str
 * @returns {string}
 */
export const capitalize = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Generate receipt number
 * @returns {string}
 */
export const generateReceiptNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `RCP${year}${month}${random}`;
};

/**
 * Validate required fields
 * @param {Object} data
 * @param {Array<string>} requiredFields
 * @returns {Object}
 */
export const validateRequiredFields = (data, requiredFields) => {
    const errors = {};

    requiredFields.forEach((field) => {
        if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
            errors[field] = 'This field is required';
        }
    });

    return errors;
};

/**
 * Generate Student Roll Number
 * Format: [SCHOOL_CODE][SESSION][CLASS_ROMAN][3-DIGIT_NUMBER]
 * @param {string} schoolCode
 * @param {string} session
 * @param {string} classRoman
 * @param {number} sequenceNumber
 * @returns {string}
 */
export const generateRollNumber = (schoolCode, session, classRoman, sequenceNumber) => {
    const sequence = sequenceNumber.toString().padStart(3, '0');
    return `${schoolCode}${session}${classRoman}${sequence}`.toUpperCase();
};
