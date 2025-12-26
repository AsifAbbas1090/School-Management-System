import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TeacherAttendanceService } from '../services/teacher-attendance.service';
import { CreateTeacherAttendanceDto } from '../dto/create-teacher-attendance.dto';
import { UpdateTeacherAttendanceDto } from '../dto/update-teacher-attendance.dto';
import { TeacherAttendanceQueryDto } from '../dto/teacher-attendance-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SchoolContext } from '../../academic/decorators/school-context.decorator';
import { SchoolGuard } from '../../academic/guards/school-guard.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Teacher Attendance')
@Controller('school/teacher-attendance')
@UseGuards(JwtAuthGuard, RolesGuard, SchoolGuard)
@ApiBearerAuth()
export class TeacherAttendanceController {
  constructor(private readonly teacherAttendanceService: TeacherAttendanceService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGEMENT)
  @ApiOperation({ summary: 'Record teacher attendance (Admin/Management only)' })
  @ApiResponse({ status: 201, description: 'Attendance recorded successfully' })
  async create(
    @SchoolContext() schoolId: string,
    @CurrentUser() user: any,
    @Body() createDto: CreateTeacherAttendanceDto,
  ) {
    return this.teacherAttendanceService.create(schoolId, user.id, createDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.TEACHER)
  @ApiOperation({ summary: 'Get teacher attendance records' })
  @ApiResponse({ status: 200, description: 'Attendance records retrieved successfully' })
  async findAll(
    @SchoolContext() schoolId: string,
    @CurrentUser() user: any,
    @Query() query: TeacherAttendanceQueryDto,
  ) {
    // Teachers can only see their own attendance
    if (user.role === UserRole.TEACHER) {
      query.teacherId = user.id;
    }
    return this.teacherAttendanceService.findAll(schoolId, query);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.TEACHER)
  @ApiOperation({ summary: 'Get teacher attendance statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats(
    @SchoolContext() schoolId: string,
    @CurrentUser() user: any,
    @Query('teacherId') teacherId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // Teachers can only see their own stats
    const finalTeacherId = user.role === UserRole.TEACHER ? user.id : teacherId;
    return this.teacherAttendanceService.getStats(schoolId, finalTeacherId, startDate, endDate);
  }

  @Get('teacher/:teacherId/stats')
  @Roles(UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.TEACHER)
  @ApiOperation({ summary: 'Get detailed stats for a specific teacher' })
  @ApiResponse({ status: 200, description: 'Teacher stats retrieved successfully' })
  async getTeacherStats(
    @SchoolContext() schoolId: string,
    @CurrentUser() user: any,
    @Param('teacherId') teacherId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // Teachers can only see their own stats
    if (user.role === UserRole.TEACHER && user.id !== teacherId) {
      throw new Error('You can only view your own attendance statistics');
    }
    return this.teacherAttendanceService.getTeacherStats(schoolId, teacherId, startDate, endDate);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.TEACHER)
  @ApiOperation({ summary: 'Get a teacher attendance record by ID' })
  @ApiResponse({ status: 200, description: 'Attendance record retrieved successfully' })
  async findOne(
    @SchoolContext() schoolId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const record = await this.teacherAttendanceService.findOne(schoolId, id);
    // Teachers can only see their own records
    if (user.role === UserRole.TEACHER && record.teacherId !== user.id) {
      throw new Error('You can only view your own attendance records');
    }
    return record;
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGEMENT)
  @ApiOperation({ summary: 'Update teacher attendance (Admin/Management only)' })
  @ApiResponse({ status: 200, description: 'Attendance updated successfully' })
  async update(
    @SchoolContext() schoolId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateTeacherAttendanceDto,
  ) {
    return this.teacherAttendanceService.update(schoolId, id, updateDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGEMENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete teacher attendance (Admin/Management only)' })
  @ApiResponse({ status: 200, description: 'Attendance deleted successfully' })
  async delete(
    @SchoolContext() schoolId: string,
    @Param('id') id: string,
  ) {
    return this.teacherAttendanceService.delete(schoolId, id);
  }
}

