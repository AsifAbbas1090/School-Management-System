import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileUploadService } from '../services/file-upload.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SchoolContext } from '../../academic/decorators/school-context.decorator';
import { SchoolGuard } from '../../academic/guards/school-guard.guard';
import { UserRole } from '@prisma/client';

@ApiTags('File Upload')
@Controller('files')
@UseGuards(JwtAuthGuard, RolesGuard, SchoolGuard)
@ApiBearerAuth()
export class FileUploadController {
  constructor(private readonly fileUploadService: FileUploadService) {}

  @Post('expense-receipt')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload expense receipt image' })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  async uploadExpenseReceipt(
    @SchoolContext() schoolId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const expenseId = `temp_${Date.now()}`;
    const url = await this.fileUploadService.uploadExpenseReceipt(
      file,
      schoolId,
      expenseId,
    );
    return { receiptImageUrl: url };
  }

  @Post('school-logo')
  @Roles(UserRole.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload school logo' })
  @ApiResponse({ status: 201, description: 'Logo uploaded successfully' })
  async uploadSchoolLogo(
    @SchoolContext() schoolId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const url = await this.fileUploadService.uploadSchoolLogo(file, schoolId);
    return { logoUrl: url };
  }
}

