import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, UserStatus, Prisma, Gender } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CreateTeacherDto, UpdateUserDto } from '../dto/create-user.dto';

export interface CreateUserDto {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  schoolId?: string;
  phone?: string;
  status?: UserStatus;
  employeeId?: string;
  salary?: number;
  gender?: Gender;
  dateOfBirth?: string | Date;
  address?: string;
  joiningDate?: string | Date;
  subjectIds?: string[];
  occupation?: string;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  /**
   * Create a new user account (teacher, parent, management, etc.)
   */
  async createUser(data: CreateUserDto) {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictException(`User with email ${data.email} already exists`);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const salaryNum =
      data.salary === undefined || data.salary === null
        ? null
        : typeof data.salary === 'string'
          ? parseFloat(data.salary)
          : Number(data.salary);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: data.role,
        schoolId: data.schoolId || null,
        phone: data.phone || null,
        occupation: data.occupation ?? null,
        status: data.status || UserStatus.ACTIVE,
        employeeId: data.employeeId || null,
        salary: salaryNum !== null && !Number.isNaN(salaryNum) ? salaryNum : null,
        gender: data.gender ?? null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        address: data.address ?? null,
        joiningDate: data.joiningDate ? new Date(data.joiningDate) : null,
        subjectIds: Array.isArray(data.subjectIds) ? data.subjectIds : [],
        updatedAt: new Date(),
      } as Prisma.UserUncheckedCreateInput,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        phone: true,
        occupation: true,
        employeeId: true,
        salary: true,
        gender: true,
        dateOfBirth: true,
        address: true,
        joiningDate: true,
        subjectIds: true,
        schoolId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  /**
   * Create a parent user account
   */
  async createParent(
    schoolId: string,
    data: {
      email: string;
      password: string;
      name: string;
      phone?: string;
      occupation?: string;
    },
  ) {
    return this.createUser({
      email: data.email,
      password: data.password,
      name: data.name,
      role: UserRole.PARENT,
      schoolId,
      phone: data.phone,
      occupation: data.occupation,
    });
  }

  /**
   * Create a teacher user account
   */
  async createTeacher(schoolId: string, data: CreateTeacherDto) {
    return this.createUser({
      email: data.email,
      password: data.password,
      name: data.name,
      role: UserRole.TEACHER,
      schoolId,
      phone: data.phone,
      employeeId: data.employeeId,
      salary: data.salary,
      gender: data.gender,
      dateOfBirth: data.dateOfBirth,
      address: data.address,
      joiningDate: data.joiningDate,
      subjectIds: data.subjectIds,
    });
  }

  /**
   * Update a user account
   */
  async updateUser(userId: string, schoolId: string, data: UpdateUserDto) {
    // Verify user belongs to school
    const existingUser = await this.prisma.user.findFirst({
      where: {
        id: userId,
        schoolId,
        deletedAt: null,
      },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // If email is being updated, check for conflicts
    if (data.email && data.email !== existingUser.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: data.email },
      });
      if (emailExists) {
        throw new ConflictException(`User with email ${data.email} already exists`);
      }
    }

    // Hash password if provided
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.employeeId !== undefined) updateData.employeeId = data.employeeId;
    if (data.salary !== undefined) {
      if (data.salary === null) {
        updateData.salary = null;
      } else {
        const raw = data.salary as number | string;
        const n = typeof raw === 'string' ? parseFloat(raw) : Number(raw);
        updateData.salary = Number.isNaN(n) ? null : n;
      }
    }
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.dateOfBirth !== undefined) {
      updateData.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
    }
    if (data.address !== undefined) updateData.address = data.address;
    if (data.joiningDate !== undefined) {
      updateData.joiningDate = data.joiningDate ? new Date(data.joiningDate) : null;
    }
    if (data.subjectIds !== undefined) updateData.subjectIds = data.subjectIds;
    if (data.occupation !== undefined) updateData.occupation = data.occupation;
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }
    updateData.updatedAt = new Date();

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        phone: true,
        occupation: true,
        employeeId: true,
        salary: true,
        gender: true,
        dateOfBirth: true,
        address: true,
        joiningDate: true,
        subjectIds: true,
        schoolId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async deleteUser(userId: string, schoolId: string) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        id: userId,
        schoolId,
        deletedAt: null,
      },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return { message: 'User deleted successfully' };
  }

  /**
   * Create a management user account (only by admin)
   */
  async createManagement(
    schoolId: string,
    data: {
      email: string;
      password: string;
      name: string;
      phone?: string;
    },
  ) {
    return this.createUser({
      email: data.email,
      password: data.password,
      name: data.name,
      role: UserRole.MANAGEMENT,
      schoolId,
      phone: data.phone,
    });
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Find user by ID
   */
  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        phone: true,
        schoolId: true,
        createdAt: true,
      },
    });
  }

  /**
   * Get users by role - optimized query.
   * When `opts` is passed with page/pageSize, returns `{ data, meta }` (paginated).
   */
  async getUsersByRole(
    schoolId: string,
    role: UserRole,
    opts?: {
      page?: number;
      pageSize?: number;
      search?: string;
      status?: string;
    },
  ) {
    const selectBase = {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      phone: true,
      occupation: true,
      employeeId: true,
      salary: true,
      gender: true,
      dateOfBirth: true,
      address: true,
      joiningDate: true,
      subjectIds: true,
      schoolId: true,
      createdAt: true,
      updatedAt: true,
    };

    const select: Prisma.UserSelect =
      role === UserRole.PARENT
        ? {
            ...selectBase,
            Student: {
              select: {
                id: true,
                name: true,
                rollNumber: true,
                Class: { select: { name: true } },
                Section: { select: { name: true } },
              },
            },
          }
        : selectBase;

    const where: Prisma.UserWhereInput = {
      schoolId,
      role,
      deletedAt: null,
    };

    if (opts?.search?.trim()) {
      const q = opts.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (opts?.status?.trim()) {
      const s = opts.status.trim().toUpperCase();
      if (s === 'ACTIVE' || s === 'INACTIVE') {
        where.status = s as UserStatus;
      }
    }

    if (opts && (opts.page !== undefined || opts.pageSize !== undefined)) {
      const page = Math.max(1, opts.page ?? 1);
      const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 25));
      const skip = (page - 1) * pageSize;

      const orderBy =
        role === UserRole.PARENT ? ({ name: 'asc' } as const) : ({ createdAt: 'desc' } as const);

      const [data, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          select,
          orderBy,
          skip,
          take: pageSize,
        }),
        this.prisma.user.count({ where }),
      ]);

      return {
        data,
        meta: {
          total,
          page,
          pageSize,
          limit: pageSize,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
        },
      };
    }

    const orderByLoose =
      role === UserRole.PARENT ? ({ name: 'asc' } as const) : ({ createdAt: 'desc' } as const);

    return this.prisma.user.findMany({
      where,
      select,
      orderBy: orderByLoose,
      take: 1000,
    });
  }

  async countUsersByRole(schoolId: string, role: UserRole) {
    const total = await this.prisma.user.count({
      where: { schoolId, role, deletedAt: null },
    });
    return { total };
  }
}

