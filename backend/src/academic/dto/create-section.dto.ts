import { IsString, IsNotEmpty, IsInt, Min, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSectionDto {
  @ApiProperty({ example: 'class-id-uuid' })
  @IsString()
  @IsNotEmpty()
  classId: string;

  @ApiProperty({ example: 'A' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 30, default: 30 })
  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;

  @ApiPropertyOptional({ example: 'teacher-id-uuid' })
  @IsString()
  @IsOptional()
  classTeacherId?: string;
}


