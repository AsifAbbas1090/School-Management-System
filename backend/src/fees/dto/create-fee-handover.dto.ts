import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Partial or full handover — amount must not exceed cash on hand (collected − prior handovers − expenses). */
export class CreateFeeHandoverDto {
  @ApiProperty({ example: 1000, description: 'Amount to submit to admin (PKR)' })
  @IsNumber()
  @Min(0.01)
  amountSubmitted: number;
}
