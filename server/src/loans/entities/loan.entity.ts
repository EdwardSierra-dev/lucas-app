import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * Loan funding source. Mirrors the shared `LoanSource` type in
 * `@lucas/types` and the `source IN ('bank','person')` DB CHECK constraint.
 */
export type LoanSource = 'bank' | 'person';

@Entity('loans')
export class Loan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 10 })
  source: LoanSource;

  // Bank loan only.
  @Column({
    name: 'installment_amount',
    type: 'numeric',
    precision: 14,
    scale: 2,
    nullable: true,
  })
  installmentAmount: number | null;

  // Person loan only.
  @Column({
    type: 'numeric',
    precision: 14,
    scale: 2,
    nullable: true,
  })
  capital: number | null;

  @Column({
    name: 'interest_per_inst',
    type: 'numeric',
    precision: 14,
    scale: 2,
    nullable: true,
  })
  interestPerInstallment: number | null;

  @Column({ name: 'total_installments', type: 'int', nullable: true })
  totalInstallments: number | null;

  @Column({ name: 'installments_paid', type: 'int', default: 0 })
  installmentsPaid: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
