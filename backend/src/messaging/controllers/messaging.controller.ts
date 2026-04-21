import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { MessagingService } from '../services/messaging.service';
import { CreateConversationDto } from '../dto/create-conversation.dto';
import { SendMessageDto } from '../dto/send-message.dto';
import { GetMessagesDto } from '../dto/get-messages.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SchoolContext } from '../../academic/decorators/school-context.decorator';
import { SchoolGuard } from '../../academic/guards/school-guard.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

/**
 * Chat API. Every endpoint is gated on a valid JWT + school context.
 * Static routes are declared BEFORE parameterized routes (NestJS matches
 * top-down) so `/unread-count` and `/users/search` don't collide with
 * `/conversations/:id`.
 */
@ApiTags('Messaging')
@Controller('messaging')
@UseGuards(JwtAuthGuard, RolesGuard, SchoolGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.TEACHER, UserRole.PARENT)
@ApiBearerAuth()
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  // ── static routes first ─────────────────────────────────────

  @Get('unread-count')
  @ApiOperation({ summary: 'Total unread messages across all conversations (for sidebar badge)' })
  @ApiResponse({ status: 200, description: 'Unread count returned' })
  async getUnreadCount(
    @CurrentUser() user: any,
    @SchoolContext() schoolId: string,
  ) {
    return this.messagingService.getUnreadCount(user.id, schoolId);
  }

  @Get('users/search')
  @ApiOperation({ summary: 'Search users in this school to start a conversation with' })
  @ApiResponse({ status: 200, description: 'Matching users returned' })
  async searchUsers(
    @CurrentUser() user: any,
    @SchoolContext() schoolId: string,
    @Query('q') q: string = '',
  ) {
    return this.messagingService.searchUsers(schoolId, user.id, q);
  }

  // ── conversations ───────────────────────────────────────────

  @Get('conversations')
  @ApiOperation({ summary: 'List all conversations the current user participates in' })
  @ApiResponse({ status: 200, description: 'Conversation previews returned' })
  async getMyConversations(
    @CurrentUser() user: any,
    @SchoolContext() schoolId: string,
  ) {
    return this.messagingService.getMyConversations(user.id, schoolId);
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Start a new conversation (or fetch the existing one) with a user' })
  @ApiResponse({ status: 201, description: 'Conversation created or returned' })
  async createConversation(
    @CurrentUser() user: any,
    @SchoolContext() schoolId: string,
    @Body() dto: CreateConversationDto,
  ) {
    return this.messagingService.getOrCreateConversation(user.id, dto.recipientId, schoolId);
  }

  // ── messages (parameterized — declared last) ────────────────

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Page back through a conversation (newest first)' })
  @ApiResponse({ status: 200, description: 'Messages page returned' })
  async getMessages(
    @CurrentUser() user: any,
    @SchoolContext() schoolId: string,
    @Param('id') conversationId: string,
    @Query() query: GetMessagesDto,
  ) {
    return this.messagingService.getMessages(
      conversationId,
      user.id,
      schoolId,
      query.page,
      query.limit,
    );
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Send a message to this conversation' })
  @ApiResponse({ status: 201, description: 'Message sent' })
  async sendMessage(
    @CurrentUser() user: any,
    @SchoolContext() schoolId: string,
    @Param('id') conversationId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagingService.sendMessage(conversationId, user.id, schoolId, dto.content);
  }
}
