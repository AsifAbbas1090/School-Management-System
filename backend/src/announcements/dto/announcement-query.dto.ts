import { IsOptional, IsString, IsInt, Min, Max, IsEnum, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class AnnouncementQueryDto {
  @ApiPropertyOptional({ example: 'search term' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({ example: 'class-id-uuid' })
  @IsString()
  @IsOptional()
  classId?: string;

  @ApiPropertyOptional({ example: true })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  isPinned?: boolean;

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


