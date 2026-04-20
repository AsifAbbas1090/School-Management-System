import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TimetableService } from '../services/timetable.service';
import { ScheduleSettingsService } from '../services/schedule-settings.service';
import { UpsertTimetableDto } from '../dto/upsert-timetable.dto';
import { UpsertScheduleSettingsDto } from '../dto/schedule-settings.dto';
import { CopyDayDto } from '../dto/copy-day.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SchoolContext } from '../../academic/decorators/school-context.decorator';
import { SchoolGuard } from '../../academic/guards/school-guard.guard';
import { UserRole } from '@prisma/client';

@ApiTags('Timetable')
@Controller('school/timetable')
@UseGuards(JwtAuthGuard, RolesGuard, SchoolGuard)
@ApiBearerAuth()
export class TimetableController {
  constructor(
    private readonly timetableService: TimetableService,
    private readonly scheduleSettingsService: ScheduleSettingsService,
  ) {}

  @Get('settings')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGEMENT,
    UserRole.TEACHER,
    UserRole.PARENT,
  )
  @ApiOperation({ summary: 'Get schedule settings + generated period list' })
  async getSettings(@SchoolContext() schoolId: string) {
    return this.scheduleSettingsService.get(schoolId);
  }

  @Put('settings')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update schedule settings (regenerates periods)' })
  async upsertSettings(
    @SchoolContext() schoolId: string,
    @Body() dto: UpsertScheduleSettingsDto,
  ) {
    return this.scheduleSettingsService.upsert(schoolId, dto);
  }

  @Post('copy-day')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Copy one weekday's slots onto another" })
  async copyDay(@SchoolContext() schoolId: string, @Body() dto: CopyDayDto) {
    return this.timetableService.copyDay(schoolId, dto);
  }

  @Get('conflicts')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT)
  @ApiOperation({ summary: 'Teacher double-booking report' })
  async conflicts(
    @SchoolContext() schoolId: string,
    @Query('classId') classId?: string,
    @Query('sectionId') sectionId?: string,
  ) {
    return this.timetableService.findTeacherConflicts(schoolId, classId, sectionId);
  }

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGEMENT,
    UserRole.TEACHER,
    UserRole.PARENT,
  )
  @ApiOperation({ summary: 'Get timetable for a class/section' })
  @ApiResponse({ status: 200, description: 'Timetable retrieved successfully' })
  async findByClassSection(
    @SchoolContext() schoolId: string,
    @Query('classId') classId: string,
    @Query('sectionId') sectionId: string,
  ) {
    return this.timetableService.findByClassSection(schoolId, classId, sectionId);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save timetable for a class/section' })
  @ApiResponse({ status: 200, description: 'Timetable saved successfully' })
  async upsert(@SchoolContext() schoolId: string, @Body() dto: UpsertTimetableDto) {
    return this.timetableService.upsert(schoolId, dto);
  }

  @Delete('slot')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear a single timetable slot' })
  async clearSlot(
    @SchoolContext() schoolId: string,
    @Query('classId') classId: string,
    @Query('sectionId') sectionId: string,
    @Query('day') day: string,
    @Query('periodId') periodId: string,
  ) {
    return this.timetableService.clearSlot(schoolId, classId, sectionId, day, periodId);
  }
}
