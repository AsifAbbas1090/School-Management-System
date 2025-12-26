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
import { AcademicQueryDto } from '../dto/query.dto';
import { CsvImportResponseDto } from '../dto/csv-import.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SchoolContext } from '../decorators/school-context.decorator';
import { SchoolGuard } from '../guards/school-guard.guard';
import { UserRole } from '@prisma/client';
import { parse } from 'csv-parse/sync';

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
          new FileTypeValidator({ fileType: 'text/csv' }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<CsvImportResponseDto> {
    const fileContent = file.buffer.toString('utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const students: CreateStudentDto[] = records.map((record: any) => ({
      classId: record.classId,
      sectionId: record.sectionId,
      rollNumber: record.rollNumber,
      name: record.name,
      gender: record.gender.toUpperCase(),
      dateOfBirth: record.dateOfBirth,
      parentId: record.parentId || undefined,
      status: record.status?.toUpperCase() || undefined,
      address: record.address || undefined,
      phone: record.phone || undefined,
      email: record.email || undefined,
    }));

    return this.studentsService.bulkImport(schoolId, students);
  }

  @Get()
  @ApiOperation({ summary: 'Get all students with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Students retrieved successfully' })
  async findAll(@SchoolContext() schoolId: string, @Query() query: AcademicQueryDto) {
    return this.studentsService.findAll(schoolId, query);
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

