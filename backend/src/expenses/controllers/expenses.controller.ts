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
} from '@nestjs/swagger';
import { ExpensesService } from '../services/expenses.service';
import { CreateExpenseDto } from '../dto/create-expense.dto';
import { UpdateExpenseDto } from '../dto/update-expense.dto';
import { ExpenseQueryDto } from '../dto/expense-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SchoolContext } from '../../academic/decorators/school-context.decorator';
import { SchoolGuard } from '../../academic/guards/school-guard.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Expenses')
@Controller('school/expenses')
@UseGuards(JwtAuthGuard, RolesGuard, SchoolGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT)
@ApiBearerAuth()
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new expense' })
  @ApiResponse({ status: 201, description: 'Expense created successfully' })
  async create(
    @SchoolContext() schoolId: string,
    @CurrentUser() user: any,
    @Body() createExpenseDto: CreateExpenseDto,
  ) {
    return this.expensesService.create(schoolId, user.id, user.role, createExpenseDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all expenses with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Expenses retrieved successfully' })
  async findAll(@SchoolContext() schoolId: string, @Query() query: ExpenseQueryDto) {
    return this.expensesService.findAll(schoolId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an expense by ID' })
  @ApiResponse({ status: 200, description: 'Expense retrieved successfully' })
  async findOne(@SchoolContext() schoolId: string, @Param('id') id: string) {
    return this.expensesService.findOne(schoolId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an expense' })
  @ApiResponse({ status: 200, description: 'Expense updated successfully' })
  async update(
    @SchoolContext() schoolId: string,
    @Param('id') id: string,
    @Body() updateExpenseDto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(schoolId, id, updateExpenseDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an expense (soft delete)' })
  @ApiResponse({ status: 200, description: 'Expense deleted successfully' })
  async remove(@SchoolContext() schoolId: string, @Param('id') id: string) {
    return this.expensesService.remove(schoolId, id);
  }
}


