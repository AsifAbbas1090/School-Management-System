import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStudentDto } from '../dto/create-student.dto';
import { UpdateStudentDto } from '../dto/update-student.dto';
import { AcademicQueryDto } from '../dto/query.dto';
import { UsersService } from '../../users/services/users.service';

@Injectable()
export class StudentsService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
  ) { }

  async create(schoolId: string, createStudentDto: CreateStudentDto) {
    // Verify class and section belong to school
    const classEntity = await this.prisma.class.findFirst({
      where: {
        id: createStudentDto.classId,
        schoolId,
        deletedAt: null,
      },
    });

    if (!classEntity) {
      throw new NotFoundException(`Class with ID ${createStudentDto.classId} not found`);
    }

    const section = await this.prisma.section.findFirst({
      where: {
        id: createStudentDto.sectionId,
        schoolId,
        classId: createStudentDto.classId,
        deletedAt: null,
      },
    });

    if (!section) {
      throw new NotFoundException(
        `Section with ID ${createStudentDto.sectionId} not found or does not belong to the class`
      );
    }

    // Check if roll number already exists in school
    const existingRoll = await this.prisma.student.findFirst({
      where: {
        schoolId,
        rollNumber: createStudentDto.rollNumber,
      },
    });

    if (existingRoll) {
      throw new BadRequestException(
        `Student with roll number ${createStudentDto.rollNumber} already exists`
      );
    }

    // Handle parent creation or verification
    let parentId = createStudentDto.parentId;

    // If parent details are provided, create parent user account
    if (createStudentDto.parentEmail && createStudentDto.parentPassword && createStudentDto.parentName) {
      if (createStudentDto.parentId) {
        throw new BadRequestException('Cannot provide both parentId and parent creation details');
      }

      // Create parent user account
      const parentUser = await this.usersService.createParent(schoolId, {
        email: createStudentDto.parentEmail,
        password: createStudentDto.parentPassword,
        name: createStudentDto.parentName,
        phone: createStudentDto.parentPhone,
      });

      parentId = parentUser.id;
    } else if (createStudentDto.parentId) {
      // Verify existing parent
      const parent = await this.prisma.user.findFirst({
        where: {
          id: createStudentDto.parentId,
          schoolId,
          role: 'PARENT',
          deletedAt: null,
        },
      });

      if (!parent) {
        throw new NotFoundException('Parent not found or invalid');
      }
    }

    // Check section capacity
    const currentStudents = await this.prisma.student.count({
      where: { sectionId: createStudentDto.sectionId },
    });

    if (currentStudents >= section.capacity) {
      throw new BadRequestException('Section has reached maximum capacity');
    }

    // Prepare student data
    const studentData: any = {
      classId: createStudentDto.classId,
      sectionId: createStudentDto.sectionId,
      rollNumber: createStudentDto.rollNumber,
      name: createStudentDto.name,
      gender: createStudentDto.gender,
      dateOfBirth: new Date(createStudentDto.dateOfBirth),
      status: createStudentDto.status || 'ACTIVE',
      address: createStudentDto.address,
      phone: createStudentDto.phone,
      email: createStudentDto.email,
      schoolId,
      admissionDate: createStudentDto.admissionDate
        ? new Date(createStudentDto.admissionDate)
        : new Date(),
    };

    if (parentId) {
      studentData.parentId = parentId;
    }

    const createdStudent = await this.prisma.student.create({
      data: {
        id: crypto.randomUUID(),
        ...studentData,
        updatedAt: new Date(),
      } as any,
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
      } as any,
    });

    // Return student with parent info properly linked
    // Handle User relation which may be null or have different types
    let parentInfo = null;
    if (createdStudent.User && !Array.isArray(createdStudent.User)) {
      const user = createdStudent.User as { id: string; name: string; email: string; phone: string };
      parentInfo = {
        id: user.id,
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      };
    }

    return {
      ...createdStudent,
      parentId: createdStudent.parentId || null,
      parent: parentInfo,
    };
  }

  async findAll(schoolId: string, query: AcademicQueryDto) {
    const { search, classId, sectionId, page = 1, pageSize = 10 } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {
      schoolId,
    };

    if (classId) {
      where.classId = classId;
    }

    if (sectionId) {
      where.sectionId = sectionId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { rollNumber: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [students, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ Class: { grade: 'asc' } }, { rollNumber: 'asc' }] as any,
        include: {
          Class: true,
          Section: true,
          User: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        } as any,
      }),
      this.prisma.student.count({ where }),
    ]);

    return {
      data: students,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findOne(schoolId: string, id: string) {
    const student = await this.prisma.student.findFirst({
      where: {
        id,
        schoolId,
      },
      include: {
        Class: true,
        Section: {
          include: {
            classTeacher: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      } as any,
    });

    if (!student) {
      throw new NotFoundException(`Student with ID ${id} not found`);
    }

    return student;
  }

  async update(schoolId: string, id: string, updateStudentDto: UpdateStudentDto) {
    const existing = await this.prisma.student.findFirst({
      where: {
        id,
        schoolId,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Student with ID ${id} not found`);
    }

    // Verify class and section if being updated
    if (updateStudentDto.classId || updateStudentDto.sectionId) {
      const classId = updateStudentDto.classId || existing.classId;
      const sectionId = updateStudentDto.sectionId || existing.sectionId;

      const section = await this.prisma.section.findFirst({
        where: {
          id: sectionId,
          schoolId,
          classId: classId,
          deletedAt: null,
        },
      });

      if (!section) {
        throw new NotFoundException('Section not found or does not belong to the class');
      }

      // Check section capacity if section is being changed
      if (updateStudentDto.sectionId && updateStudentDto.sectionId !== existing.sectionId) {
        const currentStudents = await this.prisma.student.count({
          where: { sectionId: updateStudentDto.sectionId },
        });

        if (currentStudents >= section.capacity) {
          throw new BadRequestException('Section has reached maximum capacity');
        }
      }
    }

    // Check for duplicate roll number if being updated
    if (updateStudentDto.rollNumber && updateStudentDto.rollNumber !== existing.rollNumber) {
      const duplicate = await this.prisma.student.findFirst({
        where: {
          schoolId,
          rollNumber: updateStudentDto.rollNumber,
          id: { not: id },
        },
      });

      if (duplicate) {
        throw new BadRequestException(
          `Student with roll number ${updateStudentDto.rollNumber} already exists`
        );
      }
    }

    // Handle parentId - can be string (to link) or null/undefined (to unlink)
    let parentIdValue: string | null = null;
    
    if (updateStudentDto.parentId !== undefined && updateStudentDto.parentId !== null) {
      // If it's a string, check if it's empty
      if (typeof updateStudentDto.parentId === 'string') {
        const trimmed = updateStudentDto.parentId.trim();
        if (trimmed !== '') {
          // Verify parent exists
          const parent = await this.prisma.user.findFirst({
            where: {
              id: trimmed,
              schoolId,
              role: 'PARENT',
              deletedAt: null,
            },
          });

          if (!parent) {
            throw new NotFoundException('Parent not found or invalid');
          }
          parentIdValue = trimmed;
        } else {
          parentIdValue = null; // Empty string means unlink
        }
      } else {
        parentIdValue = null; // Non-string means unlink
      }
    } else {
      parentIdValue = null; // null/undefined means unlink
    }

    const updateData: any = { ...updateStudentDto };
    updateData.parentId = parentIdValue;
    if (updateStudentDto.dateOfBirth) {
      updateData.dateOfBirth = new Date(updateStudentDto.dateOfBirth);
    }
    if (updateStudentDto.admissionDate) {
      updateData.admissionDate = new Date(updateStudentDto.admissionDate);
    }

    return this.prisma.student.update({
      where: { id },
      data: updateData,
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
      } as any,
    });
  }

  async remove(schoolId: string, id: string) {
    const student = await this.prisma.student.findFirst({
      where: {
        id,
        schoolId,
      },
    });

    if (!student) {
      throw new NotFoundException(`Student with ID ${id} not found`);
    }

    await this.prisma.student.delete({
      where: { id },
    });

    return { message: 'Student deleted successfully' };
  }

  async bulkImport(schoolId: string, students: CreateStudentDto[]) {
    const results = {
      total: students.length,
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (let i = 0; i < students.length; i++) {
      try {
        await this.create(schoolId, students[i]);
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Row ${i + 1}: ${error.message || 'Unknown error'}`);
      }
    }

    return results;
  }

  /**
   * Calculate fee dues from admission date to current month
   * Returns the number of months and total amount due
   */
  async calculateFeeDues(schoolId: string, studentId: string) {
    const student = await this.prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId,
      },
      include: {
        FeeInvoice: {
          where: {
            status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
          },
        },
      } as any,
    });

    if (!student) {
      throw new NotFoundException(`Student with ID ${studentId} not found`);
    }

    const admissionDate = student.admissionDate;
    const now = new Date();

    // Calculate months from admission date to current month
    const admissionYear = admissionDate.getFullYear();
    const admissionMonth = admissionDate.getMonth();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const totalMonths = (currentYear - admissionYear) * 12 + (currentMonth - admissionMonth) + 1;

    // Get monthly fee structure for the student's class
    const monthlyFeeStructure = await this.prisma.feeStructure.findFirst({
      where: {
        schoolId,
        classId: student.classId,
        frequency: 'MONTHLY',
      },
    });

    if (!monthlyFeeStructure) {
      return {
        monthsDue: totalMonths,
        totalAmount: 0,
        monthlyAmount: 0,
        message: 'No monthly fee structure found for this class',
      };
    }

    const monthlyAmount = monthlyFeeStructure.amount;
    const totalAmount = monthlyAmount * totalMonths;

    // Calculate already paid amount
    const paidInvoices = await this.prisma.feeInvoice.findMany({
      where: {
        studentId,
        status: 'PAID',
      },
      include: {
        FeePayment: true,
      } as any,
    });

    let paidAmount = 0;
    paidInvoices.forEach((invoice: any) => {
      invoice.FeePayment?.forEach((payment: any) => {
        paidAmount += payment.amountPaid;
      });
    });

    const dueAmount = totalAmount - paidAmount;

    return {
      monthsDue: totalMonths,
      monthlyAmount,
      totalAmount,
      paidAmount,
      dueAmount,
      admissionDate,
      currentDate: now,
    };
  }
}

