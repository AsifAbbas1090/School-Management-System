import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) { }

  async getDashboardData(schoolId: string, role: string) {
    // Get counts
    const [totalStudents] = await Promise.all([
      this.prisma.student.count({ where: { schoolId } }),
    ]);

    const totalTeachers = 0; // optimized out for now
    const totalParents = 0; // optimized out for now

    const totalExpensesAgg = await this.prisma.expense.aggregate({
      where: {
        schoolId,
        deletedAt: null,
      },
      _sum: {
        amount: true,
      },
    });
    const totalExpenses = totalExpensesAgg._sum.amount || 0;

    // Fee statistics
    const feeStats = await this.prisma.feePayment.aggregate({
      where: { schoolId },
      _sum: { amountPaid: true },
    });

    const feeInvoices = await this.prisma.feeInvoice.findMany({
      where: { schoolId },
      include: {
        FeePayment: true,
      } as any,
    });

    const totalFeeAmount = feeInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    const totalFeePaid = feeStats._sum.amountPaid || 0;
    const totalFeePending = totalFeeAmount - totalFeePaid;

    // Recent expenses
    const recentExpenses = await this.prisma.expense.findMany({
      where: {
        schoolId,
        deletedAt: null,
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        amount: true,
        category: true,
        createdAt: true,
      },
    });

    // Pending leave requests
    const pendingLeaves = await this.prisma.leaveRequest.count({
      where: {
        schoolId,
        status: 'PENDING',
      },
    });

    // Teacher attendance stats for current month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const teacherAttendanceStats = await this.prisma.teacherAttendance.groupBy({
      by: ['status'],
      where: { schoolId, date: { gte: monthStart } },
      _count: { status: true },
    });
    const taPresent = teacherAttendanceStats.find(s => s.status === 'PRESENT')?._count?.status || 0;
    const taAbsent = teacherAttendanceStats.find(s => s.status === 'ABSENT')?._count?.status || 0;
    const taTotal = taPresent + taAbsent;
    const teacherAttendanceRate = taTotal > 0 ? Math.round((taPresent / taTotal) * 100) : 0;

    // Handover summary
    const handoverStats = await this.prisma.feeHandover.aggregate({
      where: { schoolId },
      _sum: { amountSubmitted: true },
      _count: { id: true },
    });

    // Recent handovers (last 5)
    const recentHandovers = await this.prisma.feeHandover.findMany({
      where: { schoolId },
      take: 5,
      orderBy: { submittedAt: 'desc' },
      include: { User: { select: { id: true, name: true, role: true } } },
    });

    // Teacher count
    const teacherCount = await this.prisma.user.count({
      where: { schoolId, role: 'TEACHER', status: 'ACTIVE', deletedAt: null },
    });

    return {
      totalStudents,
      totalTeachers: teacherCount,
      totalParents,
      totalExpenses,
      feeCollected: totalFeePaid,
      feePending: totalFeePending,
      pendingLeaves,
      recentExpenses,
      teacherAttendanceRate,
      teacherAttendancePresent: taPresent,
      teacherAttendanceAbsent: taAbsent,
      totalHandedOver: handoverStats._sum.amountSubmitted || 0,
      handoverCount: handoverStats._count.id || 0,
      recentHandovers,
    };
  }

  async getSuperAdminOverview() {
    const [totalSchools, totalStudents, totalRevenue] = await Promise.all([
      this.prisma.school.count({
        where: { deletedAt: null },
      }),
      this.prisma.student.count(),
      this.prisma.feePayment.aggregate({
        _sum: { amountPaid: true },
      }),
    ]);

    const schools = await this.prisma.school.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        subscriptionStatus: true,
        subscriptionAmount: true,
        _count: {
          select: {
            Student: true,
            User: true,
          },
        },
      },
    });

    return {
      totalSchools,
      totalStudents,
      totalRevenue: totalRevenue._sum.amountPaid || 0,
      schools: schools.map((school) => ({
        id: school.id,
        name: school.name,
        slug: school.slug,
        subscriptionStatus: school.subscriptionStatus,
        subscriptionAmount: school.subscriptionAmount,
        studentCount: (school as any)._count?.Student || 0,
        userCount: (school as any)._count?.User || 0,
      })),
    };
  }
}


