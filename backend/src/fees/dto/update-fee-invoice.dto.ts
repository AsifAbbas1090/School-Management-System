import { IsOptional, IsNumber, IsDateString, IsEnum, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { FeeInvoiceStatus } from '@prisma/client';

export class UpdateFeeInvoiceDto {
  @ApiPropertyOptional({ example: 5000 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({ enum: FeeInvoiceStatus })
  @IsEnum(FeeInvoiceStatus)
  @IsOptional()
  status?: FeeInvoiceStatus;
}


