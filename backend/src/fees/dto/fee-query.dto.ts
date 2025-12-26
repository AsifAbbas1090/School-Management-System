import { IsOptional, IsString, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { FeeInvoiceStatus, PaymentMethod } from '@prisma/client';

export class FeeQueryDto {
  @ApiPropertyOptional({ example: 'search term' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 'student-id-uuid' })
  @IsString()
  @IsOptional()
  studentId?: string;

  @ApiPropertyOptional({ example: 'class-id-uuid' })
  @IsString()
  @IsOptional()
  classId?: string;

  @ApiPropertyOptional({ enum: FeeInvoiceStatus })
  @IsEnum(FeeInvoiceStatus)
  @IsOptional()
  status?: FeeInvoiceStatus;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize?: number = 10;
}

export class PaymentQueryDto {
  @ApiPropertyOptional({ example: 'student-id-uuid' })
  @IsString()
  @IsOptional()
  studentId?: string;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize?: number = 10;
}


