import { IsString, IsNotEmpty, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TeacherAttendanceStatus } from '@prisma/client';

export class CreateTeacherAttendanceDto {
  @ApiProperty({ example: 'teacher-id-uuid' })
  @IsString()
  @IsNotEmpty()
  teacherId: string;

  @ApiProperty({ example: '2024-12-25', description: 'Date of attendance' })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ enum: TeacherAttendanceStatus, example: TeacherAttendanceStatus.PRESENT })
  @IsEnum(TeacherAttendanceStatus)
  status: TeacherAttendanceStatus;

  @ApiPropertyOptional({ example: '2024-12-25T08:00:00Z', description: 'Entry time (optional)' })
  @IsDateString()
  @IsOptional()
  entryTime?: string;

  @ApiPropertyOptional({ example: '2024-12-25T17:00:00Z', description: 'Exit time (optional)' })
  @IsDateString()
  @IsOptional()
  exitTime?: string;

  @ApiPropertyOptional({ example: 'Regular attendance' })
  @IsString()
  @IsOptional()
  notes?: string;
}

