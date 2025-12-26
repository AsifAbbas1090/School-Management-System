import { ApiProperty } from '@nestjs/swagger';

export class SubscriptionAnalyticsDto {
  @ApiProperty({ example: 150000 })
  totalMonthlyRevenue: number;

  @ApiProperty({ example: 1800000 })
  totalRevenue: number;

  @ApiProperty({ example: 5 })
  totalSchools: number;

  @ApiProperty({ example: 3 })
  activeSchools: number;

  @ApiProperty({ example: 1 })
  expiredSchools: number;

  @ApiProperty({ example: 1 })
  dueSoonSchools: number;

  @ApiProperty({ example: 0 })
  pendingSchools: number;
}


