import { IsArray, ValidateNested, IsString, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExamResultItemDto {
  @ApiProperty({ example: 'student-id-uuid' })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({ example: 85 })
  @IsNumber()
  @Min(0)
  obtainedMarks: number;

  @ApiPropertyOptional({ example: 'A' })
  @IsString()
  @IsOptional()
  grade?: string;

  @ApiPropertyOptional({ example: 'Excellent performance' })
  @IsString()
  @IsOptional()
  remarks?: string;
}

export class BulkResultsDto {
  @ApiProperty({ type: [ExamResultItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExamResultItemDto)
  results: ExamResultItemDto[];
}

