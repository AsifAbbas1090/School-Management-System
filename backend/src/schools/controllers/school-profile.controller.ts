import { Controller, Get, Patch, Body, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SchoolsService } from '../schools.service';
import { UpdateSchoolProfileDto } from '../dto/update-school-profile.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SchoolContext } from '../../academic/decorators/school-context.decorator';
import { SchoolGuard } from '../../academic/guards/school-guard.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('School — Profile (school admin)')
@Controller('school')
@UseGuards(JwtAuthGuard, RolesGuard, SchoolGuard)
@ApiBearerAuth()
export class SchoolProfileController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Get('profile')
  @Roles(UserRole.ADMIN, UserRole.MANAGEMENT)
  @ApiOperation({ summary: 'Get current school profile (school admin)' })
  @ApiResponse({ status: 200, description: 'School retrieved' })
  async getProfile(
    @SchoolContext() schoolId: string,
    @CurrentUser() user: { schoolId: string | null },
  ) {
    if (!user.schoolId || user.schoolId !== schoolId) {
      throw new ForbiddenException('You can only access your own school');
    }
    return this.schoolsService.findOne(schoolId);
  }

  @Patch('profile')
  @Roles(UserRole.ADMIN, UserRole.MANAGEMENT)
  @ApiOperation({ summary: 'Update current school profile (school admin)' })
  @ApiResponse({ status: 200, description: 'School updated' })
  async updateProfile(
    @SchoolContext() schoolId: string,
    @CurrentUser() user: { schoolId: string | null },
    @Body() dto: UpdateSchoolProfileDto,
  ) {
    if (!user.schoolId || user.schoolId !== schoolId) {
      throw new ForbiddenException('You can only update your own school');
    }
    return this.schoolsService.updateSchoolProfile(schoolId, dto);
  }
}
