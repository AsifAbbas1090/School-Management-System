import { IsString, IsNotEmpty, IsOptional, IsArray, IsEnum, IsDateString, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class CreateAnnouncementDto {
  @ApiProperty({ example: 'Holiday Notice' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'School will be closed on...' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ example: [UserRole.PARENT, UserRole.TEACHER], type: [String] })
  @IsArray()
  @IsEnum(UserRole, { each: true })
  targetRoles: UserRole[];

  @ApiPropertyOptional({ example: ['class-id-1', 'class-id-2'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  targetClassIds?: string[];

  @ApiProperty({ example: '2024-12-24' })
  @IsDateString()
  publishDate: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsDateString()
  @IsOptional()
  expiryDate?: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isPinned?: boolean;
}

