import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { assertParentOwnsStudent } from '../../common/assert-parent-owns-student';
import { CreateFeePaymentDto } from '../dto/create-fee-payment.dto';
import { UpdateFeePaymentDto } from '../dto/update-fee-payment.dto';
import { PaymentQueryDto } from '../dto/fee-query.dto';
import { ReceiptService } from './receipt.service';
import { PaymentMethod, Prisma, UserRole } from '@prisma/client';

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
  async create(
    schoolId: string,
    createFeePaymentDto: CreateFeePaymentDto,
    user?: { id: string; role: UserRole },
  ) {
    try {
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

      if (user?.role === UserRole.PARENT) {
        await assertParentOwnsStudent(this.prisma, schoolId, user.id, createFeePaymentDto.studentId);
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

      // Validate payment method - ensure it's a valid enum value
      let paymentMethod = createFeePaymentDto.paymentMethod;
      if (typeof paymentMethod === 'string') {
        // Convert string to enum if needed
        paymentMethod = paymentMethod.toUpperCase() as any;
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
          month: createFeePaymentDto.month,
          year: createFeePaymentDto.year,
          originalAmount: createFeePaymentDto.originalAmount,
          discountPercentage,
          discountAmount,
          amountPaid: finalAmount,
          paymentMethod: paymentMethod as any,
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
    } catch (error) {
      // Log the full error for debugging
      console.error('Error creating fee payment:', error);
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        meta: error?.meta,
        stack: error?.stack,
      });
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      // Re-throw with more context
      throw new BadRequestException(
        `Failed to create payment: ${error?.message || error?.code || 'Unknown error'}. Please check backend logs for details.`
      );
    }
  }

  /**
   * Get all fee payments with filters
   */
  async findAll(
    schoolId: string,
    query: PaymentQueryDto,
    user?: { id: string; role: UserRole },
  ) {
    const { studentId, paymentMethod, month, year, page = 1, pageSize = 100 } = query;
    const skip = (page - 1) * pageSize;

    if (user?.role === UserRole.PARENT) {
      if (!studentId) {
        throw new BadRequestException('studentId is required for parents');
      }
      await assertParentOwnsStudent(this.prisma, schoolId, user.id, studentId);
    }

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
            select: {
              id: true,
              name: true,
              rollNumber: true,
              monthlyFee: true,
              classId: true,
              sectionId: true,
              Class: { select: { name: true } },
              Section: { select: { name: true } },
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
   * Get student fee summary (monthly fee + opening dues vs recorded payments)
   */
  async getStudentFeeSummary(
    schoolId: string,
    studentId: string,
    user?: { id: string; role: UserRole },
  ) {
    const student = await this.prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId,
      },
      select: {
        id: true,
        name: true,
        rollNumber: true,
        monthlyFee: true,
        pendingDues: true,
        schoolId: true,
      },
    });

    if (!student) {
      throw new NotFoundException(`Student with ID ${studentId} not found`);
    }

    if (user?.role === UserRole.PARENT) {
      await assertParentOwnsStudent(this.prisma, schoolId, user.id, studentId);
    }

    const [totalPaidAgg, payments] = await Promise.all([
      this.prisma.feePayment.aggregate({
        where: { schoolId, studentId },
        _sum: { amountPaid: true },
      }),
      this.prisma.feePayment.findMany({
        where: { schoolId, studentId },
        orderBy: { paidAt: 'desc' },
        take: 6,
        select: {
          id: true,
          amountPaid: true,
          month: true,
          year: true,
          paidAt: true,
          paymentMethod: true,
        },
      }),
    ]);

    const monthlyFee = student.monthlyFee ?? 0;
    const pendingDues = student.pendingDues ?? 0;
    const totalDue = monthlyFee + pendingDues;
    const totalPaid = totalPaidAgg._sum.amountPaid ?? 0;
    const remaining = totalDue - totalPaid;

    return {
      studentId: student.id,
      studentName: student.name,
      monthlyFee,
      pendingDues,
      totalDue,
      totalPaid,
      remaining,
      isAdvance: remaining < 0,
      lastPaymentDate: payments[0]?.paidAt ?? null,
      payments: payments.map((p) => ({
        id: p.id,
        amount: p.amountPaid,
        month: p.month,
        year: p.year,
        paymentDate: p.paidAt,
        paymentMethod: p.paymentMethod,
      })),
    };
  }

  /**
   * Get a single payment by ID
   */
  async findOne(
    schoolId: string,
    id: string,
    user?: { id: string; role: UserRole },
  ) {
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

    if (user?.role === UserRole.PARENT) {
      await assertParentOwnsStudent(this.prisma, schoolId, user.id, payment.studentId);
    }

    return payment;
  }

  /**
   * Update a fee payment (admin: full edit; parent: amountPaid / paymentMethod / remarks only — same child)
   */
  async update(
    schoolId: string,
    id: string,
    updateFeePaymentDto: UpdateFeePaymentDto,
    user?: { id: string; role: UserRole },
  ) {
    const existing = await this.findOne(schoolId, id, user);

    if (user?.role === UserRole.PARENT) {
      if (
        updateFeePaymentDto.originalAmount !== undefined ||
        updateFeePaymentDto.discountPercentage !== undefined
      ) {
        throw new ForbiddenException('Parents cannot change fee amount or discount; contact the school to adjust.');
      }
    }

    // Calculate discount if discountPercentage or originalAmount changed
    let discountAmount = existing.discountAmount;
    let finalAmount = existing.amountPaid;

    if (updateFeePaymentDto.originalAmount !== undefined || updateFeePaymentDto.discountPercentage !== undefined) {
      const originalAmount = updateFeePaymentDto.originalAmount ?? existing.originalAmount;
      const discountPercentage = updateFeePaymentDto.discountPercentage ?? existing.discountPercentage;
      discountAmount = (originalAmount * discountPercentage) / 100;
    }

    // Use provided amountPaid or calculate from original - discount
    if (updateFeePaymentDto.amountPaid !== undefined) {
      finalAmount = updateFeePaymentDto.amountPaid;
    } else if (updateFeePaymentDto.originalAmount !== undefined || updateFeePaymentDto.discountPercentage !== undefined) {
      const originalAmount = updateFeePaymentDto.originalAmount ?? existing.originalAmount;
      finalAmount = originalAmount - discountAmount;
    }

    const updateData: any = {};
    if (updateFeePaymentDto.originalAmount !== undefined) {
      updateData.originalAmount = updateFeePaymentDto.originalAmount;
    }
    if (updateFeePaymentDto.discountPercentage !== undefined) {
      updateData.discountPercentage = updateFeePaymentDto.discountPercentage;
      updateData.discountAmount = discountAmount;
    }
    if (updateFeePaymentDto.amountPaid !== undefined) {
      updateData.amountPaid = updateFeePaymentDto.amountPaid;
    }
    if (updateFeePaymentDto.paymentMethod !== undefined) {
      updateData.paymentMethod = updateFeePaymentDto.paymentMethod;
    }
    if (updateFeePaymentDto.transactionId !== undefined) {
      updateData.transactionId = updateFeePaymentDto.transactionId;
    }
    if (updateFeePaymentDto.remarks !== undefined) {
      updateData.remarks = updateFeePaymentDto.remarks;
    }

    const updated = await this.prisma.feePayment.update({
      where: { id },
      data: updateData,
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

    return updated;
  }

  /**
   * Bulk-import fee payments from parsed CSV rows (rollNumber, month, year, amountPaid, paymentMethod, …).
   */
  async bulkImportFromRows(schoolId: string, rows: Record<string, unknown>[]) {
    const results = {
      total: rows.length,
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
      skippedDetails: [] as string[],
    };

    const normKey = (k: string) => k.replace(/\s+/g, '').toLowerCase();
    const rowMap = (row: Record<string, unknown>) => {
      const m = new Map<string, string>();
      for (const [k, v] of Object.entries(row)) {
        m.set(normKey(k), String(v ?? '').trim());
      }
      return m;
    };
    const get = (m: Map<string, string>, ...aliases: string[]) => {
      for (const a of aliases) {
        const v = m.get(normKey(a));
        if (v !== undefined && v !== '') return v;
      }
      return '';
    };

    const parsePaymentMethod = (raw: string): PaymentMethod => {
      const s = raw.trim().toUpperCase().replace(/[-\s]/g, '_');
      const aliases: Record<string, PaymentMethod> = {
        CASH: PaymentMethod.CASH,
        CARD: PaymentMethod.CARD,
        BANK_TRANSFER: PaymentMethod.BANK_TRANSFER,
        BANK: PaymentMethod.BANK_TRANSFER,
        BANKTRANSFER: PaymentMethod.BANK_TRANSFER,
        ONLINE: PaymentMethod.ONLINE,
        CHEQUE: PaymentMethod.CHEQUE,
        CHECK: PaymentMethod.CHEQUE,
      };
      if (['CASH', 'CARD', 'BANK_TRANSFER', 'ONLINE', 'CHEQUE'].includes(s)) return s as PaymentMethod;
      if (aliases[s]) return aliases[s];
      throw new Error(`Invalid paymentMethod "${raw}" (use CASH, CARD, BANK_TRANSFER, ONLINE, CHEQUE)`);
    };

    type ParsedRow = {
      rowIndex: number;
      rollNumber: string;
      month: number;
      year: number;
      amountPaid: number;
      discountPercentage: number;
      originalAmount: number | null;
      remarks: string | null;
      method: PaymentMethod;
    };

    const parsedOk: ParsedRow[] = [];

    for (let i = 0; i < rows.length; i++) {
      try {
        const m = rowMap(rows[i]);
        const rollNumber = get(m, 'rollNumber', 'roll', 'roll_no');
        const monthStr = get(m, 'month');
        const yearStr = get(m, 'year');
        const amountPaidStr = get(m, 'amountPaid', 'amount', 'feeReceived', 'paid');
        const methodStr = get(m, 'paymentMethod', 'method');
        const discStr = get(m, 'discountPercentage', 'discount');
        const origStr = get(m, 'originalAmount', 'original');
        const remarks = get(m, 'remarks', 'note') || null;

        if (!rollNumber) throw new Error('rollNumber is required');
        if (!monthStr || !yearStr) throw new Error('month and year are required');
        if (!amountPaidStr) throw new Error('amountPaid is required');
        if (!methodStr) throw new Error('paymentMethod is required');

        const month = parseInt(monthStr, 10);
        const year = parseInt(yearStr, 10);
        if (!Number.isFinite(month) || month < 1 || month > 12) throw new Error('month must be 1–12');
        if (!Number.isFinite(year) || year < 2000 || year > 2100) throw new Error('year invalid');

        const amountPaid = parseFloat(amountPaidStr);
        if (Number.isNaN(amountPaid) || amountPaid < 0) throw new Error('amountPaid invalid');

        const discountPercentage = discStr ? parseFloat(discStr) : 0;
        if (Number.isNaN(discountPercentage) || discountPercentage < 0 || discountPercentage > 100) {
          throw new Error('discountPercentage must be 0–100');
        }

        let originalAmount: number | null = origStr ? parseFloat(origStr) : null;
        if (origStr && (originalAmount === null || Number.isNaN(originalAmount) || originalAmount < 0)) {
          throw new Error('originalAmount invalid');
        }

        const method = parsePaymentMethod(methodStr);

        parsedOk.push({
          rowIndex: i,
          rollNumber: rollNumber.trim(),
          month,
          year,
          amountPaid,
          discountPercentage,
          originalAmount,
          remarks,
          method,
        });
      } catch (e) {
        results.failed++;
        results.errors.push(`Row ${i + 1}: ${(e as Error).message}`);
      }
    }

    if (parsedOk.length === 0) {
      return results;
    }

    const rolls = [...new Set(parsedOk.map((p) => p.rollNumber))];
    const students = await this.prisma.student.findMany({
      where: { schoolId, rollNumber: { in: rolls } },
      select: { id: true, rollNumber: true, monthlyFee: true, name: true },
    });
    const byRoll = new Map(students.map((s) => [s.rollNumber.trim(), s]));

    for (const row of parsedOk) {
      const stu = byRoll.get(row.rollNumber);
      if (!stu) {
        results.failed++;
        results.errors.push(
          `Row ${row.rowIndex + 1}: No student with roll "${row.rollNumber}" in this school`,
        );
        continue;
      }

      const existing = await this.prisma.feePayment.findFirst({
        where: {
          schoolId,
          studentId: stu.id,
          month: row.month,
          year: row.year,
        },
      });
      if (existing) {
        results.skipped++;
        results.skippedDetails.push(
          `Row ${row.rowIndex + 1}: Payment already exists for ${stu.name} (${row.rollNumber}) ${row.month}/${row.year}`,
        );
        continue;
      }

      const originalAmount =
        row.originalAmount != null && !Number.isNaN(row.originalAmount)
          ? row.originalAmount
          : (stu.monthlyFee ?? 0);
      const discountAmount = (originalAmount * row.discountPercentage) / 100;

      try {
        let receiptNumber = this.receiptService.generateReceiptNumber();
        receiptNumber = await this.receiptService.ensureUniqueReceiptNumber(this.prisma, receiptNumber);

        await this.prisma.feePayment.create({
          data: {
            schoolId,
            studentId: stu.id,
            month: row.month,
            year: row.year,
            originalAmount,
            discountPercentage: row.discountPercentage,
            discountAmount,
            amountPaid: row.amountPaid,
            paymentMethod: row.method,
            receiptNumber,
            remarks: row.remarks,
            transactionId: null,
          },
        });
        results.success++;
      } catch (e) {
        results.failed++;
        results.errors.push(`Row ${row.rowIndex + 1}: ${(e as Error).message}`);
      }
    }

    return results;
  }

  /**
   * Get receipt payload for PDF generation
   */
  async getReceiptPayload(
    schoolId: string,
    paymentId: string,
    user?: { id: string; role: UserRole },
  ) {
    const payment = await this.findOne(schoolId, paymentId, user);

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
