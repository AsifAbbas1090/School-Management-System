import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AcademicQueryDto {
  @ApiPropertyOptional({ example: 'search term' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 'class-id-uuid' })
  @IsString()
  @IsOptional()
  classId?: string;

  @ApiPropertyOptional({ example: 'section-id-uuid' })
  @IsString()
  @IsOptional()
  sectionId?: string;

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


