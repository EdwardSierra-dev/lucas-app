import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  FindOptionsWhere,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { ExpenseRecord } from './entities/expense-record.entity';
import { CreateExpenseRecordDto } from './dto/create-expense-record.dto';
import { UpdateExpenseRecordDto } from './dto/update-expense-record.dto';

/**
 * Optional filters for listing a user's expense records. `from`/`to` are
 * inclusive ISO date bounds, `categoryId` narrows to a single category.
 */
export interface FindExpenseRecordsFilter {
  from?: string;
  to?: string;
  categoryId?: string;
}

/**
 * Business logic for a user's dated expense records (expense_records).
 *
 * Every method is scoped to the authenticated user's id so a caller can only
 * see and mutate their own records. The `amount` column is NUMERIC(14,2) and
 * is represented as a string by the entity; the DTO accepts a number which we
 * normalise to a fixed-precision string before persisting (Property P11
 * bounds are enforced by the DTO validators and the DB CHECK constraint).
 */
@Injectable()
export class ExpenseRecordsService {
  constructor(
    @InjectRepository(ExpenseRecord)
    private readonly expenseRecordsRepository: Repository<ExpenseRecord>,
  ) {}

  /**
   * List the records belonging to a user, newest first by expense date, with
   * the category relation joined so clients can render the name/emoji.
   * Optional filters narrow by inclusive date range and/or category.
   */
  async findAll(
    userId: string,
    filter: FindExpenseRecordsFilter = {},
  ): Promise<ExpenseRecord[]> {
    const where: FindOptionsWhere<ExpenseRecord> = { userId };

    if (filter.categoryId) {
      where.categoryId = filter.categoryId;
    }

    if (filter.from && filter.to) {
      where.expenseDate = Between(filter.from, filter.to);
    } else if (filter.from) {
      where.expenseDate = MoreThanOrEqual(filter.from);
    } else if (filter.to) {
      where.expenseDate = LessThanOrEqual(filter.to);
    }

    return this.expenseRecordsRepository.find({
      where,
      relations: { category: true },
      order: { expenseDate: 'DESC' },
    });
  }

  /**
   * Log a new expense record for the user. `amount` is normalised to a
   * fixed-precision string; `expenseDate` defaults to today (YYYY-MM-DD) when
   * omitted.
   */
  async create(
    userId: string,
    dto: CreateExpenseRecordDto,
  ): Promise<ExpenseRecord> {
    const record = this.expenseRecordsRepository.create({
      userId,
      categoryId: dto.categoryId,
      budgetId: dto.budgetId ?? null,
      amount: dto.amount.toFixed(2),
      description: dto.description ?? null,
      expenseDate: dto.expenseDate ?? this.today(),
    });

    return this.expenseRecordsRepository.save(record);
  }

  /**
   * Update an existing record owned by the user. Throws 404 when the record
   * does not exist or belongs to someone else.
   */
  async update(
    userId: string,
    id: string,
    dto: UpdateExpenseRecordDto,
  ): Promise<ExpenseRecord> {
    const record = await this.findOwnedOrFail(userId, id);

    if (dto.amount !== undefined) {
      record.amount = dto.amount.toFixed(2);
    }
    if (dto.description !== undefined) {
      record.description = dto.description;
    }
    if (dto.expenseDate !== undefined) {
      record.expenseDate = dto.expenseDate;
    }

    return this.expenseRecordsRepository.save(record);
  }

  /**
   * Remove a record owned by the user. Throws 404 when the record does not
   * exist or belongs to someone else.
   */
  async remove(userId: string, id: string): Promise<void> {
    const record = await this.findOwnedOrFail(userId, id);
    await this.expenseRecordsRepository.remove(record);
  }

  /**
   * Fetch a record by id, asserting it belongs to the given user.
   */
  private async findOwnedOrFail(
    userId: string,
    id: string,
  ): Promise<ExpenseRecord> {
    const record = await this.expenseRecordsRepository.findOne({
      where: { id, userId },
    });
    if (!record) {
      throw new NotFoundException('Expense record not found');
    }
    return record;
  }

  /**
   * Today's date as a YYYY-MM-DD string, matching the DATE column format.
   */
  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
