import { Module } from '@nestjs/common';
import { FileUploadService } from './services/file-upload.service';
import { FileUploadController } from './controllers/file-upload.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FileUploadController],
  providers: [FileUploadService],
  exports: [FileUploadService],
})
export class FilesModule {}


