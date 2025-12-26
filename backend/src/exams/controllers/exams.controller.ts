import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ExamsService } from '../services/exams.service';
import { CreateExamDto } from '../dto/create-exam.dto';
import { BulkResultsDto } from '../dto/bulk-results.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SchoolContext } from '../../academic/decorators/school-context.decorator';
import { SchoolGuard } from '../../academic/guards/school-guard.guard';
import { UserRole } from '@prisma/client';

@ApiTags('Exams & Results')
@Controller('school/exams')
@UseGuards(JwtAuthGuard, RolesGuard, SchoolGuard)
@ApiBearerAuth()
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.TEACHER)
  @ApiOperation({ summary: 'Create a new exam' })
  @ApiResponse({ status: 201, description: 'Exam created successfully' })
  async create(@SchoolContext() schoolId: string, @Body() createExamDto: CreateExamDto) {
    return this.examsService.create(schoolId, createExamDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all exams with optional filters' })
  @ApiResponse({ status: 200, description: 'Exams retrieved successfully' })
  async findAll(
    @SchoolContext() schoolId: string,
    @Query('classId') classId?: string,
    @Query('sectionId') sectionId?: string,
    @Query('subjectId') subjectId?: string,
  ) {
    return this.examsService.findAll(schoolId, classId, sectionId, subjectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an exam by ID with results' })
  @ApiResponse({ status: 200, description: 'Exam retrieved successfully' })
  async findOne(@SchoolContext() schoolId: string, @Param('id') id: string) {
    return this.examsService.findOne(schoolId, id);
  }

  @Post(':id/results/bulk')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.TEACHER)
  @ApiOperation({ summary: 'Submit bulk results for an exam' })
  @ApiResponse({ status: 201, description: 'Results submitted successfully' })
  async submitBulkResults(
    @SchoolContext() schoolId: string,
    @Param('id') id: string,
    @Body() bulkResultsDto: BulkResultsDto,
  ) {
    return this.examsService.submitBulkResults(schoolId, id, bulkResultsDto);
  }

  @Get('results')
  @ApiOperation({ summary: 'Get student results' })
  @ApiResponse({ status: 200, description: 'Results retrieved successfully' })
  async getStudentResults(
    @SchoolContext() schoolId: string,
    @Query('studentId') studentId: string,
  ) {
    return this.examsService.getStudentResults(schoolId, studentId);
  }
}


