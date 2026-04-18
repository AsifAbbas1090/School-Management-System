import { ApiProperty } from '@nestjs/swagger';

export class CsvImportResponseDto {
  @ApiProperty({ example: 50 })
  total: number;

  @ApiProperty({ example: 45 })
  success: number;

  @ApiProperty({ example: 3 })
  failed: number;

  @ApiProperty({ example: 2, description: 'Rows skipped (duplicate roll in file or already in database)' })
  skipped: number;

  @ApiProperty({
    example: ['Row 4: roll STU01 — already exists in this school'],
    description: 'Human-readable skip reasons',
  })
  skippedDetails: string[];

  @ApiProperty({ example: ['Row 3: Invalid roll number', 'Row 7: Class not found'] })
  errors: string[];
}






