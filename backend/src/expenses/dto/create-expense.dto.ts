import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExpenseDto {
  @ApiProperty({ example: 'Office Supplies' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: 'Supplies' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({ example: 'Purchased stationery items' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ example: 'https://storage.example.com/receipt.jpg' })
  @IsString()
  @IsOptional()
  receiptImageUrl?: string;
}


