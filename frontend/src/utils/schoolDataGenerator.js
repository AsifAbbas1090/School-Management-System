/**
 * School Data Generator
 * Generates comprehensive mock data for a new school
 */

import { generateId } from './index';
import { USER_ROLES, USER_STATUS } from '../constants';

/**
 * Generate a URL-friendly slug from school name
 */
export const generateSchoolSlug = (schoolName) => {
    return schoolName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

/**
 * Generate comprehensive school data
 */
export const generateSchoolData = (schoolId, schoolName, principalName) => {
    const now = new Date();
    
    // Generate Classes (1-10)
    const classes = [];
    const sections = [];
    for (let grade = 1; grade <= 10; grade++) {
        const classId = `class_${schoolId}_${grade}`;
        const sectionA = `section_${schoolId}_${grade}_A`;
        const sectionB = `section_${schoolId}_${grade}_B`;
        
        classes.push({
            id: classId,
            name: `Class ${grade}`,
            grade: grade.toString(),
            sectionIds: [sectionA, sectionB],
            capacity: 60,
            schoolId,
            createdAt: now,
            updatedAt: now,
        });
        
        sections.push(
            {
                id: sectionA,
                name: 'A',
                classId,
                classTeacherId: null,
                capacity: 30,
                schoolId,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: sectionB,
                name: 'B',
                classId,
                classTeacherId: null,
                capacity: 30,
                schoolId,
                createdAt: now,
                updatedAt: now,
            }
        );
    }

    // Generate Subjects
    const subjectNames = [
        'Mathematics', 'English', 'Urdu', 'Science', 'Social Studies',
        'Computer Science', 'Physics', 'Chemistry', 'Biology', 'Islamiat',
        'Pakistan Studies', 'Economics', 'Accounting', 'Business Studies'
    ];
    
    const subjects = subjectNames.map((name, index) => ({
        id: `subject_${schoolId}_${index + 1}`,
        name,
        code: name.substring(0, 3).toUpperCase(),
        classIds: classes.map(c => c.id),
        description: `${name} subject`,
        schoolId,
        createdAt: now,
        updatedAt: now,
    }));

    // Generate Teachers (20-30 teachers)
    const teacherNames = [
        'Ahmed Khan', 'Fatima Ali', 'Muhammad Hassan', 'Ayesha Malik', 'Usman Sheikh',
        'Sana Ahmed', 'Bilal Raza', 'Hina Khan', 'Zain Ali', 'Maryam Shah',
        'Omar Farooq', 'Amina Butt', 'Hamza Iqbal', 'Sara Khan', 'Tariq Mehmood',
        'Nida Hassan', 'Faisal Akram', 'Rabia Malik', 'Waseem Ahmed', 'Zara Sheikh',
        'Imran Khan', 'Sadia Ali', 'Kamran Butt', 'Hira Malik', 'Asad Raza',
        'Lubna Khan', 'Noman Sheikh', 'Aqsa Ahmed', 'Shahid Iqbal', 'Mehwish Khan'
    ];
    
    const teachers = teacherNames.slice(0, 25).map((name, index) => {
        const subjectIndex = index % subjects.length;
        const secondSubjectIndex = (index + 1) % subjects.length;
        
        return {
            id: `teacher_${schoolId}_${index + 1}`,
            name,
            email: `${name.toLowerCase().replace(/\s+/g, '.')}@${generateSchoolSlug(schoolName)}.edu.pk`,
            password: `teacher${index + 1}123`,
            employeeId: `EMP${schoolId.substring(0, 4)}${String(index + 1).padStart(3, '0')}`,
            gender: index % 2 === 0 ? 'male' : 'female',
            dateOfBirth: new Date(1980 + (index % 20), index % 12, (index % 28) + 1),
            phone: `+92${300 + index}${String(index).padStart(7, '0')}`,
            address: `${index + 1} Main Street, ${schoolName}`,
            subjectIds: [subjects[subjectIndex].id, subjects[secondSubjectIndex].id],
            classIds: classes.slice(0, 3).map(c => c.id),
            status: USER_STATUS.ACTIVE,
            joiningDate: new Date(2020 + (index % 4), 0, 1),
            salary: 50000 + (index * 2000),
            role: USER_ROLES.TEACHER,
            schoolId,
            createdAt: now,
            updatedAt: now,
        };
    });

    // Generate Students (200-300 students)
    const studentFirstNames = [
        'Ali', 'Ahmed', 'Hassan', 'Usman', 'Bilal', 'Hamza', 'Omar', 'Zain', 'Faisal', 'Imran',
        'Fatima', 'Ayesha', 'Sana', 'Hina', 'Maryam', 'Amina', 'Sara', 'Rabia', 'Zara', 'Hira',
        'Aqsa', 'Mehwish', 'Lubna', 'Sadia', 'Nida', 'Aisha', 'Zainab', 'Khadija', 'Sumaya', 'Amina'
    ];
    
    const studentLastNames = [
        'Khan', 'Ali', 'Ahmed', 'Malik', 'Sheikh', 'Butt', 'Raza', 'Iqbal', 'Mehmood', 'Akram',
        'Hassan', 'Farooq', 'Shah', 'Abbas', 'Hussain', 'Rizvi', 'Zaidi', 'Naqvi', 'Jafri', 'Hashmi'
    ];
    
    const students = [];
    const parents = [];
    let studentIndex = 1;
    
    classes.forEach((cls, classIndex) => {
        cls.sectionIds.forEach((sectionId) => {
            const studentsPerSection = 25 + (classIndex % 5);
            
            for (let i = 0; i < studentsPerSection; i++) {
                const firstName = studentFirstNames[studentIndex % studentFirstNames.length];
                const lastName = studentLastNames[studentIndex % studentLastNames.length];
                const studentName = `${firstName} ${lastName}`;
                const parentName = `Mr. ${lastName}`;
                const parentId = `parent_${schoolId}_${studentIndex}`;
                
                // Create parent
                parents.push({
                    id: parentId,
                    name: parentName,
                    email: `parent.${lastName.toLowerCase()}.${studentIndex}@${generateSchoolSlug(schoolName)}.edu.pk`,
                    password: `parent${studentIndex}123`,
                    phone: `+92${300 + studentIndex}${String(studentIndex).padStart(7, '0')}`,
                    address: `${studentIndex} Street, ${schoolName}`,
                    occupation: ['Engineer', 'Doctor', 'Teacher', 'Businessman', 'Accountant'][studentIndex % 5],
                    studentIds: [],
                    status: USER_STATUS.ACTIVE,
                    role: USER_ROLES.PARENT,
                    schoolId,
                    createdAt: now,
                    updatedAt: now,
                });
                
                // Create student
                students.push({
                    id: `student_${schoolId}_${studentIndex}`,
                    name: studentName,
                    rollNumber: `STU${schoolId.substring(0, 4)}${String(studentIndex).padStart(4, '0')}`,
                    email: studentIndex % 3 === 0 ? `${firstName.toLowerCase()}.${lastName.toLowerCase()}@student.${generateSchoolSlug(schoolName)}.edu.pk` : null,
                    classId: cls.id,
                    sectionId,
                    parentId,
                    gender: studentIndex % 2 === 0 ? 'male' : 'female',
                    dateOfBirth: new Date(2010 + (classIndex % 5), studentIndex % 12, (studentIndex % 28) + 1),
                    phone: null,
                    address: `${studentIndex} Street, ${schoolName}`,
                    status: USER_STATUS.ACTIVE,
                    admissionDate: new Date(2023 + (classIndex % 2), 0, 1),
                    monthlyFee: 5000 + (classIndex * 500),
                    schoolId,
                    createdAt: now,
                    updatedAt: now,
                });
                
                // Update parent's studentIds
                parents[parents.length - 1].studentIds.push(students[students.length - 1].id);
                
                studentIndex++;
            }
        });
    });

    return {
        classes,
        sections,
        subjects,
        teachers,
        students,
        parents,
    };
};


