import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class CreateFeePaymentDto {
  @ApiProperty({ example: 'student-id-uuid' })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiPropertyOptional({ example: 'invoice-id-uuid' })
  @IsString()
  @IsOptional()
  invoiceId?: string;

  @ApiProperty({ example: 5000, description: 'Amount paid in PKR' })
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


