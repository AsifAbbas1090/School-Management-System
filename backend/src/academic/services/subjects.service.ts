import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSubjectDto } from '../dto/create-subject.dto';
import { UpdateSubjectDto } from '../dto/update-subject.dto';
import { AcademicQueryDto } from '../dto/query.dto';

@Injectable()
export class SubjectsService {
  constructor(private prisma: PrismaService) {}

  async create(schoolId: string, createSubjectDto: CreateSubjectDto) {
    // Check if subject with same code already exists
    const existing = await this.prisma.subject.findFirst({
      where: {
        schoolId,
        code: createSubjectDto.code,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new BadRequestException(`Subject with code ${createSubjectDto.code} already exists`);
    }

    const { classIds, ...subjectData } = createSubjectDto;

    const subject = await this.prisma.subject.create({
      data: {
        ...subjectData,
        schoolId,
      } as any,
    });

    // Link subject to classes if provided
    if (classIds && classIds.length > 0) {
      // Verify all classes belong to school
      const classes = await this.prisma.class.findMany({
        where: {
          id: { in: classIds },
          schoolId,
          deletedAt: null,
        },
      });

      if (classes.length !== classIds.length) {
        throw new BadRequestException('One or more classes not found');
      }

      // Create subject-class relationships
      await this.prisma.subjectClass.createMany({
        data: classIds.map((classId) => ({
          id: require('crypto').randomUUID(),
          subjectId: subject.id,
          classId,
        })) as any,
        skipDuplicates: true,
      });
    }

    return this.findOne(schoolId, subject.id);
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
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [subjects, total] = await Promise.all([
      this.prisma.subject.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { code: 'asc' },
        include: {
          _count: {
            select: {
              SubjectClass: true,
            },
          },
        },
      }),
      this.prisma.subject.count({ where }),
    ]);

    return {
      data: subjects,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findOne(schoolId: string, id: string) {
    const subject = await this.prisma.subject.findFirst({
      where: {
        id,
        schoolId,
        deletedAt: null,
      },
      include: {
        SubjectClass: {
          include: {
            Class: true,
          },
        },
        _count: {
          select: {
            SubjectClass: true,
          },
        },
      },
    });

    if (!subject) {
      throw new NotFoundException(`Subject with ID ${id} not found`);
    }

    return subject;
  }

  async update(schoolId: string, id: string, updateSubjectDto: UpdateSubjectDto) {
    const existing = await this.prisma.subject.findFirst({
      where: {
        id,
        schoolId,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Subject with ID ${id} not found`);
    }

    // Check for duplicate code if code is being updated
    if (updateSubjectDto.code && updateSubjectDto.code !== existing.code) {
      const duplicate = await this.prisma.subject.findFirst({
        where: {
          schoolId,
          code: updateSubjectDto.code,
          id: { not: id },
          deletedAt: null,
        },
      });

      if (duplicate) {
        throw new BadRequestException(`Subject with code ${updateSubjectDto.code} already exists`);
      }
    }

    const { classIds, ...subjectData } = updateSubjectDto;

    // Update subject
    const subject = await this.prisma.subject.update({
      where: { id },
      data: subjectData,
    });

    // Update class relationships if provided
    if (classIds !== undefined) {
      // Remove existing relationships
      await this.prisma.subjectClass.deleteMany({
        where: { subjectId: id },
      });

      // Create new relationships
      if (classIds.length > 0) {
        const classes = await this.prisma.class.findMany({
          where: {
            id: { in: classIds },
            schoolId,
            deletedAt: null,
          },
        });

        if (classes.length !== classIds.length) {
          throw new BadRequestException('One or more classes not found');
        }

        await this.prisma.subjectClass.createMany({
          data: classIds.map((classId) => ({
            id: require('crypto').randomUUID(),
            subjectId: id,
            classId,
          })) as any,
        });
      }
    }

    return this.findOne(schoolId, id);
  }

  async remove(schoolId: string, id: string) {
    const subject = await this.prisma.subject.findFirst({
      where: {
        id,
        schoolId,
        deletedAt: null,
      },
    });

    if (!subject) {
      throw new NotFoundException(`Subject with ID ${id} not found`);
    }

    // Soft delete
    await this.prisma.subject.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    return { message: 'Subject deleted successfully' };
  }
}


