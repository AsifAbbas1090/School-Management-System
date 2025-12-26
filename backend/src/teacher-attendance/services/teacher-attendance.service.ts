import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTeacherAttendanceDto } from '../dto/create-teacher-attendance.dto';
import { UpdateTeacherAttendanceDto } from '../dto/update-teacher-attendance.dto';
import { TeacherAttendanceQueryDto } from '../dto/teacher-attendance-query.dto';
import { TeacherAttendanceStatus, UserRole, Prisma } from '@prisma/client';

@Injectable()
export class TeacherAttendanceService {
  constructor(private prisma: PrismaService) {}

  async create(schoolId: string, recordedById: string, createDto: CreateTeacherAttendanceDto) {
    // Verify teacher exists and belongs to school
    const teacher = await this.prisma.user.findFirst({
      where: {
        id: createDto.teacherId,
        schoolId,
        role: UserRole.TEACHER,
        deletedAt: null,
      },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found or does not belong to this school');
    }

    // Check if attendance already exists for this date
    const dateOnly = new Date(createDto.date);
    dateOnly.setHours(0, 0, 0, 0);
    const nextDay = new Date(dateOnly);
    nextDay.setDate(nextDay.getDate() + 1);

    const existing = await this.prisma.teacherAttendance.findFirst({
      where: {
        teacherId: createDto.teacherId,
        date: {
          gte: dateOnly,
          lt: nextDay,
        },
        schoolId,
      },
    });

    if (existing) {
      throw new ConflictException('Attendance already recorded for this teacher on this date');
    }

    // Prepare entry and exit times
    let entryTime: Date | null = null;
    let exitTime: Date | null = null;

    if (createDto.entryTime) {
      entryTime = new Date(createDto.entryTime);
    }
    if (createDto.exitTime) {
      exitTime = new Date(createDto.exitTime);
    }

    // Validate exit time is after entry time
    if (entryTime && exitTime && exitTime <= entryTime) {
      throw new BadRequestException('Exit time must be after entry time');
    }

    return this.prisma.teacherAttendance.create({
      data: {
        id: crypto.randomUUID(),
        schoolId,
        teacherId: createDto.teacherId,
        date: dateOnly,
        status: createDto.status,
        entryTime,
        exitTime,
        notes: createDto.notes || null,
        recordedById,
        updatedAt: new Date(),
      } as Prisma.TeacherAttendanceUncheckedCreateInput,
      include: {
        Teacher: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        RecordedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findAll(schoolId: string, query: TeacherAttendanceQueryDto) {
    const { teacherId, startDate, endDate, status, page = 1, pageSize = 10 } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {
      schoolId,
    };

    if (teacherId) {
      where.teacherId = teacherId;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    if (status) {
      where.status = status;
    }

    const [attendance, total] = await Promise.all([
      this.prisma.teacherAttendance.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { date: 'desc' },
        include: {
          Teacher: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          RecordedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.teacherAttendance.count({ where }),
    ]);

    return {
      data: attendance,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findOne(schoolId: string, id: string) {
    const attendance = await this.prisma.teacherAttendance.findFirst({
      where: {
        id,
        schoolId,
      },
      include: {
        Teacher: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        RecordedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!attendance) {
      throw new NotFoundException('Teacher attendance record not found');
    }

    return attendance;
  }

  async update(schoolId: string, id: string, updateDto: UpdateTeacherAttendanceDto) {
    const existing = await this.prisma.teacherAttendance.findFirst({
      where: {
        id,
        schoolId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Teacher attendance record not found');
    }

    const updateData: any = {};

    if (updateDto.status !== undefined) {
      updateData.status = updateDto.status;
    }

    if (updateDto.entryTime !== undefined) {
      updateData.entryTime = updateDto.entryTime ? new Date(updateDto.entryTime) : null;
    }

    if (updateDto.exitTime !== undefined) {
      updateData.exitTime = updateDto.exitTime ? new Date(updateDto.exitTime) : null;
    }

    if (updateDto.notes !== undefined) {
      updateData.notes = updateDto.notes || null;
    }

    // Validate exit time is after entry time
    const entryTime = updateData.entryTime !== undefined ? updateData.entryTime : existing.entryTime;
    const exitTime = updateData.exitTime !== undefined ? updateData.exitTime : existing.exitTime;

    if (entryTime && exitTime && exitTime <= entryTime) {
      throw new BadRequestException('Exit time must be after entry time');
    }

    updateData.updatedAt = new Date();

    return this.prisma.teacherAttendance.update({
      where: { id },
      data: updateData,
      include: {
        Teacher: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        RecordedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async delete(schoolId: string, id: string) {
    const existing = await this.prisma.teacherAttendance.findFirst({
      where: {
        id,
        schoolId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Teacher attendance record not found');
    }

    await this.prisma.teacherAttendance.delete({
      where: { id },
    });

    return { success: true, message: 'Attendance record deleted successfully' };
  }

  async getStats(schoolId: string, teacherId?: string, startDate?: string, endDate?: string) {
    const where: any = {
      schoolId,
    };

    if (teacherId) {
      where.teacherId = teacherId;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    const [total, present, absent, permittedLeave] = await Promise.all([
      this.prisma.teacherAttendance.count({ where }),
      this.prisma.teacherAttendance.count({
        where: { ...where, status: TeacherAttendanceStatus.PRESENT },
      }),
      this.prisma.teacherAttendance.count({
        where: { ...where, status: TeacherAttendanceStatus.ABSENT },
      }),
      this.prisma.teacherAttendance.count({
        where: { ...where, status: TeacherAttendanceStatus.PERMITTED_LEAVE },
      }),
    ]);

    const attendanceRate = total > 0 ? ((present / total) * 100).toFixed(2) : '0.00';

    return {
      total,
      present,
      absent,
      permittedLeave,
      attendanceRate: parseFloat(attendanceRate),
    };
  }

  async getTeacherStats(schoolId: string, teacherId: string, startDate?: string, endDate?: string) {
    const where: any = {
      schoolId,
      teacherId,
    };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    const [total, present, absent, permittedLeave, records] = await Promise.all([
      this.prisma.teacherAttendance.count({ where }),
      this.prisma.teacherAttendance.count({
        where: { ...where, status: TeacherAttendanceStatus.PRESENT },
      }),
      this.prisma.teacherAttendance.count({
        where: { ...where, status: TeacherAttendanceStatus.ABSENT },
      }),
      this.prisma.teacherAttendance.count({
        where: { ...where, status: TeacherAttendanceStatus.PERMITTED_LEAVE },
      }),
      this.prisma.teacherAttendance.findMany({
        where,
        orderBy: { date: 'desc' },
        take: 30, // Last 30 records for chart
        select: {
          date: true,
          status: true,
          entryTime: true,
          exitTime: true,
        },
      }),
    ]);

    const attendanceRate = total > 0 ? ((present / total) * 100).toFixed(2) : '0.00';

    // Prepare chart data
    const chartData = records.map(record => ({
      date: record.date.toISOString().split('T')[0],
      status: record.status,
      present: record.status === TeacherAttendanceStatus.PRESENT ? 1 : 0,
      absent: record.status === TeacherAttendanceStatus.ABSENT ? 1 : 0,
      permittedLeave: record.status === TeacherAttendanceStatus.PERMITTED_LEAVE ? 1 : 0,
    }));

    return {
      total,
      present,
      absent,
      permittedLeave,
      attendanceRate: parseFloat(attendanceRate),
      chartData,
    };
  }
}

