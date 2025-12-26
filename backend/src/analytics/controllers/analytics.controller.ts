import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AnalyticsService } from '../services/analytics.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SchoolContext } from '../../academic/decorators/school-context.decorator';
import { SchoolGuard } from '../../academic/guards/school-guard.guard';
import { UserRole } from '@prisma/client';

@ApiTags('Analytics & Dashboard')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard, SchoolGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('school/analytics/dashboard')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT)
  @ApiOperation({ summary: 'Get dashboard data for Admin/Management' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  async getDashboard(
    @SchoolContext() schoolId: string,
    @Query('role') role: string,
  ) {
    return this.analyticsService.getDashboardData(schoolId, role);
  }

  @Get('super-admin/analytics/overview')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get overview analytics for Super Admin' })
  @ApiResponse({ status: 200, description: 'Overview data retrieved successfully' })
  async getSuperAdminOverview() {
    return this.analyticsService.getSuperAdminOverview();
  }
}


