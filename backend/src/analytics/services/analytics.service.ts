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

    return {
      totalStudents,
      totalTeachers,
      totalParents,
      totalExpenses,
      feeCollected: totalFeePaid,
      feePending: totalFeePending,
      pendingLeaves,
      recentExpenses,
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


