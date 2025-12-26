import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { ClassesService } from './services/classes.service';
import { SectionsService } from './services/sections.service';
import { SubjectsService } from './services/subjects.service';
import { StudentsService } from './services/students.service';
import { ClassesController } from './controllers/classes.controller';
import { SectionsController } from './controllers/sections.controller';
import { SubjectsController } from './controllers/subjects.controller';
import { StudentsController } from './controllers/students.controller';

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [
    ClassesController,
    SectionsController,
    SubjectsController,
    StudentsController,
  ],
  providers: [
    ClassesService,
    SectionsService,
    SubjectsService,
    StudentsService,
  ],
  exports: [
    ClassesService,
    SectionsService,
    SubjectsService,
    StudentsService,
  ],
})
export class AcademicModule {}

