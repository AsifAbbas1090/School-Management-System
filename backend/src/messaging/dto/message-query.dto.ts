import { IsOptional, IsInt, Min, Max, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class MessageQueryDto {
  @ApiPropertyOptional({ example: false })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  isRead?: boolean;

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


