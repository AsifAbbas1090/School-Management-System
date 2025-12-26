import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLeaveRequestDto } from '../dto/create-leave-request.dto';
import { LeaveQueryDto } from '../dto/leave-query.dto';
import { LeaveStatus, UserRole, Prisma } from '@prisma/client';

@Injectable()
export class LeaveService {
  constructor(private prisma: PrismaService) {}

  async create(schoolId: string, userId: string, userRole: UserRole, createLeaveRequestDto: CreateLeaveRequestDto) {
    // Validate dates
    const fromDate = new Date(createLeaveRequestDto.fromDate);
    const toDate = new Date(createLeaveRequestDto.toDate);

    if (fromDate > toDate) {
      throw new BadRequestException('fromDate cannot be after toDate');
    }

    // Allow today's date but not past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fromDateOnly = new Date(fromDate);
    fromDateOnly.setHours(0, 0, 0, 0);

    if (fromDateOnly < today) {
      throw new BadRequestException('fromDate cannot be in the past');
    }

    // Validate role-specific requirements
    if (userRole === UserRole.PARENT) {
      if (!createLeaveRequestDto.requestedForStudentId) {
        throw new BadRequestException('requestedForStudentId is required for PARENT role');
      }

      // Verify student belongs to parent
      const student = await this.prisma.student.findFirst({
        where: {
          id: createLeaveRequestDto.requestedForStudentId,
          schoolId,
          parentId: userId,
        },
      });

      if (!student) {
        throw new NotFoundException('Student not found or does not belong to you');
      }
    } else if (userRole === UserRole.TEACHER) {
      // Teacher requests for self, so requestedForStudentId should be null
      if (createLeaveRequestDto.requestedForStudentId) {
        throw new BadRequestException('Teachers can only request leave for themselves');
      }
    } else {
      throw new ForbiddenException('Only TEACHER and PARENT roles can create leave requests');
    }

    return this.prisma.leaveRequest.create({
      data: {
        schoolId,
        requestedByUserId: userId,
        requestedForStudentId: createLeaveRequestDto.requestedForStudentId || null,
        role: userRole,
        type: createLeaveRequestDto.type,
        fromDate,
        toDate,
        reason: createLeaveRequestDto.reason,
        status: LeaveStatus.PENDING,
      } as Prisma.LeaveRequestUncheckedCreateInput,
      include: {
        User_LeaveRequest_requestedByUserIdToUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        Student: {
          include: {
            Class: true,
            Section: true,
          },
        },
      },
    });
  }

  async findMyRequests(schoolId: string, userId: string, query: LeaveQueryDto) {
    const { status, type, page = 1, pageSize = 10 } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {
      schoolId,
      requestedByUserId: userId,
    };

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    const [requests, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          User_LeaveRequest_requestedByUserIdToUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          Student: {
            include: {
              Class: true,
              Section: true,
            },
          },
          User_LeaveRequest_decisionByUserIdToUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.leaveRequest.count({ where }),
    ]);

    return {
      data: requests,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findPendingRequests(schoolId: string, query: LeaveQueryDto) {
    const { studentId, type, page = 1, pageSize = 10 } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {
      schoolId,
      status: LeaveStatus.PENDING,
    };

    if (studentId) {
      where.requestedForStudentId = studentId;
    }

    if (type) {
      where.type = type;
    }

    const [requests, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'asc' },
        include: {
          User_LeaveRequest_requestedByUserIdToUser: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          Student: {
            include: {
              Class: true,
              Section: true,
            },
          },
        },
      }),
      this.prisma.leaveRequest.count({ where }),
    ]);

    return {
      data: requests,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findOne(schoolId: string, id: string, userId: string, userRole: UserRole) {
    const request = await this.prisma.leaveRequest.findFirst({
      where: {
        id,
        schoolId,
      },
      include: {
        User_LeaveRequest_requestedByUserIdToUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        Student: {
          include: {
            Class: true,
            Section: true,
          },
        },
        User_LeaveRequest_decisionByUserIdToUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException(`Leave request with ID ${id} not found`);
    }

    // Check access: requester can view their own, admin/management can view all
    if (
      request.requestedByUserId !== userId &&
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.MANAGEMENT &&
      userRole !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException('You do not have permission to view this leave request');
    }

    return request;
  }

  async approve(schoolId: string, id: string, userId: string) {
    const request = await this.prisma.leaveRequest.findFirst({
      where: {
        id,
        schoolId,
      },
    });

    if (!request) {
      throw new NotFoundException(`Leave request with ID ${id} not found`);
    }

    if (request.status !== LeaveStatus.PENDING) {
      throw new BadRequestException(`Cannot approve leave request with status ${request.status}`);
    }

    return this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: LeaveStatus.APPROVED,
        decisionByUserId: userId,
        decidedAt: new Date(),
      },
      include: {
        User_LeaveRequest_requestedByUserIdToUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        Student: {
          include: {
            Class: true,
            Section: true,
          },
        },
        User_LeaveRequest_decisionByUserIdToUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async reject(schoolId: string, id: string, userId: string) {
    const request = await this.prisma.leaveRequest.findFirst({
      where: {
        id,
        schoolId,
      },
    });

    if (!request) {
      throw new NotFoundException(`Leave request with ID ${id} not found`);
    }

    if (request.status !== LeaveStatus.PENDING) {
      throw new BadRequestException(`Cannot reject leave request with status ${request.status}`);
    }

    return this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: LeaveStatus.REJECTED,
        decisionByUserId: userId,
        decidedAt: new Date(),
      },
      include: {
        User_LeaveRequest_requestedByUserIdToUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        Student: {
          include: {
            Class: true,
            Section: true,
          },
        },
        User_LeaveRequest_decisionByUserIdToUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }
}

