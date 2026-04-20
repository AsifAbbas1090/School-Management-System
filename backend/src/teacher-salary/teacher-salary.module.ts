import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TeacherSalaryController } from './controllers/teacher-salary.controller';
import { TeacherSalaryService } from './services/teacher-salary.service';

@Module({
  imports: [PrismaModule],
  controllers: [TeacherSalaryController],
  providers: [TeacherSalaryService],
  exports: [TeacherSalaryService],
})
export class TeacherSalaryModule {}
