import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { SharedBudget } from './shared-budget.entity';
import { User } from '../../users/entities/user.entity';

export type BudgetMemberRole = 'owner' | 'member';

@Entity('budget_members')
export class BudgetMember {
  @PrimaryColumn({ name: 'budget_id', type: 'uuid' })
  budgetId: string;

  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 20, default: 'member' })
  role: BudgetMemberRole;

  @CreateDateColumn({ name: 'joined_at', type: 'timestamptz' })
  joinedAt: Date;

  @ManyToOne(() => SharedBudget, (budget) => budget.members, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'budget_id' })
  budget: SharedBudget;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
