import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma, SalaryStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSalaryRecordDto } from '../dto/create-salary-record.dto';
import { PaySalaryDto } from '../dto/pay-salary.dto';

@Injectable()
export class TeacherSalaryService {
  constructor(private readonly prisma: PrismaService) {}

  /** Creates a salary record for a teacher/month/year, copying salaryDue from User.salary. */
  async createRecord(schoolId: string, dto: CreateSalaryRecordDto) {
    const teacher = await this.prisma.user.findFirst({
      where: { id: dto.teacherId, schoolId, role: UserRole.TEACHER, deletedAt: null },
      select: { id: true, salary: true, name: true },
    });
    if (!teacher) throw new NotFoundException('Teacher not found in this school');

    const salaryDue = Number(teacher.salary ?? 0);
    if (salaryDue <= 0) {
      throw new BadRequestException(`Teacher ${teacher.name} has no salary configured on their profile`);
    }

    const advancePaid = Math.max(0, Number(dto.advancePaid ?? 0));
    const remainingDue = Math.max(0, salaryDue - advancePaid);
    const status: SalaryStatus = remainingDue <= 0 ? SalaryStatus.PAID : advancePaid > 0 ? SalaryStatus.PARTIAL : SalaryStatus.PENDING;

    try {
      return await this.prisma.teacherSalaryRecord.create({
        data: {
          schoolId,
          teacherId: dto.teacherId,
          month: dto.month,
          year: dto.year,
          salaryDue,
          advancePaid,
          amountPaid: 0,
          remainingDue,
          status,
          paidAt: remainingDue <= 0 ? new Date() : null,
          notes: dto.notes ?? null,
        },
        include: {
          teacher: { select: { id: true, name: true, email: true, employeeId: true } },
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException(
          `Salary record already exists for this teacher for ${dto.month}/${dto.year}`,
        );
      }
      throw err;
    }
  }

  /** Lists salary records; teachers see only their own, admins/mgmt see all in the school. */
  async findAll(
    schoolId: string,
    viewer: { id: string; role: UserRole },
    opts: { page?: number; pageSize?: number; teacherId?: string; status?: SalaryStatus } = {},
  ) {
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 25));
    const where: Prisma.TeacherSalaryRecordWhereInput = { schoolId };
    if (viewer.role === UserRole.TEACHER) {
      where.teacherId = viewer.id;
    } else if (opts.teacherId) {
      where.teacherId = opts.teacherId;
    }
    if (opts.status) where.status = opts.status;

    const [data, total] = await Promise.all([
      this.prisma.teacherSalaryRecord.findMany({
        where,
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          teacher: { select: { id: true, name: true, email: true, employeeId: true } },
        },
      }),
      this.prisma.teacherSalaryRecord.count({ where }),
    ]);

    return { data, meta: { total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) } };
  }

  /** One-shot summary of current-month liability + overdue count. */
  async getSummary(schoolId: string) {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const [currentMonthAgg, totalOutstandingAgg, overdueCount] = await Promise.all([
      this.prisma.teacherSalaryRecord.aggregate({
        where: { schoolId, month: currentMonth, year: currentYear },
        _sum: { salaryDue: true, amountPaid: true, advancePaid: true, remainingDue: true },
      }),
      this.prisma.teacherSalaryRecord.aggregate({
        where: { schoolId, status: { not: SalaryStatus.PAID } },
        _sum: { remainingDue: true },
      }),
      this.prisma.teacherSalaryRecord.count({
        where: {
          schoolId,
          status: { not: SalaryStatus.PAID },
          OR: [
            { year: { lt: currentYear } },
            { AND: [{ year: currentYear }, { month: { lt: currentMonth } }] },
          ],
        },
      }),
    ]);

    return {
      currentMonth: {
        month: currentMonth,
        year: currentYear,
        totalSalaryLiability: currentMonthAgg._sum.salaryDue ?? 0,
        totalPaid: (currentMonthAgg._sum.amountPaid ?? 0) + (currentMonthAgg._sum.advancePaid ?? 0),
        totalRemaining: currentMonthAgg._sum.remainingDue ?? 0,
      },
      /** Sum of all remainingDue across all months, not just the current one. */
      totalRemainingAllTime: totalOutstandingAgg._sum.remainingDue ?? 0,
      overdueCount,
    };
  }

  async getByTeacher(schoolId: string, teacherId: string, viewer: { id: string; role: UserRole }) {
    if (viewer.role === UserRole.TEACHER && viewer.id !== teacherId) {
      throw new ForbiddenException('Teachers can only view their own salary records');
    }
    return this.prisma.teacherSalaryRecord.findMany({
      where: { schoolId, teacherId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      include: {
        teacher: { select: { id: true, name: true, email: true, employeeId: true } },
      },
    });
  }

  async getPending(schoolId: string) {
    return this.prisma.teacherSalaryRecord.findMany({
      where: { schoolId, status: { not: SalaryStatus.PAID } },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
      include: {
        teacher: { select: { id: true, name: true, email: true, employeeId: true } },
      },
    });
  }

  async paySalary(id: string, schoolId: string, dto: PaySalaryDto) {
    const record = await this.prisma.teacherSalaryRecord.findFirst({
      where: { id, schoolId },
      select: {
        id: true,
        salaryDue: true,
        advancePaid: true,
        amountPaid: true,
        notes: true,
      },
    });
    if (!record) throw new NotFoundException('Salary record not found');

    const add = Number(dto.amountPaid ?? 0);
    if (!Number.isFinite(add) || add < 0) throw new BadRequestException('amountPaid must be >= 0');

    const newAmountPaid = record.amountPaid + add;
    const totalCovered = record.advancePaid + newAmountPaid;
    const newRemaining = Math.max(0, record.salaryDue - totalCovered);
    const newStatus: SalaryStatus =
      newRemaining <= 0 ? SalaryStatus.PAID : totalCovered > 0 ? SalaryStatus.PARTIAL : SalaryStatus.PENDING;

    const mergedNotes = dto.notes
      ? [record.notes, dto.notes].filter(Boolean).join('\n')
      : record.notes;

    return this.prisma.teacherSalaryRecord.update({
      where: { id },
      data: {
        amountPaid: newAmountPaid,
        remainingDue: newRemaining,
        status: newStatus,
        paidAt: newStatus === SalaryStatus.PAID ? new Date() : null,
        notes: mergedNotes,
      },
      include: {
        teacher: { select: { id: true, name: true, email: true, employeeId: true } },
      },
    });
  }
}
