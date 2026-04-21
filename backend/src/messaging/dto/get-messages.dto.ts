import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetMessagesDto {
  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 40, minimum: 10, maximum: 100, default: 40 })
  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(100)
  @IsOptional()
  limit?: number = 40;
}
