import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SchoolsModule } from './schools/schools.module';
import { AcademicModule } from './academic/academic.module';
import { FeesModule } from './fees/fees.module';
import { LeaveModule } from './leave/leave.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { MessagingModule } from './messaging/messaging.module';
import { ExamsModule } from './exams/exams.module';
import { ExpensesModule } from './expenses/expenses.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { FilesModule } from './files/files.module';
import { TeacherAttendanceModule } from './teacher-attendance/teacher-attendance.module';
import { PrismaModule } from './prisma/prisma.module';
import { initializeFirebase } from './config/firebase.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    SchoolsModule,
    AcademicModule,
    FeesModule,
    LeaveModule,
    AnnouncementsModule,
    MessagingModule,
    ExamsModule,
    ExpensesModule,
    AnalyticsModule,
    FilesModule,
    TeacherAttendanceModule,
  ],
})
export class AppModule {
  constructor() {
    // Initialize Firebase on app startup
    initializeFirebase();
  }
}

