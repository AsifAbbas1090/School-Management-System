/**
 * Type definitions for School Management System
 * Using JSDoc for type safety in JavaScript
 */

/**
 * @typedef {'admin' | 'management' | 'teacher' | 'parent' | 'student'} UserRole
 */

/**
 * @typedef {'active' | 'inactive' | 'suspended'} UserStatus
 */

/**
 * @typedef {'present' | 'absent' | 'leave' | 'late'} AttendanceStatus
 */

/**
 * @typedef {'paid' | 'unpaid' | 'partial' | 'overdue'} FeeStatus
 */

/**
 * @typedef {'pending' | 'approved' | 'rejected'} LeaveStatus
 */

/**
 * @typedef {'male' | 'female' | 'other'} Gender
 */

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} email
 * @property {string} name
 * @property {UserRole} role
 * @property {UserStatus} status
 * @property {string} [avatar]
 * @property {string} [phone]
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

/**
 * @typedef {Object} Student
 * @property {string} id
 * @property {string} name
 * @property {string} rollNumber
 * @property {string} email
 * @property {string} classId
 * @property {string} sectionId
 * @property {string} [parentId]
 * @property {Gender} gender
 * @property {Date} dateOfBirth
 * @property {string} [avatar]
 * @property {string} [phone]
 * @property {string} address
 * @property {UserStatus} status
 * @property {Date} admissionDate
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

/**
 * @typedef {Object} Teacher
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {string} employeeId
 * @property {Gender} gender
 * @property {Date} dateOfBirth
 * @property {string} [avatar]
 * @property {string} phone
 * @property {string} address
 * @property {string[]} subjectIds
 * @property {string[]} classIds
 * @property {UserStatus} status
 * @property {Date} joiningDate
 * @property {number} salary
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

/**
 * @typedef {Object} Parent
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {string} phone
 * @property {string} address
 * @property {string[]} studentIds
 * @property {string} occupation
 * @property {UserStatus} status
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

/**
 * @typedef {Object} Class
 * @property {string} id
 * @property {string} name
 * @property {string} grade
 * @property {string[]} sectionIds
 * @property {number} capacity
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

/**
 * @typedef {Object} Section
 * @property {string} id
 * @property {string} name
 * @property {string} classId
 * @property {string} [classTeacherId]
 * @property {number} capacity
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

/**
 * @typedef {Object} Subject
 * @property {string} id
 * @property {string} name
 * @property {string} code
 * @property {string[]} classIds
 * @property {string} [description]
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

/**
 * @typedef {Object} Attendance
 * @property {string} id
 * @property {string} studentId
 * @property {string} classId
 * @property {string} sectionId
 * @property {string} subjectId
 * @property {string} teacherId
 * @property {Date} date
 * @property {AttendanceStatus} status
 * @property {string} [remarks]
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

/**
 * @typedef {Object} FeeStructure
 * @property {string} id
 * @property {string} classId
 * @property {string} name
 * @property {number} amount
 * @property {string} frequency
 * @property {string} [description]
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

/**
 * @typedef {Object} FeePayment
 * @property {string} id
 * @property {string} studentId
 * @property {string} feeStructureId
 * @property {number} amount
 * @property {number} paidAmount
 * @property {number} dueAmount
 * @property {FeeStatus} status
 * @property {Date} dueDate
 * @property {Date} [paidDate]
 * @property {string} [paymentMethod]
 * @property {string} [transactionId]
 * @property {string} [receiptNumber]
 * @property {string} [remarks]
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

/**
 * @typedef {Object} Exam
 * @property {string} id
 * @property {string} name
 * @property {string} type
 * @property {string[]} classIds
 * @property {Date} startDate
 * @property {Date} endDate
 * @property {number} totalMarks
 * @property {number} passingMarks
 * @property {string} [description]
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

/**
 * @typedef {Object} ExamSubject
 * @property {string} id
 * @property {string} examId
 * @property {string} subjectId
 * @property {Date} examDate
 * @property {string} startTime
 * @property {string} endTime
 * @property {number} totalMarks
 * @property {number} passingMarks
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

/**
 * @typedef {Object} Result
 * @property {string} id
 * @property {string} studentId
 * @property {string} examId
 * @property {string} subjectId
 * @property {number} marksObtained
 * @property {number} totalMarks
 * @property {string} grade
 * @property {string} [remarks]
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

/**
 * @typedef {Object} Timetable
 * @property {string} id
 * @property {string} classId
 * @property {string} sectionId
 * @property {string} day
 * @property {string} period
 * @property {string} subjectId
 * @property {string} teacherId
 * @property {string} startTime
 * @property {string} endTime
 * @property {string} [room]
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

/**
 * @typedef {Object} Announcement
 * @property {string} id
 * @property {string} title
 * @property {string} content
 * @property {UserRole[]} targetRoles
 * @property {string[]} [targetClassIds]
 * @property {string} createdBy
 * @property {Date} publishDate
 * @property {Date} [expiryDate]
 * @property {boolean} isPinned
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

/**
 * @typedef {Object} Message
 * @property {string} id
 * @property {string} senderId
 * @property {string} receiverId
 * @property {string} subject
 * @property {string} content
 * @property {boolean} isRead
 * @property {Date} readAt
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

/**
 * @typedef {Object} Leave
 * @property {string} id
 * @property {string} userId
 * @property {UserRole} userRole
 * @property {string} type
 * @property {Date} startDate
 * @property {Date} endDate
 * @property {string} reason
 * @property {LeaveStatus} status
 * @property {string} [approvedBy]
 * @property {Date} [approvedAt]
 * @property {string} [rejectionReason]
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

/**
 * @typedef {Object} AcademicYear
 * @property {string} id
 * @property {string} name
 * @property {Date} startDate
 * @property {Date} endDate
 * @property {boolean} isCurrent
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

/**
 * @typedef {Object} DashboardStats
 * @property {number} totalStudents
 * @property {number} totalTeachers
 * @property {number} totalParents
 * @property {number} totalClasses
 * @property {number} feeCollected
 * @property {number} feePending
 * @property {number} presentToday
 * @property {number} absentToday
 */

export {};
