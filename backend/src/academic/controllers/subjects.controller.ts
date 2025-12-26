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
import { SubjectsService } from '../services/subjects.service';
import { CreateSubjectDto } from '../dto/create-subject.dto';
import { UpdateSubjectDto } from '../dto/update-subject.dto';
import { AcademicQueryDto } from '../dto/query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SchoolContext } from '../decorators/school-context.decorator';
import { SchoolGuard } from '../guards/school-guard.guard';
import { UserRole } from '@prisma/client';

@ApiTags('Academic - Subjects')
@Controller('school/subjects')
@UseGuards(JwtAuthGuard, RolesGuard, SchoolGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT)
@ApiBearerAuth()
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new subject' })
  @ApiResponse({ status: 201, description: 'Subject created successfully' })
  async create(@SchoolContext() schoolId: string, @Body() createSubjectDto: CreateSubjectDto) {
    return this.subjectsService.create(schoolId, createSubjectDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all subjects with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Subjects retrieved successfully' })
  async findAll(@SchoolContext() schoolId: string, @Query() query: AcademicQueryDto) {
    return this.subjectsService.findAll(schoolId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a subject by ID' })
  @ApiResponse({ status: 200, description: 'Subject retrieved successfully' })
  async findOne(@SchoolContext() schoolId: string, @Param('id') id: string) {
    return this.subjectsService.findOne(schoolId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a subject' })
  @ApiResponse({ status: 200, description: 'Subject updated successfully' })
  async update(
    @SchoolContext() schoolId: string,
    @Param('id') id: string,
    @Body() updateSubjectDto: UpdateSubjectDto,
  ) {
    return this.subjectsService.update(schoolId, id, updateSubjectDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a subject (soft delete)' })
  @ApiResponse({ status: 200, description: 'Subject deleted successfully' })
  async remove(@SchoolContext() schoolId: string, @Param('id') id: string) {
    return this.subjectsService.remove(schoolId, id);
  }
}


