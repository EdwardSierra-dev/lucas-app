import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SharedBudget } from './shared-budget.entity';
import { User } from '../../users/entities/user.entity';

@Entity('budget_incomes')
export class BudgetIncome {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'budget_id', type: 'uuid' })
  budgetId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @Column({ name: 'income_date', type: 'date' })
  incomeDate: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => SharedBudget, (budget) => budget.incomes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'budget_id' })
  budget: SharedBudget;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
