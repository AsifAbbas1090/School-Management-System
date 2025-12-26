import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ExpensesService } from './services/expenses.service';
import { ExpensesController } from './controllers/expenses.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}


