import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BudgetMember } from './budget-member.entity';
import { BudgetInvitation } from './budget-invitation.entity';
import { BudgetIncome } from './budget-income.entity';

@Entity('shared_budgets')
export class SharedBudget {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  name: string | null;

  @Column({
    name: 'monthly_limit',
    type: 'numeric',
    precision: 14,
    scale: 2,
    nullable: true,
  })
  monthlyLimit: string | null;

  @Column({ name: 'limit_notified', type: 'boolean', default: false })
  limitNotified: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => BudgetMember, (member) => member.budget)
  members: BudgetMember[];

  @OneToMany(() => BudgetInvitation, (invitation) => invitation.budget)
  invitations: BudgetInvitation[];

  @OneToMany(() => BudgetIncome, (income) => income.budget)
  incomes: BudgetIncome[];
}
