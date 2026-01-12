import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class CreateFeePaymentDto {
  @ApiProperty({ example: 'student-id-uuid' })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({ example: 11, description: 'Month (1-12) for monthly tracking' })
  @IsNumber()
  @Min(1)
  @Max(12)
  month: number;

  @ApiProperty({ example: 2024, description: 'Year for monthly tracking' })
  @IsNumber()
  @Min(2000)
  @Max(2100)
  year: number;

  @ApiProperty({ example: 5000, description: 'Original fee amount (from student.monthlyFee)' })
  @IsNumber()
  @Min(0)
  originalAmount: number;

  @ApiPropertyOptional({ example: 10, description: 'Discount percentage (0-100)', default: 0 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  discountPercentage?: number = 0;

  @ApiProperty({ example: 4500, description: 'Actual amount received from student (can be different from calculated amount)' })
  @IsNumber()
  @Min(0)
  amountPaid: number;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CASH })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ example: 'TXN123456' })
  @IsString()
  @IsOptional()
  transactionId?: string;

  @ApiPropertyOptional({ example: 'Payment received for monthly fee' })
  @IsString()
  @IsOptional()
  remarks?: string;
}
