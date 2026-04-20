import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaySalaryDto {
  @ApiProperty({ example: 15000, description: 'Amount paid right now; will be added to existing amountPaid.' })
  @IsNumber()
  @Min(0)
  amountPaid: number;

  @ApiPropertyOptional({ example: 'April salary cleared in cash' })
  @IsString()
  @IsOptional()
  notes?: string;
}
