import {
  Controller,
  Get,
  Post,
  Body,
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

  @Post()
  @Roles(UserRole.MANAGEMENT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit fee handover (Management only)' })
  @ApiResponse({ status: 201, description: 'Handover submitted successfully' })
  async create(
    @SchoolContext() schoolId: string,
    @CurrentUser() user: any,
    @Body() createFeeHandoverDto: CreateFeeHandoverDto,
  ) {
    return this.feeHandoversService.create(schoolId, user.id, createFeeHandoverDto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT)
  @ApiOperation({ summary: 'Get all fee handovers with pagination' })
  @ApiResponse({ status: 200, description: 'Handovers retrieved successfully' })
  async findAll(@SchoolContext() schoolId: string, @Query() query: FeeQueryDto) {
    return this.feeHandoversService.findAll(schoolId, query);
  }

  @Get('summary')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT)
  @ApiOperation({ summary: 'Get handover summary (total collected, handed over, available)' })
  @ApiResponse({ status: 200, description: 'Handover summary retrieved successfully' })
  async getSummary(@SchoolContext() schoolId: string) {
    return this.feeHandoversService.getHandoverSummary(schoolId);
  }
}

