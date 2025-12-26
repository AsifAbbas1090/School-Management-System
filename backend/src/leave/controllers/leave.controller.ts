import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LeaveService } from '../services/leave.service';
import { CreateLeaveRequestDto } from '../dto/create-leave-request.dto';
import { LeaveQueryDto } from '../dto/leave-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SchoolContext } from '../../academic/decorators/school-context.decorator';
import { SchoolGuard } from '../../academic/guards/school-guard.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Leave Management')
@Controller('school/leave')
@UseGuards(JwtAuthGuard, RolesGuard, SchoolGuard)
@ApiBearerAuth()
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post()
  @Roles(UserRole.TEACHER, UserRole.PARENT)
  @ApiOperation({ summary: 'Create a leave request (Teacher for self, Parent for child)' })
  @ApiResponse({ status: 201, description: 'Leave request created successfully' })
  async create(
    @SchoolContext() schoolId: string,
    @CurrentUser() user: any,
    @Body() createLeaveRequestDto: CreateLeaveRequestDto,
  ) {
    return this.leaveService.create(schoolId, user.id, user.role, createLeaveRequestDto);
  }

  @Get('my')
  @Roles(UserRole.TEACHER, UserRole.PARENT, UserRole.ADMIN, UserRole.MANAGEMENT)
  @ApiOperation({ summary: 'Get current user\'s leave requests' })
  @ApiResponse({ status: 200, description: 'Leave requests retrieved successfully' })
  async findMyRequests(
    @SchoolContext() schoolId: string,
    @CurrentUser() user: any,
    @Query() query: LeaveQueryDto,
  ) {
    return this.leaveService.findMyRequests(schoolId, user.id, query);
  }

  @Get('pending')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT)
  @ApiOperation({ summary: 'Get pending leave requests (Admin/Management only)' })
  @ApiResponse({ status: 200, description: 'Pending leave requests retrieved successfully' })
  async findPendingRequests(
    @SchoolContext() schoolId: string,
    @Query() query: LeaveQueryDto,
  ) {
    return this.leaveService.findPendingRequests(schoolId, query);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.TEACHER, UserRole.PARENT)
  @ApiOperation({ summary: 'Get a leave request by ID' })
  @ApiResponse({ status: 200, description: 'Leave request retrieved successfully' })
  async findOne(
    @SchoolContext() schoolId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.leaveService.findOne(schoolId, id, user.id, user.role);
  }

  @Patch(':id/approve')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a leave request (Admin/Management only)' })
  @ApiResponse({ status: 200, description: 'Leave request approved successfully' })
  async approve(
    @SchoolContext() schoolId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.leaveService.approve(schoolId, id, user.id);
  }

  @Patch(':id/reject')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a leave request (Admin/Management only)' })
  @ApiResponse({ status: 200, description: 'Leave request rejected successfully' })
  async reject(
    @SchoolContext() schoolId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.leaveService.reject(schoolId, id, user.id);
  }
}


