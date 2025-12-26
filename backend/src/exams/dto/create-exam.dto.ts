import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExamType } from '@prisma/client';

export class CreateExamDto {
  @ApiProperty({ example: 'Midterm Exam' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: ExamType, example: ExamType.MIDTERM })
  @IsEnum(ExamType)
  type: ExamType;

  @ApiProperty({ example: 'class-id-uuid' })
  @IsString()
  @IsNotEmpty()
  classId: string;

  @ApiPropertyOptional({ example: 'section-id-uuid' })
  @IsString()
  @IsOptional()
  sectionId?: string;

  @ApiProperty({ example: 'subject-id-uuid' })
  @IsString()
  @IsNotEmpty()
  subjectId: string;

  @ApiProperty({ example: '2024-12-30' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0)
  totalMarks: number;
}


