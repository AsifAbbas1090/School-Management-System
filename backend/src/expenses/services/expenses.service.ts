import { randomUUID } from 'crypto';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExpenseDto } from '../dto/create-expense.dto';
import { UpdateExpenseDto } from '../dto/update-expense.dto';
import { ExpenseQueryDto } from '../dto/expense-query.dto';
import { UserRole, Prisma } from '@prisma/client';
import { EPS, getManagerCashLedger } from '../../common/manager-cash-ledger';

/** Include creator (`User`) + last-editor (`Editor`) on every expense read so admins can see
 *  who added the entry and which admin (if any) last touched it. */
const EXPENSE_INCLUDE = {
  User: {
    select: { id: true, name: true, email: true },
  },
  Editor: {
    select: { id: true, name: true, email: true },
  },
} as const;

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async create(schoolId: string, userId: string, userRole: string, createExpenseDto: CreateExpenseDto) {
    if (userRole === UserRole.MANAGEMENT) {
      const ledger = await getManagerCashLedger(this.prisma, schoolId, userId);
      if (createExpenseDto.amount > ledger.remainingOnHand + EPS) {
        throw new BadRequestException(
          `Expense exceeds cash on hand (${ledger.remainingOnHand.toFixed(2)}). Collected ${ledger.totalCollected.toFixed(2)} − submitted to admin ${ledger.totalSubmittedToAdmin.toFixed(2)} − prior expenses ${ledger.totalExpensesFromFloat.toFixed(2)}.`,
        );
      }
    }

    return this.prisma.expense.create({
      data: {
        id: randomUUID(),
        schoolId,
        title: createExpenseDto.title,
        amount: createExpenseDto.amount,
        category: createExpenseDto.category,
        notes: createExpenseDto.notes || null,
        receiptImageUrl: createExpenseDto.receiptImageUrl || null,
        createdById: userId,
        createdByRole: userRole as UserRole,
        updatedAt: new Date(),
      } as Prisma.ExpenseUncheckedCreateInput,
      include: EXPENSE_INCLUDE,
    });
  }

  async findAll(schoolId: string, query: ExpenseQueryDto) {
    const { search, category, page = 1, pageSize = 10 } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {
      schoolId,
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = category;
    }

    const [expenses, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: EXPENSE_INCLUDE,
      }),
      this.prisma.expense.count({ where }),
    ]);

    return {
      data: expenses,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findOne(schoolId: string, id: string) {
    const expense = await this.prisma.expense.findFirst({
      where: {
        id,
        schoolId,
        deletedAt: null,
      },
      include: EXPENSE_INCLUDE,
    });

    if (!expense) {
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }

    return expense;
  }

  async update(
    schoolId: string,
    id: string,
    editorUserId: string,
    editorUserRole: string,
    updateExpenseDto: UpdateExpenseDto,
  ) {
    /** Defence in depth: the controller already gates to ADMIN/SUPER_ADMIN, but if another
     *  caller plugs into this service directly we still refuse MANAGEMENT edits here. */
    if (
      editorUserRole !== UserRole.ADMIN &&
      editorUserRole !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException(
        'Only administrators can edit expenses. Contact an admin if you need a correction.',
      );
    }

    const existing = await this.prisma.expense.findFirst({
      where: {
        id,
        schoolId,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }

    const nextAmount =
      updateExpenseDto.amount !== undefined ? updateExpenseDto.amount : existing.amount;
    if (existing.createdByRole === UserRole.MANAGEMENT) {
      const ledger = await getManagerCashLedger(this.prisma, schoolId, existing.createdById);
      const headroom = ledger.remainingOnHand + existing.amount;
      if (nextAmount > headroom + EPS) {
        throw new BadRequestException(
          `Updated expense exceeds available cash (${headroom.toFixed(2)} including this entry).`,
        );
      }
    }

    return this.prisma.expense.update({
      where: { id },
      data: {
        ...updateExpenseDto,
        /** Preserve original creator; record who touched it last for admin oversight. */
        updatedById: editorUserId,
        updatedByRole: editorUserRole as UserRole,
      },
      include: EXPENSE_INCLUDE,
    });
  }

  async remove(schoolId: string, id: string) {
    const expense = await this.prisma.expense.findFirst({
      where: {
        id,
        schoolId,
        deletedAt: null,
      },
    });

    if (!expense) {
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }

    // Soft delete
    await this.prisma.expense.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    return { message: 'Expense deleted successfully' };
  }
}


