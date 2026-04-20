import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Duplicate the timetable slots from one weekday to another within the
 * same class/section. Defaults to overwriting the target day's slots so the
 * copy is idempotent; set `overwrite: false` to skip already-filled cells.
 */
export class CopyDayDto {
  @ApiProperty({ example: 'class-id-uuid' })
  @IsString()
  @IsNotEmpty()
  classId: string;

  @ApiProperty({ example: 'section-id-uuid' })
  @IsString()
  @IsNotEmpty()
  sectionId: string;

  @ApiProperty({ example: 'Monday' })
  @IsString()
  @IsNotEmpty()
  fromDay: string;

  @ApiProperty({ example: 'Tuesday' })
  @IsString()
  @IsNotEmpty()
  toDay: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  overwrite?: boolean;
}
