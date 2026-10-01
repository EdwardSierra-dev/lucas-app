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

export type BudgetInvitationStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'expired';

@Entity('budget_invitations')
export class BudgetInvitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'budget_id', type: 'uuid' })
  budgetId: string;

  @Column({ name: 'inviter_id', type: 'uuid' })
  inviterId: string;

  @Column({ name: 'invitee_email', type: 'varchar', length: 254 })
  inviteeEmail: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: BudgetInvitationStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @ManyToOne(() => SharedBudget, (budget) => budget.invitations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'budget_id' })
  budget: SharedBudget;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inviter_id' })
  inviter: User;
}
