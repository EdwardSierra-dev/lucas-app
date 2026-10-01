import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * A configured monthly expense slot linking a user to a category, with an
 * optional payment day (1-28) and an optional configured amount.
 *
 * Maps to the `user_expenses` table created in
 * supabase/migrations/20240101000003_create_user_expenses.sql.
 */
@Entity('user_expenses')
@Unique(['userId', 'categoryId'])
export class UserExpense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  amount: string | null;

  @Column({ name: 'payment_day', type: 'smallint', nullable: true })
  paymentDay: number | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // The Category entity is introduced in a later task; reference it by its
  // registered entity name to avoid a hard import on a not-yet-created class.
  @ManyToOne('Category', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category: unknown;
}
