import { randomUUID } from 'crypto';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { assertParentOwnsStudent } from '../../common/assert-parent-owns-student';
import { CreateExamDto } from '../dto/create-exam.dto';
import { BulkResultsDto } from '../dto/bulk-results.dto';

@Injectable()
export class ExamsService {
  constructor(private prisma: PrismaService) {}

  async create(schoolId: string, createExamDto: CreateExamDto) {
    // Verify class, section, subject belong to school
    const classEntity = await this.prisma.class.findFirst({
      where: {
        id: createExamDto.classId,
        schoolId,
        deletedAt: null,
      },
    });

    if (!classEntity) {
      throw new NotFoundException(`Class with ID ${createExamDto.classId} not found`);
    }

    if (createExamDto.sectionId) {
      const section = await this.prisma.section.findFirst({
        where: {
          id: createExamDto.sectionId,
          schoolId,
          classId: createExamDto.classId,
          deletedAt: null,
        },
      });

      if (!section) {
        throw new NotFoundException(`Section with ID ${createExamDto.sectionId} not found`);
      }
    }

    const subject = await this.prisma.subject.findFirst({
      where: {
        id: createExamDto.subjectId,
        schoolId,
        deletedAt: null,
      },
    });

    if (!subject) {
      throw new NotFoundException(`Subject with ID ${createExamDto.subjectId} not found`);
    }

    const now = new Date();
    return this.prisma.exam.create({
      data: {
        id: randomUUID(),
        schoolId,
        name: createExamDto.name,
        type: createExamDto.type,
        classId: createExamDto.classId,
        sectionId: createExamDto.sectionId || null,
        subjectId: createExamDto.subjectId,
        date: new Date(createExamDto.date),
        totalMarks: createExamDto.totalMarks,
        updatedAt: now,
      } as any,
      include: {
        Class: true,
        Section: true,
        Subject: true,
        _count: {
          select: {
            ExamResult: true,
          },
        },
      } as any,
    });
  }

  async findAll(schoolId: string, classId?: string, sectionId?: string, subjectId?: string) {
    const where: any = { schoolId };

    if (classId) where.classId = classId;
    if (sectionId) where.sectionId = sectionId;
    if (subjectId) where.subjectId = subjectId;

    return this.prisma.exam.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        Class: true,
        Section: true,
        Subject: true,
        _count: {
          select: {
            ExamResult: true,
          },
        },
      },
    });
  }

  async findOne(schoolId: string, id: string) {
    const exam = await this.prisma.exam.findFirst({
      where: {
        id,
        schoolId,
      },
      include: {
        Class: true,
        Section: true,
        Subject: true,
        ExamResult: {
          include: {
            Student: {
              include: {
                Class: true,
                Section: true,
              },
            },
          },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException(`Exam with ID ${id} not found`);
    }

    return exam;
  }

  async submitBulkResults(schoolId: string, examId: string, bulkResultsDto: BulkResultsDto) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, schoolId },
      select: { id: true, classId: true, totalMarks: true },
    });

    if (!exam) {
      throw new NotFoundException(`Exam with ID ${examId} not found`);
    }

    const incoming = bulkResultsDto.results;
    if (!incoming?.length) {
      return { message: 'No results to submit', examId, resultsCount: 0 };
    }

    // Marks-cap validation up front — avoids half-written state.
    for (const r of incoming) {
      if (r.obtainedMarks > exam.totalMarks) {
        throw new BadRequestException(
          `Obtained marks (${r.obtainedMarks}) cannot exceed total marks (${exam.totalMarks})`,
        );
      }
    }

    // Verify every student is in this school AND exam's class in one query.
    const studentIds = incoming.map((r) => r.studentId);
    const validStudents = await this.prisma.student.findMany({
      where: {
        id: { in: studentIds },
        schoolId,
        classId: exam.classId,
      },
      select: { id: true },
    });
    const validIds = new Set(validStudents.map((s) => s.id));
    const missing = studentIds.filter((id) => !validIds.has(id));
    if (missing.length) {
      throw new BadRequestException(
        `Students not in exam's class: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '…' : ''}`,
      );
    }

    /** Two-round-trip strategy: delete whatever already exists for this
     *  (exam, studentIds) set, then bulk-insert the new rows with
     *  `createMany`. This is O(1) DB round-trips regardless of class size,
     *  so a 30-student class submit completes in well under a second even
     *  on a remote Postgres instance. */
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.examResult.deleteMany({
        where: { examId, studentId: { in: studentIds } },
      }),
      this.prisma.examResult.createMany({
        data: incoming.map((r) => ({
          id: randomUUID(),
          examId,
          studentId: r.studentId,
          obtainedMarks: r.obtainedMarks,
          grade: r.grade || null,
          remarks: r.remarks || null,
          updatedAt: now,
        })),
        skipDuplicates: true,
      }),
    ]);

    return {
      message: 'Results submitted successfully',
      examId,
      resultsCount: incoming.length,
    };
  }

  async getStudentResults(
    schoolId: string,
    studentId: string,
    user?: { id: string; role: UserRole },
  ) {
    const student = await this.prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId,
      },
    });

    if (!student) {
      throw new NotFoundException(`Student with ID ${studentId} not found`);
    }

    if (user?.role === UserRole.PARENT) {
      await assertParentOwnsStudent(this.prisma, schoolId, user.id, studentId);
    }

    const results = await this.prisma.examResult.findMany({
      where: {
        studentId,
        Exam: {
          schoolId,
        },
      },
      include: {
        Exam: {
          include: {
            Subject: true,
            Class: true,
          },
        },
      },
      orderBy: {
        Exam: {
          date: 'desc',
        },
      },
    });

    // Calculate GPA
    const gradePoints: { [key: string]: number } = {
      A: 4.0,
      'A-': 3.7,
      'B+': 3.3,
      B: 3.0,
      'B-': 2.7,
      'C+': 2.3,
      C: 2.0,
      'C-': 1.7,
      D: 1.0,
      F: 0.0,
    };

    let totalPoints = 0;
    let totalCredits = 0;

    for (const result of results) {
      if (result.grade && gradePoints[result.grade]) {
        totalPoints += gradePoints[result.grade] * result.Exam.totalMarks;
        totalCredits += result.Exam.totalMarks;
      }
    }

    const gpa = totalCredits > 0 ? totalPoints / totalCredits : 0;

    return {
      student: {
        id: student.id,
        name: student.name,
        rollNumber: student.rollNumber,
      },
      results,
      gpa: gpa.toFixed(2),
    };
  }

  /**
   * Fetch all results for a class, optionally filtered by exam or subject.
   * Sections of the same class are merged; each row carries its section name
   * so the UI can show a small A/B/C chip next to the student.
   */
  async getClassResults(
    schoolId: string,
    classId: string,
    examId?: string,
    subjectId?: string,
  ) {
    const cls = await this.prisma.class.findFirst({
      where: { id: classId, schoolId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!cls) {
      throw new NotFoundException(`Class with ID ${classId} not found`);
    }

    const results = await this.prisma.examResult.findMany({
      where: {
        Exam: {
          schoolId,
          classId,
          ...(examId ? { id: examId } : {}),
          ...(subjectId ? { subjectId } : {}),
        },
      },
      include: {
        Exam: {
          select: {
            id: true,
            name: true,
            type: true,
            totalMarks: true,
            date: true,
            Subject: { select: { id: true, name: true } },
          },
        },
        Student: {
          select: {
            id: true,
            name: true,
            rollNumber: true,
            Section: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [
        { Exam: { date: 'desc' } },
        { Student: { rollNumber: 'asc' } },
      ],
    });

    return {
      class: cls,
      results: results.map((r) => ({
        id: r.id,
        studentId: r.studentId,
        studentName: r.Student?.name ?? '',
        rollNumber: r.Student?.rollNumber ?? '',
        sectionId: r.Student?.Section?.id ?? null,
        sectionName: r.Student?.Section?.name ?? '',
        examId: r.examId,
        examName: r.Exam?.name ?? '',
        examType: r.Exam?.type ?? '',
        examDate: r.Exam?.date ?? null,
        subjectId: r.Exam?.Subject?.id ?? null,
        subjectName: r.Exam?.Subject?.name ?? '',
        obtainedMarks: r.obtainedMarks,
        totalMarks: r.Exam?.totalMarks ?? 0,
        grade: r.grade ?? null,
        remarks: r.remarks ?? null,
      })),
    };
  }
}


