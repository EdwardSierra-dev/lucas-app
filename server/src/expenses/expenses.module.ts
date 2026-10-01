import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpenseRecord } from './entities/expense-record.entity';
import { UserExpense } from './entities/user-expense.entity';
import { UserExpensesController } from './user-expenses.controller';
import { UserExpensesService } from './user-expenses.service';
import { ExpenseRecordsController } from './expense-records.controller';
import { ExpenseRecordsService } from './expense-records.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserExpense, ExpenseRecord])],
  controllers: [UserExpensesController, ExpenseRecordsController],
  providers: [UserExpensesService, ExpenseRecordsService],
  exports: [UserExpensesService, ExpenseRecordsService],
})
export class ExpensesModule {}
