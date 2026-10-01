import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserExpense } from '../expenses/entities/user-expense.entity';
import { Notification } from './entities/notification.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationSchedulerService } from './notification-scheduler.service';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, UserExpense])],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationSchedulerService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
