import { IsString, IsInt, IsOptional, IsArray, Matches, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Single break window between lectures (e.g. morning break, lunch).
 * `startTime` / `endTime` are 24h `HH:mm` strings so the frontend can
 * render them directly without timezone arithmetic.
 */
export class BreakWindowDto {
  @ApiPropertyOptional({ example: 'Lunch' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: '12:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'startTime must be HH:mm' })
  startTime: string;

  @ApiProperty({ example: '13:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'endTime must be HH:mm' })
  endTime: string;
}

export class UpsertScheduleSettingsDto {
  @ApiProperty({ example: '08:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'startTime must be HH:mm' })
  startTime: string;

  @ApiProperty({ example: '14:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'endTime must be HH:mm' })
  endTime: string;

  @ApiProperty({ example: 40, description: 'Lecture duration in minutes' })
  @IsInt()
  @Min(15)
  @Max(180)
  lectureDuration: number;

  @ApiPropertyOptional({ type: [BreakWindowDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => BreakWindowDto)
  breaks?: BreakWindowDto[];
}
