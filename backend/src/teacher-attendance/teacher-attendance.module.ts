import { Module } from '@nestjs/common';
import { TeacherAttendanceController } from './controllers/teacher-attendance.controller';
import { TeacherAttendanceService } from './services/teacher-attendance.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TeacherAttendanceController],
  providers: [TeacherAttendanceService],
  exports: [TeacherAttendanceService],
})
export class TeacherAttendanceModule {}

