import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FeeStructuresService } from './services/fee-structures.service';
import { FeeInvoicesService } from './services/fee-invoices.service';
import { FeePaymentsService } from './services/fee-payments.service';
import { FeeHandoversService } from './services/fee-handovers.service';
import { ReceiptService } from './services/receipt.service';
import { FeeStructuresController } from './controllers/fee-structures.controller';
import { FeeInvoicesController } from './controllers/fee-invoices.controller';
import { FeePaymentsController } from './controllers/fee-payments.controller';
import { FeeHandoversController } from './controllers/fee-handovers.controller';

@Module({
  imports: [PrismaModule],
  controllers: [
    FeeStructuresController,
    FeeInvoicesController,
    FeePaymentsController,
    FeeHandoversController,
  ],
  providers: [
    FeeStructuresService,
    FeeInvoicesService,
    FeePaymentsService,
    FeeHandoversService,
    ReceiptService,
  ],
  exports: [
    FeeStructuresService,
    FeeInvoicesService,
    FeePaymentsService,
    FeeHandoversService,
    ReceiptService,
  ],
})
export class FeesModule {}


