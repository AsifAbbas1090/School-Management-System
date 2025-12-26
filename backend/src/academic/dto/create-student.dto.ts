import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender, StudentStatus } from '@prisma/client';

export class CreateStudentDto {
  @ApiProperty({ example: 'class-id-uuid' })
  @IsString()
  @IsNotEmpty()
  classId: string;

  @ApiProperty({ example: 'section-id-uuid' })
  @IsString()
  @IsNotEmpty()
  sectionId: string;

  @ApiProperty({ example: 'STU001' })
  @IsString()
  @IsNotEmpty()
  rollNumber: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: Gender, example: Gender.MALE })
  @IsEnum(Gender)
  gender: Gender;

  @ApiProperty({ example: '2010-05-15' })
  @IsDateString()
  dateOfBirth: string;

  @ApiPropertyOptional({ example: 'parent-id-uuid' })
  @IsString()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({ enum: StudentStatus, default: StudentStatus.ACTIVE })
  @IsEnum(StudentStatus)
  @IsOptional()
  status?: StudentStatus;

  @ApiPropertyOptional({ example: '123 Main Street' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: '+92 300 1234567' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'student@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '2024-01-15', description: 'Admission date (defaults to today)' })
  @IsDateString()
  @IsOptional()
  admissionDate?: string;

  // Parent creation fields (when creating parent along with student)
  @ApiPropertyOptional({ example: 'John Parent', description: 'Parent name (required if creating parent)' })
  @IsString()
  @IsOptional()
  parentName?: string;

  @ApiPropertyOptional({ example: 'parent@example.com', description: 'Parent email (required if creating parent)' })
  @IsEmail()
  @IsOptional()
  parentEmail?: string;

  @ApiPropertyOptional({ example: 'password123', description: 'Parent password (required if creating parent)' })
  @IsString()
  @IsOptional()
  parentPassword?: string;

  @ApiPropertyOptional({ example: '+92 300 1234567', description: 'Parent phone' })
  @IsString()
  @IsOptional()
  parentPhone?: string;

  @ApiPropertyOptional({ example: 'Engineer', description: 'Parent occupation' })
  @IsString()
  @IsOptional()
  parentOccupation?: string;
}

