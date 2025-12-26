import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSubjectDto {
  @ApiProperty({ example: 'Mathematics' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'MATH' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({ example: 'Basic mathematics for primary level' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: ['class-id-1', 'class-id-2'], description: 'Array of class IDs this subject is taught in' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  classIds?: string[];
}


