import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { MessagingService } from '../services/messaging.service';
import { CreateMessageDto } from '../dto/create-message.dto';
import { MessageQueryDto } from '../dto/message-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { SchoolContext } from '../../academic/decorators/school-context.decorator';
import { SchoolGuard } from '../../academic/guards/school-guard.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Messaging')
@Controller('school/messages')
@UseGuards(JwtAuthGuard, RolesGuard, SchoolGuard)
@ApiBearerAuth()
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Post()
  @ApiOperation({ summary: 'Send a message' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  async create(
    @SchoolContext() schoolId: string,
    @CurrentUser() user: any,
    @Body() createMessageDto: CreateMessageDto,
  ) {
    return this.messagingService.create(schoolId, user.id, createMessageDto);
  }

  @Get('inbox')
  @ApiOperation({ summary: 'Get inbox messages for current user' })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  async getInbox(
    @SchoolContext() schoolId: string,
    @CurrentUser() user: any,
    @Query() query: MessageQueryDto,
  ) {
    return this.messagingService.getInbox(schoolId, user.id, user.role, null, query);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark message as read' })
  @ApiResponse({ status: 200, description: 'Message marked as read' })
  async markAsRead(
    @SchoolContext() schoolId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.messagingService.markAsRead(schoolId, id, user.id);
  }
}

