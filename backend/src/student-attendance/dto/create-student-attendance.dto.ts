import { IsString, IsNotEmpty, IsEnum, IsDateString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { StudentAttendanceStatus } from '@prisma/client';

export class AttendanceEntryDto {
  @ApiProperty({ example: 'student-id-uuid' })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({ enum: StudentAttendanceStatus })
  @IsEnum(StudentAttendanceStatus)
  status: StudentAttendanceStatus;

  @ApiPropertyOptional({ example: 'Came late due to transport issue' })
  @IsString()
  @IsOptional()
  remarks?: string;
}

export class CreateStudentAttendanceDto {
  @ApiProperty({ example: 'class-id-uuid' })
  @IsString()
  @IsNotEmpty()
  classId: string;

  @ApiProperty({ example: 'section-id-uuid' })
  @IsString()
  @IsNotEmpty()
  sectionId: string;

  @ApiProperty({ example: '2024-04-05' })
  @IsDateString()
  date: string;

  @ApiProperty({ type: [AttendanceEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  entries: AttendanceEntryDto[];
}
