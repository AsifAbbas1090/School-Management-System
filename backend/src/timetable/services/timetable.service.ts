import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertTimetableDto } from '../dto/upsert-timetable.dto';
import { CopyDayDto } from '../dto/copy-day.dto';

@Injectable()
export class TimetableService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get timetable for a class/section as both a structured map
   * ({ day -> periodId -> slot }) and a flat list so clients can pick
   * whichever shape is cheaper for their use-case.
   */
  async findByClassSection(schoolId: string, classId: string, sectionId: string) {
    const slots = await this.prisma.timetableSlot.findMany({
      where: { schoolId, classId, sectionId },
      include: {
        Subject: { select: { id: true, name: true, code: true } },
        Teacher: { select: { id: true, name: true } },
      },
      orderBy: [{ day: 'asc' }, { periodId: 'asc' }],
    });

    const structured: Record<string, Record<string, any>> = {};
    for (const slot of slots) {
      if (!structured[slot.day]) structured[slot.day] = {};
      structured[slot.day][slot.periodId] = {
        id: slot.id,
        subjectId: slot.subjectId,
        subjectName: slot.Subject?.name || null,
        subjectCode: slot.Subject?.code || null,
        teacherId: slot.teacherId,
        teacherName: slot.Teacher?.name || null,
        room: slot.room || null,
      };
    }

    return { classId, sectionId, timetable: structured, slots };
  }

  /**
   * Bulk upsert timetable slots for a class/section. Teacher conflicts
   * (same teacher, same day+period, different class/section) are reported
   * in the response so the UI can surface them without blocking a save —
   * this matches the typical admin workflow of fixing conflicts after
   * seeing the full picture.
   */
  async upsert(schoolId: string, dto: UpsertTimetableDto) {
    const { classId, sectionId, slots } = dto;

    const section = await this.prisma.section.findFirst({
      where: { id: sectionId, classId, schoolId, deletedAt: null },
      select: { id: true },
    });
    if (!section) {
      throw new NotFoundException('Section not found in this school');
    }

    await this.prisma.$transaction(
      slots.map((slot) =>
        this.prisma.timetableSlot.upsert({
          where: {
            schoolId_classId_sectionId_day_periodId: {
              schoolId,
              classId,
              sectionId,
              day: slot.day,
              periodId: slot.periodId,
            },
          },
          create: {
            schoolId,
            classId,
            sectionId,
            day: slot.day,
            periodId: slot.periodId,
            subjectId: slot.subjectId || null,
            teacherId: slot.teacherId || null,
            room: slot.room || null,
          },
          update: {
            subjectId: slot.subjectId || null,
            teacherId: slot.teacherId || null,
            room: slot.room || null,
          },
        }),
      ),
    );

    const [result, conflicts] = await Promise.all([
      this.findByClassSection(schoolId, classId, sectionId),
      this.findTeacherConflicts(schoolId, classId, sectionId),
    ]);

    return { ...result, conflicts };
  }

  /**
   * Report teacher double-bookings: same teacher assigned to two different
   * (class, section) pairs for the same day+period. Used after an upsert
   * and on-demand from the UI.
   */
  async findTeacherConflicts(schoolId: string, classId?: string, sectionId?: string) {
    const slots = await this.prisma.timetableSlot.findMany({
      where: {
        schoolId,
        teacherId: { not: null },
      },
      select: {
        day: true,
        periodId: true,
        teacherId: true,
        classId: true,
        sectionId: true,
        Teacher: { select: { id: true, name: true } },
        Class: { select: { id: true, name: true } },
        Section: { select: { id: true, name: true } },
      },
    });

    /** Group by teacherId + day + periodId to find duplicates. */
    const buckets = new Map<string, typeof slots>();
    for (const s of slots) {
      const k = `${s.teacherId}|${s.day}|${s.periodId}`;
      const arr = buckets.get(k) || [];
      arr.push(s);
      buckets.set(k, arr);
    }

    const conflicts: Array<{
      teacherId: string;
      teacherName: string;
      day: string;
      periodId: string;
      entries: { classId: string; className: string; sectionId: string; sectionName: string }[];
    }> = [];

    for (const [, list] of buckets) {
      if (list.length < 2) continue;
      // If a class/section filter is provided, only report conflicts that touch it.
      if (classId && sectionId) {
        const touches = list.some((s) => s.classId === classId && s.sectionId === sectionId);
        if (!touches) continue;
      }
      conflicts.push({
        teacherId: list[0].teacherId!,
        teacherName: list[0].Teacher?.name || 'Unknown',
        day: list[0].day,
        periodId: list[0].periodId,
        entries: list.map((s) => ({
          classId: s.classId,
          className: s.Class?.name || '—',
          sectionId: s.sectionId,
          sectionName: s.Section?.name || '—',
        })),
      });
    }

    return conflicts;
  }

  async clearSlot(schoolId: string, classId: string, sectionId: string, day: string, periodId: string) {
    await this.prisma.timetableSlot.deleteMany({
      where: { schoolId, classId, sectionId, day, periodId },
    });
    return { message: 'Slot cleared' };
  }

  /**
   * Duplicate one weekday's slots onto another weekday in the same
   * (class, section). `overwrite=false` keeps existing target slots.
   */
  async copyDay(schoolId: string, dto: CopyDayDto) {
    const { classId, sectionId, fromDay, toDay, overwrite = true } = dto;
    if (fromDay === toDay) {
      return this.findByClassSection(schoolId, classId, sectionId);
    }

    const section = await this.prisma.section.findFirst({
      where: { id: sectionId, classId, schoolId, deletedAt: null },
      select: { id: true },
    });
    if (!section) {
      throw new NotFoundException('Section not found in this school');
    }

    const sourceSlots = await this.prisma.timetableSlot.findMany({
      where: { schoolId, classId, sectionId, day: fromDay },
      select: { periodId: true, subjectId: true, teacherId: true, room: true },
    });

    if (sourceSlots.length === 0) {
      throw new ConflictException(`No slots to copy from ${fromDay}`);
    }

    if (overwrite) {
      await this.prisma.timetableSlot.deleteMany({
        where: { schoolId, classId, sectionId, day: toDay },
      });
    }

    await this.prisma.$transaction(
      sourceSlots.map((s) =>
        this.prisma.timetableSlot.upsert({
          where: {
            schoolId_classId_sectionId_day_periodId: {
              schoolId,
              classId,
              sectionId,
              day: toDay,
              periodId: s.periodId,
            },
          },
          create: {
            schoolId,
            classId,
            sectionId,
            day: toDay,
            periodId: s.periodId,
            subjectId: s.subjectId,
            teacherId: s.teacherId,
            room: s.room,
          },
          update: overwrite
            ? {
                subjectId: s.subjectId,
                teacherId: s.teacherId,
                room: s.room,
              }
            : {}, // noop keeps existing slot
        }),
      ),
    );

    return this.findByClassSection(schoolId, classId, sectionId);
  }
}
