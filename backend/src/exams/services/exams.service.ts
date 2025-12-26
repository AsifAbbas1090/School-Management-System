import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
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

    return this.prisma.exam.create({
      data: {
        schoolId,
        name: createExamDto.name,
        type: createExamDto.type,
        classId: createExamDto.classId,
        sectionId: createExamDto.sectionId || null,
        subjectId: createExamDto.subjectId,
        date: new Date(createExamDto.date),
        totalMarks: createExamDto.totalMarks,
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
      where: {
        id: examId,
        schoolId,
      },
    });

    if (!exam) {
      throw new NotFoundException(`Exam with ID ${examId} not found`);
    }

    // Verify all students belong to exam's class/section
    const studentIds = bulkResultsDto.results.map((r) => r.studentId);
    const students = await this.prisma.student.findMany({
      where: {
        id: { in: studentIds },
        schoolId,
        classId: exam.classId,
      },
    });

    if (students.length !== studentIds.length) {
      throw new BadRequestException('One or more students not found or do not belong to the exam class');
    }

    // Validate marks don't exceed total
    for (const result of bulkResultsDto.results) {
      if (result.obtainedMarks > exam.totalMarks) {
        throw new BadRequestException(
          `Obtained marks (${result.obtainedMarks}) cannot exceed total marks (${exam.totalMarks})`
        );
      }
    }

    // Create or update results
    const results = [];
    for (const resultData of bulkResultsDto.results) {
      const result = await this.prisma.examResult.upsert({
        where: {
          examId_studentId: {
            examId,
            studentId: resultData.studentId,
          },
        },
        update: {
          obtainedMarks: resultData.obtainedMarks,
          grade: resultData.grade || null,
          remarks: resultData.remarks || null,
        },
        create: {
          examId,
          studentId: resultData.studentId,
          obtainedMarks: resultData.obtainedMarks,
          grade: resultData.grade || null,
          remarks: resultData.remarks || null,
        } as any,
        include: {
          Student: {
            include: {
              Class: true,
              Section: true,
            },
          },
        },
      });
      results.push(result);
    }

    return {
      message: 'Results submitted successfully',
      examId,
      resultsCount: results.length,
      results,
    };
  }

  async getStudentResults(schoolId: string, studentId: string) {
    const student = await this.prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId,
      },
    });

    if (!student) {
      throw new NotFoundException(`Student with ID ${studentId} not found`);
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
}


