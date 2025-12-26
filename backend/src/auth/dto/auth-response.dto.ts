import { ApiProperty } from '@nestjs/swagger';
import { UserRole, UserStatus } from '@prisma/client';

export class AuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty({ required: false })
  refreshToken?: string;

  @ApiProperty()
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    status: UserStatus;
    phone?: string;
    avatarUrl?: string;
    schoolId?: string;
  };
}


