import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFeeInvoiceDto } from '../dto/create-fee-invoice.dto';
import { UpdateFeeInvoiceDto } from '../dto/update-fee-invoice.dto';
import { FeeQueryDto } from '../dto/fee-query.dto';
import { FeeInvoiceStatus, Prisma } from '@prisma/client';

@Injectable()
export class FeeInvoicesService {
  constructor(private prisma: PrismaService) {}

  async create(schoolId: string, createFeeInvoiceDto: CreateFeeInvoiceDto) {
    // Verify student belongs to school
    const student = await this.prisma.student.findFirst({
      where: {
        id: createFeeInvoiceDto.studentId,
        schoolId,
      },
    });

    if (!student) {
      throw new NotFoundException(`Student with ID ${createFeeInvoiceDto.studentId} not found`);
    }

    // Verify fee structure belongs to school and matches student's class or is global
    const feeStructure = await this.prisma.feeStructure.findFirst({
      where: {
        id: createFeeInvoiceDto.feeStructureId,
        schoolId,
        OR: [
          { classId: null }, // Global
          { classId: student.classId }, // Class-specific
        ],
      },
    });

    if (!feeStructure) {
      throw new NotFoundException(
        `Fee structure not found or does not apply to this student's class`
      );
    }

    // Use fee structure amount if not provided
    const amount = createFeeInvoiceDto.amount || feeStructure.amount;

    // Calculate status based on due date
    const dueDate = new Date(createFeeInvoiceDto.dueDate);
    const now = new Date();
    const status = dueDate < now ? FeeInvoiceStatus.OVERDUE : FeeInvoiceStatus.PENDING;

    return this.prisma.feeInvoice.create({
      data: {
        schoolId,
        studentId: createFeeInvoiceDto.studentId,
        feeStructureId: createFeeInvoiceDto.feeStructureId,
        amount,
        dueDate,
        status,
      } as Prisma.FeeInvoiceUncheckedCreateInput,
      include: {
        Student: {
          include: {
            Class: true,
            Section: true,
          },
        },
        FeeStructure: true,
        FeePayment: {
          orderBy: { paidAt: 'desc' },
          take: 5,
        },
      },
    });
  }

  async findAll(schoolId: string, query: FeeQueryDto) {
    const { search, studentId, classId, status, page = 1, pageSize = 10 } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {
      schoolId,
    };

    if (studentId) {
      where.studentId = studentId;
    }

    if (classId) {
      where.Student = {
        classId,
      };
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { Student: { name: { contains: search, mode: 'insensitive' } } },
        { Student: { rollNumber: { contains: search, mode: 'insensitive' } } },
        { FeeStructure: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [invoices, total] = await Promise.all([
      this.prisma.feeInvoice.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { dueDate: 'asc' },
        include: {
          Student: {
            include: {
              Class: true,
              Section: true,
            },
          },
          FeeStructure: true,
          FeePayment: {
            select: {
              amountPaid: true,
              paidAt: true,
            },
            orderBy: { paidAt: 'desc' },
          },
        },
      }),
      this.prisma.feeInvoice.count({ where }),
    ]);

    // Calculate paid amount and remaining for each invoice
    const invoicesWithCalculations = invoices.map((invoice) => {
      const totalPaid = invoice.FeePayment?.reduce((sum, p) => sum + p.amountPaid, 0) || 0;
      const remaining = invoice.amount - totalPaid;
      const calculatedStatus =
        remaining <= 0
          ? FeeInvoiceStatus.PAID
          : remaining < invoice.amount
          ? FeeInvoiceStatus.PARTIAL
          : invoice.status;

      return {
        ...invoice,
        totalPaid,
        remaining,
        calculatedStatus,
      };
    });

    return {
      data: invoicesWithCalculations,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findOne(schoolId: string, id: string) {
    const invoice = await this.prisma.feeInvoice.findFirst({
      where: {
        id,
        schoolId,
      },
      include: {
        Student: {
          include: {
            Class: true,
            Section: true,
            User: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        FeeStructure: true,
        FeePayment: {
          orderBy: { paidAt: 'desc' },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Fee invoice with ID ${id} not found`);
    }

    const totalPaid = invoice.FeePayment?.reduce((sum, p) => sum + p.amountPaid, 0) || 0;
    const remaining = invoice.amount - totalPaid;

    return {
      ...invoice,
      totalPaid,
      remaining,
    };
  }

  async update(schoolId: string, id: string, updateFeeInvoiceDto: UpdateFeeInvoiceDto) {
    const existing = await this.prisma.feeInvoice.findFirst({
      where: {
        id,
        schoolId,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Fee invoice with ID ${id} not found`);
    }

    // Recalculate status if dueDate is updated
    let status = updateFeeInvoiceDto.status;
    if (updateFeeInvoiceDto.dueDate && !status) {
      const dueDate = new Date(updateFeeInvoiceDto.dueDate);
      const now = new Date();
      status = dueDate < now ? FeeInvoiceStatus.OVERDUE : existing.status;
    }

    return this.prisma.feeInvoice.update({
      where: { id },
      data: {
        ...updateFeeInvoiceDto,
        status,
      },
      include: {
        Student: {
          include: {
            Class: true,
            Section: true,
          },
        },
        FeeStructure: true,
      },
    });
  }

  async remove(schoolId: string, id: string) {
    const invoice = await this.prisma.feeInvoice.findFirst({
      where: {
        id,
        schoolId,
      },
      include: {
        _count: {
          select: {
            FeePayment: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Fee invoice with ID ${id} not found`);
    }

    if (invoice._count.FeePayment > 0) {
      throw new BadRequestException(
        `Cannot delete invoice with ${invoice._count.FeePayment} payments. Delete payments first.`
      );
    }

    await this.prisma.feeInvoice.delete({
      where: { id },
    });

    return { message: 'Fee invoice deleted successfully' };
  }
}


