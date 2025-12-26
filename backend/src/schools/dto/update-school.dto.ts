import { PartialType } from '@nestjs/swagger';
import { CreateSchoolDto } from './create-school.dto';
import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionStatus } from '@prisma/client';

export class UpdateSchoolDto extends PartialType(CreateSchoolDto) {
  @ApiPropertyOptional({ enum: SubscriptionStatus })
  @IsEnum(SubscriptionStatus)
  @IsOptional()
  subscriptionStatus?: SubscriptionStatus;

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00Z' })
  @IsOptional()
  subscriptionStartDate?: string;

  @ApiPropertyOptional({ example: '2024-02-01T00:00:00Z' })
  @IsOptional()
  nextBillingDate?: Date;
}


