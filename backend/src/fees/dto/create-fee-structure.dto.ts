import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FeeFrequency } from '@prisma/client';

export class CreateFeeStructureDto {
  @ApiPropertyOptional({ example: 'class-id-uuid', description: 'null for global (all classes)' })
  @IsString()
  @IsOptional()
  classId?: string;

  @ApiProperty({ example: 'Tuition Fee' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 5000, description: 'Amount in PKR' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ enum: FeeFrequency, example: FeeFrequency.MONTHLY })
  @IsEnum(FeeFrequency)
  frequency: FeeFrequency;

  @ApiPropertyOptional({ example: false, description: 'Allow payers to pay fees for future months in advance' })
  @IsBoolean()
  @IsOptional()
  allowAdvancePayment?: boolean;

  @ApiPropertyOptional({ example: 3, minimum: 1, maximum: 24, description: 'Max months of advance allowed when allowAdvancePayment is true' })
  @IsInt()
  @Min(1)
  @Max(24)
  @IsOptional()
  advanceMonths?: number;
}






