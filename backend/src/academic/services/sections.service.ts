import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSectionDto } from '../dto/create-section.dto';
import { UpdateSectionDto } from '../dto/update-section.dto';
import { AcademicQueryDto } from '../dto/query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class SectionsService {
  constructor(private prisma: PrismaService) { }

  async create(schoolId: string, createSectionDto: CreateSectionDto) {
    // Verify class belongs to school
    const classEntity = await this.prisma.class.findFirst({
      where: {
        id: createSectionDto.classId,
        schoolId,
        deletedAt: null,
      },
    });

    if (!classEntity) {
      throw new NotFoundException(`Class with ID ${createSectionDto.classId} not found`);
    }

    // Check if section with same name already exists in this class
    const existing = await this.prisma.section.findFirst({
      where: {
        schoolId,
        classId: createSectionDto.classId,
        name: createSectionDto.name,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Section ${createSectionDto.name} already exists in this class`
      );
    }

    // Verify class teacher if provided
    if (createSectionDto.classTeacherId) {
      const teacher = await this.prisma.user.findFirst({
        where: {
          id: createSectionDto.classTeacherId,
          schoolId,
          role: { in: ['TEACHER', 'ADMIN', 'MANAGEMENT'] },
          deletedAt: null,
        },
      });

      if (!teacher) {
        throw new NotFoundException('Class teacher not found or invalid');
      }
    }

    return this.prisma.section.create({
      data: {
        id: crypto.randomUUID(),
        name: createSectionDto.name,
        classId: createSectionDto.classId,
        capacity: createSectionDto.capacity || 30,
        classTeacherId: createSectionDto.classTeacherId || null,
        schoolId,
        updatedAt: new Date(),
      } as Prisma.SectionUncheckedCreateInput,
      include: {
        Class: true,
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

  async findAll(schoolId: string, query: AcademicQueryDto) {
    const { search, classId, page = 1, pageSize = 10 } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {
      schoolId,
      deletedAt: null,
    };

    if (classId) {
      where.classId = classId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { Class: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [sections, total] = await Promise.all([
      this.prisma.section.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ Class: { grade: 'asc' } }, { name: 'asc' }],
        include: {
          Class: true,
          User: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              Student: true,
            },
          },
        },
      }),
      this.prisma.section.count({ where }),
    ]);

    return {
      data: sections,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findOne(schoolId: string, id: string) {
    const section = await this.prisma.section.findFirst({
      where: {
        id,
        schoolId,
        deletedAt: null,
      },
      include: {
        Class: true,
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            Student: true,
          },
        },
      },
    });

    if (!section) {
      throw new NotFoundException(`Section with ID ${id} not found`);
    }

    return section;
  }

  async update(schoolId: string, id: string, updateSectionDto: UpdateSectionDto) {
    const existing = await this.prisma.section.findFirst({
      where: {
        id,
        schoolId,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Section with ID ${id} not found`);
    }

    // Verify class if being updated
    if (updateSectionDto.classId) {
      const classEntity = await this.prisma.class.findFirst({
        where: {
          id: updateSectionDto.classId,
          schoolId,
          deletedAt: null,
        },
      });

      if (!classEntity) {
        throw new NotFoundException(`Class with ID ${updateSectionDto.classId} not found`);
      }
    }

    // Check for duplicate name if name is being updated
    if (updateSectionDto.name && updateSectionDto.name !== existing.name) {
      const duplicate = await this.prisma.section.findFirst({
        where: {
          schoolId,
          classId: updateSectionDto.classId || existing.classId,
          name: updateSectionDto.name,
          id: { not: id },
          deletedAt: null,
        },
      });

      if (duplicate) {
        throw new BadRequestException(
          `Section ${updateSectionDto.name} already exists in this class`
        );
      }
    }

    // Verify class teacher if provided
    if (updateSectionDto.classTeacherId) {
      const teacher = await this.prisma.user.findFirst({
        where: {
          id: updateSectionDto.classTeacherId,
          schoolId,
          role: { in: ['TEACHER', 'ADMIN', 'MANAGEMENT'] },
          deletedAt: null,
        },
      });

      if (!teacher) {
        throw new NotFoundException('Class teacher not found or invalid');
      }
    }

    return this.prisma.section.update({
      where: { id },
      data: updateSectionDto,
      include: {
        Class: true,
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
    const section = await this.prisma.section.findFirst({
      where: {
        id,
        schoolId,
        deletedAt: null,
      },
    });

    if (!section) {
      throw new NotFoundException(`Section with ID ${id} not found`);
    }

    // Check if section has students
    const studentCount = await this.prisma.student.count({
      where: { sectionId: id },
    });

    if (studentCount > 0) {
      throw new BadRequestException(
        `Cannot delete section with ${studentCount} students. Please transfer students first.`
      );
    }

    // Soft delete
    await this.prisma.section.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    return { message: 'Section deleted successfully' };
  }
}


