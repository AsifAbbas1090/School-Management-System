import { randomBytes, randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaClient, UserRole, Gender, FeeFrequency, StudentStatus } from '@prisma/client';

export interface IntegrationTestSeed {
  suffix: string;
  schoolId: string;
  classId: string;
  sectionId: string;
  subjectId: string;
  feeStructureId: string;
  adminEmail: string;
  teacherEmail: string;
  parent1Email: string;
  parent2Email: string;
  passwordPlain: string;
  adminId: string;
  teacherId: string;
  parent1Id: string;
  parent2Id: string;
  student1Id: string;
  student2Id: string;
  student3Id: string;
  invoiceOwnId: string;
  invoiceOtherId: string;
}

/**
 * Inserts one school, class/section/subject, fee structure, users (admin, teacher, 2 parents),
 * three students (parent1 → s1+s2, parent2 → s3), and two fee invoices.
 */
export async function seedIntegrationData(prisma: PrismaClient): Promise<IntegrationTestSeed> {
  const suffix = randomBytes(6).toString('hex');
  const passwordPlain = 'IntegrationTest#1';
  const hashed = await bcrypt.hash(passwordPlain, 8);
  const now = new Date();

  const schoolId = randomUUID();
  const classId = randomUUID();
  const sectionId = randomUUID();
  const subjectId = randomUUID();
  const feeStructureId = randomUUID();

  const adminId = randomUUID();
  const teacherId = randomUUID();
  const parent1Id = randomUUID();
  const parent2Id = randomUUID();

  const student1Id = randomUUID();
  const student2Id = randomUUID();
  const student3Id = randomUUID();

  const invoiceOwnId = randomUUID();
  const invoiceOtherId = randomUUID();

  const adminEmail = `it-${suffix}-admin@test.local`;
  const teacherEmail = `it-${suffix}-teacher@test.local`;
  const parent1Email = `it-${suffix}-parent1@test.local`;
  const parent2Email = `it-${suffix}-parent2@test.local`;

  await prisma.school.create({
    data: {
      id: schoolId,
      name: 'Integration Test School',
      slug: `int-school-${suffix}`,
      updatedAt: now,
    },
  });

  await prisma.class.create({
    data: {
      id: classId,
      schoolId,
      grade: '10',
      name: 'A',
      updatedAt: now,
    },
  });

  await prisma.section.create({
    data: {
      id: sectionId,
      schoolId,
      classId,
      name: 'Sec-1',
      updatedAt: now,
    },
  });

  await prisma.subject.create({
    data: {
      id: subjectId,
      schoolId,
      name: 'Mathematics',
      code: `MATH-${suffix}`,
      updatedAt: now,
    },
  });

  await prisma.feeStructure.create({
    data: {
      id: feeStructureId,
      schoolId,
      classId: null,
      name: 'General Fee',
      amount: 5000,
      frequency: FeeFrequency.MONTHLY,
      updatedAt: now,
    },
  });

  await prisma.user.createMany({
    data: [
      {
        id: adminId,
        email: adminEmail,
        password: hashed,
        name: 'Test Admin',
        role: UserRole.ADMIN,
        schoolId,
        updatedAt: now,
      },
      {
        id: teacherId,
        email: teacherEmail,
        password: hashed,
        name: 'Test Teacher',
        role: UserRole.TEACHER,
        schoolId,
        updatedAt: now,
      },
      {
        id: parent1Id,
        email: parent1Email,
        password: hashed,
        name: 'Parent One',
        role: UserRole.PARENT,
        schoolId,
        updatedAt: now,
      },
      {
        id: parent2Id,
        email: parent2Email,
        password: hashed,
        name: 'Parent Two',
        role: UserRole.PARENT,
        schoolId,
        updatedAt: now,
      },
    ],
  });

  const dob = new Date('2010-05-15');

  await prisma.student.createMany({
    data: [
      {
        id: student1Id,
        schoolId,
        classId,
        sectionId,
        rollNumber: `R1-${suffix}`,
        name: 'Student One',
        gender: Gender.MALE,
        dateOfBirth: dob,
        parentId: parent1Id,
        status: StudentStatus.ACTIVE,
        updatedAt: now,
      },
      {
        id: student2Id,
        schoolId,
        classId,
        sectionId,
        rollNumber: `R2-${suffix}`,
        name: 'Student Two',
        gender: Gender.FEMALE,
        dateOfBirth: dob,
        parentId: parent1Id,
        status: StudentStatus.ACTIVE,
        updatedAt: now,
      },
      {
        id: student3Id,
        schoolId,
        classId,
        sectionId,
        rollNumber: `R3-${suffix}`,
        name: 'Student Other Parent',
        gender: Gender.MALE,
        dateOfBirth: dob,
        parentId: parent2Id,
        status: StudentStatus.ACTIVE,
        updatedAt: now,
      },
    ],
  });

  await prisma.feeInvoice.createMany({
    data: [
      {
        id: invoiceOwnId,
        schoolId,
        studentId: student1Id,
        feeStructureId,
        amount: 5000,
        dueDate: new Date('2026-12-31'),
        updatedAt: now,
      },
      {
        id: invoiceOtherId,
        schoolId,
        studentId: student3Id,
        feeStructureId,
        amount: 5000,
        dueDate: new Date('2026-12-31'),
        updatedAt: now,
      },
    ],
  });

  return {
    suffix,
    schoolId,
    classId,
    sectionId,
    subjectId,
    feeStructureId,
    adminEmail,
    teacherEmail,
    parent1Email,
    parent2Email,
    passwordPlain,
    adminId,
    teacherId,
    parent1Id,
    parent2Id,
    student1Id,
    student2Id,
    student3Id,
    invoiceOwnId,
    invoiceOtherId,
  };
}
