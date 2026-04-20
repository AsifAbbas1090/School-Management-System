import { IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSalaryRecordDto {
  @ApiProperty({ example: 'teacher-user-uuid' })
  @IsString()
  teacherId: string;

  @ApiProperty({ example: 4, minimum: 1, maximum: 12 })
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @ApiProperty({ example: 2026, minimum: 2000, maximum: 2100 })
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @ApiPropertyOptional({ example: 0, description: 'Advance paid before record creation — reduces remainingDue immediately.' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  advancePaid?: number;

  @ApiPropertyOptional({ example: 'Paid Rs. 5000 advance on 1 Apr for travel' })
  @IsString()
  @IsOptional()
  notes?: string;
}
