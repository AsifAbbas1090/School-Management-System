import { ApiProperty } from '@nestjs/swagger';

export class CsvImportResponseDto {
  @ApiProperty({ example: 50 })
  total: number;

  @ApiProperty({ example: 45 })
  success: number;

  @ApiProperty({ example: 5 })
  failed: number;

  @ApiProperty({ example: ['Row 3: Invalid roll number', 'Row 7: Class not found'] })
  errors: string[];
}


