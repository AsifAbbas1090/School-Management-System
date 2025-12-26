import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionStatus } from '@prisma/client';

export class SchoolResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty({ required: false })
  principalName?: string;

  @ApiProperty({ required: false })
  ownerName?: string;

  @ApiProperty()
  subscriptionAmount: number;

  @ApiProperty({ enum: SubscriptionStatus })
  subscriptionStatus: SubscriptionStatus;

  @ApiProperty({ required: false })
  subscriptionStartDate?: Date;

  @ApiProperty({ required: false })
  nextBillingDate?: Date;

  @ApiProperty({ required: false })
  address?: string;

  @ApiProperty({ required: false })
  phone?: string;

  @ApiProperty({ required: false })
  email?: string;

  @ApiProperty({ required: false })
  website?: string;

  @ApiProperty({ required: false })
  logoUrl?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}


