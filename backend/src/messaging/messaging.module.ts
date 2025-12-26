import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MessagingService } from './services/messaging.service';
import { MessagingController } from './controllers/messaging.controller';

@Module({
  imports: [PrismaModule],
  controllers: [MessagingController],
  providers: [MessagingService],
  exports: [MessagingService],
})
export class MessagingModule {}


