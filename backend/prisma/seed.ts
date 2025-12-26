import { PrismaClient, UserRole, UserStatus, SubscriptionStatus, Gender, StudentStatus, ExamType, FeeFrequency, FeeInvoiceStatus, PaymentMethod, TeacherAttendanceStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const now = new Date();

  // ============================================
  // 1. CREATE SUPER ADMIN
  // ============================================
  const superAdminPassword = await bcrypt.hash('password123', 10);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@school.com' },
    update: {},
    create: {
      id: randomUUID(),
      email: 'superadmin@school.com',
      password: superAdminPassword,
      name: 'System Super Admin',
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      phone: '+923001234567',
      updatedAt: now,
    },
  });
  console.log('✅ Created super admin:', superAdmin.email, '| Password: password123');

  // ============================================
  // 2. CREATE DEMO SCHOOL
  // ============================================
  const demoSchool = await prisma.school.upsert({
    where: { slug: 'demo-school' },
    update: {},
    create: {
      id: randomUUID(),
      name: 'AL-ABBAS COLLEGE OF SCIENCE AND ARTS Shah Jamal',
      slug: 'demo-school',
      principalName: 'Dr. Muhammad Ali',
      ownerName: 'School Management',
      subscriptionAmount: 50000,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      subscriptionStartDate: now,
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      address: 'Shah Jamal, Muzaffargarh, Punjab, Pakistan',
      phone: '+923001234567',
      email: 'info@alabbascollege.edu.pk',
      website: 'www.alabbascollege.edu.pk',
      updatedAt: now,
    },
  });
  console.log('✅ Created demo school:', demoSchool.name);

  // ============================================
  // 3. CREATE ADMIN USER
  // ============================================
  const adminPassword = await bcrypt.hash('password123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@school.com' },
    update: {},
    create: {
      id: randomUUID(),
      email: 'admin@school.com',
      password: adminPassword,
      name: 'Admin User',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      phone: '+923001234568',
      schoolId: demoSchool.id,
      updatedAt: now,
    },
  });
  console.log('✅ Created admin user:', admin.email, '| Password: password123');

  // ============================================
  // 4. CREATE MANAGEMENT USER
  // ============================================
  const managementPassword = await bcrypt.hash('password123', 10);
  const management = await prisma.user.upsert({
    where: { email: 'manager@school.com' },
    update: {},
    create: {
      id: randomUUID(),
      email: 'manager@school.com',
      password: managementPassword,
      name: 'Management Manager',
      role: UserRole.MANAGEMENT,
      status: UserStatus.ACTIVE,
      phone: '+923001234569',
      schoolId: demoSchool.id,
      updatedAt: now,
    },
  });
  console.log('✅ Created management user:', management.email, '| Password: password123');

  // ============================================
  // 5. CREATE TEACHER USER
  // ============================================
  const teacherPassword = await bcrypt.hash('password123', 10);
  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@school.com' },
    update: {},
    create: {
      id: randomUUID(),
      email: 'teacher@school.com',
      password: teacherPassword,
      name: 'Mr. Ahmad Khan',
      role: UserRole.TEACHER,
      status: UserStatus.ACTIVE,
      phone: '+923001234570',
      schoolId: demoSchool.id,
      updatedAt: now,
    },
  });
  console.log('✅ Created teacher user:', teacher.email, '| Password: password123');

  // ============================================
  // 6. CREATE PARENT USER
  // ============================================
  const parentPassword = await bcrypt.hash('password123', 10);
  const parent = await prisma.user.upsert({
    where: { email: 'parent@school.com' },
    update: {},
    create: {
      id: randomUUID(),
      email: 'parent@school.com',
      password: parentPassword,
      name: 'Mr. Hassan Ali',
      role: UserRole.PARENT,
      status: UserStatus.ACTIVE,
      phone: '+923001234571',
      schoolId: demoSchool.id,
      updatedAt: now,
    },
  });
  console.log('✅ Created parent user:', parent.email, '| Password: password123');

  // ============================================
  // 7. CREATE CLASSES
  // ============================================
  const class1 = await prisma.class.upsert({
    where: { id: 'class-1-id' },
    update: {},
    create: {
      id: 'class-1-id',
      schoolId: demoSchool.id,
      grade: '1',
      name: 'Class 1',
      displayName: 'Class 1',
      updatedAt: now,
    },
  });

  const class2 = await prisma.class.upsert({
    where: { id: 'class-2-id' },
    update: {},
    create: {
      id: 'class-2-id',
      schoolId: demoSchool.id,
      grade: '2',
      name: 'Class 2',
      displayName: 'Class 2',
      updatedAt: now,
    },
  });

  const class3 = await prisma.class.upsert({
    where: { id: 'class-3-id' },
    update: {},
    create: {
      id: 'class-3-id',
      schoolId: demoSchool.id,
      grade: '3',
      name: 'Class 3',
      displayName: 'Class 3',
      updatedAt: now,
    },
  });
  console.log('✅ Created 3 classes');

  // ============================================
  // 8. CREATE SECTIONS
  // ============================================
  const section1A = await prisma.section.upsert({
    where: { id: 'section-1a-id' },
    update: {},
    create: {
      id: 'section-1a-id',
      schoolId: demoSchool.id,
      classId: class1.id,
      name: 'A',
      capacity: 30,
      classTeacherId: teacher.id,
      updatedAt: now,
    },
  });

  const section1B = await prisma.section.upsert({
    where: { id: 'section-1b-id' },
    update: {},
    create: {
      id: 'section-1b-id',
      schoolId: demoSchool.id,
      classId: class1.id,
      name: 'B',
      capacity: 30,
      updatedAt: now,
    },
  });

  const section2A = await prisma.section.upsert({
    where: { id: 'section-2a-id' },
    update: {},
    create: {
      id: 'section-2a-id',
      schoolId: demoSchool.id,
      classId: class2.id,
      name: 'A',
      capacity: 30,
      updatedAt: now,
    },
  });
  console.log('✅ Created 3 sections');

  // ============================================
  // 9. CREATE SUBJECTS
  // ============================================
  const subjects = [
    { name: 'Mathematics', code: 'MATH' },
    { name: 'English', code: 'ENG' },
    { name: 'Science', code: 'SCI' },
    { name: 'Urdu', code: 'URD' },
    { name: 'Islamiat', code: 'ISL' },
    { name: 'Computer Science', code: 'CS' },
  ];

  const createdSubjects = [];
  for (const subject of subjects) {
    const subj = await prisma.subject.upsert({
      where: { id: `subject-${subject.code.toLowerCase()}-id` },
      update: {},
      create: {
        id: `subject-${subject.code.toLowerCase()}-id`,
        schoolId: demoSchool.id,
        name: subject.name,
        code: subject.code,
        description: `${subject.name} subject`,
        updatedAt: now,
      },
    });
    createdSubjects.push(subj);
  }
  console.log('✅ Created', createdSubjects.length, 'subjects');

  // ============================================
  // 10. CREATE STUDENTS
  // ============================================
  const students = [
    { name: 'Ali Ahmed', rollNumber: 'STU001', gender: Gender.MALE, classId: class1.id, sectionId: section1A.id },
    { name: 'Fatima Khan', rollNumber: 'STU002', gender: Gender.FEMALE, classId: class1.id, sectionId: section1A.id },
    { name: 'Hassan Ali', rollNumber: 'STU003', gender: Gender.MALE, classId: class1.id, sectionId: section1A.id },
    { name: 'Ayesha Malik', rollNumber: 'STU004', gender: Gender.FEMALE, classId: class2.id, sectionId: section2A.id },
    { name: 'Usman Sheikh', rollNumber: 'STU005', gender: Gender.MALE, classId: class2.id, sectionId: section2A.id },
  ];

  const createdStudents = [];
  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const dob = new Date(2015 + i, 5, 15 + i); // Different birth dates
    const stu = await prisma.student.upsert({
      where: { 
        schoolId_rollNumber: {
          schoolId: demoSchool.id,
          rollNumber: student.rollNumber,
        }
      },
      update: {},
      create: {
        id: `student-${student.rollNumber.toLowerCase()}-id`,
        schoolId: demoSchool.id,
        classId: student.classId,
        sectionId: student.sectionId,
        rollNumber: student.rollNumber,
        name: student.name,
        gender: student.gender,
        dateOfBirth: dob,
        parentId: i === 0 ? parent.id : null, // Link first student to parent
        status: StudentStatus.ACTIVE,
        address: `Address ${i + 1}, City, Pakistan`,
        phone: `+92300${1000000 + i}`,
        email: `student${i + 1}@school.com`,
        admissionDate: new Date(2024, 0, 1),
        updatedAt: now,
      },
    });
    createdStudents.push(stu);
  }
  console.log('✅ Created', createdStudents.length, 'students');

  // ============================================
  // 11. CREATE FEE STRUCTURES
  // ============================================
  const feeStructure = await prisma.feeStructure.upsert({
    where: { id: 'fee-structure-1-id' },
    update: {},
    create: {
      id: 'fee-structure-1-id',
      schoolId: demoSchool.id,
      classId: class1.id,
      name: 'Monthly Fee',
      amount: 5000,
      frequency: FeeFrequency.MONTHLY,
      updatedAt: now,
    },
  });
  console.log('✅ Created fee structure');

  // ============================================
  // 12. CREATE FEE INVOICES
  // ============================================
  for (const student of createdStudents.slice(0, 3)) {
    await prisma.feeInvoice.upsert({
      where: { id: `invoice-${student.rollNumber}-id` },
      update: {},
      create: {
        id: `invoice-${student.rollNumber}-id`,
        schoolId: demoSchool.id,
        studentId: student.id,
        feeStructureId: feeStructure.id,
        amount: 5000,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        status: FeeInvoiceStatus.PENDING,
        issuedAt: now,
        updatedAt: now,
      },
    });
  }
  console.log('✅ Created fee invoices');

  // ============================================
  // 13. CREATE EXAMS
  // ============================================
  const exam1 = await prisma.exam.upsert({
    where: { id: 'exam-1-id' },
    update: {},
    create: {
      id: 'exam-1-id',
      schoolId: demoSchool.id,
      name: 'Midterm Exam 2024',
      type: ExamType.MIDTERM,
      classId: class1.id,
      sectionId: section1A.id,
      subjectId: createdSubjects[0].id, // Mathematics
      date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      totalMarks: 100,
      updatedAt: now,
    },
  });

  const exam2 = await prisma.exam.upsert({
    where: { id: 'exam-2-id' },
    update: {},
    create: {
      id: 'exam-2-id',
      schoolId: demoSchool.id,
      name: 'Final Exam 2024',
      type: ExamType.FINAL,
      classId: class1.id,
      sectionId: section1A.id,
      subjectId: createdSubjects[1].id, // English
      date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
      totalMarks: 100,
      updatedAt: now,
    },
  });
  console.log('✅ Created 2 exams');

  // ============================================
  // 14. CREATE EXAM RESULTS
  // ============================================
  for (let i = 0; i < Math.min(3, createdStudents.length); i++) {
    const student = createdStudents[i];
    const marks = 70 + (i * 5); // Different marks for each student
    
    await prisma.examResult.upsert({
      where: {
        examId_studentId: {
          examId: exam1.id,
          studentId: student.id,
        }
      },
      update: {},
      create: {
        id: `result-${exam1.id}-${student.id}`,
        examId: exam1.id,
        studentId: student.id,
        obtainedMarks: marks,
        grade: marks >= 90 ? 'A+' : marks >= 80 ? 'A' : marks >= 70 ? 'B' : marks >= 60 ? 'C' : 'D',
        remarks: 'Good performance',
        updatedAt: now,
      },
    });
  }
  console.log('✅ Created exam results');

  // ============================================
  // 15. CREATE EXPENSES
  // ============================================
  const expenses = [
    { title: 'Stationery Purchase', amount: 15000, category: 'Supplies' },
    { title: 'Electricity Bill', amount: 25000, category: 'Utilities' },
    { title: 'Teacher Training', amount: 30000, category: 'Training' },
  ];

  for (const expense of expenses) {
    await prisma.expense.create({
      data: {
        id: randomUUID(),
        schoolId: demoSchool.id,
        title: expense.title,
        amount: expense.amount,
        category: expense.category,
        notes: `Monthly ${expense.category.toLowerCase()} expense`,
        createdById: admin.id,
        createdByRole: UserRole.ADMIN,
        updatedAt: now,
      },
    });
  }
  console.log('✅ Created', expenses.length, 'expenses');

  // ============================================
  // 16. CREATE TEACHER ATTENDANCE
  // ============================================
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Create attendance for last 7 days
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    
    const status = i < 5 ? TeacherAttendanceStatus.PRESENT : TeacherAttendanceStatus.ABSENT;
    let entryTime: Date | null = null;
    let exitTime: Date | null = null;
    
    if (i < 5) {
      entryTime = new Date(date);
      entryTime.setHours(8, 0, 0, 0);
      exitTime = new Date(date);
      exitTime.setHours(17, 0, 0, 0);
    }

    try {
      await prisma.teacherAttendance.upsert({
        where: {
          teacherId_date: {
            teacherId: teacher.id,
            date: date,
          }
        },
        update: {},
        create: {
          id: randomUUID(),
          schoolId: demoSchool.id,
          teacherId: teacher.id,
          date: date,
          status: status,
          entryTime: entryTime,
          exitTime: exitTime,
          notes: i < 5 ? 'Regular attendance' : 'On leave',
          recordedById: admin.id,
          updatedAt: now,
        },
      });
    } catch (error) {
      // Skip if already exists
      console.log(`   Skipped attendance for date ${date.toISOString().split('T')[0]} (already exists)`);
    }
  }
  console.log('✅ Created teacher attendance records');

  // ============================================
  // 17. CREATE ANNOUNCEMENTS
  // ============================================
  try {
    const announcement = await prisma.announcement.create({
      data: {
        id: randomUUID(),
        schoolId: demoSchool.id,
        title: 'Welcome to New Academic Year',
        content: 'We welcome all students and parents to the new academic year. Please ensure all fees are paid on time.',
        publishDate: now,
        isPinned: true,
        createdById: admin.id,
        updatedAt: now,
        AnnouncementRole: {
          create: [
            { id: randomUUID(), role: UserRole.PARENT },
            { id: randomUUID(), role: UserRole.TEACHER },
            { id: randomUUID(), role: UserRole.ADMIN },
            { id: randomUUID(), role: UserRole.MANAGEMENT },
          ],
        },
      },
    });
    console.log('✅ Created announcement');
  } catch (error) {
    console.log('   Skipped announcement (may already exist)');
  }

  console.log('\n🎉 Seeding completed successfully!');
  console.log('\n📋 Login Credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Super Admin: superadmin@school.com | Password: password123');
  console.log('Admin:       admin@school.com      | Password: password123');
  console.log('Management: manager@school.com    | Password: password123');
  console.log('Teacher:    teacher@school.com    | Password: password123');
  console.log('Parent:     parent@school.com     | Password: password123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📊 Created Data:');
  console.log(`   - 1 School`);
  console.log(`   - 3 Classes`);
  console.log(`   - 3 Sections`);
  console.log(`   - ${createdSubjects.length} Subjects`);
  console.log(`   - ${createdStudents.length} Students`);
  console.log(`   - 2 Exams with Results`);
  console.log(`   - Fee Structures & Invoices`);
  console.log(`   - ${expenses.length} Expenses`);
  console.log(`   - 7 Teacher Attendance Records`);
  console.log(`   - 1 Announcement`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
