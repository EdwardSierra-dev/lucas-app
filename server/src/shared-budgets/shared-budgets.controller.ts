import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SharedBudgetsService } from './shared-budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { AddIncomeDto } from './dto/add-income.dto';
import { AddBudgetExpenseDto } from './dto/add-budget-expense.dto';
import { SetLimitDto } from './dto/set-limit.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

interface AuthenticatedRequest {
  user: JwtPayload;
}

/**
 * Shared budget core endpoints (Requirement 5): budget creation/listing,
 * member listing, and the invitation lifecycle. All routes require a valid
 * access token.
 */
@Controller()
@UseGuards(JwtAuthGuard)
export class SharedBudgetsController {
  constructor(private readonly budgetsService: SharedBudgetsService) {}

  @Post('budgets')
  @HttpCode(HttpStatus.CREATED)
  createBudget(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateBudgetDto,
  ) {
    return this.budgetsService.createBudget(req.user.sub, dto);
  }

  @Get('budgets')
  listBudgets(@Req() req: AuthenticatedRequest) {
    return this.budgetsService.listBudgets(req.user.sub);
  }

  @Get('budgets/:id/members')
  listMembers(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) budgetId: string,
  ) {
    return this.budgetsService.listMembers(req.user.sub, budgetId);
  }

  @Post('budgets/:id/invitations')
  @HttpCode(HttpStatus.CREATED)
  inviteMember(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) budgetId: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.budgetsService.inviteMember(req.user.sub, budgetId, dto);
  }

  @Post('budgets/:id/incomes')
  @HttpCode(HttpStatus.CREATED)
  addIncome(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) budgetId: string,
    @Body() dto: AddIncomeDto,
  ) {
    return this.budgetsService.addIncome(req.user.sub, budgetId, dto);
  }

  @Get('budgets/:id/incomes')
  listIncomes(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) budgetId: string,
  ) {
    return this.budgetsService.listIncomes(req.user.sub, budgetId);
  }

  @Post('budgets/:id/expenses')
  @HttpCode(HttpStatus.CREATED)
  addExpense(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) budgetId: string,
    @Body() dto: AddBudgetExpenseDto,
  ) {
    return this.budgetsService.addExpense(req.user.sub, budgetId, dto);
  }

  @Get('budgets/:id/expenses')
  listExpenses(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) budgetId: string,
  ) {
    return this.budgetsService.listExpenses(req.user.sub, budgetId);
  }

  @Patch('budgets/:id/limit')
  setLimit(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) budgetId: string,
    @Body() dto: SetLimitDto,
  ) {
    return this.budgetsService.setLimit(req.user.sub, budgetId, dto);
  }

  @Post('invitations/:id/accept')
  @HttpCode(HttpStatus.OK)
  acceptInvitation(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) invitationId: string,
  ) {
    return this.budgetsService.acceptInvitation(
      req.user.sub,
      req.user.email,
      invitationId,
    );
  }

  @Post('invitations/:id/reject')
  @HttpCode(HttpStatus.OK)
  rejectInvitation(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) invitationId: string,
  ) {
    return this.budgetsService.rejectInvitation(req.user.email, invitationId);
  }
}
