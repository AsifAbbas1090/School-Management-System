import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ExamsService } from './services/exams.service';
import { ExamsController } from './controllers/exams.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ExamsController],
  providers: [ExamsService],
  exports: [ExamsService],
})
export class ExamsModule {}


