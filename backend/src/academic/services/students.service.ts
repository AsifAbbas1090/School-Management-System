import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Gender, StudentStatus, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CreateStudentDto } from '../dto/create-student.dto';
import { UpdateStudentDto } from '../dto/update-student.dto';
import { BulkUpdateParentDto } from '../dto/bulk-update-parent.dto';
import { AcademicQueryDto } from '../dto/query.dto';
import { UsersService } from '../../users/services/users.service';

@Injectable()
export class StudentsService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
  ) { }

  async create(schoolId: string, createStudentDto: CreateStudentDto) {
    const [classEntity, section] = await Promise.all([
      this.prisma.class.findFirst({
        where: {
          id: createStudentDto.classId,
          schoolId,
          deletedAt: null,
        },
      }),
      this.prisma.section.findFirst({
        where: {
          id: createStudentDto.sectionId,
          schoolId,
          classId: createStudentDto.classId,
          deletedAt: null,
        },
      }),
    ]);

    if (!classEntity) {
      throw new NotFoundException(`Class with ID ${createStudentDto.classId} not found`);
    }

    if (!section) {
      throw new NotFoundException(
        `Section with ID ${createStudentDto.sectionId} not found or does not belong to the class`
      );
    }

    // Check if roll number already exists in school
    const existingRoll = await this.prisma.student.findFirst({
      where: {
        schoolId,
        rollNumber: createStudentDto.rollNumber,
      },
    });

    if (existingRoll) {
      throw new BadRequestException(
        `Student with roll number ${createStudentDto.rollNumber} already exists`
      );
    }

    // Handle parent creation or verification
    let parentId = createStudentDto.parentId;

    const wantsNewParent =
      !!createStudentDto.parentEmail ||
      !!createStudentDto.parentPassword ||
      !!createStudentDto.parentName ||
      !!createStudentDto.parentPhone;

    if (wantsNewParent) {
      if (createStudentDto.parentId) {
        throw new BadRequestException('Cannot provide both parentId and parent creation details');
      }
      if (
        !createStudentDto.parentEmail ||
        !createStudentDto.parentPassword ||
        !createStudentDto.parentName ||
        !createStudentDto.parentPhone
      ) {
        throw new BadRequestException(
          'To create a parent account, parentName, parentEmail, parentPassword, and parentPhone are all required',
        );
      }

      const parentUser = await this.usersService.createParent(schoolId, {
        email: createStudentDto.parentEmail,
        password: createStudentDto.parentPassword,
        name: createStudentDto.parentName,
        phone: createStudentDto.parentPhone,
        occupation: createStudentDto.parentOccupation,
      });

      parentId = parentUser.id;
    } else if (createStudentDto.parentId) {
      // Verify existing parent
      const parent = await this.prisma.user.findFirst({
        where: {
          id: createStudentDto.parentId,
          schoolId,
          role: 'PARENT',
          deletedAt: null,
        },
      });

      if (!parent) {
        throw new NotFoundException('Parent not found or invalid');
      }
    }

    // Check section capacity
    const currentStudents = await this.prisma.student.count({
      where: { sectionId: createStudentDto.sectionId },
    });

    if (currentStudents >= section.capacity) {
      throw new BadRequestException('Section has reached maximum capacity');
    }

    // Prepare student data
    const studentData: any = {
      classId: createStudentDto.classId,
      sectionId: createStudentDto.sectionId,
      rollNumber: createStudentDto.rollNumber,
      name: createStudentDto.name,
      gender: createStudentDto.gender,
      dateOfBirth: new Date(createStudentDto.dateOfBirth),
      status: createStudentDto.status || 'ACTIVE',
      address: createStudentDto.address,
      phone: createStudentDto.phone,
      email: createStudentDto.email,
      monthlyFee: createStudentDto.monthlyFee || 0, // Individual monthly fee amount
      pendingDues: createStudentDto.pendingDues ?? 0,
      schoolId,
      admissionDate: createStudentDto.admissionDate
        ? new Date(createStudentDto.admissionDate)
        : new Date(),
    };

    if (parentId) {
      studentData.parentId = parentId;
    }

    const createdStudent = await this.prisma.student.create({
      data: {
        id: crypto.randomUUID(),
        ...studentData,
        updatedAt: new Date(),
      } as any,
      select: {
        id: true,
        name: true,
        rollNumber: true,
        gender: true,
        dateOfBirth: true,
        status: true,
        address: true,
        phone: true,
        email: true,
        monthlyFee: true, // Include monthlyFee
        pendingDues: true,
        admissionDate: true,
        classId: true,
        sectionId: true,
        schoolId: true,
        parentId: true, // Explicitly include parentId
        createdAt: true,
        updatedAt: true,
        Class: { select: { id: true, name: true, grade: true } },
        Section: { select: { id: true, name: true, capacity: true, classId: true } },
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      } as any,
    });

    // Return student with parent info properly linked
    // Handle User relation which may be null or have different types
    let parentInfo = null;
    if (createdStudent.User && !Array.isArray(createdStudent.User)) {
      const user = createdStudent.User as { id: string; name: string; email: string; phone: string };
      parentInfo = {
        id: user.id,
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      };
    }

    return {
      ...createdStudent,
      parentId: createdStudent.parentId || null,
      parent: parentInfo,
    };
  }

  async countBySchool(schoolId: string) {
    const total = await this.prisma.student.count({ where: { schoolId } });
    return { total };
  }

  async findAll(schoolId: string, query: AcademicQueryDto) {
    const { search, classId, sectionId, status, page = 1, pageSize = 50 } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {
      schoolId,
    };

    if (classId) {
      where.classId = classId;
    }

    if (sectionId) {
      where.sectionId = sectionId;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { rollNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const listSelect = {
      id: true,
      name: true,
      rollNumber: true,
      gender: true,
      monthlyFee: true,
      pendingDues: true,
      status: true,
      email: true,
      phone: true,
      address: true,
      dateOfBirth: true,
      admissionDate: true,
      classId: true,
      sectionId: true,
      schoolId: true,
      parentId: true,
      Class: { select: { id: true, name: true, grade: true } },
      Section: { select: { id: true, name: true } },
      User: { select: { id: true, name: true, email: true, phone: true } },
    } as const;

    const [studentsWithRelations, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [
          { Class: { grade: 'asc' } },
          { rollNumber: 'asc' },
        ] as any,
        select: listSelect as any,
      }),
      this.prisma.student.count({ where }),
    ]);

    const students = studentsWithRelations.map((student) => ({
      ...student,
      parentId: student.parentId || null,
    }));

    return {
      data: students,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findByParentId(schoolId: string, parentId: string) {
    return this.prisma.student.findMany({
      where: { schoolId, parentId },
      include: {
        Class: { select: { id: true, name: true, grade: true } },
        Section: { select: { id: true, name: true } },
      },
      orderBy: [{ Class: { grade: 'asc' } }, { rollNumber: 'asc' }] as any,
    });
  }

  /** Slim rows for Parents UI: link map + display names without loading full student lists in the client. */
  async findMinimalForParentsUi(schoolId: string) {
    const data = await this.prisma.student.findMany({
      where: { schoolId },
      select: {
        id: true,
        parentId: true,
        name: true,
        rollNumber: true,
        classId: true,
        Class: { select: { name: true } },
      },
    });
    return { data };
  }

  async findOne(schoolId: string, id: string) {
    const student = await this.prisma.student.findFirst({
      where: {
        id,
        schoolId,
      },
      select: {
        id: true,
        name: true,
        rollNumber: true,
        gender: true,
        dateOfBirth: true,
        status: true,
        address: true,
        phone: true,
        email: true,
        monthlyFee: true, // Include monthlyFee
        pendingDues: true,
        admissionDate: true,
        classId: true,
        sectionId: true,
        schoolId: true,
        parentId: true, // Explicitly include parentId
        createdAt: true,
        updatedAt: true,
        Class: true,
        Section: {
          include: {
            User: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      } as any,
    });

    if (!student) {
      throw new NotFoundException(`Student with ID ${id} not found`);
    }

    return student;
  }

  async bulkUpdateParent(schoolId: string, dto: BulkUpdateParentDto) {
    const { studentIds, parentId } = dto;
    if (!studentIds?.length) {
      return { count: 0 };
    }

    if (parentId) {
      const parent = await this.prisma.user.findFirst({
        where: {
          id: parentId,
          schoolId,
          role: UserRole.PARENT,
          deletedAt: null,
        },
      });
      if (!parent) {
        throw new NotFoundException('Parent not found or invalid');
      }
    }

    const result = await this.prisma.student.updateMany({
      where: {
        schoolId,
        id: { in: studentIds },
      },
      data: {
        parentId: parentId ?? null,
        updatedAt: new Date(),
      },
    });

    return { count: result.count };
  }

  async update(schoolId: string, id: string, updateStudentDto: UpdateStudentDto) {
    const existing = await this.prisma.student.findFirst({
      where: {
        id,
        schoolId,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Student with ID ${id} not found`);
    }

    const updateData: any = {};
    for (const key of Object.keys(updateStudentDto as object)) {
      const v = (updateStudentDto as Record<string, unknown>)[key];
      if (v !== undefined) {
        updateData[key] = v;
      }
    }
    delete updateData.parentName;
    delete updateData.parentEmail;
    delete updateData.parentPassword;
    delete updateData.parentPhone;
    delete updateData.parentOccupation;

    // Verify class and section if being updated
    if (updateData.classId || updateData.sectionId) {
      const classId = updateData.classId || existing.classId;
      const sectionId = updateData.sectionId || existing.sectionId;

      const section = await this.prisma.section.findFirst({
        where: {
          id: sectionId,
          schoolId,
          classId: classId,
          deletedAt: null,
        },
      });

      if (!section) {
        throw new NotFoundException('Section not found or does not belong to the class');
      }

      // Check section capacity if section is being changed
      if (updateData.sectionId && updateData.sectionId !== existing.sectionId) {
        const currentStudents = await this.prisma.student.count({
          where: { sectionId: updateData.sectionId },
        });

        if (currentStudents >= section.capacity) {
          throw new BadRequestException('Section has reached maximum capacity');
        }
      }
    }

    // Check for duplicate roll number if being updated
    if (updateData.rollNumber && updateData.rollNumber !== existing.rollNumber) {
      const duplicate = await this.prisma.student.findFirst({
        where: {
          schoolId,
          rollNumber: updateData.rollNumber,
          id: { not: id },
        },
      });

      if (duplicate) {
        throw new BadRequestException(
          `Student with roll number ${updateData.rollNumber} already exists`
        );
      }
    }

    // Handle parentId only when the client sent it (partial PATCH)
    let parentIdValue: string | null | undefined = undefined;

    if (updateStudentDto.parentId !== undefined) {
      if (updateStudentDto.parentId === null || updateStudentDto.parentId === '') {
        parentIdValue = null;
      } else if (typeof updateStudentDto.parentId === 'string') {
        const trimmed = updateStudentDto.parentId.trim();
        if (trimmed !== '') {
          const parent = await this.prisma.user.findFirst({
            where: {
              id: trimmed,
              schoolId,
              role: 'PARENT',
              deletedAt: null,
            },
          });

          if (!parent) {
            throw new NotFoundException('Parent not found or invalid');
          }
          parentIdValue = trimmed;
        } else {
          parentIdValue = null;
        }
      }
      if (parentIdValue !== undefined) {
        updateData.parentId = parentIdValue;
      }
    }
    if (updateData.dateOfBirth) {
      updateData.dateOfBirth = new Date(updateData.dateOfBirth);
    }
    if (updateData.admissionDate) {
      updateData.admissionDate = new Date(updateData.admissionDate);
    }

    if (updateData.monthlyFee !== undefined && updateData.monthlyFee !== null) {
      const raw = updateData.monthlyFee;
      const n = typeof raw === 'string' ? parseFloat(raw) : Number(raw);
      if (Number.isNaN(n)) {
        delete updateData.monthlyFee;
      } else {
        updateData.monthlyFee = n;
      }
    }

    if (updateData.pendingDues !== undefined && updateData.pendingDues !== null) {
      const raw = updateData.pendingDues;
      const n = typeof raw === 'string' ? parseFloat(raw) : Number(raw);
      if (Number.isNaN(n)) {
        delete updateData.pendingDues;
      } else {
        updateData.pendingDues = n;
      }
    }

    const updated = await this.prisma.student.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        rollNumber: true,
        gender: true,
        dateOfBirth: true,
        status: true,
        address: true,
        phone: true,
        email: true,
        monthlyFee: true, // Include monthlyFee
        pendingDues: true,
        admissionDate: true,
        classId: true,
        sectionId: true,
        schoolId: true,
        parentId: true, // Explicitly include parentId
        createdAt: true,
        updatedAt: true,
        Class: { select: { id: true, name: true, grade: true } },
        Section: { select: { id: true, name: true, capacity: true, classId: true } },
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      } as any,
    });
    
    return updated;
  }

  async remove(schoolId: string, id: string) {
    const student = await this.prisma.student.findFirst({
      where: {
        id,
        schoolId,
      },
    });

    if (!student) {
      throw new NotFoundException(`Student with ID ${id} not found`);
    }

    await this.prisma.student.delete({
      where: { id },
    });

    return { message: 'Student deleted successfully' };
  }

  /** Normalize CSV header keys for flexible matching (className, Class Name, etc.). */
  private csvNormKey(key: string): string {
    return String(key).replace(/\s+/g, '').toLowerCase();
  }

  private csvRowToMap(row: Record<string, unknown>): Map<string, string> {
    const map = new Map<string, string>();
    for (const [k, v] of Object.entries(row)) {
      map.set(this.csvNormKey(k), String(v ?? '').trim());
    }
    return map;
  }

  private csvGet(m: Map<string, string>, ...aliases: string[]): string {
    for (const a of aliases) {
      const v = m.get(this.csvNormKey(a));
      if (v !== undefined && v !== '') return v;
    }
    return '';
  }

  private normEmail(email: string): string {
    return String(email ?? '').trim().toLowerCase();
  }

  /** Excel often saves long numbers as scientific notation (e.g. 9.23E+11); normalize for phone fields. */
  private normalizeCsvPhoneLike(raw: string): string {
    const s = String(raw ?? '').trim();
    if (!s) return '';
    if (/[eE][+-]?\d+/.test(s)) {
      const n = Number(s);
      if (!Number.isNaN(n) && Number.isFinite(n)) {
        return String(Math.round(n));
      }
    }
    return s;
  }

  /** Parse CSV date cells: ISO yyyy-mm-dd, dd/mm/yyyy, dd-mm-yyyy, or Excel serial (optional). */
  private parseCsvDate(raw: string, fieldLabel: string): string {
    const s = String(raw ?? '').trim();
    if (!s) {
      throw new Error(`${fieldLabel} is required`);
    }

    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      const d = new Date(s.slice(0, 10));
      if (!Number.isNaN(d.getTime())) {
        return s.slice(0, 10);
      }
    }

    const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slash) {
      const day = parseInt(slash[1], 10);
      const month = parseInt(slash[2], 10) - 1;
      const year = parseInt(slash[3], 10);
      const d = new Date(year, month, day);
      if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) {
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }

    const dash = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (dash) {
      const day = parseInt(dash[1], 10);
      const month = parseInt(dash[2], 10) - 1;
      const year = parseInt(dash[3], 10);
      const d = new Date(year, month, day);
      if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) {
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }

    throw new Error(
      `${fieldLabel}: unrecognised date "${raw}" (use yyyy-mm-dd or dd/mm/yyyy)`,
    );
  }

  /** Preload classes/sections once per import (avoids N DB round-trips per row). */
  private async buildBulkImportCache(schoolId: string) {
    const [classes, sections] = await Promise.all([
      this.prisma.class.findMany({ where: { schoolId, deletedAt: null } }),
      this.prisma.section.findMany({ where: { schoolId, deletedAt: null } }),
    ]);
    const classById = new Map(classes.map((c) => [c.id, c]));
    const classByLowerName = new Map<string, (typeof classes)[0]>();
    for (const c of classes) {
      classByLowerName.set(c.name.toLowerCase().trim(), c);
    }
    const sectionById = new Map(sections.map((s) => [s.id, s]));
    const sectionByClassAndLowerName = new Map<string, Map<string, (typeof sections)[0]>>();
    for (const s of sections) {
      if (!sectionByClassAndLowerName.has(s.classId)) {
        sectionByClassAndLowerName.set(s.classId, new Map());
      }
      sectionByClassAndLowerName.get(s.classId)!.set(s.name.toLowerCase().trim(), s);
    }
    return { classById, classByLowerName, sectionById, sectionByClassAndLowerName };
  }

  /**
   * Map one CSV row to CreateStudentDto using preloaded class/section maps (bulk import only).
   */
  private mapCsvRowToCreateDtoFromCache(
    row: Record<string, unknown>,
    cache: Awaited<ReturnType<StudentsService['buildBulkImportCache']>>,
  ): CreateStudentDto {
    const m = this.csvRowToMap(row);

    const name = this.csvGet(m, 'name', 'fullname', 'fullName');
    const rollNumber = this.csvGet(m, 'rollNumber', 'rollnumber', 'roll');
    const genderRaw = this.csvGet(m, 'gender');
    const address = this.csvGet(m, 'address');

    if (!name) throw new Error('name is required');
    if (!rollNumber) throw new Error('rollNumber is required');
    if (!genderRaw) throw new Error('gender is required');
    if (!address) throw new Error('address is required');

    const genderUpper = genderRaw.toUpperCase();
    if (!['MALE', 'FEMALE', 'OTHER'].includes(genderUpper)) {
      throw new Error(`Invalid gender: ${genderRaw} (use MALE, FEMALE, or OTHER)`);
    }

    const dateOfBirth = this.parseCsvDate(
      this.csvGet(m, 'dateOfBirth', 'dateofbirth', 'dob'),
      'dateOfBirth',
    );
    const admissionRaw = this.csvGet(m, 'admissionDate', 'admissiondate', 'admission');
    const admissionDate = admissionRaw?.trim()
      ? this.parseCsvDate(admissionRaw, 'admissionDate')
      : undefined;

    const monthlyFeeStr = this.csvGet(m, 'monthlyFee', 'monthlyfee', 'fees', 'fee', 'monthlyfeePKR');
    if (!monthlyFeeStr) throw new Error('monthlyFee is required');
    const monthlyFee = parseFloat(monthlyFeeStr);
    if (Number.isNaN(monthlyFee) || monthlyFee < 0) {
      throw new Error(`monthlyFee must be a non-negative number (got "${monthlyFeeStr}")`);
    }

    let classId = this.csvGet(m, 'classId', 'classid');
    const className = this.csvGet(m, 'className', 'classname', 'class');

    if (classId) {
      if (!cache.classById.has(classId)) {
        throw new Error(`Class not found for id: ${classId}`);
      }
    } else if (className) {
      const cls = cache.classByLowerName.get(className.toLowerCase().trim());
      if (!cls) {
        throw new Error(`Class not found: "${className}"`);
      }
      classId = cls.id;
    } else {
      throw new Error('classId or className is required');
    }

    let sectionId = this.csvGet(m, 'sectionId', 'sectionid');
    const sectionName = this.csvGet(m, 'sectionName', 'sectionname', 'section');

    if (sectionId) {
      const sec = cache.sectionById.get(sectionId);
      if (!sec || sec.classId !== classId) {
        throw new Error('Section not found or does not match the selected class');
      }
    } else if (sectionName) {
      const map = cache.sectionByClassAndLowerName.get(classId);
      const sec = map?.get(sectionName.toLowerCase().trim());
      if (!sec) {
        throw new Error(`Section not found: "${sectionName}" for the given class`);
      }
      sectionId = sec.id;
    } else {
      throw new Error('sectionId or sectionName is required');
    }

    const parentId = this.csvGet(m, 'parentId', 'parentid');
    const parentName = this.csvGet(m, 'parentName', 'parentname', 'guardianName', 'fatherName');
    const parentEmail = this.csvGet(m, 'parentEmail', 'parentemail', 'guardianEmail');
    const parentPassword = this.csvGet(m, 'parentPassword', 'parentpassword');
    const parentPhone = this.normalizeCsvPhoneLike(
      this.csvGet(m, 'parentPhone', 'parentphone', 'guardianPhone', 'guardianphone'),
    );
    const parentOccupation = this.csvGet(m, 'parentOccupation', 'parentoccupation', 'occupation');
    const studentPhone = this.normalizeCsvPhoneLike(
      this.csvGet(m, 'phone', 'studentPhone', 'studentphone'),
    );

    if (parentId) {
      // Link existing parent; ignore parent creation columns
    } else {
      if (!parentName || !parentEmail || !parentPassword || !parentPhone) {
        throw new Error(
          'Provide parentId to link an existing parent, or parentName, parentEmail, parentPassword, and parentPhone to create one',
        );
      }
    }

    const dto: CreateStudentDto = {
      name,
      rollNumber,
      gender: genderUpper as Gender,
      dateOfBirth,
      monthlyFee,
      address,
      classId,
      sectionId,
    };
    if (admissionDate) {
      dto.admissionDate = admissionDate;
    }

    if (parentId) {
      dto.parentId = parentId;
    } else {
      dto.parentName = parentName;
      dto.parentEmail = parentEmail;
      dto.parentPassword = parentPassword;
      dto.parentPhone = parentPhone;
      if (parentOccupation) dto.parentOccupation = parentOccupation;
    }

    const statusRaw = this.csvGet(m, 'status');
    if (statusRaw) {
      const su = statusRaw.toUpperCase();
      if (Object.values(StudentStatus).includes(su as StudentStatus)) {
        dto.status = su as StudentStatus;
      }
    }

    if (studentPhone) dto.phone = studentPhone;

    const email = this.csvGet(m, 'email', 'studentEmail', 'studentemail');
    if (email) dto.email = email;

    const pendingDuesRaw = this.csvGet(m, 'pendingDues', 'pendingdues', 'openingDues', 'openingdues');
    if (pendingDuesRaw !== '') {
      const pd = parseFloat(pendingDuesRaw);
      if (!Number.isNaN(pd) && pd >= 0) {
        dto.pendingDues = pd;
      }
    }

    return dto;
  }

  /**
   * Bulk import: batched DB writes, parallel password hashing, skips duplicate rolls.
   */
  async bulkImport(schoolId: string, rows: Record<string, unknown>[]) {
    const results = {
      total: rows.length,
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
      skippedDetails: [] as string[],
    };

    if (rows.length === 0) {
      return results;
    }

    const cache = await this.buildBulkImportCache(schoolId);

    type OkRow = { rowIndex: number; dto: CreateStudentDto };
    const okParsed: OkRow[] = [];

    for (let i = 0; i < rows.length; i++) {
      try {
        const dto = this.mapCsvRowToCreateDtoFromCache(rows[i], cache);
        okParsed.push({ rowIndex: i, dto });
      } catch (e) {
        const msg = (e as Error).message || 'Unknown error';
        results.failed++;
        results.errors.push(`Row ${i + 1}: ${msg}`);
      }
    }

    const rollFirstRow = new Map<string, number>();
    const afterFileDedup: OkRow[] = [];
    for (const p of okParsed) {
      const roll = p.dto.rollNumber.trim();
      if (rollFirstRow.has(roll)) {
        results.skipped++;
        results.skippedDetails.push(
          `Row ${p.rowIndex + 1}: roll ${roll} — duplicate in file (first at row ${(rollFirstRow.get(roll) ?? 0) + 1})`,
        );
        continue;
      }
      rollFirstRow.set(roll, p.rowIndex);
      afterFileDedup.push(p);
    }

    if (afterFileDedup.length === 0) {
      return results;
    }

    const rolls = [...new Set(afterFileDedup.map((p) => p.dto.rollNumber.trim()))];
    const existingStudents = await this.prisma.student.findMany({
      where: { schoolId, rollNumber: { in: rolls } },
      select: { rollNumber: true },
    });
    const existingRollSet = new Set(existingStudents.map((e) => e.rollNumber));

    const notInDb: OkRow[] = [];
    for (const p of afterFileDedup) {
      const roll = p.dto.rollNumber.trim();
      if (existingRollSet.has(roll)) {
        results.skipped++;
        results.skippedDetails.push(`Row ${p.rowIndex + 1}: roll ${roll} — already exists in this school`);
        continue;
      }
      notInDb.push(p);
    }

    if (notInDb.length === 0) {
      return results;
    }

    const sectionIds = [...new Set(notInDb.map((p) => p.dto.sectionId))];
    const counts = await this.prisma.student.groupBy({
      by: ['sectionId'],
      where: { schoolId, sectionId: { in: sectionIds } },
      _count: { _all: true },
    });
    const countMap = new Map(counts.map((c) => [c.sectionId, c._count._all]));
    const pendingPerSection = new Map<string, number>();

    const capacityOk: OkRow[] = [];
    for (const p of notInDb) {
      const sid = p.dto.sectionId;
      const sec = cache.sectionById.get(sid);
      if (!sec) {
        results.failed++;
        results.errors.push(`Row ${p.rowIndex + 1}: section not found`);
        continue;
      }
      const cur = countMap.get(sid) ?? 0;
      const pend = pendingPerSection.get(sid) ?? 0;
      if (cur + pend >= sec.capacity) {
        results.failed++;
        results.errors.push(
          `Row ${p.rowIndex + 1}: section "${sec.name}" is at capacity (${sec.capacity})`,
        );
        continue;
      }
      pendingPerSection.set(sid, pend + 1);
      capacityOk.push(p);
    }

    if (capacityOk.length === 0) {
      return results;
    }

    const explicitParentIds = [
      ...new Set(capacityOk.map((p) => p.dto.parentId).filter((id): id is string => !!id)),
    ];
    let validExplicitParents = new Set<string>();
    if (explicitParentIds.length) {
      const parents = await this.prisma.user.findMany({
        where: {
          id: { in: explicitParentIds },
          schoolId,
          role: UserRole.PARENT,
          deletedAt: null,
        },
        select: { id: true },
      });
      validExplicitParents = new Set(parents.map((u) => u.id));
    }

    const rawByNorm = new Map<string, string>();
    for (const p of capacityOk) {
      if (!p.dto.parentId && p.dto.parentEmail) {
        const n = this.normEmail(p.dto.parentEmail);
        if (!rawByNorm.has(n)) {
          rawByNorm.set(n, p.dto.parentEmail!.trim());
        }
      }
    }
    const rawEmailList = [...rawByNorm.values()];

    const existingUsers =
      rawEmailList.length === 0
        ? []
        : await this.prisma.user.findMany({
            where: {
              OR: rawEmailList.map((email) => ({
                email: { equals: email, mode: 'insensitive' as const },
              })),
            },
            select: { id: true, email: true, role: true, schoolId: true, deletedAt: true },
          });

    const userByNormEmail = new Map<string, (typeof existingUsers)[0]>();
    for (const u of existingUsers) {
      userByNormEmail.set(u.email.toLowerCase().trim(), u);
    }

    type QueueItem = { rowIndex: number; dto: CreateStudentDto };
    const queue: QueueItem[] = [];
    const newParentByNorm = new Map<
      string,
      { rawEmail: string; name: string; password: string; phone: string; occupation?: string }
    >();

    for (const p of capacityOk) {
      const { rowIndex, dto } = p;

      if (dto.parentId) {
        if (!validExplicitParents.has(dto.parentId)) {
          results.failed++;
          results.errors.push(`Row ${rowIndex + 1}: parentId not found or not a parent in this school`);
          continue;
        }
        queue.push({ rowIndex, dto });
        continue;
      }

      const em = this.normEmail(dto.parentEmail!);
      const existing = userByNormEmail.get(em);

      if (existing) {
        if (existing.deletedAt) {
          results.failed++;
          results.errors.push(`Row ${rowIndex + 1}: parent account is inactive`);
          continue;
        }
        if (existing.role !== UserRole.PARENT) {
          results.failed++;
          results.errors.push(
            `Row ${rowIndex + 1}: email ${dto.parentEmail} is already used by a non-parent account`,
          );
          continue;
        }
        if (existing.schoolId !== schoolId) {
          results.failed++;
          results.errors.push(`Row ${rowIndex + 1}: parent email belongs to another school`);
          continue;
        }
        queue.push({ rowIndex, dto });
        continue;
      }

      if (!newParentByNorm.has(em)) {
        newParentByNorm.set(em, {
          rawEmail: dto.parentEmail!.trim(),
          name: dto.parentName!,
          password: dto.parentPassword!,
          phone: dto.parentPhone!,
          occupation: dto.parentOccupation,
        });
      }
      queue.push({ rowIndex, dto });
    }

    if (queue.length === 0) {
      return results;
    }

    const newParentEntries = [...newParentByNorm.entries()];
    const hashedNewParents = await Promise.all(
      newParentEntries.map(async ([norm, data]) => ({
        norm,
        data,
        hash: await bcrypt.hash(data.password, 10),
      })),
    );
    const hashByNorm = new Map(hashedNewParents.map((h) => [h.norm, h.hash]));

    const now = new Date();

    await this.prisma.$transaction(
      async (tx) => {
        const createdParentIdByNorm = new Map<string, string>();

        await Promise.all(
          newParentEntries.map(async ([norm, data]) => {
            const hash = hashByNorm.get(norm)!;
            const created = await tx.user.create({
              data: {
                id: crypto.randomUUID(),
                email: data.rawEmail,
                password: hash,
                name: data.name,
                role: UserRole.PARENT,
                schoolId,
                phone: data.phone || null,
                occupation: data.occupation ?? null,
                status: UserStatus.ACTIVE,
                updatedAt: now,
              },
              select: { id: true },
            });
            createdParentIdByNorm.set(norm, created.id);
          }),
        );

        const studentRows: Array<Record<string, unknown>> = [];

        for (const item of queue) {
          const dto = item.dto;
          let parentId: string | null = null;

          if (dto.parentId) {
            parentId = dto.parentId;
          } else {
            const em = this.normEmail(dto.parentEmail!);
            const existing = userByNormEmail.get(em);
            if (existing) {
              parentId = existing.id;
            } else {
              parentId = createdParentIdByNorm.get(em) ?? null;
            }
          }

          if (!parentId) {
            throw new Error(`Internal: could not resolve parent for row ${item.rowIndex + 1}`);
          }

          studentRows.push({
            id: crypto.randomUUID(),
            schoolId,
            classId: dto.classId,
            sectionId: dto.sectionId,
            rollNumber: dto.rollNumber.trim(),
            name: dto.name,
            gender: dto.gender,
            dateOfBirth: new Date(dto.dateOfBirth),
            status: dto.status || StudentStatus.ACTIVE,
            address: dto.address ?? null,
            phone: dto.phone ?? null,
            email: dto.email ?? null,
            monthlyFee: dto.monthlyFee ?? 0,
            pendingDues: dto.pendingDues ?? 0,
            admissionDate: dto.admissionDate ? new Date(dto.admissionDate) : now,
            parentId,
            updatedAt: now,
          });
        }

        const CHUNK = 200;
        for (let i = 0; i < studentRows.length; i += CHUNK) {
          await tx.student.createMany({ data: studentRows.slice(i, i + CHUNK) as any });
        }
      },
      { maxWait: 60000, timeout: 120000 },
    );

    results.success = queue.length;
    return results;
  }

  /**
   * Calculate fee dues from admission date to current month
   * Returns the number of months and total amount due
   */
  async calculateFeeDues(schoolId: string, studentId: string) {
    const student = await this.prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId,
      },
      include: {
        FeeInvoice: {
          where: {
            status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
          },
        },
      } as any,
    });

    if (!student) {
      throw new NotFoundException(`Student with ID ${studentId} not found`);
    }

    const admissionDate = student.admissionDate;
    const now = new Date();

    // Calculate months from admission date to current month
    const admissionYear = admissionDate.getFullYear();
    const admissionMonth = admissionDate.getMonth();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const totalMonths = (currentYear - admissionYear) * 12 + (currentMonth - admissionMonth) + 1;

    // Get monthly fee structure for the student's class
    const monthlyFeeStructure = await this.prisma.feeStructure.findFirst({
      where: {
        schoolId,
        classId: student.classId,
        frequency: 'MONTHLY',
      },
    });

    if (!monthlyFeeStructure) {
      return {
        monthsDue: totalMonths,
        totalAmount: 0,
        monthlyAmount: 0,
        message: 'No monthly fee structure found for this class',
      };
    }

    const monthlyAmount = monthlyFeeStructure.amount;
    const totalAmount = monthlyAmount * totalMonths;

    // Calculate already paid amount
    const paidInvoices = await this.prisma.feeInvoice.findMany({
      where: {
        studentId,
        status: 'PAID',
      },
      include: {
        FeePayment: true,
      } as any,
    });

    let paidAmount = 0;
    paidInvoices.forEach((invoice: any) => {
      invoice.FeePayment?.forEach((payment: any) => {
        paidAmount += payment.amountPaid;
      });
    });

    const dueAmount = totalAmount - paidAmount;

    return {
      monthsDue: totalMonths,
      monthlyAmount,
      totalAmount,
      paidAmount,
      dueAmount,
      admissionDate,
      currentDate: now,
    };
  }
}

