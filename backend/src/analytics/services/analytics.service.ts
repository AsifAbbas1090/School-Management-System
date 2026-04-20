import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) { }

  async getDashboardData(schoolId: string, _role: string) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86400000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const sevenDaysAgo = new Date(todayStart.getTime() - 6 * 86400000);
    const sixMonthsAgoAtt = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // One round-trip: parallel queries (was ~15 sequential awaits + full-table scans).
    const [
      totalStudents,
      teacherCount,
      pendingLeaves,
      feeStats,
      activeStudentsMonthlyFeeSum,
      currentMonthPaymentsSum,
      allPayments,
      weekAttendanceRaw,
      presentToday,
      classGroups,
      teacherAttendanceStats,
      handoverStats,
      recentHandovers,
      recentExpenses,
      recentPayments,
      recentStudents,
      examResults,
      pendingInvoices,
      attendanceTrendRows,
      schoolClasses,
      parentCount,
      /** Cards for admin & management dashboards — resolved in this same round-trip so no extra API call is needed. */
      todayCollectionAgg,
      pendingHandoversList,
      unsubmittedByManager,
      pendingSalariesAgg,
    ] = await Promise.all([
      this.prisma.student.count({ where: { schoolId } }),
      this.prisma.user.count({ where: { schoolId, role: 'TEACHER', status: 'ACTIVE', deletedAt: null } }),
      this.prisma.leaveRequest.count({ where: { schoolId, status: 'PENDING' } }),
      this.prisma.feePayment.aggregate({
        where: { schoolId },
        _sum: { amountPaid: true },
      }),
      this.prisma.student.aggregate({
        where: { schoolId, status: 'ACTIVE' },
        _sum: { monthlyFee: true },
      }),
      this.prisma.feePayment.aggregate({
        where: {
          schoolId,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        },
        _sum: { amountPaid: true },
      }),
      this.prisma.feePayment.findMany({
        where: { schoolId, paidAt: { gte: sixMonthsAgo } },
        select: { amountPaid: true, paidAt: true },
      }),
      this.prisma.studentAttendance.findMany({
        where: { schoolId, date: { gte: sevenDaysAgo, lte: new Date(todayEnd.getTime() - 1) } },
        select: { date: true, status: true },
      }),
      this.prisma.studentAttendance.count({
        where: { schoolId, date: { gte: todayStart, lt: todayEnd }, status: 'PRESENT' },
      }),
      this.prisma.student.groupBy({
        by: ['classId'],
        where: { schoolId },
        _count: { classId: true },
      }),
      this.prisma.teacherAttendance.groupBy({
        by: ['status'],
        where: { schoolId, date: { gte: monthStart } },
        _count: { status: true },
      }),
      this.prisma.feeHandover.aggregate({
        where: { schoolId },
        _sum: { amountSubmitted: true },
        _count: { id: true },
      }),
      this.prisma.feeHandover.findMany({
        where: { schoolId },
        take: 5,
        orderBy: { submittedAt: 'desc' },
        include: { manager: { select: { id: true, name: true, role: true } } },
      }),
      this.prisma.expense.findMany({
        where: { schoolId, deletedAt: null },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, amount: true, category: true, createdAt: true },
      }),
      this.prisma.feePayment.findMany({
        where: { schoolId },
        take: 5,
        orderBy: { paidAt: 'desc' },
        include: { Student: { select: { name: true } } },
      }),
      this.prisma.student.findMany({
        where: { schoolId },
        take: 3,
        orderBy: { admissionDate: 'desc' },
        select: { id: true, name: true, admissionDate: true, Class: { select: { name: true } } },
      }),
      // Cap heavy joins — full scan was the main latency source on real data.
      this.prisma.examResult.findMany({
        where: { Exam: { schoolId } },
        take: 15000,
        orderBy: { createdAt: 'desc' },
        include: {
          Exam: { select: { totalMarks: true, Class: { select: { name: true } } } },
          Student: { select: { id: true, name: true } },
        },
      }),
      this.prisma.feeInvoice.findMany({
        where: { schoolId, status: { in: ['PENDING', 'OVERDUE'] } },
        select: {
          amount: true,
          status: true,
          studentId: true,
          Student: { select: { id: true, name: true, classId: true, Class: { select: { name: true } } } },
        },
      }),
      this.prisma.$queryRaw<Array<{ y: number; m: number; present: bigint; total: bigint }>>`
        SELECT EXTRACT(YEAR FROM date)::int AS y,
               EXTRACT(MONTH FROM date)::int AS m,
               COUNT(*) FILTER (WHERE status = 'PRESENT')::bigint AS present,
               COUNT(*)::bigint AS total
        FROM "StudentAttendance"
        WHERE "schoolId" = ${schoolId}
          AND date >= ${sixMonthsAgoAtt}
        GROUP BY EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date)
        ORDER BY y ASC, m ASC
      `,
      this.prisma.class.findMany({
        where: { schoolId, deletedAt: null },
        select: { id: true, name: true },
      }),
      this.prisma.user.count({
        where: { schoolId, role: 'PARENT', deletedAt: null },
      }),
      this.prisma.feePayment.aggregate({
        where: { schoolId, paidAt: { gte: todayStart, lt: todayEnd } },
        _sum: { amountPaid: true },
        _count: { _all: true },
      }),
      this.prisma.feeHandover.findMany({
        where: { schoolId, status: 'PENDING' },
        orderBy: { submittedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          amountSubmitted: true,
          totalCollected: true,
          status: true,
          submittedAt: true,
          manager: { select: { id: true, name: true, role: true } },
          _count: { select: { payments: true } },
        },
      }),
      this.prisma.feePayment.groupBy({
        by: ['collectedById'],
        where: { schoolId, handoverId: null, collectedById: { not: null } },
        _sum: { amountPaid: true },
        _count: { _all: true },
      }),
      this.prisma.teacherSalaryRecord.aggregate({
        where: { schoolId, status: { not: 'PAID' } },
        _sum: { remainingDue: true },
        _count: { _all: true },
      }),
    ]);

    // Name + today's collection hydration for "unsubmitted by manager" — single follow-up query.
    const managerIds = unsubmittedByManager
      .map((row) => row.collectedById)
      .filter((id): id is string => Boolean(id));
    const [managers, todayByManagerRaw] = managerIds.length
      ? await Promise.all([
          this.prisma.user.findMany({
            where: { id: { in: managerIds } },
            select: { id: true, name: true, role: true },
          }),
          this.prisma.feePayment.groupBy({
            by: ['collectedById'],
            where: {
              schoolId,
              paidAt: { gte: todayStart, lt: todayEnd },
              collectedById: { in: managerIds },
            },
            _sum: { amountPaid: true },
          }),
        ])
      : [[], [] as any[]];
    const managerMap = Object.fromEntries(managers.map((m) => [m.id, m]));
    const todayByManagerMap = Object.fromEntries(
      todayByManagerRaw.map((g: any) => [g.collectedById, g._sum.amountPaid ?? 0]),
    );
    const unsubmittedCollections = unsubmittedByManager
      .filter((row) => row.collectedById)
      .map((row) => ({
        managerId: row.collectedById as string,
        managerName: managerMap[row.collectedById as string]?.name ?? 'Unknown',
        managerRole: managerMap[row.collectedById as string]?.role ?? null,
        amountUnsubmitted: row._sum.amountPaid ?? 0,
        paymentCount: row._count._all ?? 0,
        todayCollected: todayByManagerMap[row.collectedById as string] ?? 0,
      }));

    const totalFeePaid = feeStats._sum.amountPaid || 0;
    /** Current calendar month: expected (sum of active students' monthly fee) minus recorded payments for that month — aligns with Fees page / revenue stats, not legacy invoices. */
    const expectedThisMonth = activeStudentsMonthlyFeeSum._sum.monthlyFee || 0;
    const collectedThisMonth = currentMonthPaymentsSum._sum.amountPaid || 0;
    const totalFeePending = Math.max(0, expectedThisMonth - collectedThisMonth);

    const monthlyFeeMap: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthlyFeeMap[`${d.getFullYear()}-${d.getMonth()}`] = 0;
    }
    allPayments.forEach((p) => {
      const d = new Date(p.paidAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (key in monthlyFeeMap) monthlyFeeMap[key] += p.amountPaid;
    });
    const monthlyFeeData: { month: string; collected: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      monthlyFeeData.push({
        month: MONTH_NAMES[d.getMonth()],
        collected: Math.round(monthlyFeeMap[key] || 0),
      });
    }

    const weekMap: Record<string, { present: number; absent: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayStart.getTime() - i * 86400000);
      const key = d.toISOString().split('T')[0];
      weekMap[key] = { present: 0, absent: 0 };
    }
    weekAttendanceRaw.forEach((r) => {
      const key = new Date(r.date).toISOString().split('T')[0];
      if (weekMap[key]) {
        if (r.status === 'PRESENT') weekMap[key].present++;
        else weekMap[key].absent++;
      }
    });
    const weeklyAttendance = Object.entries(weekMap).map(([dateStr, counts]) => {
      const d = new Date(dateStr);
      return { day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()], ...counts };
    });

    const classMap = Object.fromEntries(schoolClasses.map((c) => [c.id, c.name]));
    const classDistribution = classGroups
      .map((g) => ({ name: classMap[g.classId] || 'Unknown', value: g._count.classId }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const taPresent = teacherAttendanceStats.find((s) => s.status === 'PRESENT')?._count?.status || 0;
    const taAbsent = teacherAttendanceStats.find((s) => s.status === 'ABSENT')?._count?.status || 0;
    const taTotal = taPresent + taAbsent;
    const teacherAttendanceRate = taTotal > 0 ? Math.round((taPresent / taTotal) * 100) : 0;

    const recentActivities = [
      ...recentStudents.map((s) => ({
        id: s.id,
        type: 'student',
        message: `New student ${s.name} enrolled in ${(s as any).Class?.name || 'a class'}`,
        time: s.admissionDate,
      })),
      ...recentPayments.map((p) => ({
        id: p.id,
        type: 'fee',
        message: `Fee payment of ${p.amountPaid} received from ${(p as any).Student?.name || 'a student'}`,
        time: p.paidAt,
      })),
    ]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 5);

    const defaulterMap: Record<string, { name: string; className: string; amount: number; invoiceCount: number }> = {};
    pendingInvoices.forEach((inv) => {
      const sid = (inv as any).Student?.id;
      if (!sid) return;
      if (!defaulterMap[sid]) {
        defaulterMap[sid] = {
          name: (inv as any).Student?.name || 'Unknown',
          className: (inv as any).Student?.Class?.name || 'N/A',
          amount: 0,
          invoiceCount: 0,
        };
      }
      defaulterMap[sid].amount += inv.amount;
      defaulterMap[sid].invoiceCount++;
    });
    const feeDefaulters = Object.entries(defaulterMap)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const studentScoreMap: Record<string, { name: string; className: string; total: number; max: number; count: number }> = {};
    examResults.forEach((r) => {
      const sid = r.studentId;
      if (!studentScoreMap[sid]) {
        studentScoreMap[sid] = {
          name: (r as any).Student?.name || 'Unknown',
          className: (r as any).Exam?.Class?.name || 'N/A',
          total: 0,
          max: 0,
          count: 0,
        };
      }
      studentScoreMap[sid].total += r.obtainedMarks;
      studentScoreMap[sid].max += (r as any).Exam?.totalMarks || 100;
      studentScoreMap[sid].count++;
    });
    const topStudents = Object.entries(studentScoreMap)
      .map(([id, d]) => ({
        id,
        name: d.name,
        class: d.className,
        score: d.max > 0 ? Math.round((d.total / d.max) * 100) : 0,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((s, i) => ({ ...s, rank: i + 1 }));

    const classScoreMap: Record<string, { name: string; total: number; max: number; count: number }> = {};
    examResults.forEach((r) => {
      const cid = (r as any).Exam?.Class?.name || 'Unknown';
      if (!classScoreMap[cid]) classScoreMap[cid] = { name: cid, total: 0, max: 0, count: 0 };
      classScoreMap[cid].total += r.obtainedMarks;
      classScoreMap[cid].max += (r as any).Exam?.totalMarks || 100;
      classScoreMap[cid].count++;
    });
    const classPerformance = Object.values(classScoreMap)
      .map((c) => ({ class: c.name, average: c.max > 0 ? Math.round((c.total / c.max) * 100) : 0 }))
      .sort((a, b) => a.class.localeCompare(b.class));

    const attMonthMap: Record<string, { present: number; total: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      attMonthMap[`${d.getFullYear()}-${d.getMonth()}`] = { present: 0, total: 0 };
    }
    attendanceTrendRows.forEach((row) => {
      const jsMonth = Number(row.m) - 1;
      const key = `${row.y}-${jsMonth}`;
      if (attMonthMap[key]) {
        attMonthMap[key].present = Number(row.present);
        attMonthMap[key].total = Number(row.total);
      }
    });
    const attendanceTrend: { month: string; rate: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const val = attMonthMap[key] || { present: 0, total: 0 };
      attendanceTrend.push({
        month: MONTH_NAMES[d.getMonth()],
        rate: val.total > 0 ? Math.round((val.present / val.total) * 100) : 0,
      });
    }

    return {
      totalStudents,
      totalTeachers: teacherCount,
      totalParents: parentCount,
      feeCollected: totalFeePaid,
      feePending: totalFeePending,
      pendingLeaves,
      presentToday,
      recentExpenses,
      teacherAttendanceRate,
      teacherAttendancePresent: taPresent,
      teacherAttendanceAbsent: taAbsent,
      totalHandedOver: handoverStats._sum.amountSubmitted || 0,
      handoverCount: handoverStats._count.id || 0,
      recentHandovers,
      /** Section 7 dashboard cards — all derived from the single Promise.all above. */
      collections: {
        todayTotal: todayCollectionAgg._sum.amountPaid ?? 0,
        todayCount: todayCollectionAgg._count._all ?? 0,
        monthTotal: collectedThisMonth,
        monthExpected: expectedThisMonth,
        pendingHandoversCount: pendingHandoversList.length,
        pendingHandovers: pendingHandoversList,
        unsubmittedByManager: unsubmittedCollections,
      },
      salaries: {
        pendingRemaining: pendingSalariesAgg._sum.remainingDue ?? 0,
        pendingRecordCount: pendingSalariesAgg._count._all ?? 0,
      },
      // Chart data
      monthlyFeeData,
      weeklyAttendance,
      classDistribution,
      recentActivities,
      feeDefaulters,
      topStudents,
      classPerformance,
      attendanceTrend,
    };
  }

  async getSuperAdminOverview() {
    const [totalSchools, totalStudents, totalRevenue, schools] = await Promise.all([
      this.prisma.school.count({ where: { deletedAt: null } }),
      this.prisma.student.count(),
      this.prisma.feePayment.aggregate({ _sum: { amountPaid: true } }),
      this.prisma.school.findMany({
        where: { deletedAt: null },
        select: {
          id: true, name: true, slug: true,
          subscriptionStatus: true, subscriptionAmount: true,
          _count: { select: { Student: true, User: true } },
        },
      }),
    ]);

    return {
      totalSchools,
      totalStudents,
      totalRevenue: totalRevenue._sum.amountPaid || 0,
      schools: schools.map((school) => ({
        id: school.id, name: school.name, slug: school.slug,
        subscriptionStatus: school.subscriptionStatus,
        subscriptionAmount: school.subscriptionAmount,
        studentCount: (school as any)._count?.Student || 0,
        userCount: (school as any)._count?.User || 0,
      })),
    };
  }
}
