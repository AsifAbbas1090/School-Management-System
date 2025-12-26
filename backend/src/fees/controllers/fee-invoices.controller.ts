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
import { FeeInvoicesService } from '../services/fee-invoices.service';
import { CreateFeeInvoiceDto } from '../dto/create-fee-invoice.dto';
import { UpdateFeeInvoiceDto } from '../dto/update-fee-invoice.dto';
import { FeeQueryDto } from '../dto/fee-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SchoolContext } from '../../academic/decorators/school-context.decorator';
import { SchoolGuard } from '../../academic/guards/school-guard.guard';
import { UserRole } from '@prisma/client';

@ApiTags('Fees - Invoices')
@Controller('school/fees/invoices')
@UseGuards(JwtAuthGuard, RolesGuard, SchoolGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT)
@ApiBearerAuth()
export class FeeInvoicesController {
  constructor(private readonly feeInvoicesService: FeeInvoicesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new fee invoice' })
  @ApiResponse({ status: 201, description: 'Fee invoice created successfully' })
  async create(@SchoolContext() schoolId: string, @Body() createFeeInvoiceDto: CreateFeeInvoiceDto) {
    return this.feeInvoicesService.create(schoolId, createFeeInvoiceDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all fee invoices with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Fee invoices retrieved successfully' })
  async findAll(@SchoolContext() schoolId: string, @Query() query: FeeQueryDto) {
    return this.feeInvoicesService.findAll(schoolId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a fee invoice by ID' })
  @ApiResponse({ status: 200, description: 'Fee invoice retrieved successfully' })
  async findOne(@SchoolContext() schoolId: string, @Param('id') id: string) {
    return this.feeInvoicesService.findOne(schoolId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a fee invoice' })
  @ApiResponse({ status: 200, description: 'Fee invoice updated successfully' })
  async update(
    @SchoolContext() schoolId: string,
    @Param('id') id: string,
    @Body() updateFeeInvoiceDto: UpdateFeeInvoiceDto,
  ) {
    return this.feeInvoicesService.update(schoolId, id, updateFeeInvoiceDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a fee invoice' })
  @ApiResponse({ status: 200, description: 'Fee invoice deleted successfully' })
  async remove(@SchoolContext() schoolId: string, @Param('id') id: string) {
    return this.feeInvoicesService.remove(schoolId, id);
  }
}

