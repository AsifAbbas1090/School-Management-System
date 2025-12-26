import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SeedService {
  constructor(private prisma: PrismaService) {}

  async seedSchool(schoolId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      throw new NotFoundException(`School with ID ${schoolId} not found`);
    }

    // Create 10 Classes (Class 1-10)
    const classes = [];
    for (let i = 1; i <= 10; i++) {
      const classEntity = await this.prisma.class.create({
        data: {
          schoolId,
          grade: i.toString(),
          name: `Class ${i}`,
          displayName: `Class ${i} - Primary`,
        } as any,
      });
      classes.push(classEntity);
    }

    // Create 2 Sections per class (A & B)
    const sections = [];
    for (const classEntity of classes) {
      for (const sectionName of ['A', 'B']) {
        const section = await this.prisma.section.create({
          data: {
            schoolId,
            classId: classEntity.id,
            name: sectionName,
            capacity: 30,
          } as any,
        });
        sections.push(section);
      }
    }

    // Create 14 Subjects
    const subjectsData = [
      { name: 'Mathematics', code: 'MATH', description: 'Mathematics' },
      { name: 'English', code: 'ENG', description: 'English Language' },
      { name: 'Science', code: 'SCI', description: 'General Science' },
      { name: 'Social Studies', code: 'SS', description: 'Social Studies' },
      { name: 'Urdu', code: 'URD', description: 'Urdu Language' },
      { name: 'Islamiat', code: 'ISL', description: 'Islamic Studies' },
      { name: 'Computer Science', code: 'CS', description: 'Computer Science' },
      { name: 'Physics', code: 'PHY', description: 'Physics' },
      { name: 'Chemistry', code: 'CHEM', description: 'Chemistry' },
      { name: 'Biology', code: 'BIO', description: 'Biology' },
      { name: 'History', code: 'HIS', description: 'History' },
      { name: 'Geography', code: 'GEO', description: 'Geography' },
      { name: 'Art', code: 'ART', description: 'Art and Drawing' },
      { name: 'Physical Education', code: 'PE', description: 'Physical Education' },
    ];

    const subjects = [];
    for (const subjectData of subjectsData) {
      const subject = await this.prisma.subject.create({
        data: {
          ...subjectData,
          schoolId,
        } as any,
      });
      subjects.push(subject);

      // Link subject to all classes
      await this.prisma.subjectClass.createMany({
        data: classes.map((classEntity) => ({
          id: require('crypto').randomUUID(),
          subjectId: subject.id,
          classId: classEntity.id,
        })) as any,
      });
    }

    // Create 25 Teachers
    const teachers = [];
    const teacherNames = [
      'John Smith', 'Emily Brown', 'Michael Johnson', 'Sarah Davis', 'David Wilson',
      'Jessica Martinez', 'Christopher Anderson', 'Amanda Taylor', 'Matthew Thomas', 'Ashley Jackson',
      'Daniel White', 'Melissa Harris', 'James Martin', 'Michelle Thompson', 'Robert Garcia',
      'Laura Martinez', 'William Rodriguez', 'Kimberly Lewis', 'Joseph Lee', 'Nicole Walker',
      'Andrew Hall', 'Stephanie Allen', 'Ryan Young', 'Rebecca King', 'Kevin Wright',
    ];

    for (let i = 0; i < teacherNames.length; i++) {
      const name = teacherNames[i];
      const email = `teacher${i + 1}@${school.slug}.com`;
      const password = await bcrypt.hash('teacher123', 10);

      const teacher = await this.prisma.user.create({
        data: {
          email,
          password,
          name,
          role: 'TEACHER',
          schoolId,
          phone: `+123456789${i}`,
        } as any,
      });
      teachers.push(teacher);
    }

    // Assign some teachers as class teachers
    let teacherIndex = 0;
    for (const section of sections.slice(0, 20)) {
      if (teacherIndex < teachers.length) {
        await this.prisma.section.update({
          where: { id: section.id },
          data: { classTeacherId: teachers[teacherIndex].id },
        });
        teacherIndex++;
      }
    }

    // Create 200-300 Students with parent accounts
    const students = [];
    const firstNames = ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason', 'Isabella', 'James'];
    const lastNames = ['Wilson', 'Brown', 'Davis', 'Miller', 'Garcia', 'Rodriguez', 'Martinez', 'Anderson', 'Taylor', 'Thomas'];

    const studentCount = Math.floor(Math.random() * 101) + 200; // 200-300

    for (let i = 0; i < studentCount; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const studentName = `${firstName} ${lastName}`;
      const rollNumber = `STU${String(i + 1).padStart(3, '0')}`;

      // Random class and section
      const classEntity = classes[Math.floor(Math.random() * classes.length)];
      const classSections = sections.filter((s) => s.classId === classEntity.id);
      const section = classSections[Math.floor(Math.random() * classSections.length)];

      // Create parent for student
      const parentEmail = `parent${i + 1}@${school.slug}.com`;
      const parentPassword = await bcrypt.hash('parent123', 10);
      const parent = await this.prisma.user.create({
        data: {
          email: parentEmail,
          password: parentPassword,
          name: `Parent of ${studentName}`,
          role: 'PARENT',
          schoolId,
          phone: `+123456789${i + 100}`,
        } as any,
      });

      // Create student
      const dateOfBirth = new Date();
      dateOfBirth.setFullYear(dateOfBirth.getFullYear() - (5 + Math.floor(Math.random() * 10)));

      const student = await this.prisma.student.create({
        data: {
          schoolId,
          classId: classEntity.id,
          sectionId: section.id,
          rollNumber,
          name: studentName,
          gender: Math.random() > 0.5 ? 'MALE' : 'FEMALE',
          dateOfBirth,
          parentId: parent.id,
          status: 'ACTIVE',
          address: `${Math.floor(Math.random() * 1000)} Main Street`,
          phone: `+123456789${i + 200}`,
        } as any,
      });

      students.push(student);
    }

    return {
      message: 'School data seeded successfully',
      summary: {
        classes: classes.length,
        sections: sections.length,
        subjects: subjects.length,
        teachers: teachers.length,
        students: students.length,
        parents: students.length,
      },
    };
  }
}


