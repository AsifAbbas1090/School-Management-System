import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TeacherAttendanceStatus } from '@prisma/client';

export class TeacherAttendanceQueryDto {
  @ApiPropertyOptional({ example: 'teacher-id-uuid' })
  @IsString()
  @IsOptional()
  teacherId?: string;

  @ApiPropertyOptional({ example: '2024-12-01' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ enum: TeacherAttendanceStatus })
  @IsEnum(TeacherAttendanceStatus)
  @IsOptional()
  status?: TeacherAttendanceStatus;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  pageSize?: number;
}

