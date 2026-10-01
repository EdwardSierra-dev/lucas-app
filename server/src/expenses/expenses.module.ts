import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserExpense } from './entities/user-expense.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserExpense])],
  providers: [],
  exports: [],
})
export class ExpensesModule {}
