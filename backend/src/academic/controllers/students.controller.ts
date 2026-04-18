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
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { StudentsService } from '../services/students.service';
import { CreateStudentDto } from '../dto/create-student.dto';
import { UpdateStudentDto } from '../dto/update-student.dto';
import { BulkUpdateParentDto } from '../dto/bulk-update-parent.dto';
import { AcademicQueryDto } from '../dto/query.dto';
import { CsvImportResponseDto } from '../dto/csv-import.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SchoolContext } from '../decorators/school-context.decorator';
import { SchoolGuard } from '../guards/school-guard.guard';
import { UserRole } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Academic - Students')
@Controller('school/students')
@UseGuards(JwtAuthGuard, RolesGuard, SchoolGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT)
@ApiBearerAuth()
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new student' })
  @ApiResponse({ status: 201, description: 'Student created successfully' })
  async create(@SchoolContext() schoolId: string, @Body() createStudentDto: CreateStudentDto) {
    return this.studentsService.create(schoolId, createStudentDto);
  }

  @Post('bulk-import')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Bulk import students from CSV file' })
  @ApiResponse({ status: 200, description: 'Import completed', type: CsvImportResponseDto })
  async bulkImport(
    @SchoolContext() schoolId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          // Browsers / Excel often send CSV as application/vnd.ms-excel or text/plain — not only text/csv
          new FileTypeValidator({
            // CSV has no reliable magic bytes — without this, file-type returns null and every CSV fails.
            skipMagicNumbersValidation: true,
            fileType:
              /(text\/csv|application\/csv|application\/vnd\.ms-excel|text\/plain|application\/octet-stream)/i,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<CsvImportResponseDto> {
    const raw = file.buffer.toString('utf-8').replace(/^\uFEFF/, '');
    if (!raw.trim()) {
      throw new BadRequestException('CSV file is empty');
    }
    const records = parse(raw, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, unknown>[];

    if (!records.length) {
      throw new BadRequestException('CSV has no data rows (check headers and content)');
    }

    return this.studentsService.bulkImport(schoolId, records);
  }

  @Get()
  @ApiOperation({ summary: 'Get all students with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Students retrieved successfully' })
  async findAll(@SchoolContext() schoolId: string, @Query() query: AcademicQueryDto) {
    return this.studentsService.findAll(schoolId, query);
  }

  @Get('count')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.TEACHER)
  @ApiOperation({ summary: 'Total students in the current school (no list payload)' })
  @ApiResponse({ status: 200, description: 'Count retrieved successfully' })
  async getSchoolStudentCount(@SchoolContext() schoolId: string) {
    return this.studentsService.countBySchool(schoolId);
  }

  @Get('for-parents-ui')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT)
  @ApiOperation({ summary: 'Minimal student rows for Parents page (names, class, parent links)' })
  async getForParentsUi(@SchoolContext() schoolId: string) {
    return this.studentsService.findMinimalForParentsUi(schoolId);
  }

  @Get('my-children')
  @Roles(UserRole.PARENT)
  @ApiOperation({ summary: 'List students linked to the current parent (same school)' })
  @ApiResponse({ status: 200, description: 'Children retrieved successfully' })
  async getMyChildren(
    @SchoolContext() schoolId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.studentsService.findByParentId(schoolId, user.id);
  }

  @Patch('bulk-update-parent')
  @ApiOperation({ summary: 'Bulk assign or clear parent for students in this school' })
  @ApiResponse({ status: 200, description: 'Students updated' })
  async bulkUpdateParent(
    @SchoolContext() schoolId: string,
    @Body() body: BulkUpdateParentDto,
  ) {
    return this.studentsService.bulkUpdateParent(schoolId, body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a student by ID' })
  @ApiResponse({ status: 200, description: 'Student retrieved successfully' })
  async findOne(@SchoolContext() schoolId: string, @Param('id') id: string) {
    return this.studentsService.findOne(schoolId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a student' })
  @ApiResponse({ status: 200, description: 'Student updated successfully' })
  async update(
    @SchoolContext() schoolId: string,
    @Param('id') id: string,
    @Body() updateStudentDto: UpdateStudentDto,
  ) {
    return this.studentsService.update(schoolId, id, updateStudentDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a student' })
  @ApiResponse({ status: 200, description: 'Student deleted successfully' })
  async remove(@SchoolContext() schoolId: string, @Param('id') id: string) {
    return this.studentsService.remove(schoolId, id);
  }

  @Get(':id/fee-dues')
  @ApiOperation({ summary: 'Calculate fee dues from admission date to current month' })
  @ApiResponse({ status: 200, description: 'Fee dues calculated successfully' })
  async calculateFeeDues(@SchoolContext() schoolId: string, @Param('id') id: string) {
    return this.studentsService.calculateFeeDues(schoolId, id);
  }
}

