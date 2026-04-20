/**
 * Autonomous API test seed — idempotent upserts for test-school-1 and related rows.
 * Run: cd backend && npx ts-node prisma/autonomous-test-seed.ts
 */
import {
  PrismaClient,
  UserRole,
  UserStatus,
  SubscriptionStatus,
  Gender,
  StudentStatus,
  ExamType,
  FeeFrequency,
  FeeInvoiceStatus,
  PaymentMethod,
  LeaveType,
  LeaveStatus,
  TeacherAttendanceStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const SCHOOL_ID = 'test-school-1';
const PASSWORD = 'Test@1234';

async function main() {
  const now = new Date();
  const hash = await bcrypt.hash(PASSWORD, 10);

  const school = await prisma.school.upsert({
    where: { id: SCHOOL_ID },
    update: {
      name: 'Test College',
      email: 'admin@testcollege.com',
      updatedAt: now,
    },
    create: {
      id: SCHOOL_ID,
      name: 'Test College',
      slug: 'test-college-autonomous',
      principalName: 'Test Principal',
      ownerName: 'Test Owner',
      subscriptionAmount: 50000,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      subscriptionStartDate: now,
      nextBillingDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      address: 'Test Address',
      phone: '+920001112233',
      email: 'admin@testcollege.com',
      website: 'https://testcollege.test',
      updatedAt: now,
    },
  });

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@test.com' },
    update: { password: hash, updatedAt: now },
    create: {
      id: 'user-test-superadmin',
      email: 'superadmin@test.com',
      password: hash,
      name: 'Super Admin Test',
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      updatedAt: now,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: { password: hash, schoolId: school.id, updatedAt: now },
    create: {
      id: 'user-test-admin',
      email: 'admin@test.com',
      password: hash,
      name: 'Admin Test',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      schoolId: school.id,
      updatedAt: now,
    },
  });

  const management = await prisma.user.upsert({
    where: { email: 'management@test.com' },
    update: { password: hash, schoolId: school.id, updatedAt: now },
    create: {
      id: 'user-test-management',
      email: 'management@test.com',
      password: hash,
      name: 'Management Test',
      role: UserRole.MANAGEMENT,
      status: UserStatus.ACTIVE,
      schoolId: school.id,
      updatedAt: now,
    },
  });

  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@test.com' },
    update: {
      password: hash,
      schoolId: school.id,
      employeeId: 'TCH001',
      updatedAt: now,
    },
    create: {
      id: 'user-test-teacher',
      email: 'teacher@test.com',
      password: hash,
      name: 'Teacher Test',
      role: UserRole.TEACHER,
      status: UserStatus.ACTIVE,
      schoolId: school.id,
      phone: '03001234567',
      employeeId: 'TCH001',
      salary: 45000,
      updatedAt: now,
    },
  });

  const parent1 = await prisma.user.upsert({
    where: { email: 'parent1@test.com' },
    update: { password: hash, schoolId: school.id, updatedAt: now },
    create: {
      id: 'user-test-parent1',
      email: 'parent1@test.com',
      password: hash,
      name: 'Parent One',
      role: UserRole.PARENT,
      status: UserStatus.ACTIVE,
      schoolId: school.id,
      updatedAt: now,
    },
  });

  const parent2 = await prisma.user.upsert({
    where: { email: 'parent2@test.com' },
    update: { password: hash, schoolId: school.id, updatedAt: now },
    create: {
      id: 'user-test-parent2',
      email: 'parent2@test.com',
      password: hash,
      name: 'Parent Two',
      role: UserRole.PARENT,
      status: UserStatus.ACTIVE,
      schoolId: school.id,
      updatedAt: now,
    },
  });

  const supportStaff = await prisma.user.upsert({
    where: { email: 'support@test.com' },
    update: { password: hash, schoolId: school.id, updatedAt: now },
    create: {
      id: 'user-test-support',
      email: 'support@test.com',
      password: hash,
      name: 'Support Staff',
      role: UserRole.SUPPORT_STAFF,
      status: UserStatus.ACTIVE,
      schoolId: school.id,
      updatedAt: now,
    },
  });

  const class5 = await prisma.class.upsert({
    where: { id: 'class-test-5' },
    update: { name: 'Class 5', displayName: 'Class 5', updatedAt: now },
    create: {
      id: 'class-test-5',
      schoolId: school.id,
      grade: '5',
      name: 'Class 5',
      displayName: 'Class 5',
      updatedAt: now,
    },
  });

  const sectionA = await prisma.section.upsert({
    where: { id: 'section-test-a' },
    update: { updatedAt: now },
    create: {
      id: 'section-test-a',
      schoolId: school.id,
      classId: class5.id,
      name: 'Section A',
      capacity: 40,
      updatedAt: now,
    },
  });

  const subjectMath = await prisma.subject.upsert({
    where: { id: 'subject-test-math' },
    update: { updatedAt: now },
    create: {
      id: 'subject-test-math',
      schoolId: school.id,
      name: 'Mathematics',
      code: 'MATH-T',
      description: 'Math',
      updatedAt: now,
    },
  });

  const dob = new Date(2014, 0, 15);

  const stu1 = await prisma.student.upsert({
    where: { schoolId_rollNumber: { schoolId: school.id, rollNumber: '001' } },
    update: {
      monthlyFee: 5000,
      pendingDues: 1500,
      parentId: parent1.id,
      updatedAt: now,
    },
    create: {
      id: 'student-test-001',
      schoolId: school.id,
      classId: class5.id,
      sectionId: sectionA.id,
      rollNumber: '001',
      name: 'Ahmed Khan',
      gender: Gender.MALE,
      dateOfBirth: dob,
      parentId: parent1.id,
      status: StudentStatus.ACTIVE,
      monthlyFee: 5000,
      pendingDues: 1500,
      admissionDate: new Date(2023, 3, 1),
      updatedAt: now,
    },
  });

  const stu2 = await prisma.student.upsert({
    where: { schoolId_rollNumber: { schoolId: school.id, rollNumber: '002' } },
    update: {
      monthlyFee: 4000,
      pendingDues: 0,
      parentId: parent2.id,
      updatedAt: now,
    },
    create: {
      id: 'student-test-002',
      schoolId: school.id,
      classId: class5.id,
      sectionId: sectionA.id,
      rollNumber: '002',
      name: 'Sara Ali',
      gender: Gender.FEMALE,
      dateOfBirth: dob,
      parentId: parent2.id,
      status: StudentStatus.ACTIVE,
      monthlyFee: 4000,
      pendingDues: 0,
      admissionDate: new Date(2023, 3, 1),
      updatedAt: now,
    },
  });

  const stu3 = await prisma.student.upsert({
    where: { schoolId_rollNumber: { schoolId: school.id, rollNumber: '003' } },
    update: { monthlyFee: 4500, pendingDues: 0, updatedAt: now },
    create: {
      id: 'student-test-003',
      schoolId: school.id,
      classId: class5.id,
      sectionId: sectionA.id,
      rollNumber: '003',
      name: 'Bilal Hussain',
      gender: Gender.MALE,
      dateOfBirth: dob,
      status: StudentStatus.ACTIVE,
      monthlyFee: 4500,
      pendingDues: 0,
      admissionDate: new Date(2023, 3, 1),
      updatedAt: now,
    },
  });

  const feeStructure = await prisma.feeStructure.upsert({
    where: { id: 'fee-structure-test-5' },
    update: { updatedAt: now },
    create: {
      id: 'fee-structure-test-5',
      schoolId: school.id,
      classId: class5.id,
      name: 'Class 5 Monthly',
      amount: 5000,
      frequency: FeeFrequency.MONTHLY,
      updatedAt: now,
    },
  });

  await prisma.feeInvoice.upsert({
    where: { id: 'fee-inv-test-stu1' },
    update: { updatedAt: now },
    create: {
      id: 'fee-inv-test-stu1',
      schoolId: school.id,
      studentId: stu1.id,
      feeStructureId: feeStructure.id,
      amount: 5000,
      dueDate: new Date('2025-04-30'),
      status: FeeInvoiceStatus.PENDING,
      updatedAt: now,
    },
  });

  const receiptPartial = `RCPT-TEST-M3-2025-${school.id.slice(0, 6)}`;
  await prisma.feePayment.upsert({
    where: { studentId_month_year: { studentId: stu1.id, month: 3, year: 2025 } },
    update: {
      amountPaid: 3000,
      originalAmount: 5000,
      updatedAt: now,
    },
    create: {
      id: 'fee-pay-partial-m3-2025',
      schoolId: school.id,
      studentId: stu1.id,
      month: 3,
      year: 2025,
      originalAmount: 5000,
      discountPercentage: 0,
      discountAmount: 0,
      amountPaid: 3000,
      paymentMethod: PaymentMethod.CASH,
      receiptNumber: receiptPartial,
      updatedAt: now,
    },
  });

  const examMid = await prisma.exam.upsert({
    where: { id: 'exam-mid-term-test' },
    update: { updatedAt: now },
    create: {
      id: 'exam-mid-term-test',
      schoolId: school.id,
      name: 'Mid Term',
      type: ExamType.MIDTERM,
      classId: class5.id,
      sectionId: sectionA.id,
      subjectId: subjectMath.id,
      date: new Date('2025-05-15'),
      totalMarks: 100,
      updatedAt: now,
    },
  });

  await prisma.examResult.upsert({
    where: { examId_studentId: { examId: examMid.id, studentId: stu1.id } },
    update: { obtainedMarks: 72, updatedAt: now },
    create: {
      id: 'exam-result-mid-stu1',
      examId: examMid.id,
      studentId: stu1.id,
      obtainedMarks: 72,
      grade: 'B',
      remarks: 'Seeded',
      updatedAt: now,
    },
  });

  const leavePending = await prisma.leaveRequest.upsert({
    where: { id: 'leave-pending-teacher-test' },
    update: { status: LeaveStatus.PENDING, updatedAt: now },
    create: {
      id: 'leave-pending-teacher-test',
      schoolId: school.id,
      requestedByUserId: teacher.id,
      role: UserRole.TEACHER,
      type: LeaveType.SICK,
      status: LeaveStatus.PENDING,
      fromDate: new Date('2025-04-10'),
      toDate: new Date('2025-04-11'),
      reason: 'Seeded pending leave',
      updatedAt: now,
    },
  });

  try {
    await prisma.announcement.create({
      data: {
        id: 'announcement-seed-test',
        schoolId: school.id,
        title: 'Autonomous Test Announcement',
        content: 'Seeded announcement body',
        publishDate: now,
        isPinned: false,
        createdById: admin.id,
        updatedAt: now,
        AnnouncementRole: {
          create: [{ id: randomUUID(), role: UserRole.TEACHER }, { id: randomUUID(), role: UserRole.PARENT }],
        },
      },
    });
  } catch {
    /* already exists */
  }

  await prisma.expense.upsert({
    where: { id: 'expense-stationery-test' },
    update: { amount: 2000, updatedAt: now },
    create: {
      id: 'expense-stationery-test',
      schoolId: school.id,
      title: 'Stationery',
      amount: 2000,
      category: 'SUPPLIES',
      notes: 'Seeded expense',
      createdById: admin.id,
      createdByRole: UserRole.ADMIN,
      updatedAt: now,
    },
  });

  const manifest = {
    schoolId: school.id,
    class5Id: class5.id,
    sectionAId: sectionA.id,
    subjectMathId: subjectMath.id,
    student001Id: stu1.id,
    student002Id: stu2.id,
    student003Id: stu3.id,
    teacherUserId: teacher.id,
    parent1UserId: parent1.id,
    parent2UserId: parent2.id,
    adminUserId: admin.id,
    feeStructureId: feeStructure.id,
    examMidTermId: examMid.id,
    leavePendingId: leavePending.id,
    receiptPartialMarch2025: receiptPartial,
  };

  const outPath = path.join(__dirname, '..', 'autonomous-test-ids.json');
  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log('Wrote', outPath);
  console.log('Autonomous test seed OK.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
