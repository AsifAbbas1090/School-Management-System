import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FeeHandoversService } from '../services/fee-handovers.service';
import { CreateFeeHandoverDto } from '../dto/create-fee-handover.dto';
import { FeeQueryDto } from '../dto/fee-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SchoolContext } from '../../academic/decorators/school-context.decorator';
import { SchoolGuard } from '../../academic/guards/school-guard.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Fees - Handovers')
@Controller('school/fees/handovers')
@UseGuards(JwtAuthGuard, RolesGuard, SchoolGuard)
@ApiBearerAuth()
export class FeeHandoversController {
  constructor(private readonly feeHandoversService: FeeHandoversService) {}

  @Get('my-summary')
  @Roles(UserRole.MANAGEMENT)
  @ApiOperation({ summary: 'Current manager unsubmitted total and recent handovers' })
  @ApiResponse({ status: 200, description: 'Summary retrieved successfully' })
  async getMySummary(
    @SchoolContext() schoolId: string,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.feeHandoversService.getManagerSummary(schoolId, user.id);
  }

  @Get('managers')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Per-manager collection overview (admin)' })
  @ApiResponse({ status: 200, description: 'Overview retrieved successfully' })
  async getManagersOverview(@SchoolContext() schoolId: string) {
    return this.feeHandoversService.getManagersOverview(schoolId);
  }

  @Get('summary')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT)
  @ApiOperation({ summary: 'Handover summary (admin: school-wide; management: own)' })
  @ApiResponse({ status: 200, description: 'Handover summary retrieved successfully' })
  async getSummary(
    @SchoolContext() schoolId: string,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.feeHandoversService.getHandoverSummary(schoolId, user);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT)
  @ApiOperation({ summary: 'List handovers (admin: all; management: own)' })
  @ApiResponse({ status: 200, description: 'Handovers retrieved successfully' })
  async findAll(
    @SchoolContext() schoolId: string,
    @Query() query: FeeQueryDto,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.feeHandoversService.findAll(schoolId, query, user);
  }

  @Patch(':id/verify')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Verify a submitted handover' })
  @ApiResponse({ status: 200, description: 'Handover verified' })
  async verify(
    @SchoolContext() schoolId: string,
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.feeHandoversService.verify(id, schoolId, user.id);
  }

  @Post()
  @Roles(UserRole.MANAGEMENT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit fee handover (all unsubmitted collections for this manager)' })
  @ApiResponse({ status: 201, description: 'Handover submitted successfully' })
  async create(
    @SchoolContext() schoolId: string,
    @CurrentUser() user: { id: string; role: UserRole },
    @Body() createFeeHandoverDto: CreateFeeHandoverDto,
  ) {
    return this.feeHandoversService.create(schoolId, user.id, createFeeHandoverDto);
  }
}
