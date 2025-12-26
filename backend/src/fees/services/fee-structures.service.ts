import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFeeStructureDto } from '../dto/create-fee-structure.dto';
import { UpdateFeeStructureDto } from '../dto/update-fee-structure.dto';
import { FeeQueryDto } from '../dto/fee-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class FeeStructuresService {
  constructor(private prisma: PrismaService) {}

  async create(schoolId: string, createFeeStructureDto: CreateFeeStructureDto) {
    // Verify class belongs to school if classId provided
    if (createFeeStructureDto.classId) {
      const classEntity = await this.prisma.class.findFirst({
        where: {
          id: createFeeStructureDto.classId,
          schoolId,
          deletedAt: null,
        },
      });

      if (!classEntity) {
        throw new NotFoundException(`Class with ID ${createFeeStructureDto.classId} not found`);
      }
    }

    return this.prisma.feeStructure.create({
      data: {
        ...createFeeStructureDto,
        schoolId,
      } as Prisma.FeeStructureUncheckedCreateInput,
      include: {
        Class: true,
        _count: {
          select: {
            FeeInvoice: true,
          },
        },
      },
    });
  }

  async findAll(schoolId: string, query: FeeQueryDto) {
    const { search, classId, page = 1, pageSize = 10 } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {
      schoolId,
    };

    if (classId) {
      where.classId = classId;
    } else if (classId === null) {
      // Explicitly get global structures
      where.classId = null;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { Class: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [structures, total] = await Promise.all([
      this.prisma.feeStructure.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          Class: true,
          _count: {
            select: {
              FeeInvoice: true,
            },
          },
        },
      }),
      this.prisma.feeStructure.count({ where }),
    ]);

    return {
      data: structures,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findOne(schoolId: string, id: string) {
    const structure = await this.prisma.feeStructure.findFirst({
      where: {
        id,
        schoolId,
      },
      include: {
        Class: true,
        FeeInvoice: {
          include: {
            Student: {
              select: {
                id: true,
                name: true,
                rollNumber: true,
              },
            },
          },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            FeeInvoice: true,
          },
        },
      },
    });

    if (!structure) {
      throw new NotFoundException(`Fee structure with ID ${id} not found`);
    }

    return structure;
  }

  async update(schoolId: string, id: string, updateFeeStructureDto: UpdateFeeStructureDto) {
    const existing = await this.prisma.feeStructure.findFirst({
      where: {
        id,
        schoolId,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Fee structure with ID ${id} not found`);
    }

    // Verify class if being updated
    if (updateFeeStructureDto.classId !== undefined) {
      if (updateFeeStructureDto.classId) {
        const classEntity = await this.prisma.class.findFirst({
          where: {
            id: updateFeeStructureDto.classId,
            schoolId,
            deletedAt: null,
          },
        });

        if (!classEntity) {
          throw new NotFoundException(`Class with ID ${updateFeeStructureDto.classId} not found`);
        }
      }
    }

    return this.prisma.feeStructure.update({
      where: { id },
      data: updateFeeStructureDto,
      include: {
        Class: true,
      },
    });
  }

  async remove(schoolId: string, id: string) {
    const structure = await this.prisma.feeStructure.findFirst({
      where: {
        id,
        schoolId,
      },
      include: {
        _count: {
          select: {
            FeeInvoice: true,
          },
        },
      },
    });

    if (!structure) {
      throw new NotFoundException(`Fee structure with ID ${id} not found`);
    }

    if (structure._count?.FeeInvoice > 0) {
      throw new BadRequestException(
        `Cannot delete fee structure with ${structure._count.FeeInvoice} invoices. Delete invoices first.`
      );
    }

    await this.prisma.feeStructure.delete({
      where: { id },
    });

    return { message: 'Fee structure deleted successfully' };
  }
}


