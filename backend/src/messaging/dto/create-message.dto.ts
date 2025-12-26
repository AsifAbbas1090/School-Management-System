import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, MessageReceiverType } from '@prisma/client';

export class CreateMessageDto {
  @ApiProperty({ enum: MessageReceiverType, example: MessageReceiverType.ROLE })
  @IsEnum(MessageReceiverType)
  receiverType: MessageReceiverType;

  @ApiPropertyOptional({ enum: UserRole, example: UserRole.PARENT })
  @IsEnum(UserRole)
  @IsOptional()
  receiverRole?: UserRole;

  @ApiPropertyOptional({ example: 'user-id-uuid' })
  @IsString()
  @IsOptional()
  receiverId?: string;

  @ApiPropertyOptional({ example: 'class-id-uuid' })
  @IsString()
  @IsOptional()
  receiverClassId?: string;

  @ApiPropertyOptional({ example: 'section-id-uuid' })
  @IsString()
  @IsOptional()
  receiverSectionId?: string;

  @ApiProperty({ example: 'Important Notice' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ example: 'Please check the following...' })
  @IsString()
  @IsNotEmpty()
  body: string;
}


