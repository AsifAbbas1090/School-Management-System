import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connected successfully');
    } catch (error) {
      this.logger.warn(`Failed to connect to database: ${error.message}`);
      this.logger.warn('Please check your DATABASE_URL in .env file');
      this.logger.warn('Backend will continue to start, but database operations may fail');
      // Don't throw - allow backend to start even if DB is temporarily unavailable
      // This is useful for development when DB might be starting up
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
    } catch (error) {
      // Silently handle disconnect errors
    }
  }
}

