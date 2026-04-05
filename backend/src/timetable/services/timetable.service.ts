import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertTimetableDto } from '../dto/upsert-timetable.dto';

@Injectable()
export class TimetableService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get timetable for a class/section
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

    // Return as structured map: { day -> { periodId -> slot } }
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
   * Bulk upsert timetable slots for a class/section
   */
  async upsert(schoolId: string, dto: UpsertTimetableDto) {
    const { classId, sectionId, slots } = dto;

    // Verify section belongs to school
    const section = await this.prisma.section.findFirst({
      where: { id: sectionId, classId, schoolId, deletedAt: null },
    });
    if (!section) {
      throw new NotFoundException('Section not found in this school');
    }

    // Upsert each slot
    await Promise.all(
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

    return this.findByClassSection(schoolId, classId, sectionId);
  }

  /**
   * Clear a single slot
   */
  async clearSlot(schoolId: string, classId: string, sectionId: string, day: string, periodId: string) {
    await this.prisma.timetableSlot.deleteMany({
      where: { schoolId, classId, sectionId, day, periodId },
    });
    return { message: 'Slot cleared' };
  }
}
