import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';

export class BulkUpdateParentDto {
  @ApiProperty({ type: [String], description: 'Student IDs in this school to update' })
  @IsArray()
  @IsString({ each: true })
  studentIds: string[];

  @ApiPropertyOptional({
    nullable: true,
    description: 'Parent user id to assign, or null to clear parent link',
  })
  @IsOptional()
  @ValidateIf((_, v) => v != null && typeof v === 'string')
  @IsUUID()
  parentId?: string | null;
}
