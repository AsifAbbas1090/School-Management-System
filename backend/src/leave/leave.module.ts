import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LeaveService } from './services/leave.service';
import { LeaveController } from './controllers/leave.controller';

@Module({
  imports: [PrismaModule],
  controllers: [LeaveController],
  providers: [LeaveService],
  exports: [LeaveService],
})
export class LeaveModule {}


