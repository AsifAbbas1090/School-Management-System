import { IsNumber, IsNotEmpty, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFeeHandoverDto {
  @ApiProperty({ example: 50000, description: 'Amount to submit in PKR' })
  @IsNumber()
  @Min(0)
  amountSubmitted: number;
}


