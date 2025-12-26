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
import { FeeStructuresService } from '../services/fee-structures.service';
import { CreateFeeStructureDto } from '../dto/create-fee-structure.dto';
import { UpdateFeeStructureDto } from '../dto/update-fee-structure.dto';
import { FeeQueryDto } from '../dto/fee-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SchoolContext } from '../../academic/decorators/school-context.decorator';
import { SchoolGuard } from '../../academic/guards/school-guard.guard';
import { UserRole } from '@prisma/client';

@ApiTags('Fees - Structures')
@Controller('school/fees/structures')
@UseGuards(JwtAuthGuard, RolesGuard, SchoolGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT)
@ApiBearerAuth()
export class FeeStructuresController {
  constructor(private readonly feeStructuresService: FeeStructuresService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new fee structure' })
  @ApiResponse({ status: 201, description: 'Fee structure created successfully' })
  async create(@SchoolContext() schoolId: string, @Body() createFeeStructureDto: CreateFeeStructureDto) {
    return this.feeStructuresService.create(schoolId, createFeeStructureDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all fee structures with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Fee structures retrieved successfully' })
  async findAll(@SchoolContext() schoolId: string, @Query() query: FeeQueryDto) {
    return this.feeStructuresService.findAll(schoolId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a fee structure by ID' })
  @ApiResponse({ status: 200, description: 'Fee structure retrieved successfully' })
  async findOne(@SchoolContext() schoolId: string, @Param('id') id: string) {
    return this.feeStructuresService.findOne(schoolId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a fee structure' })
  @ApiResponse({ status: 200, description: 'Fee structure updated successfully' })
  async update(
    @SchoolContext() schoolId: string,
    @Param('id') id: string,
    @Body() updateFeeStructureDto: UpdateFeeStructureDto,
  ) {
    return this.feeStructuresService.update(schoolId, id, updateFeeStructureDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a fee structure' })
  @ApiResponse({ status: 200, description: 'Fee structure deleted successfully' })
  async remove(@SchoolContext() schoolId: string, @Param('id') id: string) {
    return this.feeStructuresService.remove(schoolId, id);
  }
}

