import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * A dated financial entry (an actual logged expense/transaction) associated
 * with a user and a category, optionally belonging to a shared budget.
 *
 * Maps to the `expense_records` table created in
 * supabase/migrations/20240101000005_create_expense_records.sql.
 *
 * Property P11 (financial entry validation): `amount` must be positive and
 * within the NUMERIC(14,2) range (0 < amount <= 999_999_999.99). This is
 * enforced at the database level via a CHECK constraint and validated at the
 * application layer in the expense record endpoints.
 */
@Entity('expense_records')
@Index('idx_expense_records_user_date', ['userId', 'expenseDate'])
@Index('idx_expense_records_category', ['categoryId'])
export class ExpenseRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId: string;

  // Optional shared budget association. The shared_budgets table and its FK
  // constraint are introduced in a later migration (task 11.1).
  @Column({ name: 'budget_id', type: 'uuid', nullable: true })
  budgetId: string | null;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @Column({ name: 'expense_date', type: 'date', default: () => 'CURRENT_DATE' })
  expenseDate: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // The Category entity is referenced by its registered entity name to mirror
  // the pattern used in UserExpense and avoid a hard import cycle.
  @ManyToOne('Category', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category: unknown;
}
