import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionStatus } from '@prisma/client';

export class SchoolQueryDto {
  @ApiPropertyOptional({ example: 'al-abbas' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: SubscriptionStatus })
  @IsEnum(SubscriptionStatus)
  @IsOptional()
  subscriptionStatus?: SubscriptionStatus;

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


