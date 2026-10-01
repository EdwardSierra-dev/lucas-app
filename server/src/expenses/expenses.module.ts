import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpenseRecord } from './entities/expense-record.entity';
import { UserExpense } from './entities/user-expense.entity';
import { UserExpensesController } from './user-expenses.controller';
import { UserExpensesService } from './user-expenses.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserExpense, ExpenseRecord])],
  controllers: [UserExpensesController],
  providers: [UserExpensesService],
  exports: [UserExpensesService],
})
export class ExpensesModule {}
