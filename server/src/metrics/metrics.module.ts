import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpenseRecord } from '../expenses/entities/expense-record.entity';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

/**
 * Provides the metrics/analytics endpoints (Req 6). Aggregates the user's
 * logged expense records; depends only on the ExpenseRecord repository.
 */
@Module({
  imports: [TypeOrmModule.forFeature([ExpenseRecord])],
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
