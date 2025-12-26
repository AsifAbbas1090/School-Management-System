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
import { SectionsService } from '../services/sections.service';
import { CreateSectionDto } from '../dto/create-section.dto';
import { UpdateSectionDto } from '../dto/update-section.dto';
import { AcademicQueryDto } from '../dto/query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SchoolContext } from '../decorators/school-context.decorator';
import { SchoolGuard } from '../guards/school-guard.guard';
import { UserRole } from '@prisma/client';

@ApiTags('Academic - Sections')
@Controller('school/sections')
@UseGuards(JwtAuthGuard, RolesGuard, SchoolGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT)
@ApiBearerAuth()
export class SectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new section' })
  @ApiResponse({ status: 201, description: 'Section created successfully' })
  async create(@SchoolContext() schoolId: string, @Body() createSectionDto: CreateSectionDto) {
    return this.sectionsService.create(schoolId, createSectionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all sections with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Sections retrieved successfully' })
  async findAll(@SchoolContext() schoolId: string, @Query() query: AcademicQueryDto) {
    return this.sectionsService.findAll(schoolId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a section by ID' })
  @ApiResponse({ status: 200, description: 'Section retrieved successfully' })
  async findOne(@SchoolContext() schoolId: string, @Param('id') id: string) {
    return this.sectionsService.findOne(schoolId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a section' })
  @ApiResponse({ status: 200, description: 'Section updated successfully' })
  async update(
    @SchoolContext() schoolId: string,
    @Param('id') id: string,
    @Body() updateSectionDto: UpdateSectionDto,
  ) {
    return this.sectionsService.update(schoolId, id, updateSectionDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a section (soft delete)' })
  @ApiResponse({ status: 200, description: 'Section deleted successfully' })
  async remove(@SchoolContext() schoolId: string, @Param('id') id: string) {
    return this.sectionsService.remove(schoolId, id);
  }
}


