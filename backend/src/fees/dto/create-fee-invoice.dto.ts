import { IsString, IsNotEmpty, IsNumber, IsDateString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFeeInvoiceDto {
  @ApiProperty({ example: 'student-id-uuid' })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({ example: 'fee-structure-id-uuid' })
  @IsString()
  @IsNotEmpty()
  feeStructureId: string;

  @ApiProperty({ example: 5000, description: 'Amount in PKR' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: '2024-12-31', description: 'Due date' })
  @IsDateString()
  dueDate: string;
}


