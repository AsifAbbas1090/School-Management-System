import { Controller, Post, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SeedService } from '../services/seed.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Super Admin - Schools')
@Controller('super-admin/schools')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Post(':id/seed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Seed school with sample data (classes, sections, subjects, teachers, students)' })
  @ApiResponse({ status: 200, description: 'School seeded successfully' })
  @ApiResponse({ status: 404, description: 'School not found' })
  async seed(@Param('id') schoolId: string) {
    return this.seedService.seedSchool(schoolId);
  }
}


