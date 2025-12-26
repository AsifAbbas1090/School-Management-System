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
import { FeePaymentsService } from '../services/fee-payments.service';
import { CreateFeePaymentDto } from '../dto/create-fee-payment.dto';
import { PaymentQueryDto } from '../dto/fee-query.dto';
import { ReceiptPayloadDto } from '../dto/receipt-payload.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SchoolContext } from '../../academic/decorators/school-context.decorator';
import { SchoolGuard } from '../../academic/guards/school-guard.guard';
import { UserRole } from '@prisma/client';

@ApiTags('Fees - Payments')
@Controller('school/fees/payments')
@UseGuards(JwtAuthGuard, RolesGuard, SchoolGuard)
@ApiBearerAuth()
export class FeePaymentsController {
  constructor(private readonly feePaymentsService: FeePaymentsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT)
  @ApiOperation({ summary: 'Record a fee payment for a student' })
  @ApiResponse({ status: 201, description: 'Payment recorded successfully' })
  async create(@SchoolContext() schoolId: string, @Body() createFeePaymentDto: CreateFeePaymentDto) {
    return this.feePaymentsService.create(schoolId, createFeePaymentDto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.PARENT)
  @ApiOperation({ summary: 'Get all fee payments with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Payments retrieved successfully' })
  async findAll(@SchoolContext() schoolId: string, @Query() query: PaymentQueryDto) {
    return this.feePaymentsService.findAll(schoolId, query);
  }

  @Get('student/:studentId/summary')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.PARENT)
  @ApiOperation({ summary: 'Get fee summary for a student' })
  @ApiResponse({ status: 200, description: 'Student fee summary retrieved successfully' })
  async getStudentSummary(
    @SchoolContext() schoolId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.feePaymentsService.getStudentFeeSummary(schoolId, studentId);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.PARENT)
  @ApiOperation({ summary: 'Get a fee payment by ID' })
  @ApiResponse({ status: 200, description: 'Payment retrieved successfully' })
  async findOne(@SchoolContext() schoolId: string, @Param('id') id: string) {
    return this.feePaymentsService.findOne(schoolId, id);
  }

  @Get(':id/receipt-payload')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.PARENT)
  @ApiOperation({ summary: 'Get receipt payload for PDF generation' })
  @ApiResponse({ status: 200, description: 'Receipt payload retrieved successfully', type: ReceiptPayloadDto })
  async getReceiptPayload(@SchoolContext() schoolId: string, @Param('id') id: string) {
    return this.feePaymentsService.getReceiptPayload(schoolId, id);
  }
}

