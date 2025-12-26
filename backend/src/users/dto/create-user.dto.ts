import { IsString, IsNotEmpty, IsEmail, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class CreateParentDto {
  @ApiProperty({ example: 'parent@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: 'John Parent' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: '+92 300 1234567' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'Engineer' })
  @IsString()
  @IsOptional()
  occupation?: string;
}

export class CreateTeacherDto {
  @ApiProperty({ example: 'teacher@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: 'Jane Teacher' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: '+92 300 1234567' })
  @IsString()
  @IsOptional()
  phone?: string;
}

export class CreateManagementDto {
  @ApiProperty({ example: 'principal@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: 'Dr. Principal' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: '+92 300 1234567' })
  @IsString()
  @IsOptional()
  phone?: string;
}


