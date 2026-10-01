import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpenseRecord } from './entities/expense-record.entity';
import { UserExpense } from './entities/user-expense.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserExpense, ExpenseRecord])],
  providers: [],
  exports: [],
})
export class ExpensesModule {}
