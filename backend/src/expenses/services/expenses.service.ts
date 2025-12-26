import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExpenseDto } from '../dto/create-expense.dto';
import { UpdateExpenseDto } from '../dto/update-expense.dto';
import { ExpenseQueryDto } from '../dto/expense-query.dto';
import { UserRole, Prisma } from '@prisma/client';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async create(schoolId: string, userId: string, userRole: string, createExpenseDto: CreateExpenseDto) {
    return this.prisma.expense.create({
      data: {
        schoolId,
        title: createExpenseDto.title,
        amount: createExpenseDto.amount,
        category: createExpenseDto.category,
        notes: createExpenseDto.notes || null,
        receiptImageUrl: createExpenseDto.receiptImageUrl || null,
        createdById: userId,
        createdByRole: userRole as UserRole,
      } as Prisma.ExpenseUncheckedCreateInput,
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
        include: {
          User: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
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

    if (!expense) {
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }

    return expense;
  }

  async update(schoolId: string, id: string, updateExpenseDto: UpdateExpenseDto) {
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

    return this.prisma.expense.update({
      where: { id },
      data: updateExpenseDto,
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


