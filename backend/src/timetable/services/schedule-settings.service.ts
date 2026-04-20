import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertScheduleSettingsDto, BreakWindowDto } from '../dto/schedule-settings.dto';

type PeriodKind = 'LECTURE' | 'BREAK';

export interface GeneratedPeriod {
  id: string;
  kind: PeriodKind;
  order: number;
  name: string;
  startTime: string;
  endTime: string;
}

const DEFAULT_SETTINGS = {
  startTime: '08:00',
  endTime: '14:00',
  lectureDuration: 40,
  breaks: [] as BreakWindowDto[],
};

/**
 * Turn a HH:mm string into minutes-since-midnight for arithmetic.
 */
function hmToMin(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
}

function minToHm(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Deterministically generate the full list of periods (lectures + breaks)
 * between `startTime` and `endTime` using the given lecture duration and
 * the configured breaks. Breaks outside the school window are ignored.
 *
 * The returned ids (`p1`, `p2`, `b1`, …) are stable across calls with the
 * same inputs, so `TimetableSlot.periodId` stays meaningful when the user
 * saves a slot and navigates away.
 */
export function generatePeriods(settings: {
  startTime: string;
  endTime: string;
  lectureDuration: number;
  breaks: BreakWindowDto[];
}): GeneratedPeriod[] {
  const schoolStart = hmToMin(settings.startTime);
  const schoolEnd = hmToMin(settings.endTime);
  const duration = Math.max(15, settings.lectureDuration || 40);

  const breaks = (settings.breaks || [])
    .map((b, idx) => ({
      name: b.name?.trim() || (idx === 0 ? 'Break' : `Break ${idx + 1}`),
      start: hmToMin(b.startTime),
      end: hmToMin(b.endTime),
    }))
    .filter((b) => b.end > b.start && b.start >= schoolStart && b.end <= schoolEnd)
    .sort((a, b) => a.start - b.start);

  const periods: GeneratedPeriod[] = [];
  let cursor = schoolStart;
  let lectureIdx = 0;
  let breakIdx = 0;

  while (cursor < schoolEnd) {
    const nextBreak = breaks.find((b) => b.start >= cursor);

    if (nextBreak && nextBreak.start <= cursor) {
      // Currently inside a break boundary
      breakIdx += 1;
      periods.push({
        id: `b${breakIdx}`,
        kind: 'BREAK',
        order: periods.length,
        name: nextBreak.name,
        startTime: minToHm(nextBreak.start),
        endTime: minToHm(nextBreak.end),
      });
      cursor = nextBreak.end;
      continue;
    }

    // Time available before the next break (or end of day)
    const chunkEnd = Math.min(nextBreak ? nextBreak.start : schoolEnd, schoolEnd);
    let available = chunkEnd - cursor;

    if (available < duration) {
      // Not enough time for a full lecture — skip to next boundary
      cursor = chunkEnd;
      continue;
    }

    while (available >= duration && cursor + duration <= chunkEnd) {
      lectureIdx += 1;
      const start = cursor;
      const end = cursor + duration;
      periods.push({
        id: `p${lectureIdx}`,
        kind: 'LECTURE',
        order: periods.length,
        name: `Period ${lectureIdx}`,
        startTime: minToHm(start),
        endTime: minToHm(end),
      });
      cursor = end;
      available = chunkEnd - cursor;
    }

    if (cursor < chunkEnd) {
      // Dangling minutes that can't fit a full lecture — jump to boundary.
      cursor = chunkEnd;
    }
  }

  return periods;
}

@Injectable()
export class ScheduleSettingsService {
  constructor(private prisma: PrismaService) {}

  async get(schoolId: string) {
    const row = await this.prisma.scheduleSettings.findUnique({ where: { schoolId } });
    const settings = row
      ? {
          startTime: row.startTime,
          endTime: row.endTime,
          lectureDuration: row.lectureDuration,
          breaks: Array.isArray(row.breaks) ? (row.breaks as unknown as BreakWindowDto[]) : [],
        }
      : DEFAULT_SETTINGS;

    return {
      settings,
      periods: generatePeriods(settings),
    };
  }

  async upsert(schoolId: string, dto: UpsertScheduleSettingsDto) {
    const breaks = dto.breaks || [];
    const row = await this.prisma.scheduleSettings.upsert({
      where: { schoolId },
      create: {
        schoolId,
        startTime: dto.startTime,
        endTime: dto.endTime,
        lectureDuration: dto.lectureDuration,
        breaks: breaks as any,
      },
      update: {
        startTime: dto.startTime,
        endTime: dto.endTime,
        lectureDuration: dto.lectureDuration,
        breaks: breaks as any,
      },
    });

    const settings = {
      startTime: row.startTime,
      endTime: row.endTime,
      lectureDuration: row.lectureDuration,
      breaks,
    };

    return {
      settings,
      periods: generatePeriods(settings),
    };
  }
}
