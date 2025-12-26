import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { SchoolQueryDto } from './dto/school-query.dto';
import { SubscriptionService } from './services/subscription.service';
import { SubscriptionStatus, UserRole } from '@prisma/client';
import { UsersService } from '../users/services/users.service';

@Injectable()
export class SchoolsService {
  constructor(
    private prisma: PrismaService,
    private subscriptionService: SubscriptionService,
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
  ) { }

  /**
   * Generate slug from school name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Ensure slug is unique
   */
  private async ensureUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.prisma.school.findUnique({
        where: { slug },
      });

      if (!existing || existing.id === excludeId) {
        break;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  /**
   * Create a new school
   */
  async create(createSchoolDto: CreateSchoolDto) {
    const slug = await this.ensureUniqueSlug(this.generateSlug(createSchoolDto.name));

    // Set default subscription dates if not provided
    const subscriptionStartDate = createSchoolDto.subscriptionStartDate
      ? new Date(createSchoolDto.subscriptionStartDate)
      : new Date();
    const nextBillingDate = new Date(subscriptionStartDate);
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

    const subscriptionStatus = this.subscriptionService.calculateSubscriptionStatus(
      nextBillingDate
    );

    // Extract admin credentials if provided (they're not part of school data)
    const { adminEmail, adminPassword, subscriptionStartDate: _, ...schoolData } = createSchoolDto;

    const school = await this.prisma.school.create({
      data: {
        ...schoolData,
        id: crypto.randomUUID(),
        slug,
        subscriptionStartDate,
        nextBillingDate,
        subscriptionStatus,
        updatedAt: new Date(),
      } as any,
    });

    // Create admin user if credentials provided
    if (adminEmail && adminPassword) {
      await this.usersService.createUser({
        email: adminEmail,
        password: adminPassword,
        name: `Admin - ${school.name}`,
        role: UserRole.ADMIN,
        schoolId: school.id,
      });
    }

    return school;
  }

  /**
   * Find all schools with filters and pagination
   */
  async findAll(query: SchoolQueryDto) {
    const { search, subscriptionStatus, page = 1, pageSize = 10 } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (subscriptionStatus) {
      where.subscriptionStatus = subscriptionStatus;
    }

    const [schools, total] = await Promise.all([
      this.prisma.school.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.school.count({ where }),
    ]);

    // Update subscription statuses for all schools
    await Promise.all(
      schools.map((school) =>
        this.subscriptionService.updateSubscriptionStatus(school.id)
      )
    );

    // Re-fetch to get updated statuses
    const updatedSchools = await this.prisma.school.findMany({
      where: {
        id: { in: schools.map((s) => s.id) },
      },
    });

    return {
      data: updatedSchools,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Find one school by ID
   */
  async findOne(id: string) {
    const school = await this.prisma.school.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            User: true,
            Campus: true,
            Expense: true,
          },
        },
      },
    });

    if (!school) {
      throw new NotFoundException(`School with ID ${id} not found`);
    }

    // Update subscription status
    await this.subscriptionService.updateSubscriptionStatus(school.id);

    // Re-fetch to get updated status
    const updatedSchool = await this.prisma.school.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            User: true,
            Campus: true,
            Expense: true,
          },
        },
      },
    });

    return updatedSchool;
  }

  /**
   * Find school by slug
   */
  async findBySlug(slug: string) {
    const school = await this.prisma.school.findFirst({
      where: {
        slug,
        deletedAt: null,
      },
    });

    if (!school) {
      throw new NotFoundException(`School with slug ${slug} not found`);
    }

    return school;
  }

  /**
   * Update a school
   */
  async update(id: string, updateSchoolDto: UpdateSchoolDto) {
    const existingSchool = await this.prisma.school.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!existingSchool) {
      throw new NotFoundException(`School with ID ${id} not found`);
    }

    // If name is being updated, regenerate slug
    let slug = existingSchool.slug;
    if (updateSchoolDto.name && updateSchoolDto.name !== existingSchool.name) {
      slug = await this.ensureUniqueSlug(
        this.generateSlug(updateSchoolDto.name),
        id
      );
    }

    // Calculate subscription status if dates are updated
    let subscriptionStatus = updateSchoolDto.subscriptionStatus;
    if (updateSchoolDto.nextBillingDate) {
      subscriptionStatus = this.subscriptionService.calculateSubscriptionStatus(
        updateSchoolDto.nextBillingDate
      );
    }

    const school = await this.prisma.school.update({
      where: { id },
      data: {
        ...updateSchoolDto,
        slug,
        subscriptionStatus,
      },
    });

    return school;
  }

  /**
   * Soft delete a school
   */
  async remove(id: string) {
    const school = await this.prisma.school.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!school) {
      throw new NotFoundException(`School with ID ${id} not found`);
    }

    await this.prisma.school.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    return { message: 'School deleted successfully' };
  }
}


