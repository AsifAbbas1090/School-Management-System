import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFeeHandoverDto } from '../dto/create-fee-handover.dto';
import { FeeQueryDto } from '../dto/fee-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class FeeHandoversService {
  constructor(private prisma: PrismaService) {}

  async create(schoolId: string, submittedById: string, createFeeHandoverDto: CreateFeeHandoverDto) {
    const { amountSubmitted } = createFeeHandoverDto;

    // Calculate total collected at this moment
    const totalCollected = await this.prisma.feePayment.aggregate({
      where: {
        schoolId,
      },
      _sum: {
        amountPaid: true,
      },
    });

    const totalCollectedAmount = totalCollected._sum.amountPaid || 0;

    // Calculate total already handed over
    const totalHandedOver = await this.prisma.feeHandover.aggregate({
      where: {
        schoolId,
      },
      _sum: {
        amountSubmitted: true,
      },
    });

    const totalHandedOverAmount = totalHandedOver._sum.amountSubmitted || 0;

    // Available amount = total collected - total handed over
    const availableAmount = totalCollectedAmount - totalHandedOverAmount;

    if (amountSubmitted > availableAmount) {
      throw new BadRequestException(
        `Cannot submit ${amountSubmitted}. Available amount is ${availableAmount}`
      );
    }

    const backupAmount = availableAmount - amountSubmitted;

    const handover = await this.prisma.feeHandover.create({
      data: {
        schoolId,
        submittedById,
        amountSubmitted,
        totalCollectedAtTime: totalCollectedAmount,
        backupAmount,
      } as Prisma.FeeHandoverUncheckedCreateInput,
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return handover;
  }

  async findAll(schoolId: string, query: FeeQueryDto) {
    const { page = 1, pageSize = 10 } = query;
    const skip = (page - 1) * pageSize;

    const [handovers, total] = await Promise.all([
      this.prisma.feeHandover.findMany({
        where: {
          schoolId,
        },
        skip,
        take: pageSize,
        orderBy: { submittedAt: 'desc' },
        include: {
          User: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.feeHandover.count({
        where: {
          schoolId,
        },
      }),
    ]);

    // Calculate totals
    const totalSubmitted = handovers.reduce((sum, h) => sum + h.amountSubmitted, 0);
    const totalCollected = await this.prisma.feePayment.aggregate({
      where: { schoolId },
      _sum: { amountPaid: true },
    });

    return {
      data: handovers,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
      summary: {
        totalSubmitted,
        totalCollected: totalCollected._sum.amountPaid || 0,
        remainingBackup: handovers.length > 0 ? handovers[0].backupAmount : 0,
      },
    };
  }

  async getHandoverSummary(schoolId: string) {
    // Total collected
    const totalCollected = await this.prisma.feePayment.aggregate({
      where: { schoolId },
      _sum: { amountPaid: true },
    });

    // Total handed over
    const totalHandedOver = await this.prisma.feeHandover.aggregate({
      where: { schoolId },
      _sum: { amountSubmitted: true },
    });

    // Available for handover
    const availableAmount =
      (totalCollected._sum.amountPaid || 0) - (totalHandedOver._sum.amountSubmitted || 0);

    // Recent handovers
    const recentHandovers = await this.prisma.feeHandover.findMany({
      where: { schoolId },
      take: 5,
      orderBy: { submittedAt: 'desc' },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return {
      totalCollected: totalCollected._sum.amountPaid || 0,
      totalHandedOver: totalHandedOver._sum.amountSubmitted || 0,
      availableAmount,
      recentHandovers,
    };
  }
}


