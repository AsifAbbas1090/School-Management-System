import { Module } from '@nestjs/common';
import { TimetableController } from './controllers/timetable.controller';
import { TimetableService } from './services/timetable.service';
import { ScheduleSettingsService } from './services/schedule-settings.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TimetableController],
  providers: [TimetableService, ScheduleSettingsService],
  exports: [TimetableService, ScheduleSettingsService],
})
export class TimetableModule {}
