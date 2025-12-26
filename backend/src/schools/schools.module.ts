import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SchoolsService } from './schools.service';
import { SchoolsController } from './schools.controller';
import { SubscriptionService } from './services/subscription.service';
import { SeedService } from './services/seed.service';
import { SeedController } from './controllers/seed.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [PrismaModule, forwardRef(() => UsersModule)],
  controllers: [SchoolsController, SeedController],
  providers: [SchoolsService, SubscriptionService, SeedService],
  exports: [SchoolsService, SubscriptionService, SeedService],
})
export class SchoolsModule {}

