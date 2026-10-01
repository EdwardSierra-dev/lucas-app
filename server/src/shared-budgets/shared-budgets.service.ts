import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, Repository } from 'typeorm';
import { SharedBudget } from './entities/shared-budget.entity';
import { BudgetMember } from './entities/budget-member.entity';
import { BudgetInvitation } from './entities/budget-invitation.entity';
import { BudgetIncome } from './entities/budget-income.entity';
import { ExpenseRecord } from '../expenses/entities/expense-record.entity';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { AddIncomeDto } from './dto/add-income.dto';
import { AddBudgetExpenseDto } from './dto/add-budget-expense.dto';
import { SetLimitDto } from './dto/set-limit.dto';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';

/**
 * Result of logging a shared-budget expense. `limitExceeded` reflects whether
 * the budget's month-to-date total is over the configured monthly limit after
 * this expense was recorded (Requirements 5.12, Properties P12/P13).
 */
export interface AddBudgetExpenseResult {
  expense: ExpenseRecord;
  limitExceeded: boolean;
}

/** Invitations are valid for 7 days from issuance (Requirement 5). */
const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Budget_Manager service (Requirement 5).
 *
 * Owns shared budget membership lifecycle: creating budgets, inviting members
 * by registered email, and accepting/rejecting invitations. Expense, income
 * and limit operations live in a later task.
 */
@Injectable()
export class SharedBudgetsService {
  constructor(
    @InjectRepository(SharedBudget)
    private readonly budgetsRepository: Repository<SharedBudget>,
    @InjectRepository(BudgetMember)
    private readonly membersRepository: Repository<BudgetMember>,
    @InjectRepository(BudgetInvitation)
    private readonly invitationsRepository: Repository<BudgetInvitation>,
    @InjectRepository(BudgetIncome)
    private readonly incomesRepository: Repository<BudgetIncome>,
    @InjectRepository(ExpenseRecord)
    private readonly expenseRecordsRepository: Repository<ExpenseRecord>,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create a shared budget and register the creator as its owner member.
   * The two inserts are wrapped in a transaction so a budget never exists
   * without an owner (Requirement 5).
   */
  async createBudget(
    userId: string,
    dto: CreateBudgetDto,
  ): Promise<SharedBudget> {
    return this.dataSource.transaction(async (manager) => {
      const budget = manager.create(SharedBudget, {
        name: dto.name,
        monthlyLimit:
          dto.monthlyLimit !== undefined ? dto.monthlyLimit.toFixed(2) : null,
      });
      const savedBudget = await manager.save(budget);

      const owner = manager.create(BudgetMember, {
        budgetId: savedBudget.id,
        userId,
        role: 'owner',
      });
      await manager.save(owner);

      return savedBudget;
    });
  }

  /**
   * List every shared budget the authenticated user is a member of.
   */
  async listBudgets(userId: string): Promise<SharedBudget[]> {
    const memberships = await this.membersRepository.find({
      where: { userId },
    });
    if (memberships.length === 0) {
      return [];
    }
    const budgetIds = memberships.map((m) => m.budgetId);
    return this.budgetsRepository.find({
      where: budgetIds.map((id) => ({ id })),
    });
  }

  /**
   * List the members of a budget. The caller must be a member themselves.
   */
  async listMembers(
    userId: string,
    budgetId: string,
  ): Promise<BudgetMember[]> {
    await this.assertMembership(userId, budgetId);
    return this.membersRepository.find({ where: { budgetId } });
  }

  /**
   * Invite a registered user to a budget by email (Requirements 5.2, 5.3).
   * Only the budget owner may invite. Creates a pending invitation that
   * expires in 7 days and dispatches an invitation email.
   */
  async inviteMember(
    userId: string,
    budgetId: string,
    dto: InviteMemberDto,
  ): Promise<BudgetInvitation> {
    const membership = await this.assertMembership(userId, budgetId);
    if (membership.role !== 'owner') {
      throw new ForbiddenException('Only the budget owner can invite members');
    }

    const budget = await this.budgetsRepository.findOneBy({ id: budgetId });
    if (!budget) {
      throw new NotFoundException('Budget not found');
    }

    // Requirement 5.3: invitee email must map to a registered account.
    const invitee = await this.usersService.findByEmail(dto.inviteeEmail);
    if (!invitee) {
      throw new NotFoundException(
        'No account was found for the provided email address',
      );
    }

    const now = new Date();
    const invitation = this.invitationsRepository.create({
      budgetId,
      inviterId: userId,
      inviteeEmail: invitee.email,
      status: 'pending',
      expiresAt: new Date(now.getTime() + INVITATION_TTL_MS),
    });
    const saved = await this.invitationsRepository.save(invitation);

    await this.mailService.sendBudgetInvitation(
      invitee.email,
      budget.name ?? 'Presupuesto compartido',
      saved.id,
    );

    return saved;
  }

  /**
   * Accept a pending invitation (Requirement 5.5). Validates the invitation is
   * pending and not expired, that the authenticated user's email matches the
   * invitee, then creates a member row and marks the invitation accepted.
   */
  async acceptInvitation(
    userId: string,
    userEmail: string,
    invitationId: string,
  ): Promise<BudgetMember> {
    const invitation = await this.invitationsRepository.findOneBy({
      id: invitationId,
    });
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw new BadRequestException(
        `Invitation is not pending (status: ${invitation.status})`,
      );
    }

    if (invitation.expiresAt.getTime() <= Date.now()) {
      invitation.status = 'expired';
      await this.invitationsRepository.save(invitation);
      throw new BadRequestException('Invitation has expired');
    }

    if (
      invitation.inviteeEmail.toLowerCase() !== userEmail.toLowerCase()
    ) {
      throw new ForbiddenException(
        'This invitation was issued to a different email address',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const member = manager.create(BudgetMember, {
        budgetId: invitation.budgetId,
        userId,
        role: 'member',
      });
      const savedMember = await manager.save(member);

      invitation.status = 'accepted';
      await manager.save(invitation);

      return savedMember;
    });
  }

  /**
   * Reject a pending invitation (sets status to 'rejected').
   */
  async rejectInvitation(
    userEmail: string,
    invitationId: string,
  ): Promise<BudgetInvitation> {
    const invitation = await this.invitationsRepository.findOneBy({
      id: invitationId,
    });
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (
      invitation.inviteeEmail.toLowerCase() !== userEmail.toLowerCase()
    ) {
      throw new ForbiddenException(
        'This invitation was issued to a different email address',
      );
    }

    if (invitation.status !== 'pending') {
      throw new BadRequestException(
        `Invitation is not pending (status: ${invitation.status})`,
      );
    }

    invitation.status = 'rejected';
    return this.invitationsRepository.save(invitation);
  }

  // --------------------------------------------------------------------------
  // Incomes (Requirements 5.1, 5.6)
  // --------------------------------------------------------------------------

  /**
   * Record an income entry against a budget. The caller must be a member
   * (ForbiddenException otherwise). `amount` is normalised to a
   * fixed-precision string; `incomeDate` defaults to today when omitted.
   */
  async addIncome(
    userId: string,
    budgetId: string,
    dto: AddIncomeDto,
  ): Promise<BudgetIncome> {
    await this.assertMembership(userId, budgetId);

    const income = this.incomesRepository.create({
      budgetId,
      userId,
      amount: dto.amount.toFixed(2),
      description: dto.description ?? null,
      incomeDate: dto.incomeDate ?? this.today(),
    });

    return this.incomesRepository.save(income);
  }

  /**
   * List income entries for a budget, newest first. Members only.
   */
  async listIncomes(
    userId: string,
    budgetId: string,
  ): Promise<BudgetIncome[]> {
    await this.assertMembership(userId, budgetId);
    return this.incomesRepository.find({
      where: { budgetId },
      order: { incomeDate: 'DESC' },
    });
  }

  // --------------------------------------------------------------------------
  // Expenses + monthly limit notification (Requirements 5.7, 5.12)
  // --------------------------------------------------------------------------

  /**
   * Log a shared expense record against a budget (Requirements 5.7, 5.12).
   *
   * The caller must be a member. After persisting the expense, the budget's
   * month-to-date total is recomputed; when a monthly limit is set and the
   * total exceeds it, `limitExceeded` is `true`. The limit-exceeded
   * notification fires exactly once per cycle: `limitNotified` is only flipped
   * from `false` to `true` on the first crossing (Properties P12/P13). A
   * subsequent crossing still reports `limitExceeded = true` but does NOT
   * re-trigger the notification.
   */
  async addExpense(
    userId: string,
    budgetId: string,
    dto: AddBudgetExpenseDto,
  ): Promise<AddBudgetExpenseResult> {
    await this.assertMembership(userId, budgetId);

    const budget = await this.budgetsRepository.findOneBy({ id: budgetId });
    if (!budget) {
      throw new NotFoundException('Budget not found');
    }

    const expense = this.expenseRecordsRepository.create({
      userId,
      categoryId: dto.categoryId,
      budgetId,
      amount: dto.amount.toFixed(2),
      description: dto.description ?? null,
      expenseDate: dto.expenseDate ?? this.today(),
    });
    const savedExpense = await this.expenseRecordsRepository.save(expense);

    const monthTotal = await this.monthToDateTotal(
      budgetId,
      savedExpense.expenseDate,
    );

    const limit =
      budget.monthlyLimit !== null ? Number(budget.monthlyLimit) : null;
    const limitExceeded = limit !== null && monthTotal > limit;

    // Flip the once-per-cycle notification flag only on the first crossing.
    if (limitExceeded && !budget.limitNotified) {
      budget.limitNotified = true;
      await this.budgetsRepository.save(budget);
    }

    return { expense: savedExpense, limitExceeded };
  }

  /**
   * List the shared expense records belonging to a budget, newest first.
   * Members only.
   */
  async listExpenses(
    userId: string,
    budgetId: string,
  ): Promise<ExpenseRecord[]> {
    await this.assertMembership(userId, budgetId);
    return this.expenseRecordsRepository.find({
      where: { budgetId },
      order: { expenseDate: 'DESC' },
    });
  }

  // --------------------------------------------------------------------------
  // Monthly limit (Requirements 5.10, 5.11)
  // --------------------------------------------------------------------------

  /**
   * Set or clear the monthly spending limit (owner only). Passing `null`
   * clears the limit. When the limit value changes, `limitNotified` is reset
   * to `false` so the over-limit alert can fire again in the new cycle.
   */
  async setLimit(
    userId: string,
    budgetId: string,
    dto: SetLimitDto,
  ): Promise<SharedBudget> {
    const membership = await this.assertMembership(userId, budgetId);
    if (membership.role !== 'owner') {
      throw new ForbiddenException('Only the budget owner can set the limit');
    }

    const budget = await this.budgetsRepository.findOneBy({ id: budgetId });
    if (!budget) {
      throw new NotFoundException('Budget not found');
    }

    const nextLimit =
      dto.monthlyLimit === null ? null : dto.monthlyLimit.toFixed(2);

    if (nextLimit !== budget.monthlyLimit) {
      budget.monthlyLimit = nextLimit;
      budget.limitNotified = false;
    }

    return this.budgetsRepository.save(budget);
  }

  // --------------------------------------------------------------------------
  // Internal helpers
  // --------------------------------------------------------------------------

  /**
   * Sum of expense amounts for a budget within the calendar month of the
   * given reference date (YYYY-MM-DD).
   */
  private async monthToDateTotal(
    budgetId: string,
    referenceDate: string,
  ): Promise<number> {
    const parts = referenceDate.split('-');
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const monthLabel = String(month).padStart(2, '0');
    const monthStart = `${year}-${monthLabel}-01`;
    // Day 0 of the next month is the last day of the current month.
    const lastDay = new Date(year, month, 0).getDate();
    const monthEnd = `${year}-${monthLabel}-${String(lastDay).padStart(2, '0')}`;

    const records = await this.expenseRecordsRepository.find({
      where: { budgetId, expenseDate: Between(monthStart, monthEnd) },
    });

    return records.reduce((sum, record) => sum + Number(record.amount), 0);
  }

  /**
   * Today's date as a YYYY-MM-DD string, matching the DATE column format.
   */
  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  /**
   * Ensure the user belongs to the budget, returning their membership.
   * Throws ForbiddenException otherwise.
   */
  private async assertMembership(
    userId: string,
    budgetId: string,
  ): Promise<BudgetMember> {
    const membership = await this.membersRepository.findOneBy({
      budgetId,
      userId,
    });
    if (!membership) {
      throw new ForbiddenException('You are not a member of this budget');
    }
    return membership;
  }
}
