import { IsOptional, IsString, IsEnum, IsDateString, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { StudentAttendanceStatus } from '@prisma/client';

export class StudentAttendanceQueryDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  classId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sectionId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  studentId?: string;

  @ApiPropertyOptional({ example: '2024-04-05' })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ example: '2024-04-01' })
  @IsDateString()
  @IsOptional()
  fromDate?: string;

  @ApiPropertyOptional({ example: '2024-04-30' })
  @IsDateString()
  @IsOptional()
  toDate?: string;

  @ApiPropertyOptional({ enum: StudentAttendanceStatus })
  @IsEnum(StudentAttendanceStatus)
  @IsOptional()
  status?: StudentAttendanceStatus;

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 200 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  pageSize?: number = 200;
}
