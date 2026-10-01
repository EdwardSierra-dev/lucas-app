import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserExpense } from '../expenses/entities/user-expense.entity';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { SharedBudget } from '../shared-budgets/entities/shared-budget.entity';
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
 * Decide whether a vehicle document expiry date falls inside the reminder
 * window — i.e. it is expiring within the next `windowDays` days and has not
 * already passed. Per requirements 4.8–4.10 the window is the next 30 calendar
 * days (today..today+30 inclusive). An already-expired document (date before
 * today) is excluded, as is a missing/null date.
 *
 * Kept pure (no I/O, no clock access) so it can be exercised exhaustively by
 * unit and property tests (task 18.6 — Property P10).
 *
 * @param expiryDate The document expiry date as an ISO date string, or null.
 * @param today      The reference date to evaluate against.
 * @param windowDays The size of the reminder window in days (default 30).
 * @returns true when the expiry date is within [today, today+windowDays].
 */
export function withinExpiryWindow(
  expiryDate: string | null | undefined,
  today: Date,
  windowDays = 30,
): boolean {
  if (expiryDate == null) {
    return false;
  }
  const expiry = new Date(expiryDate);
  if (Number.isNaN(expiry.getTime())) {
    return false;
  }

  // Compare at day granularity (UTC midnight) so time-of-day never shifts the
  // result across a day boundary.
  const toUtcDay = (d: Date): number =>
    Math.floor(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) /
        86_400_000,
    );
  const diffDays = toUtcDay(expiry) - toUtcDay(today);
  return diffDays >= 0 && diffDays <= windowDays;
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
    @InjectRepository(Vehicle)
    private readonly vehiclesRepository: Repository<Vehicle>,
    @InjectRepository(SharedBudget)
    private readonly sharedBudgetsRepository: Repository<SharedBudget>,
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

  /**
   * Daily job (08:00) that reminds users when a vehicle document (SOAT,
   * tecnomecánica, or kit) is expiring within the next 30 days. Loads every
   * vehicle, checks each document date via {@link withinExpiryWindow}, and
   * creates one in-app notification per document in the window — identifying
   * which document it is (Requirements 4.8, 4.9, 4.10).
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendVehicleExpiryReminders(now: Date = new Date()): Promise<void> {
    const vehicles = await this.vehiclesRepository.find();

    const documents: Array<{
      document: 'soat' | 'tecnomecanica' | 'kit';
      key: 'soatExpiry' | 'tecnomecanicaExpiry' | 'kitExpiry';
    }> = [
      { document: 'soat', key: 'soatExpiry' },
      { document: 'tecnomecanica', key: 'tecnomecanicaExpiry' },
      { document: 'kit', key: 'kitExpiry' },
    ];

    let created = 0;
    for (const vehicle of vehicles) {
      for (const { document, key } of documents) {
        const expiryDate = vehicle[key];
        if (!withinExpiryWindow(expiryDate, now)) {
          continue;
        }
        await this.notificationsService.create(
          vehicle.userId,
          'vehicle_expiry',
          { document, expiryDate },
          'in_app',
        );
        created += 1;
      }
    }

    this.logger.log(
      `Vehicle expiry reminders dispatched: ${created} across ${vehicles.length} vehicles`,
    );
  }

  /**
   * Monthly job (midnight on the 1st) that clears the `limit_notified` flag on
   * every shared budget so the once-per-cycle over-limit alert can fire again
   * in the new month (Requirement 5.12; properties P12/P13).
   */
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async resetBudgetLimitNotifications(): Promise<void> {
    await this.sharedBudgetsRepository.update({}, { limitNotified: false });
    this.logger.log('Reset limit_notified flag on all shared budgets');
  }
}
