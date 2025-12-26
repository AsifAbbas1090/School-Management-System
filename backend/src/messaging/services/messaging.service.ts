import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMessageDto } from '../dto/create-message.dto';
import { MessageQueryDto } from '../dto/message-query.dto';
import { MessageReceiverType, UserRole } from '@prisma/client';

@Injectable()
export class MessagingService {
  constructor(private prisma: PrismaService) {}

  async create(schoolId: string, senderId: string, createMessageDto: CreateMessageDto) {
    // Validate receiver based on receiverType
    if (createMessageDto.receiverType === MessageReceiverType.ROLE) {
      if (!createMessageDto.receiverRole) {
        throw new BadRequestException('receiverRole is required when receiverType is ROLE');
      }
    } else if (createMessageDto.receiverType === MessageReceiverType.USER) {
      if (!createMessageDto.receiverId) {
        throw new BadRequestException('receiverId is required when receiverType is USER');
      }

      // Verify receiver belongs to school
      const receiver = await this.prisma.user.findFirst({
        where: {
          id: createMessageDto.receiverId,
          schoolId,
          deletedAt: null,
        },
      });

      if (!receiver) {
        throw new NotFoundException('Receiver not found');
      }
    } else if (createMessageDto.receiverType === MessageReceiverType.CLASS) {
      if (!createMessageDto.receiverClassId) {
        throw new BadRequestException('receiverClassId is required when receiverType is CLASS');
      }

      const classEntity = await this.prisma.class.findFirst({
        where: {
          id: createMessageDto.receiverClassId,
          schoolId,
          deletedAt: null,
        },
      });

      if (!classEntity) {
        throw new NotFoundException('Class not found');
      }
    }

    return this.prisma.message.create({
      data: {
        schoolId,
        senderId,
        receiverType: createMessageDto.receiverType,
        receiverRole: createMessageDto.receiverRole || null,
        receiverId: createMessageDto.receiverId || null,
        receiverClassId: createMessageDto.receiverClassId || null,
        receiverSectionId: createMessageDto.receiverSectionId || null,
        subject: createMessageDto.subject,
        body: createMessageDto.body,
      } as any,
      include: {
        User_Message_senderIdToUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        User_Message_receiverIdToUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  async getInbox(schoolId: string, userId: string, userRole: UserRole, userClassId: string | null, query: MessageQueryDto) {
    const { isRead, page = 1, pageSize = 10 } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {
      schoolId,
      OR: [
        { receiverId: userId },
        { receiverRole: userRole },
      ],
    };

    if (userClassId) {
      where.OR.push({ receiverClassId: userClassId });
    }

    if (isRead !== undefined) {
      where.isRead = isRead;
    }

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { sentAt: 'desc' },
        include: {
          User_Message_senderIdToUser: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.message.count({ where }),
    ]);

    return {
      data: messages,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async markAsRead(schoolId: string, id: string, userId: string) {
    const message = await this.prisma.message.findFirst({
      where: {
        id,
        schoolId,
        OR: [
          { receiverId: userId },
          { receiverRole: { in: [UserRole.PARENT, UserRole.TEACHER] } },
        ],
      },
    });

    if (!message) {
      throw new NotFoundException(`Message with ID ${id} not found`);
    }

    if (message.isRead) {
      return message;
    }

    return this.prisma.message.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
      include: {
        User_Message_senderIdToUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }
}

