import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SalaryStatus, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SchoolGuard } from '../../academic/guards/school-guard.guard';
import { SchoolContext } from '../../academic/decorators/school-context.decorator';
import { CreateSalaryRecordDto } from '../dto/create-salary-record.dto';
import { PaySalaryDto } from '../dto/pay-salary.dto';
import { TeacherSalaryService } from '../services/teacher-salary.service';

@ApiTags('Teacher Salary')
@ApiBearerAuth()
@Controller('school/teacher-salary')
@UseGuards(JwtAuthGuard, RolesGuard, SchoolGuard)
export class TeacherSalaryController {
  constructor(private readonly service: TeacherSalaryService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT)
  @ApiOperation({ summary: 'Create a salary record for a teacher/month/year.' })
  create(@SchoolContext() schoolId: string, @Body() dto: CreateSalaryRecordDto) {
    return this.service.createRecord(schoolId, dto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.TEACHER)
  @ApiOperation({ summary: 'List salary records. Teachers automatically see only their own.' })
  findAll(
    @SchoolContext() schoolId: string,
    @Req() req: any,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('teacherId') teacherId?: string,
    @Query('status') status?: SalaryStatus,
  ) {
    return this.service.findAll(
      schoolId,
      { id: req.user.id, role: req.user.role },
      {
        page: page ? parseInt(page, 10) : undefined,
        pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
        teacherId,
        status,
      },
    );
  }

  @Get('summary')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT)
  @ApiOperation({ summary: 'School-wide salary liability summary (current month + overdue count).' })
  summary(@SchoolContext() schoolId: string) {
    return this.service.getSummary(schoolId);
  }

  @Get('pending')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT)
  @ApiOperation({ summary: 'All records that are not fully paid.' })
  pending(@SchoolContext() schoolId: string) {
    return this.service.getPending(schoolId);
  }

  @Get('teacher/:teacherId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.TEACHER)
  @ApiOperation({ summary: 'All salary records for one teacher.' })
  byTeacher(
    @SchoolContext() schoolId: string,
    @Param('teacherId') teacherId: string,
    @Req() req: any,
  ) {
    return this.service.getByTeacher(schoolId, teacherId, { id: req.user.id, role: req.user.role });
  }

  @Patch(':id/pay')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT)
  @ApiOperation({ summary: 'Record a salary payment (partial or full).' })
  pay(
    @SchoolContext() schoolId: string,
    @Param('id') id: string,
    @Body() dto: PaySalaryDto,
  ) {
    return this.service.paySalary(id, schoolId, dto);
  }
}
