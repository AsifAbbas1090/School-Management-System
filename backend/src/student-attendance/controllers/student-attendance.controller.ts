import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { StudentAttendanceService } from '../services/student-attendance.service';
import { CreateStudentAttendanceDto } from '../dto/create-student-attendance.dto';
import { StudentAttendanceQueryDto } from '../dto/student-attendance-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SchoolContext } from '../../academic/decorators/school-context.decorator';
import { SchoolGuard } from '../../academic/guards/school-guard.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Student Attendance')
@Controller('school/student-attendance')
@UseGuards(JwtAuthGuard, RolesGuard, SchoolGuard)
@ApiBearerAuth()
export class StudentAttendanceController {
  constructor(private readonly service: StudentAttendanceService) {}

  @Post('bulk')
  @Roles(UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.TEACHER, UserRole.SUPPORT_STAFF)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit bulk attendance for a class/section' })
  @ApiResponse({ status: 201, description: 'Attendance saved successfully' })
  async bulkCreate(
    @SchoolContext() schoolId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateStudentAttendanceDto,
  ) {
    return this.service.bulkCreate(schoolId, user.id, dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.TEACHER, UserRole.SUPPORT_STAFF, UserRole.PARENT)
  @ApiOperation({ summary: 'Get attendance records with filters' })
  @ApiResponse({ status: 200, description: 'Records retrieved successfully' })
  async findAll(
    @SchoolContext() schoolId: string,
    @Query() query: StudentAttendanceQueryDto,
  ) {
    return this.service.findAll(schoolId, query);
  }

  @Get('summary')
  @Roles(UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.TEACHER, UserRole.SUPPORT_STAFF)
  @ApiOperation({ summary: 'Get attendance summary for a class/section on a date' })
  @ApiResponse({ status: 200, description: 'Summary retrieved successfully' })
  async getSummary(
    @SchoolContext() schoolId: string,
    @Query('classId') classId: string,
    @Query('sectionId') sectionId: string,
    @Query('date') date: string,
  ) {
    return this.service.getSummary(schoolId, classId, sectionId, date);
  }

  @Get('student/:studentId/report')
  @Roles(UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.TEACHER, UserRole.SUPPORT_STAFF, UserRole.PARENT)
  @ApiOperation({ summary: 'Get monthly attendance report for a student' })
  @ApiResponse({ status: 200, description: 'Report retrieved successfully' })
  async getStudentReport(
    @SchoolContext() schoolId: string,
    @Param('studentId') studentId: string,
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    return this.service.getStudentReport(schoolId, studentId, Number(month), Number(year));
  }
}
