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
import { ClassesService } from '../services/classes.service';
import { CreateClassDto } from '../dto/create-class.dto';
import { UpdateClassDto } from '../dto/update-class.dto';
import { AcademicQueryDto } from '../dto/query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SchoolContext } from '../decorators/school-context.decorator';
import { SchoolGuard } from '../guards/school-guard.guard';
import { UserRole } from '@prisma/client';

@ApiTags('Academic - Classes')
@Controller('school/classes')
@UseGuards(JwtAuthGuard, RolesGuard, SchoolGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT)
@ApiBearerAuth()
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new class' })
  @ApiResponse({ status: 201, description: 'Class created successfully' })
  async create(@SchoolContext() schoolId: string, @Body() createClassDto: CreateClassDto) {
    return this.classesService.create(schoolId, createClassDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all classes with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Classes retrieved successfully' })
  async findAll(@SchoolContext() schoolId: string, @Query() query: AcademicQueryDto) {
    return this.classesService.findAll(schoolId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a class by ID' })
  @ApiResponse({ status: 200, description: 'Class retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Class not found' })
  async findOne(@SchoolContext() schoolId: string, @Param('id') id: string) {
    return this.classesService.findOne(schoolId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a class' })
  @ApiResponse({ status: 200, description: 'Class updated successfully' })
  async update(
    @SchoolContext() schoolId: string,
    @Param('id') id: string,
    @Body() updateClassDto: UpdateClassDto,
  ) {
    return this.classesService.update(schoolId, id, updateClassDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a class (soft delete)' })
  @ApiResponse({ status: 200, description: 'Class deleted successfully' })
  async remove(@SchoolContext() schoolId: string, @Param('id') id: string) {
    return this.classesService.remove(schoolId, id);
  }
}


