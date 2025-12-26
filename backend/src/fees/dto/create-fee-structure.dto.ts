import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, Min } from 'class-validator';
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
}


