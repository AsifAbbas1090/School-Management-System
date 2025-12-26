import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Calculate subscription status based on nextBillingDate
   */
  calculateSubscriptionStatus(nextBillingDate: Date | null): SubscriptionStatus {
    if (!nextBillingDate) {
      return SubscriptionStatus.PENDING;
    }

    const now = new Date();
    const dueSoonThreshold = new Date();
    dueSoonThreshold.setDate(dueSoonThreshold.getDate() + 7); // 7 days from now

    if (nextBillingDate < now) {
      return SubscriptionStatus.EXPIRED;
    } else if (nextBillingDate < dueSoonThreshold) {
      return SubscriptionStatus.DUE_SOON;
    } else {
      return SubscriptionStatus.ACTIVE;
    }
  }

  /**
   * Update subscription status for a school
   */
  async updateSubscriptionStatus(schoolId: string): Promise<SubscriptionStatus> {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      throw new Error('School not found');
    }

    const newStatus = this.calculateSubscriptionStatus(school.nextBillingDate);
    
    if (newStatus !== school.subscriptionStatus) {
      await this.prisma.school.update({
        where: { id: schoolId },
        data: { subscriptionStatus: newStatus },
      });
    }

    return newStatus;
  }

  /**
   * Calculate monthly revenue from all active subscriptions
   */
  async calculateMonthlyRevenue(): Promise<number> {
    const activeSchools = await this.prisma.school.findMany({
      where: {
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        deletedAt: null,
      },
      select: {
        subscriptionAmount: true,
      },
    });

    return activeSchools.reduce((total, school) => total + school.subscriptionAmount, 0);
  }

  /**
   * Calculate total revenue (all time) based on subscription start dates
   */
  async calculateTotalRevenue(): Promise<number> {
    const schools = await this.prisma.school.findMany({
      where: {
        deletedAt: null,
        subscriptionStartDate: { not: null },
      },
      select: {
        subscriptionAmount: true,
        subscriptionStartDate: true,
      },
    });

    const now = new Date();
    let totalRevenue = 0;

    for (const school of schools) {
      if (!school.subscriptionStartDate) continue;

      const startDate = new Date(school.subscriptionStartDate);
      const months = Math.max(
        1,
        Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
      );

      totalRevenue += school.subscriptionAmount * months;
    }

    return totalRevenue;
  }

  /**
   * Get subscription analytics
   */
  async getSubscriptionAnalytics() {
    const schools = await this.prisma.school.findMany({
      where: { deletedAt: null },
      select: {
        subscriptionStatus: true,
        subscriptionAmount: true,
        subscriptionStartDate: true,
      },
    });

    const totalSchools = schools.length;
    const activeSchools = schools.filter(
      (s) => s.subscriptionStatus === SubscriptionStatus.ACTIVE
    ).length;
    const expiredSchools = schools.filter(
      (s) => s.subscriptionStatus === SubscriptionStatus.EXPIRED
    ).length;
    const dueSoonSchools = schools.filter(
      (s) => s.subscriptionStatus === SubscriptionStatus.DUE_SOON
    ).length;
    const pendingSchools = schools.filter(
      (s) => s.subscriptionStatus === SubscriptionStatus.PENDING
    ).length;

    const totalMonthlyRevenue = await this.calculateMonthlyRevenue();
    const totalRevenue = await this.calculateTotalRevenue();

    return {
      totalMonthlyRevenue,
      totalRevenue,
      totalSchools,
      activeSchools,
      expiredSchools,
      dueSoonSchools,
      pendingSchools,
    };
  }
}


