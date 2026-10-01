import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedBudget } from './entities/shared-budget.entity';
import { BudgetMember } from './entities/budget-member.entity';
import { BudgetInvitation } from './entities/budget-invitation.entity';
import { BudgetIncome } from './entities/budget-income.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SharedBudget,
      BudgetMember,
      BudgetInvitation,
      BudgetIncome,
    ]),
  ],
})
export class SharedBudgetsModule {}
