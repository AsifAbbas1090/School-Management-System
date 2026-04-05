import { Module } from '@nestjs/common';
import { TimetableController } from './controllers/timetable.controller';
import { TimetableService } from './services/timetable.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TimetableController],
  providers: [TimetableService],
  exports: [TimetableService],
})
export class TimetableModule {}
