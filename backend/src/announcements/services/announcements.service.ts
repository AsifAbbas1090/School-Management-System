import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAnnouncementDto } from '../dto/create-announcement.dto';
import { UpdateAnnouncementDto } from '../dto/update-announcement.dto';
import { AnnouncementQueryDto } from '../dto/announcement-query.dto';
import { UserRole, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class AnnouncementsService {
  constructor(private prisma: PrismaService) {}

  async create(schoolId: string, userId: string, createAnnouncementDto: CreateAnnouncementDto) {
    const publishDate = new Date(createAnnouncementDto.publishDate);
    const expiryDate = createAnnouncementDto.expiryDate ? new Date(createAnnouncementDto.expiryDate) : null;

    if (expiryDate && expiryDate < publishDate) {
      throw new BadRequestException('expiryDate cannot be before publishDate');
    }

    // Verify classes belong to school
    if (createAnnouncementDto.targetClassIds && createAnnouncementDto.targetClassIds.length > 0) {
      const classes = await this.prisma.class.findMany({
        where: {
          id: { in: createAnnouncementDto.targetClassIds },
          schoolId,
          deletedAt: null,
        },
      });

      if (classes.length !== createAnnouncementDto.targetClassIds.length) {
        throw new BadRequestException('One or more classes not found');
      }
    }

    const now = new Date();
    const announcement = await this.prisma.announcement.create({
      data: {
        id: randomUUID(),
        schoolId,
        title: createAnnouncementDto.title,
        content: createAnnouncementDto.content,
        publishDate,
        expiryDate,
        isPinned: createAnnouncementDto.isPinned || false,
        createdById: userId,
        updatedAt: now,
        AnnouncementRole: {
          create: createAnnouncementDto.targetRoles.map((role) => ({
            id: randomUUID(),
            role,
          })),
        },
        AnnouncementClass: createAnnouncementDto.targetClassIds && createAnnouncementDto.targetClassIds.length > 0
          ? {
              create: createAnnouncementDto.targetClassIds.map((classId) => ({
                id: randomUUID(),
                classId,
              })),
            }
          : undefined,
      } as Prisma.AnnouncementUncheckedCreateInput,
      include: {
        AnnouncementRole: true,
        AnnouncementClass: {
          include: {
            Class: true,
          },
        },
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return announcement;
  }

  async findAll(schoolId: string, userRole: string, userClassId: string | null, query: AnnouncementQueryDto) {
    const { search, role, classId, isPinned, page = 1, pageSize = 10 } = query;
    const skip = (page - 1) * pageSize;
    const now = new Date();

    const where: any = {
      schoolId,
      publishDate: { lte: now },
      OR: [
        { expiryDate: null },
        { expiryDate: { gte: now } },
      ],
    };

    // Filter by user's role and class
    where.OR = [
      {
        AnnouncementRole: {
          some: {
            role: userRole as UserRole,
          },
        },
      },
    ];

    if (userClassId) {
      where.OR.push({
        AnnouncementClass: {
          some: {
            classId: userClassId,
          },
        },
      });
    }

    if (search) {
      where.AND = [
        {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { content: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    if (isPinned !== undefined) {
      where.isPinned = isPinned;
    }

    const [announcements, total] = await Promise.all([
      this.prisma.announcement.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ isPinned: 'desc' }, { publishDate: 'desc' }],
        include: {
          AnnouncementRole: true,
          AnnouncementClass: {
            include: {
              Class: true,
            },
          },
          User: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.announcement.count({ where }),
    ]);

    return {
      data: announcements,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findOne(schoolId: string, id: string) {
    const announcement = await this.prisma.announcement.findFirst({
      where: {
        id,
        schoolId,
      },
      include: {
        AnnouncementRole: true,
        AnnouncementClass: {
          include: {
            Class: true,
          },
        },
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!announcement) {
      throw new NotFoundException(`Announcement with ID ${id} not found`);
    }

    return announcement;
  }

  async update(schoolId: string, id: string, updateAnnouncementDto: UpdateAnnouncementDto) {
    const existing = await this.prisma.announcement.findFirst({
      where: {
        id,
        schoolId,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Announcement with ID ${id} not found`);
    }

    const updateData: any = {};

    if (updateAnnouncementDto.title) updateData.title = updateAnnouncementDto.title;
    if (updateAnnouncementDto.content) updateData.content = updateAnnouncementDto.content;
    if (updateAnnouncementDto.publishDate) updateData.publishDate = new Date(updateAnnouncementDto.publishDate);
    if (updateAnnouncementDto.expiryDate !== undefined) {
      updateData.expiryDate = updateAnnouncementDto.expiryDate ? new Date(updateAnnouncementDto.expiryDate) : null;
    }
    if (updateAnnouncementDto.isPinned !== undefined) updateData.isPinned = updateAnnouncementDto.isPinned;

    // Update target roles
    if (updateAnnouncementDto.targetRoles) {
      await this.prisma.announcementRole.deleteMany({
        where: { announcementId: id },
      });
      updateData.AnnouncementRole = {
        create: updateAnnouncementDto.targetRoles.map((role) => ({
          id: randomUUID(),
          role,
        })),
      };
    }

    // Update target classes
    if (updateAnnouncementDto.targetClassIds !== undefined) {
      await this.prisma.announcementClass.deleteMany({
        where: { announcementId: id },
      });
      if (updateAnnouncementDto.targetClassIds && updateAnnouncementDto.targetClassIds.length > 0) {
        const classes = await this.prisma.class.findMany({
          where: {
            id: { in: updateAnnouncementDto.targetClassIds },
            schoolId,
            deletedAt: null,
          },
        });

        if (classes.length !== updateAnnouncementDto.targetClassIds.length) {
          throw new BadRequestException('One or more classes not found');
        }

        updateData.AnnouncementClass = {
          create: updateAnnouncementDto.targetClassIds.map((classId) => ({ classId })),
        };
      }
    }

    return this.prisma.announcement.update({
      where: { id },
      data: updateData,
      include: {
        AnnouncementRole: true,
        AnnouncementClass: {
          include: {
            Class: true,
          },
        },
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
    const announcement = await this.prisma.announcement.findFirst({
      where: {
        id,
        schoolId,
      },
    });

    if (!announcement) {
      throw new NotFoundException(`Announcement with ID ${id} not found`);
    }

    await this.prisma.announcement.delete({
      where: { id },
    });

    return { message: 'Announcement deleted successfully' };
  }
}


