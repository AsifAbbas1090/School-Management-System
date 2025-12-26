import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClassDto {
  @ApiProperty({ example: '1' })
  @IsString()
  @IsNotEmpty()
  grade: string;

  @ApiProperty({ example: 'Class 1' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Class 1 - Primary' })
  @IsString()
  @IsOptional()
  displayName?: string;
}


