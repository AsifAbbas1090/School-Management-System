import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSubjectDto } from '../dto/create-subject.dto';
import { UpdateSubjectDto } from '../dto/update-subject.dto';
import { AcademicQueryDto } from '../dto/query.dto';

@Injectable()
export class SubjectsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Idempotent bulk insert used by the timetable page's "Import standard
   * subjects" action. Existing codes (case-insensitive) are skipped so the
   * user can click the button twice without creating duplicates.
   */
  async bulkCreate(schoolId: string, items: Array<{ name: string; code: string; description?: string }>) {
    if (!Array.isArray(items) || items.length === 0) {
      return { created: 0, skipped: 0, subjects: [] as any[] };
    }

    const uniqueByCode = new Map<string, { name: string; code: string; description?: string }>();
    for (const item of items) {
      if (!item?.name || !item?.code) continue;
      const key = item.code.trim().toUpperCase();
      if (!uniqueByCode.has(key)) {
        uniqueByCode.set(key, {
          name: item.name.trim(),
          code: item.code.trim().toUpperCase(),
          description: item.description?.trim(),
        });
      }
    }

    const incomingCodes = Array.from(uniqueByCode.keys());
    const existing = await this.prisma.subject.findMany({
      where: {
        schoolId,
        deletedAt: null,
        code: { in: incomingCodes },
      },
      select: { code: true },
    });
    const existingCodes = new Set(existing.map((s) => s.code.toUpperCase()));

    const toCreate = Array.from(uniqueByCode.values()).filter(
      (item) => !existingCodes.has(item.code),
    );

    if (toCreate.length === 0) {
      return { created: 0, skipped: uniqueByCode.size, subjects: [] as any[] };
    }

    const now = new Date();
    await this.prisma.subject.createMany({
      data: toCreate.map((item) => ({
        id: randomUUID(),
        schoolId,
        name: item.name,
        code: item.code,
        description: item.description || null,
        updatedAt: now,
      })) as any,
      skipDuplicates: true,
    });

    const subjects = await this.prisma.subject.findMany({
      where: { schoolId, deletedAt: null, code: { in: toCreate.map((i) => i.code) } },
      select: { id: true, name: true, code: true, description: true },
    });

    return {
      created: toCreate.length,
      skipped: uniqueByCode.size - toCreate.length,
      subjects,
    };
  }

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
          SubjectClass: { select: { classId: true } },
          _count: { select: { SubjectClass: true } },
        },
      }),
      this.prisma.subject.count({ where }),
    ]);

    /** Flatten `SubjectClass[]` into a compact `classIds` array so the UI
     *  can filter subjects by selected class without a second round-trip. */
    const data = subjects.map((s) => ({
      ...s,
      classIds: (s.SubjectClass || []).map((sc) => sc.classId),
    }));

    return {
      data,
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


