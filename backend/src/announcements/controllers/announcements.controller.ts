import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
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
import { AnnouncementsService } from '../services/announcements.service';
import { CreateAnnouncementDto } from '../dto/create-announcement.dto';
import { UpdateAnnouncementDto } from '../dto/update-announcement.dto';
import { AnnouncementQueryDto } from '../dto/announcement-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SchoolContext } from '../../academic/decorators/school-context.decorator';
import { SchoolGuard } from '../../academic/guards/school-guard.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Announcements')
@Controller('school/announcements')
@UseGuards(JwtAuthGuard, RolesGuard, SchoolGuard)
@ApiBearerAuth()
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT)
  @ApiOperation({ summary: 'Create a new announcement' })
  @ApiResponse({ status: 201, description: 'Announcement created successfully' })
  async create(
    @SchoolContext() schoolId: string,
    @CurrentUser() user: any,
    @Body() createAnnouncementDto: CreateAnnouncementDto,
  ) {
    return this.announcementsService.create(schoolId, user.id, createAnnouncementDto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.TEACHER, UserRole.PARENT)
  @ApiOperation({ summary: 'Get all announcements (filtered by role/class)' })
  @ApiResponse({ status: 200, description: 'Announcements retrieved successfully' })
  async findAll(
    @SchoolContext() schoolId: string,
    @CurrentUser() user: any,
    @Query() query: AnnouncementQueryDto,
  ) {
    return this.announcementsService.findAll(schoolId, user.role, null, query);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.TEACHER, UserRole.PARENT)
  @ApiOperation({ summary: 'Get an announcement by ID' })
  @ApiResponse({ status: 200, description: 'Announcement retrieved successfully' })
  async findOne(@SchoolContext() schoolId: string, @Param('id') id: string) {
    return this.announcementsService.findOne(schoolId, id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT)
  @ApiOperation({ summary: 'Update an announcement' })
  @ApiResponse({ status: 200, description: 'Announcement updated successfully' })
  async update(
    @SchoolContext() schoolId: string,
    @Param('id') id: string,
    @Body() updateAnnouncementDto: UpdateAnnouncementDto,
  ) {
    return this.announcementsService.update(schoolId, id, updateAnnouncementDto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an announcement' })
  @ApiResponse({ status: 200, description: 'Announcement deleted successfully' })
  async remove(@SchoolContext() schoolId: string, @Param('id') id: string) {
    return this.announcementsService.remove(schoolId, id);
  }
}

