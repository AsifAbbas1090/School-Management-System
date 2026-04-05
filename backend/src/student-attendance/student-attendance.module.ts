import { Module } from '@nestjs/common';
import { StudentAttendanceController } from './controllers/student-attendance.controller';
import { StudentAttendanceService } from './services/student-attendance.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StudentAttendanceController],
  providers: [StudentAttendanceService],
  exports: [StudentAttendanceService],
})
export class StudentAttendanceModule {}
