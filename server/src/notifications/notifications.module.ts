import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserExpense } from '../expenses/entities/user-expense.entity';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { SharedBudget } from '../shared-budgets/entities/shared-budget.entity';
import { Notification } from './entities/notification.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationSchedulerService } from './notification-scheduler.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      UserExpense,
      Vehicle,
      SharedBudget,
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationSchedulerService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
