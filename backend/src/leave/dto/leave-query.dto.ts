import { IsOptional, IsString, IsInt, Min, Max, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { LeaveStatus, LeaveType } from '@prisma/client';

export class LeaveQueryDto {
  @ApiPropertyOptional({ example: 'student-id-uuid' })
  @IsString()
  @IsOptional()
  studentId?: string;

  @ApiPropertyOptional({ enum: LeaveType })
  @IsEnum(LeaveType)
  @IsOptional()
  type?: LeaveType;

  @ApiPropertyOptional({ enum: LeaveStatus })
  @IsEnum(LeaveStatus)
  @IsOptional()
  status?: LeaveStatus;

  @ApiPropertyOptional({ example: '2024-12-01' })
  @IsDateString()
  @IsOptional()
  fromDate?: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsDateString()
  @IsOptional()
  toDate?: string;

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


