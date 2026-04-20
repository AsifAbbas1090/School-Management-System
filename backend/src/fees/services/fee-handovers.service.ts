import { randomUUID } from 'crypto';
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFeeHandoverDto } from '../dto/create-fee-handover.dto';
import { FeeQueryDto } from '../dto/fee-query.dto';
import { HandoverStatus, Prisma, UserRole } from '@prisma/client';
import { EPS, getManagerCashLedger } from '../../common/manager-cash-ledger';

@Injectable()
export class FeeHandoversService {
  constructor(private prisma: PrismaService) {}

  /**
   * Submit a partial or full handover. Amount is capped by cash on hand (ledger).
   */
  async create(schoolId: string, managerId: string, dto: CreateFeeHandoverDto) {
    const amountSubmitted = Number(dto.amountSubmitted);
    if (!Number.isFinite(amountSubmitted) || amountSubmitted < EPS) {
      throw new BadRequestException('amountSubmitted must be a positive number');
    }

    const ledger = await getManagerCashLedger(this.prisma, schoolId, managerId);
    if (amountSubmitted > ledger.remainingOnHand + EPS) {
      throw new BadRequestException(
        `Cannot submit ${amountSubmitted}. Available on hand: ${Math.max(0, ledger.remainingOnHand).toFixed(2)} (collected ${ledger.totalCollected.toFixed(2)} − handed ${ledger.totalSubmittedToAdmin.toFixed(2)} − expenses ${ledger.totalExpensesFromFloat.toFixed(2)})`,
      );
    }

    return this.prisma.feeHandover.create({
      data: {
        id: randomUUID(),
        schoolId,
        managerId,
        amountSubmitted,
        totalCollected: amountSubmitted,
        status: HandoverStatus.PENDING,
        totalCollectedAtTime: null,
        backupAmount: null,
        updatedAt: new Date(),
      },
      include: {
        manager: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
  }

  async findAll(
    schoolId: string,
    query: FeeQueryDto,
    user?: { id: string; role: UserRole },
  ) {
    const { page = 1, pageSize = 10 } = query;
    const skip = (page - 1) * pageSize;

    const where: Prisma.FeeHandoverWhereInput = {
      schoolId,
      ...(user?.role === UserRole.MANAGEMENT && { managerId: user.id }),
    };

    const [handovers, total] = await Promise.all([
      this.prisma.feeHandover.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { submittedAt: 'desc' },
        include: {
          manager: {
            select: { id: true, name: true, email: true, role: true },
          },
          verifiedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      this.prisma.feeHandover.count({ where }),
    ]);

    return {
      data: handovers,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    };
  }

  async getHandoverSummary(schoolId: string, user?: { id: string; role: UserRole }) {
    if (user?.role === UserRole.MANAGEMENT) {
      return this.getManagerSummary(schoolId, user.id);
    }

    const [totalCollectedSchool, verifiedAgg, pendingAgg] = await Promise.all([
      this.prisma.feePayment.aggregate({
        where: { schoolId },
        _sum: { amountPaid: true },
      }),
      this.prisma.feeHandover.aggregate({
        where: { schoolId, status: HandoverStatus.VERIFIED },
        _sum: { amountSubmitted: true },
      }),
      this.prisma.feeHandover.aggregate({
        where: { schoolId, status: HandoverStatus.PENDING },
        _sum: { amountSubmitted: true },
      }),
    ]);

    const recentHandovers = await this.prisma.feeHandover.findMany({
      where: { schoolId },
      take: 8,
      orderBy: { submittedAt: 'desc' },
      include: {
        manager: { select: { id: true, name: true, email: true } },
        verifiedBy: { select: { id: true, name: true } },
      },
    });

    return {
      totalCollected: totalCollectedSchool._sum.amountPaid || 0,
      totalHandedOver: verifiedAgg._sum.amountSubmitted || 0,
      pendingVerificationAmount: pendingAgg._sum.amountSubmitted || 0,
      availableAmount: pendingAgg._sum.amountSubmitted || 0,
      recentHandovers,
    };
  }

  async getManagerSummary(schoolId: string, managerId: string) {
    const ledger = await getManagerCashLedger(this.prisma, schoolId, managerId);

    const [verifiedAgg, pendingAgg, allManagerHandovers] = await Promise.all([
      this.prisma.feeHandover.aggregate({
        where: { schoolId, managerId, status: HandoverStatus.VERIFIED },
        _sum: { amountSubmitted: true },
      }),
      this.prisma.feeHandover.aggregate({
        where: { schoolId, managerId, status: HandoverStatus.PENDING },
        _sum: { amountSubmitted: true },
      }),
      this.prisma.feeHandover.findMany({
        where: { schoolId, managerId },
        orderBy: { submittedAt: 'desc' },
        take: 12,
        select: {
          id: true,
          amountSubmitted: true,
          totalCollected: true,
          status: true,
          submittedAt: true,
          verifiedAt: true,
        },
      }),
    ]);

    const verifiedTotal = verifiedAgg._sum.amountSubmitted ?? 0;
    const pendingTotal = pendingAgg._sum.amountSubmitted ?? 0;

    return {
      ...ledger,
      totalHandedOverVerified: verifiedTotal,
      totalHandedOverPending: pendingTotal,
      /** Sum of all handover submissions (pending + verified) — cash left manager */
      totalSubmittedToAdmin: ledger.totalSubmittedToAdmin,
      /** Same as remainingOnHand — max you can hand over or reflects float after expenses */
      availableAmount: Math.max(0, ledger.remainingOnHand),
      unsubmittedTotal: Math.max(0, ledger.remainingOnHand),
      mustSubmit: Math.max(0, ledger.remainingOnHand),
      /** Back-compat name */
      totalHandedOver: verifiedTotal,
      recentHandovers: allManagerHandovers,
    };
  }

  /** Admin: per-manager collection overview + ledger. */
  async getManagersOverview(schoolId: string) {
    const managers = await this.prisma.user.findMany({
      where: { schoolId, role: UserRole.MANAGEMENT, deletedAt: null },
      select: { id: true, name: true, email: true },
    });

    const rows = await Promise.all(
      managers.map(async (m) => {
        const ledger = await getManagerCashLedger(this.prisma, schoolId, m.id);
        const lastHo = await this.prisma.feeHandover.findFirst({
          where: { schoolId, managerId: m.id },
          orderBy: { submittedAt: 'desc' },
          select: { submittedAt: true, status: true, amountSubmitted: true, verifiedAt: true },
        });
        return {
          managerId: m.id,
          managerName: m.name,
          email: m.email,
          totalCollectedLifetime: ledger.totalCollected,
          totalSubmittedToAdmin: ledger.totalSubmittedToAdmin,
          totalExpensesFromFloat: ledger.totalExpensesFromFloat,
          remainingOnHand: ledger.remainingOnHand,
          feePaymentsCount: ledger.feePaymentsCount,
          unsubmittedAmount: Math.max(0, ledger.remainingOnHand),
          lastHandoverAt: lastHo?.submittedAt ?? null,
          lastHandoverStatus: lastHo?.status ?? null,
          lastHandoverVerifiedAt: lastHo?.verifiedAt ?? null,
        };
      }),
    );

    return rows;
  }

  async verify(handoverId: string, schoolId: string, adminId: string) {
    const handover = await this.prisma.feeHandover.findFirst({
      where: { id: handoverId, schoolId },
    });

    if (!handover) {
      throw new NotFoundException('Handover not found');
    }
    if (handover.status === HandoverStatus.VERIFIED) {
      throw new BadRequestException('Already verified');
    }

    return this.prisma.feeHandover.update({
      where: { id: handoverId },
      data: {
        status: HandoverStatus.VERIFIED,
        verifiedById: adminId,
        verifiedAt: new Date(),
      },
      include: {
        manager: { select: { name: true, email: true } },
        verifiedBy: { select: { name: true } },
      },
    });
  }
}
