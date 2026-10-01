import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserExpense } from './entities/user-expense.entity';
import { CreateUserExpenseDto } from './dto/create-user-expense.dto';
import { UpdateUserExpenseDto } from './dto/update-user-expense.dto';

/**
 * Business logic for a user's configured expense slots (user_expenses).
 *
 * Every method is scoped to the authenticated user's id so a caller can only
 * see and mutate their own slots. The `amount` column is NUMERIC(14,2) and is
 * represented as a string by the entity; the DTO accepts a number which we
 * normalise to a fixed-precision string before persisting.
 */
@Injectable()
export class UserExpensesService {
  constructor(
    @InjectRepository(UserExpense)
    private readonly userExpensesRepository: Repository<UserExpense>,
  ) {}

  /**
   * List the slots belonging to a user, newest first, with the category
   * relation joined so clients can render the name/emoji.
   */
  async findAll(userId: string): Promise<UserExpense[]> {
    return this.userExpensesRepository.find({
      where: { userId },
      relations: { category: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Configure a new expense slot for the user. Rejects a duplicate
   * (userId, categoryId) pair with a 409 so the UI can surface it inline.
   */
  async create(
    userId: string,
    dto: CreateUserExpenseDto,
  ): Promise<UserExpense> {
    const existing = await this.userExpensesRepository.findOne({
      where: { userId, categoryId: dto.categoryId },
    });
    if (existing) {
      throw new ConflictException(
        'An expense slot for this category already exists',
      );
    }

    const slot = this.userExpensesRepository.create({
      userId,
      categoryId: dto.categoryId,
      amount: dto.amount !== undefined ? dto.amount.toFixed(2) : null,
      paymentDay: dto.paymentDay ?? null,
      isActive: true,
    });

    return this.userExpensesRepository.save(slot);
  }

  /**
   * Update an existing slot owned by the user. Throws 404 when the slot does
   * not exist or belongs to someone else.
   */
  async update(
    userId: string,
    id: string,
    dto: UpdateUserExpenseDto,
  ): Promise<UserExpense> {
    const slot = await this.findOwnedOrFail(userId, id);

    if (dto.amount !== undefined) {
      slot.amount = dto.amount.toFixed(2);
    }
    if (dto.paymentDay !== undefined) {
      slot.paymentDay = dto.paymentDay;
    }
    if (dto.isActive !== undefined) {
      slot.isActive = dto.isActive;
    }

    return this.userExpensesRepository.save(slot);
  }

  /**
   * Remove a slot owned by the user. Throws 404 when the slot does not exist
   * or belongs to someone else.
   */
  async remove(userId: string, id: string): Promise<void> {
    const slot = await this.findOwnedOrFail(userId, id);
    await this.userExpensesRepository.remove(slot);
  }

  /**
   * Fetch a slot by id, asserting it belongs to the given user.
   */
  private async findOwnedOrFail(
    userId: string,
    id: string,
  ): Promise<UserExpense> {
    const slot = await this.userExpensesRepository.findOne({
      where: { id, userId },
    });
    if (!slot) {
      throw new NotFoundException('Expense slot not found');
    }
    return slot;
  }
}
