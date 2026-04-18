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
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Fees - Invoices')
@Controller('school/fees/invoices')
@UseGuards(JwtAuthGuard, RolesGuard, SchoolGuard)
@ApiBearerAuth()
export class FeeInvoicesController {
  constructor(private readonly feeInvoicesService: FeeInvoicesService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT)
  @ApiOperation({ summary: 'Create a new fee invoice' })
  @ApiResponse({ status: 201, description: 'Fee invoice created successfully' })
  async create(@SchoolContext() schoolId: string, @Body() createFeeInvoiceDto: CreateFeeInvoiceDto) {
    return this.feeInvoicesService.create(schoolId, createFeeInvoiceDto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.PARENT)
  @ApiOperation({ summary: 'Get all fee invoices with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Fee invoices retrieved successfully' })
  async findAll(
    @SchoolContext() schoolId: string,
    @Query() query: FeeQueryDto,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.feeInvoicesService.findAll(schoolId, query, user);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.PARENT)
  @ApiOperation({ summary: 'Get a fee invoice by ID' })
  @ApiResponse({ status: 200, description: 'Fee invoice retrieved successfully' })
  async findOne(
    @SchoolContext() schoolId: string,
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.feeInvoicesService.findOne(schoolId, id, user);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT)
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
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a fee invoice' })
  @ApiResponse({ status: 200, description: 'Fee invoice deleted successfully' })
  async remove(@SchoolContext() schoolId: string, @Param('id') id: string) {
    return this.feeInvoicesService.remove(schoolId, id);
  }
}

