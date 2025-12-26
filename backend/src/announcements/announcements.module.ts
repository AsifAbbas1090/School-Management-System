import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AnnouncementsService } from './services/announcements.service';
import { AnnouncementsController } from './controllers/announcements.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService],
  exports: [AnnouncementsService],
})
export class AnnouncementsModule {}


