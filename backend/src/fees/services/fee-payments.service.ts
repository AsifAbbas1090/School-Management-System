import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFeePaymentDto } from '../dto/create-fee-payment.dto';
import { PaymentQueryDto } from '../dto/fee-query.dto';
import { ReceiptService } from './receipt.service';
import { FeeInvoiceStatus, Prisma } from '@prisma/client';

@Injectable()
export class FeePaymentsService {
  constructor(
    private prisma: PrismaService,
    private receiptService: ReceiptService,
  ) {}

  async create(schoolId: string, createFeePaymentDto: CreateFeePaymentDto) {
    // Verify student belongs to school
    const student = await this.prisma.student.findFirst({
      where: {
        id: createFeePaymentDto.studentId,
        schoolId,
      },
      include: {
        Class: true,
        Section: true,
        User: true,
      },
    });

    if (!student) {
      throw new NotFoundException(`Student with ID ${createFeePaymentDto.studentId} not found`);
    }

    // Verify invoice if provided
    let invoice = null;
    if (createFeePaymentDto.invoiceId) {
      invoice = await this.prisma.feeInvoice.findFirst({
        where: {
          id: createFeePaymentDto.invoiceId,
          schoolId,
          studentId: createFeePaymentDto.studentId,
        },
        include: {
          FeePayment: true,
        },
      });

      if (!invoice) {
        throw new NotFoundException(`Invoice with ID ${createFeePaymentDto.invoiceId} not found`);
      }

      // Check if payment exceeds remaining amount
      const totalPaid = invoice.FeePayment?.reduce((sum, p) => sum + p.amountPaid, 0) || 0;
      const remaining = invoice.amount - totalPaid;

      if (createFeePaymentDto.amountPaid > remaining) {
        throw new BadRequestException(
          `Payment amount (${createFeePaymentDto.amountPaid}) exceeds remaining amount (${remaining})`
        );
      }
    }

    // Generate unique receipt number
    let receiptNumber = this.receiptService.generateReceiptNumber();
    receiptNumber = await this.receiptService.ensureUniqueReceiptNumber(
      this.prisma,
      receiptNumber,
    );

    // Create payment
    const payment = await this.prisma.feePayment.create({
      data: {
        schoolId,
        studentId: createFeePaymentDto.studentId,
        invoiceId: createFeePaymentDto.invoiceId || null,
        amountPaid: createFeePaymentDto.amountPaid,
        paymentMethod: createFeePaymentDto.paymentMethod,
        transactionId: createFeePaymentDto.transactionId || null,
        remarks: createFeePaymentDto.remarks || null,
        receiptNumber,
      } as Prisma.FeePaymentUncheckedCreateInput,
      include: {
        Student: {
          include: {
            Class: true,
            Section: true,
            User: true,
          },
        },
        FeeInvoice: {
          include: {
            FeeStructure: true,
          },
        },
      },
    });

    // Update invoice status if invoice was provided
    if (invoice) {
      const totalPaid = (invoice.FeePayment?.reduce((sum, p) => sum + p.amountPaid, 0) || 0) + createFeePaymentDto.amountPaid;
      const remaining = invoice.amount - totalPaid;

      let newStatus = invoice.status;
      if (remaining <= 0) {
        newStatus = FeeInvoiceStatus.PAID;
      } else if (totalPaid > 0) {
        newStatus = FeeInvoiceStatus.PARTIAL;
      }

      await this.prisma.feeInvoice.update({
        where: { id: invoice.id },
        data: { status: newStatus },
      });
    }

    return payment;
  }

  async findAll(schoolId: string, query: PaymentQueryDto) {
    const { studentId, paymentMethod, page = 1, pageSize = 10 } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {
      schoolId,
    };

    if (studentId) {
      where.studentId = studentId;
    }

    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }

    const [payments, total] = await Promise.all([
      this.prisma.feePayment.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { paidAt: 'desc' },
        include: {
          Student: {
            include: {
              Class: true,
              Section: true,
            },
          },
          FeeInvoice: {
            include: {
              FeeStructure: true,
            },
          },
        },
      }),
      this.prisma.feePayment.count({ where }),
    ]);

    return {
      data: payments,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findOne(schoolId: string, id: string) {
    const payment = await this.prisma.feePayment.findFirst({
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
        FeeInvoice: {
          include: {
            FeeStructure: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Fee payment with ID ${id} not found`);
    }

    return payment;
  }

  async getReceiptPayload(schoolId: string, paymentId: string) {
    const payment = await this.findOne(schoolId, paymentId);

    if (!payment.Student) {
      throw new NotFoundException('Student not found');
    }

    // Get school data
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    const className = payment.Student.Class
      ? `Class ${payment.Student.Class.grade}${payment.Student.Section ? ` - Section ${payment.Student.Section.name}` : ''}`
      : 'N/A';

    return {
      payment: {
        receiptNumber: payment.receiptNumber,
        amount: payment.amountPaid,
        paidDate: payment.paidAt,
        paymentMethod: payment.paymentMethod,
        feeType: payment.FeeInvoice?.FeeStructure?.name || 'Fee Payment',
        transactionId: payment.transactionId || null,
        remarks: payment.remarks || null,
      },
      student: {
        name: payment.Student.name,
        rollNumber: payment.Student.rollNumber,
        className,
        fatherName: payment.Student.User?.name || 'N/A',
        phone: payment.Student.User?.phone || payment.Student.phone || 'N/A',
        contact: payment.Student.User?.phone || payment.Student.phone || 'N/A',
      },
      school: {
        name: school.name,
        logoUrl: school.logoUrl || null,
        principalName: school.principalName || null,
        ownerName: school.ownerName || null,
        address: school.address || null,
        phone: school.phone || null,
        email: school.email || null,
      },
    };
  }

  async getStudentFeeSummary(schoolId: string, studentId: string) {
    const student = await this.prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId,
      },
    });

    if (!student) {
      throw new NotFoundException(`Student with ID ${studentId} not found`);
    }

    // Get all invoices for student
    const invoices = await this.prisma.feeInvoice.findMany({
      where: {
        schoolId,
        studentId,
      },
      include: {
        FeePayment: true,
        FeeStructure: true,
      },
    });

    // Calculate totals
    const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const totalPaid = invoices.reduce(
      (sum, inv) => sum + (inv.FeePayment?.reduce((pSum, p) => pSum + p.amountPaid, 0) || 0),
      0,
    );
    const totalPending = totalAmount - totalPaid;

    // Group by status
    const byStatus = invoices.reduce(
      (acc, inv) => {
        const totalPaidForInv = inv.FeePayment?.reduce((sum, p) => sum + p.amountPaid, 0) || 0;
        const remaining = inv.amount - totalPaidForInv;

        if (remaining <= 0) {
          acc.paid++;
        } else if (totalPaidForInv > 0) {
          acc.partial++;
        } else {
          acc.pending++;
        }

        return acc;
      },
      { paid: 0, partial: 0, pending: 0 },
    );

    return {
      student: {
        id: student.id,
        name: student.name,
        rollNumber: student.rollNumber,
      },
      summary: {
        totalAmount,
        totalPaid,
        totalPending,
        invoiceCount: invoices.length,
        byStatus,
      },
      invoices: invoices.map((inv) => {
        const totalPaidForInv = inv.FeePayment?.reduce((sum, p) => sum + p.amountPaid, 0) || 0;
        const remaining = inv.amount - totalPaidForInv;

        return {
          id: inv.id,
          feeStructure: inv.FeeStructure?.name || 'N/A',
          amount: inv.amount,
          totalPaid: totalPaidForInv,
          remaining,
          dueDate: inv.dueDate,
          status: inv.status,
        };
      }),
    };
  }
}


