import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({ example: 'recipient-user-uuid' })
  @IsString()
  @IsNotEmpty()
  recipientId: string;
}
