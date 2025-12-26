import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClassDto } from '../dto/create-class.dto';
import { UpdateClassDto } from '../dto/update-class.dto';
import { AcademicQueryDto } from '../dto/query.dto';

@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService) { }

  async create(schoolId: string, createClassDto: CreateClassDto) {
    // Ensure grade is a string
    const grade = String(createClassDto.grade);

    // Check if class with same grade already exists
    const existing = await this.prisma.class.findFirst({
      where: {
        schoolId,
        grade,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new BadRequestException(`Class with grade ${grade} already exists`);
    }

    return this.prisma.class.create({
      data: {
        id: crypto.randomUUID(),
        ...createClassDto,
        grade,
        schoolId,
        updatedAt: new Date(),
      } as any,
    });
  }

  async findAll(schoolId: string, query: AcademicQueryDto) {
    const { search, page = 1, pageSize = 10 } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {
      schoolId,
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { grade: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [classes, total] = await Promise.all([
      this.prisma.class.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { grade: 'asc' },
        include: {
          _count: {
            select: {
              Section: true,
              Student: true,
            },
          },
        },
      }),
      this.prisma.class.count({ where }),
    ]);

    return {
      data: classes,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findOne(schoolId: string, id: string) {
    const classEntity = await this.prisma.class.findFirst({
      where: {
        id,
        schoolId,
        deletedAt: null,
      },
      include: {
        Section: {
          include: {
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
        },
        SubjectClass: {
          include: {
            Subject: true,
          },
        },
        _count: {
          select: {
            Student: true,
            Section: true,
          },
        },
      },
    });

    if (!classEntity) {
      throw new NotFoundException(`Class with ID ${id} not found`);
    }

    return classEntity;
  }

  async update(schoolId: string, id: string, updateClassDto: UpdateClassDto) {
    const existing = await this.prisma.class.findFirst({
      where: {
        id,
        schoolId,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Class with ID ${id} not found`);
    }

    // Check for duplicate grade if grade is being updated
    if (updateClassDto.grade && updateClassDto.grade !== existing.grade) {
      const duplicate = await this.prisma.class.findFirst({
        where: {
          schoolId,
          grade: updateClassDto.grade,
          id: { not: id },
          deletedAt: null,
        },
      });

      if (duplicate) {
        throw new BadRequestException(`Class with grade ${updateClassDto.grade} already exists`);
      }
    }

    return this.prisma.class.update({
      where: { id },
      data: updateClassDto,
    });
  }

  async remove(schoolId: string, id: string) {
    const classEntity = await this.prisma.class.findFirst({
      where: {
        id,
        schoolId,
        deletedAt: null,
      },
    });

    if (!classEntity) {
      throw new NotFoundException(`Class with ID ${id} not found`);
    }

    // Soft delete
    await this.prisma.class.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    return { message: 'Class deleted successfully' };
  }
}


