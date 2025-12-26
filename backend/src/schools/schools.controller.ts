import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { SchoolsService } from './schools.service';
import { SubscriptionService } from './services/subscription.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { SchoolQueryDto } from './dto/school-query.dto';
import { SchoolResponseDto } from './dto/school-response.dto';
import { SubscriptionAnalyticsDto } from './dto/subscription-analytics.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Super Admin - Schools')
@Controller('super-admin/schools')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class SchoolsController {
  constructor(
    private readonly schoolsService: SchoolsService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new school' })
  @ApiResponse({ status: 201, description: 'School created successfully', type: SchoolResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() createSchoolDto: CreateSchoolDto) {
    return this.schoolsService.create(createSchoolDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all schools with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Schools retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@Query() query: SchoolQueryDto) {
    return this.schoolsService.findAll(query);
  }

  @Get('analytics/subscriptions')
  @ApiOperation({ summary: 'Get subscription analytics and revenue metrics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully', type: SubscriptionAnalyticsDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSubscriptionAnalytics() {
    return this.subscriptionService.getSubscriptionAnalytics();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a school by ID' })
  @ApiResponse({ status: 200, description: 'School retrieved successfully', type: SchoolResponseDto })
  @ApiResponse({ status: 404, description: 'School not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(@Param('id') id: string) {
    return this.schoolsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a school' })
  @ApiResponse({ status: 200, description: 'School updated successfully', type: SchoolResponseDto })
  @ApiResponse({ status: 404, description: 'School not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async update(@Param('id') id: string, @Body() updateSchoolDto: UpdateSchoolDto) {
    return this.schoolsService.update(id, updateSchoolDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a school' })
  @ApiResponse({ status: 200, description: 'School deleted successfully' })
  @ApiResponse({ status: 404, description: 'School not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async remove(@Param('id') id: string) {
    return this.schoolsService.remove(id);
  }
}


