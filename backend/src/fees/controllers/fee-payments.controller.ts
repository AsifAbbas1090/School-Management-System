import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
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
import { FeePaymentsService } from '../services/fee-payments.service';
import { CreateFeePaymentDto } from '../dto/create-fee-payment.dto';
import { UpdateFeePaymentDto } from '../dto/update-fee-payment.dto';
import { PaymentQueryDto } from '../dto/fee-query.dto';
import { ReceiptPayloadDto } from '../dto/receipt-payload.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SchoolContext } from '../../academic/decorators/school-context.decorator';
import { SchoolGuard } from '../../academic/guards/school-guard.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { parse } from 'csv-parse/sync';

@ApiTags('Fees - Payments')
@Controller('school/fees/payments')
@UseGuards(JwtAuthGuard, RolesGuard, SchoolGuard)
@ApiBearerAuth()
export class FeePaymentsController {
  constructor(private readonly feePaymentsService: FeePaymentsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.PARENT)
  @ApiOperation({ summary: 'Record a fee payment for a student' })
  @ApiResponse({ status: 201, description: 'Payment recorded successfully' })
  async create(
    @SchoolContext() schoolId: string,
    @Body() createFeePaymentDto: CreateFeePaymentDto,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.feePaymentsService.create(schoolId, createFeePaymentDto, user);
  }

  @Post('bulk-import')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT)
  @ApiOperation({ summary: 'Bulk import fee payments from CSV' })
  async bulkImport(
    @SchoolContext() schoolId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({
            skipMagicNumbersValidation: true,
            fileType:
              /(text\/csv|application\/csv|application\/vnd\.ms-excel|text\/plain|application\/octet-stream)/i,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
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
      throw new BadRequestException('CSV has no data rows');
    }
    return this.feePaymentsService.bulkImportFromRows(schoolId, records);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.PARENT)
  @ApiOperation({ summary: 'Get all fee payments with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Payments retrieved successfully' })
  async findAll(
    @SchoolContext() schoolId: string,
    @Query() query: PaymentQueryDto,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.feePaymentsService.findAll(schoolId, query, user);
  }

  @Get('revenue/stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT)
  @ApiOperation({ summary: 'Get revenue statistics (expected, collected, pending)' })
  @ApiResponse({ status: 200, description: 'Revenue statistics retrieved successfully' })
  async getRevenueStats(
    @SchoolContext() schoolId: string,
    @Query('month') month?: number,
    @Query('year') year?: number,
  ) {
    return this.feePaymentsService.getRevenueStats(schoolId, month, year);
  }

  @Get('student/:studentId/summary')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.PARENT)
  @ApiOperation({ summary: 'Get fee summary for a student' })
  @ApiResponse({ status: 200, description: 'Student fee summary retrieved successfully' })
  async getStudentSummary(
    @SchoolContext() schoolId: string,
    @Param('studentId') studentId: string,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.feePaymentsService.getStudentFeeSummary(schoolId, studentId, user);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.PARENT)
  @ApiOperation({ summary: 'Get a fee payment by ID' })
  @ApiResponse({ status: 200, description: 'Payment retrieved successfully' })
  async findOne(
    @SchoolContext() schoolId: string,
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.feePaymentsService.findOne(schoolId, id, user);
  }

  @Get(':id/receipt-payload')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.PARENT)
  @ApiOperation({ summary: 'Get receipt payload for PDF generation' })
  @ApiResponse({ status: 200, description: 'Receipt payload retrieved successfully', type: ReceiptPayloadDto })
  async getReceiptPayload(
    @SchoolContext() schoolId: string,
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.feePaymentsService.getReceiptPayload(schoolId, id, user);
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.PARENT)
  @ApiOperation({
    summary: 'Update a fee payment (admin: full; parent: top-up amountPaid / method / remarks only)',
  })
  @ApiResponse({ status: 200, description: 'Payment updated successfully' })
  async update(
    @SchoolContext() schoolId: string,
    @Param('id') id: string,
    @Body() updateFeePaymentDto: UpdateFeePaymentDto,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.feePaymentsService.update(schoolId, id, updateFeePaymentDto, user);
  }
}

