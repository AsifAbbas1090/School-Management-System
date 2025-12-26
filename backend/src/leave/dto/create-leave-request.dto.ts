import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeaveType } from '@prisma/client';

export class CreateLeaveRequestDto {
  @ApiPropertyOptional({ example: 'student-id-uuid', description: 'Required for PARENT role, null for TEACHER (self)' })
  @IsString()
  @IsOptional()
  requestedForStudentId?: string;

  @ApiProperty({ enum: LeaveType, example: LeaveType.SICK })
  @IsEnum(LeaveType)
  type: LeaveType;

  @ApiProperty({ example: '2024-12-25', description: 'Start date' })
  @IsDateString()
  fromDate: string;

  @ApiProperty({ example: '2024-12-27', description: 'End date' })
  @IsDateString()
  toDate: string;

  @ApiProperty({ example: 'I need to take leave due to personal reasons' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}


