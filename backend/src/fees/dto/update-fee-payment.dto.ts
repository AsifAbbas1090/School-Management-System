import { IsString, IsOptional, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class UpdateFeePaymentDto {
  @ApiPropertyOptional({ example: 5000, description: 'Original fee amount (from student.monthlyFee)' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  originalAmount?: number;

  @ApiPropertyOptional({ example: 10, description: 'Discount percentage (0-100)', default: 0 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  discountPercentage?: number;

  @ApiPropertyOptional({ example: 4500, description: 'Actual amount received from student' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  amountPaid?: number;

  @ApiPropertyOptional({ enum: PaymentMethod, example: PaymentMethod.CASH })
  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ example: 'TXN123456' })
  @IsString()
  @IsOptional()
  transactionId?: string;

  @ApiPropertyOptional({ example: 'Payment received for monthly fee' })
  @IsString()
  @IsOptional()
  remarks?: string;
}

