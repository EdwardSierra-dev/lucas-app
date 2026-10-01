import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserExpense } from '../expenses/entities/user-expense.entity';
import { NotificationsService } from './notifications.service';

/**
 * Decide whether a configured expense should trigger a payment reminder today.
 *
 * Per requirements 2.9 and 3.6, a reminder is sent when the Payment_Date is one
 * day away OR when the Payment_Date is reached (today). Payment days are
 * constrained to 1–28, so there is no month-length edge case to reconcile.
 *
 * Kept pure (no I/O, no clock access) so it can be exercised exhaustively by
 * unit and property tests.
 *
 * @param paymentDay The configured day of the month (expected 1–28).
 * @param today      The reference date to evaluate against.
 * @returns true when a reminder is due today for the given payment day.
 */
export function dueForReminder(
  paymentDay: number | null | undefined,
  today: Date,
): boolean {
  if (paymentDay == null || paymentDay < 1 || paymentDay > 28) {
    return false;
  }
  const dayOfMonth = today.getDate();
  // Reminder fires the day before (one day away) and on the payment day itself.
  return dayOfMonth === paymentDay || dayOfMonth + 1 === paymentDay;
}

/**
 * Hosts the NestJS @Cron jobs that drive the Notification_Service. Task 18.3
 * adds the daily payment-reminder job; later tasks (18.4 vehicle expiry, 18.5
 * monthly reset) attach additional @Cron methods to this same service so all
 * scheduled notification work lives in one place.
 */
@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(
    @InjectRepository(UserExpense)
    private readonly userExpensesRepository: Repository<UserExpense>,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Daily job (08:00) that sends a payment reminder for every active expense
   * whose Payment_Date is due today under {@link dueForReminder}. Creates one
   * in-app notification per matching user-expense.
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendPaymentReminders(now: Date = new Date()): Promise<void> {
    const activeExpenses = await this.userExpensesRepository.find({
      where: { isActive: true },
    });

    let created = 0;
    for (const expense of activeExpenses) {
      if (!dueForReminder(expense.paymentDay, now)) {
        continue;
      }
      await this.notificationsService.create(
        expense.userId,
        'payment_reminder',
        { categoryId: expense.categoryId, paymentDay: expense.paymentDay },
        'in_app',
      );
      created += 1;
    }

    this.logger.log(
      `Payment reminders dispatched: ${created} of ${activeExpenses.length} active expenses due`,
    );
  }
}
