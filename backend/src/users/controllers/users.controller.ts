import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Param,
  Patch,
  Delete,
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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SchoolContext } from '../../academic/decorators/school-context.decorator';
import { SchoolGuard } from '../../academic/guards/school-guard.guard';
import { UserRole } from '@prisma/client';
import { UsersService } from '../services/users.service';
import {
  CreateParentDto,
  CreateTeacherDto,
  CreateManagementDto,
  UpdateUserDto,
} from '../dto/create-user.dto';

@ApiTags('Users')
@Controller('school/users')
@UseGuards(JwtAuthGuard, RolesGuard, SchoolGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('parents')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT)
  @ApiOperation({ summary: 'Create a parent user account' })
  @ApiResponse({ status: 201, description: 'Parent created successfully' })
  async createParent(
    @SchoolContext() schoolId: string,
    @Body() createParentDto: CreateParentDto,
  ) {
    return this.usersService.createParent(schoolId, createParentDto);
  }

  @Post('teachers')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT)
  @ApiOperation({ summary: 'Create a teacher user account' })
  @ApiResponse({ status: 201, description: 'Teacher created successfully' })
  async createTeacher(
    @SchoolContext() schoolId: string,
    @Body() createTeacherDto: CreateTeacherDto,
  ) {
    return this.usersService.createTeacher(schoolId, createTeacherDto);
  }

  @Post('management')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a management user account (Admin only)' })
  @ApiResponse({ status: 201, description: 'Management user created successfully' })
  async createManagement(
    @SchoolContext() schoolId: string,
    @Body() createManagementDto: CreateManagementDto,
  ) {
    return this.usersService.createManagement(schoolId, createManagementDto);
  }

  @Get('parents/count')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.TEACHER)
  @ApiOperation({ summary: 'Count parent users in the current school' })
  async countParents(@SchoolContext() schoolId: string) {
    return this.usersService.countUsersByRole(schoolId, UserRole.PARENT);
  }

  @Get('teachers/count')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.TEACHER)
  @ApiOperation({ summary: 'Count teacher users in the current school' })
  async countTeachers(@SchoolContext() schoolId: string) {
    return this.usersService.countUsersByRole(schoolId, UserRole.TEACHER);
  }

  @Get('parents')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT)
  @ApiOperation({ summary: 'List parent users (always paginated; defaults page=1, pageSize=25)' })
  async getParents(
    @SchoolContext() schoolId: string,
    @Query('page') pageStr?: string,
    @Query('pageSize') pageSizeStr?: string,
    @Query('limit') limitStr?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const page = pageStr != null && pageStr !== '' ? parseInt(pageStr, 10) : 1;
    const fromLimit = limitStr != null && limitStr !== '' ? parseInt(limitStr, 10) : NaN;
    const fromPageSize = pageSizeStr != null && pageSizeStr !== '' ? parseInt(pageSizeStr, 10) : NaN;
    const pageSizeRaw = Number.isFinite(fromLimit) ? fromLimit : Number.isFinite(fromPageSize) ? fromPageSize : 25;
    return this.usersService.getUsersByRole(schoolId, UserRole.PARENT, {
      page: Number.isFinite(page) && page > 0 ? page : 1,
      pageSize: Number.isFinite(pageSizeRaw) && pageSizeRaw > 0 ? Math.min(100, pageSizeRaw) : 25,
      search: search ?? undefined,
      status: status ?? undefined,
    });
  }

  @Get('teachers')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT)
  @ApiOperation({ summary: 'List all teacher users' })
  async getTeachers(@SchoolContext() schoolId: string) {
    return this.usersService.getUsersByRole(schoolId, UserRole.TEACHER);
  }

  @Get('management')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'List all management users' })
  async getManagement(@SchoolContext() schoolId: string) {
    return this.usersService.getUsersByRole(schoolId, UserRole.MANAGEMENT);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT)
  @ApiOperation({ summary: 'Update a user account' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  async updateUser(
    @SchoolContext() schoolId: string,
    @Param('id') userId: string,
    @Body() body: UpdateUserDto,
  ) {
    return this.usersService.updateUser(userId, schoolId, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT)
  @ApiOperation({ summary: 'Soft-delete a user in the current school' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  async deleteUser(@SchoolContext() schoolId: string, @Param('id') userId: string) {
    return this.usersService.deleteUser(userId, schoolId);
  }
}


