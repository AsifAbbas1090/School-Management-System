import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class TimetableSlotDto {
  @ApiProperty({ example: 'Monday' })
  @IsString()
  @IsNotEmpty()
  day: string;

  @ApiProperty({ example: '1' })
  @IsString()
  @IsNotEmpty()
  periodId: string;

  @ApiPropertyOptional({ example: 'subject-id-uuid' })
  @IsString()
  @IsOptional()
  subjectId?: string;

  @ApiPropertyOptional({ example: 'teacher-id-uuid' })
  @IsString()
  @IsOptional()
  teacherId?: string;

  @ApiPropertyOptional({ example: 'Room 101' })
  @IsString()
  @IsOptional()
  room?: string;
}

export class UpsertTimetableDto {
  @ApiProperty({ example: 'class-id-uuid' })
  @IsString()
  @IsNotEmpty()
  classId: string;

  @ApiProperty({ example: 'section-id-uuid' })
  @IsString()
  @IsNotEmpty()
  sectionId: string;

  @ApiProperty({ type: [TimetableSlotDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimetableSlotDto)
  slots: TimetableSlotDto[];
}
