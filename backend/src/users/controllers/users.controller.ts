import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Query,
  Param,
  Patch,
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
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { SchoolContext } from '../../academic/decorators/school-context.decorator';
import { SchoolGuard } from '../../academic/guards/school-guard.guard';
import { UserRole, UserStatus } from '@prisma/client';
import { UsersService } from '../services/users.service';
import { CreateParentDto, CreateTeacherDto, CreateManagementDto } from '../dto/create-user.dto';

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

  @Get('parents')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT)
  @ApiOperation({ summary: 'List all parent users' })
  async getParents(@SchoolContext() schoolId: string) {
    return this.usersService.getUsersByRole(schoolId, UserRole.PARENT);
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
    @Body() updateData: { name?: string; email?: string; phone?: string; password?: string; status?: string },
  ) {
    // Convert status string to UserStatus enum if provided
    const processedData: {
      name?: string;
      email?: string;
      phone?: string;
      password?: string;
      status?: UserStatus;
    } = {
      name: updateData.name,
      email: updateData.email,
      phone: updateData.phone,
      password: updateData.password,
    };
    
    if (updateData.status) {
      processedData.status = updateData.status as UserStatus;
    }
    
    return this.usersService.updateUser(userId, schoolId, processedData);
  }
}


