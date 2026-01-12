import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFeePaymentDto } from '../dto/create-fee-payment.dto';
import { PaymentQueryDto } from '../dto/fee-query.dto';
import { ReceiptService } from './receipt.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class FeePaymentsService {
  constructor(
    private prisma: PrismaService,
    private receiptService: ReceiptService,
  ) {}

  /**
   * Create a new fee payment
   * Simplified model: Each student has monthlyFee, payments are tracked monthly
   */
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

    // Check if payment already exists for this student/month/year
    const existingPayment = await this.prisma.feePayment.findFirst({
      where: {
        schoolId,
        studentId: createFeePaymentDto.studentId,
        month: createFeePaymentDto.month,
        year: createFeePaymentDto.year,
      },
    });

    if (existingPayment) {
      throw new BadRequestException(
        `Payment already exists for ${student.name} for ${createFeePaymentDto.month}/${createFeePaymentDto.year}`
      );
    }

    // Calculate discount
    const discountPercentage = createFeePaymentDto.discountPercentage || 0;
    const discountAmount = (createFeePaymentDto.originalAmount * discountPercentage) / 100;
    
    // Use the actual amount paid (provided by frontend - can be different from calculated amount)
    // This allows for partial payments (remaining balance) or overpayments (surplus)
    const finalAmount = createFeePaymentDto.amountPaid;

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
        month: createFeePaymentDto.month,
        year: createFeePaymentDto.year,
        originalAmount: createFeePaymentDto.originalAmount,
        discountPercentage,
        discountAmount,
        amountPaid: finalAmount,
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
      },
    });

    return payment;
  }

  /**
   * Get all fee payments with filters
   */
  async findAll(schoolId: string, query: PaymentQueryDto) {
    const { studentId, paymentMethod, month, year, page = 1, pageSize = 100 } = query;
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

    if (month) {
      where.month = month;
    }

    if (year) {
      where.year = year;
    }

    const [payments, total] = await Promise.all([
      this.prisma.feePayment.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ year: 'desc' }, { month: 'desc' }, { paidAt: 'desc' }],
        include: {
          Student: {
            include: {
              Class: true,
              Section: true,
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

  /**
   * Get revenue statistics
   */
  async getRevenueStats(schoolId: string, month?: number, year?: number) {
    // Get all active students
    const students = await this.prisma.student.findMany({
      where: {
        schoolId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        monthlyFee: true,
      },
    });

    // Calculate expected revenue (sum of all student monthly fees)
    const expectedRevenue = students.reduce((sum, s) => sum + (s.monthlyFee || 0), 0);

    // Build where clause for payments
    const paymentWhere: any = { schoolId };
    if (month) paymentWhere.month = month;
    if (year) paymentWhere.year = year;

    // Get all payments
    const payments = await this.prisma.feePayment.findMany({
      where: paymentWhere,
      select: {
        amountPaid: true,
        month: true,
        year: true,
      },
    });

    // Calculate collected revenue
    const collectedRevenue = payments.reduce((sum, p) => sum + p.amountPaid, 0);

    // Calculate pending revenue
    const pendingRevenue = expectedRevenue - collectedRevenue;

    // Get students who haven't paid (for current month if month/year provided)
    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    // Get all payments for the specified month/year to find paid students
    const monthPayments = await this.prisma.feePayment.findMany({
      where: {
        schoolId,
        month: currentMonth,
        year: currentYear,
      },
      select: {
        studentId: true,
      },
    });

    const paidStudentIds = new Set(monthPayments.map(p => p.studentId));
    const unpaidStudents = students.filter(s => !paidStudentIds.has(s.id));

    return {
      expectedRevenue,
      collectedRevenue,
      pendingRevenue,
      totalStudents: students.length,
      paidStudents: paidStudentIds.size,
      unpaidStudents: unpaidStudents.length,
      unpaidStudentsList: unpaidStudents.map(s => ({
        id: s.id,
        monthlyFee: s.monthlyFee || 0,
      })),
    };
  }

  /**
   * Get student fee summary
   */
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

    // Get all payments for this student
    const payments = await this.prisma.feePayment.findMany({
      where: {
        schoolId,
        studentId,
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    // Calculate totals
    const totalPaid = payments.reduce((sum, p) => sum + p.amountPaid, 0);
    const totalDiscount = payments.reduce((sum, p) => sum + p.discountAmount, 0);

    // Get current month/year
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Check if paid for current month
    const currentMonthPayment = payments.find(
      p => p.month === currentMonth && p.year === currentYear
    );

    return {
      student: {
        id: student.id,
        name: student.name,
        rollNumber: student.rollNumber,
        monthlyFee: student.monthlyFee || 0,
      },
      summary: {
        totalPaid,
        totalDiscount,
        monthlyFee: student.monthlyFee || 0,
        currentMonthPaid: currentMonthPayment ? true : false,
        currentMonthPayment: currentMonthPayment || null,
      },
      payments: payments.map(p => ({
        id: p.id,
        month: p.month,
        year: p.year,
        originalAmount: p.originalAmount,
        discountPercentage: p.discountPercentage,
        discountAmount: p.discountAmount,
        amountPaid: p.amountPaid,
        paymentMethod: p.paymentMethod,
        paidAt: p.paidAt,
        receiptNumber: p.receiptNumber,
      })),
    };
  }

  /**
   * Get a single payment by ID
   */
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
      },
    });

    if (!payment) {
      throw new NotFoundException(`Fee payment with ID ${id} not found`);
    }

    return payment;
  }

  /**
   * Get receipt payload for PDF generation
   */
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
        originalAmount: payment.originalAmount,
        discountPercentage: payment.discountPercentage,
        discountAmount: payment.discountAmount,
        paidDate: payment.paidAt,
        paymentMethod: payment.paymentMethod,
        month: payment.month,
        year: payment.year,
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
}
