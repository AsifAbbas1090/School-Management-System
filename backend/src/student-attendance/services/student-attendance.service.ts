import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStudentAttendanceDto } from '../dto/create-student-attendance.dto';
import { StudentAttendanceQueryDto } from '../dto/student-attendance-query.dto';
import { StudentAttendanceStatus } from '@prisma/client';

@Injectable()
export class StudentAttendanceService {
  constructor(private prisma: PrismaService) {}

  /**
   * Bulk save attendance for a class/section on a given date.
   * Upserts each student record (one per student per date).
   */
  async bulkCreate(schoolId: string, recordedById: string, dto: CreateStudentAttendanceDto) {
    const { classId, sectionId, date, entries } = dto;

    // Verify class and section belong to school
    const section = await this.prisma.section.findFirst({
      where: { id: sectionId, classId, schoolId, deletedAt: null },
    });
    if (!section) {
      throw new NotFoundException('Section not found in this school');
    }

    // Upsert each student's attendance
    const results = await Promise.all(
      entries.map((entry) =>
        this.prisma.studentAttendance.upsert({
          where: { studentId_date: { studentId: entry.studentId, date: new Date(date) } },
          create: {
            schoolId,
            studentId: entry.studentId,
            classId,
            sectionId,
            date: new Date(date),
            status: entry.status,
            remarks: entry.remarks || null,
            recordedById,
          },
          update: {
            status: entry.status,
            remarks: entry.remarks ?? null,
            recordedById,
          },
        }),
      ),
    );

    return { saved: results.length, date, classId, sectionId };
  }

  /**
   * Get attendance records with filters
   */
  async findAll(schoolId: string, query: StudentAttendanceQueryDto) {
    const { classId, sectionId, studentId, date, fromDate, toDate, status, page = 1, pageSize = 200 } = query;
    const skip = (page - 1) * pageSize;

    const where: any = { schoolId };

    if (classId) where.classId = classId;
    if (sectionId) where.sectionId = sectionId;
    if (studentId) where.studentId = studentId;
    if (status) where.status = status;

    if (date) {
      where.date = new Date(date);
    } else if (fromDate || toDate) {
      where.date = {};
      if (fromDate) where.date.gte = new Date(fromDate);
      if (toDate) where.date.lte = new Date(toDate);
    }

    const [records, total] = await Promise.all([
      this.prisma.studentAttendance.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ date: 'desc' }, { Student: { name: 'asc' } }],
        include: {
          Student: { select: { id: true, name: true, rollNumber: true } },
          Class: { select: { id: true, name: true, grade: true } },
          Section: { select: { id: true, name: true } },
        },
      }),
      this.prisma.studentAttendance.count({ where }),
    ]);

    return {
      data: records,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }

  /**
   * Get attendance summary stats for a class/section on a date
   */
  async getSummary(schoolId: string, classId: string, sectionId: string, date: string) {
    const records = await this.prisma.studentAttendance.findMany({
      where: { schoolId, classId, sectionId, date: new Date(date) },
      include: { Student: { select: { id: true, name: true, rollNumber: true } } },
    });

    const summary = {
      date,
      classId,
      sectionId,
      total: records.length,
      present: records.filter((r) => r.status === StudentAttendanceStatus.PRESENT).length,
      absent: records.filter((r) => r.status === StudentAttendanceStatus.ABSENT).length,
      late: records.filter((r) => r.status === StudentAttendanceStatus.LATE).length,
      leave: records.filter((r) => r.status === StudentAttendanceStatus.LEAVE).length,
      records,
    };

    return summary;
  }

  /**
   * Get a student's monthly attendance report
   */
  async getStudentReport(schoolId: string, studentId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // last day of month

    const records = await this.prisma.studentAttendance.findMany({
      where: {
        schoolId,
        studentId,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'asc' },
    });

    const total = records.length;
    const present = records.filter((r) => r.status === StudentAttendanceStatus.PRESENT).length;
    const absent = records.filter((r) => r.status === StudentAttendanceStatus.ABSENT).length;
    const late = records.filter((r) => r.status === StudentAttendanceStatus.LATE).length;
    const leave = records.filter((r) => r.status === StudentAttendanceStatus.LEAVE).length;
    const attendancePercentage = total > 0 ? Math.round((present / total) * 100) : 0;

    return {
      studentId,
      month,
      year,
      total,
      present,
      absent,
      late,
      leave,
      attendancePercentage,
      records,
    };
  }
}
