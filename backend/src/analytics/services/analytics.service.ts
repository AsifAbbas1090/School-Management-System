import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) { }

  async getDashboardData(schoolId: string, role: string) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86400000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // ─── Core counts ───────────────────────────────────────────────────
    const [totalStudents, teacherCount, pendingLeaves] = await Promise.all([
      this.prisma.student.count({ where: { schoolId } }),
      this.prisma.user.count({ where: { schoolId, role: 'TEACHER', status: 'ACTIVE', deletedAt: null } }),
      this.prisma.leaveRequest.count({ where: { schoolId, status: 'PENDING' } }),
    ]);

    // ─── Fee stats ─────────────────────────────────────────────────────
    const feeStats = await this.prisma.feePayment.aggregate({
      where: { schoolId },
      _sum: { amountPaid: true },
    });
    const feeInvoices = await this.prisma.feeInvoice.findMany({
      where: { schoolId },
      select: { amount: true, status: true, studentId: true, Student: { select: { id: true, name: true, classId: true, Class: { select: { name: true } } } } },
    });
    const totalFeeAmount = feeInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    const totalFeePaid = feeStats._sum.amountPaid || 0;
    const totalFeePending = totalFeeAmount - totalFeePaid;

    // ─── Monthly fee data (last 6 months) ──────────────────────────────
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const allPayments = await this.prisma.feePayment.findMany({
      where: { schoolId, paidAt: { gte: sixMonthsAgo } },
      select: { amountPaid: true, paidAt: true, month: true, year: true },
    });

    const monthlyFeeMap: Record<string, number> = {};
    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      monthlyFeeMap[key] = 0;
    }
    allPayments.forEach(p => {
      const d = new Date(p.paidAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (key in monthlyFeeMap) monthlyFeeMap[key] += p.amountPaid;
    });
    const monthlyFeeData = Object.entries(monthlyFeeMap).map(([key, collected]) => {
      const [yr, mo] = key.split('-').map(Number);
      return { month: MONTH_NAMES[mo], collected: Math.round(collected) };
    });

    // ─── Weekly student attendance (last 7 days) ────────────────────────
    const sevenDaysAgo = new Date(todayStart.getTime() - 6 * 86400000);
    const weekAttendanceRaw = await this.prisma.studentAttendance.findMany({
      where: { schoolId, date: { gte: sevenDaysAgo, lte: new Date(todayEnd.getTime() - 1) } },
      select: { date: true, status: true },
    });
    const weekMap: Record<string, { present: number; absent: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayStart.getTime() - i * 86400000);
      const key = d.toISOString().split('T')[0];
      const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
      weekMap[key] = { present: 0, absent: 0 };
    }
    weekAttendanceRaw.forEach(r => {
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

    // ─── Today's present count ─────────────────────────────────────────
    const presentToday = await this.prisma.studentAttendance.count({
      where: { schoolId, date: { gte: todayStart, lt: todayEnd }, status: 'PRESENT' },
    });

    // ─── Class distribution ────────────────────────────────────────────
    const classGroups = await this.prisma.student.groupBy({
      by: ['classId'],
      where: { schoolId },
      _count: { classId: true },
    });
    const classNames = await this.prisma.class.findMany({
      where: { id: { in: classGroups.map(g => g.classId) } },
      select: { id: true, name: true },
    });
    const classMap = Object.fromEntries(classNames.map(c => [c.id, c.name]));
    const classDistribution = classGroups
      .map(g => ({ name: classMap[g.classId] || 'Unknown', value: g._count.classId }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // ─── Teacher attendance stats ──────────────────────────────────────
    const teacherAttendanceStats = await this.prisma.teacherAttendance.groupBy({
      by: ['status'],
      where: { schoolId, date: { gte: monthStart } },
      _count: { status: true },
    });
    const taPresent = teacherAttendanceStats.find(s => s.status === 'PRESENT')?._count?.status || 0;
    const taAbsent = teacherAttendanceStats.find(s => s.status === 'ABSENT')?._count?.status || 0;
    const taTotal = taPresent + taAbsent;
    const teacherAttendanceRate = taTotal > 0 ? Math.round((taPresent / taTotal) * 100) : 0;

    // ─── Handover stats ────────────────────────────────────────────────
    const [handoverStats, recentHandovers, recentExpenses] = await Promise.all([
      this.prisma.feeHandover.aggregate({ where: { schoolId }, _sum: { amountSubmitted: true }, _count: { id: true } }),
      this.prisma.feeHandover.findMany({
        where: { schoolId }, take: 5, orderBy: { submittedAt: 'desc' },
        include: { User: { select: { id: true, name: true, role: true } } },
      }),
      this.prisma.expense.findMany({
        where: { schoolId, deletedAt: null }, take: 5, orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, amount: true, category: true, createdAt: true },
      }),
    ]);

    // ─── Recent activities ─────────────────────────────────────────────
    const recentPayments = await this.prisma.feePayment.findMany({
      where: { schoolId }, take: 5, orderBy: { paidAt: 'desc' },
      include: { Student: { select: { name: true } } },
    });
    const recentStudents = await this.prisma.student.findMany({
      where: { schoolId }, take: 3, orderBy: { admissionDate: 'desc' },
      select: { id: true, name: true, admissionDate: true, Class: { select: { name: true } } },
    });
    const recentActivities = [
      ...recentStudents.map(s => ({
        id: s.id, type: 'student',
        message: `New student ${s.name} enrolled in ${(s as any).Class?.name || 'a class'}`,
        time: s.admissionDate,
      })),
      ...recentPayments.map(p => ({
        id: p.id, type: 'fee',
        message: `Fee payment of ${p.amountPaid} received from ${(p as any).Student?.name || 'a student'}`,
        time: p.paidAt,
      })),
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5);

    // ─── Fee defaulters ────────────────────────────────────────────────
    const pendingInvoices = feeInvoices.filter(inv => inv.status === 'PENDING' || inv.status === 'OVERDUE');
    const defaulterMap: Record<string, { name: string; className: string; amount: number; invoiceCount: number }> = {};
    pendingInvoices.forEach(inv => {
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

    // ─── Top students (by avg exam score) ─────────────────────────────
    const examResults = await this.prisma.examResult.findMany({
      where: { Exam: { schoolId } },
      include: { Exam: { select: { totalMarks: true, Class: { select: { name: true } } } }, Student: { select: { id: true, name: true } } },
    });
    const studentScoreMap: Record<string, { name: string; className: string; total: number; max: number; count: number }> = {};
    examResults.forEach(r => {
      const sid = r.studentId;
      if (!studentScoreMap[sid]) {
        studentScoreMap[sid] = {
          name: (r as any).Student?.name || 'Unknown',
          className: (r as any).Exam?.Class?.name || 'N/A',
          total: 0, max: 0, count: 0,
        };
      }
      studentScoreMap[sid].total += r.obtainedMarks;
      studentScoreMap[sid].max += ((r as any).Exam?.totalMarks || 100);
      studentScoreMap[sid].count++;
    });
    const topStudents = Object.entries(studentScoreMap)
      .map(([id, d]) => ({ id, name: d.name, class: d.className, score: d.max > 0 ? Math.round((d.total / d.max) * 100) : 0 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((s, i) => ({ ...s, rank: i + 1 }));

    // ─── Class performance ─────────────────────────────────────────────
    const classScoreMap: Record<string, { name: string; total: number; max: number; count: number }> = {};
    examResults.forEach(r => {
      const cid = (r as any).Exam?.Class?.name || 'Unknown';
      if (!classScoreMap[cid]) classScoreMap[cid] = { name: cid, total: 0, max: 0, count: 0 };
      classScoreMap[cid].total += r.obtainedMarks;
      classScoreMap[cid].max += ((r as any).Exam?.totalMarks || 100);
      classScoreMap[cid].count++;
    });
    const classPerformance = Object.values(classScoreMap)
      .map(c => ({ class: c.name, average: c.max > 0 ? Math.round((c.total / c.max) * 100) : 0 }))
      .sort((a, b) => a.class.localeCompare(b.class));

    // ─── Attendance trend (last 6 months) ──────────────────────────────
    const sixMonthsAgoAtt = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const allAttendance = await this.prisma.studentAttendance.findMany({
      where: { schoolId, date: { gte: sixMonthsAgoAtt } },
      select: { date: true, status: true },
    });
    const attMonthMap: Record<string, { present: number; total: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      attMonthMap[`${d.getFullYear()}-${d.getMonth()}`] = { present: 0, total: 0 };
    }
    allAttendance.forEach(r => {
      const d = new Date(r.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (attMonthMap[key]) {
        attMonthMap[key].total++;
        if (r.status === 'PRESENT') attMonthMap[key].present++;
      }
    });
    const attendanceTrend = Object.entries(attMonthMap).map(([key, val]) => {
      const [yr, mo] = key.split('-').map(Number);
      return { month: MONTH_NAMES[mo], rate: val.total > 0 ? Math.round((val.present / val.total) * 100) : 0 };
    });

    return {
      totalStudents,
      totalTeachers: teacherCount,
      totalParents: 0,
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
    const [totalSchools, totalStudents, totalRevenue] = await Promise.all([
      this.prisma.school.count({ where: { deletedAt: null } }),
      this.prisma.student.count(),
      this.prisma.feePayment.aggregate({ _sum: { amountPaid: true } }),
    ]);

    const schools = await this.prisma.school.findMany({
      where: { deletedAt: null },
      select: {
        id: true, name: true, slug: true,
        subscriptionStatus: true, subscriptionAmount: true,
        _count: { select: { Student: true, User: true } },
      },
    });

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
