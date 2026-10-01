import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedBudget } from './entities/shared-budget.entity';
import { BudgetMember } from './entities/budget-member.entity';
import { BudgetInvitation } from './entities/budget-invitation.entity';
import { BudgetIncome } from './entities/budget-income.entity';
import { SharedBudgetsService } from './shared-budgets.service';
import { SharedBudgetsController } from './shared-budgets.controller';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SharedBudget,
      BudgetMember,
      BudgetInvitation,
      BudgetIncome,
    ]),
    UsersModule,
    MailModule,
  ],
  controllers: [SharedBudgetsController],
  providers: [SharedBudgetsService],
  exports: [SharedBudgetsService],
})
export class SharedBudgetsModule {}
