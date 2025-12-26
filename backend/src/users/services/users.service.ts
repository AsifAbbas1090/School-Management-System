import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, UserStatus, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export interface CreateUserDto {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  schoolId?: string;
  phone?: string;
  status?: UserStatus;
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
        status: data.status || UserStatus.ACTIVE,
        updatedAt: new Date(),
      } as Prisma.UserUncheckedCreateInput,
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
    });
  }

  /**
   * Create a teacher user account
   */
  async createTeacher(
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
      role: UserRole.TEACHER,
      schoolId,
      phone: data.phone,
    });
  }

  /**
   * Update a user account
   */
  async updateUser(
    userId: string,
    schoolId: string,
    data: {
      name?: string;
      email?: string;
      phone?: string;
      password?: string;
      status?: UserStatus;
    },
  ) {
    // Verify user belongs to school
    const existingUser = await this.prisma.user.findFirst({
      where: {
        id: userId,
        schoolId,
        deletedAt: null,
      },
    });

    if (!existingUser) {
      throw new BadRequestException('User not found');
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
        schoolId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
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
   * Get users by role
   */
  async getUsersByRole(schoolId: string, role: UserRole) {
    return this.prisma.user.findMany({
      where: {
        schoolId,
        role,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        phone: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}

