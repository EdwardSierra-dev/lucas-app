import {
  NotificationSchedulerService,
  dueForReminder,
} from '../notification-scheduler.service';

/**
 * Unit tests for NotificationSchedulerService (Requirements 2.9, 3.6 — payment
 * reminders). The UserExpense repository and NotificationsService are mocked so
 * the tests exercise only scheduler logic — no database or real clock.
 */
describe('NotificationSchedulerService — payment reminders', () => {
  let service: NotificationSchedulerService;
  let repo: { find: jest.Mock };
  let notifications: { create: jest.Mock };

  beforeEach(() => {
    repo = { find: jest.fn() };
    notifications = { create: jest.fn().mockResolvedValue({ id: 'n-1' }) };
    service = new NotificationSchedulerService(
      repo as never,
      notifications as never,
    );
  });

  describe('dueForReminder (pure helper)', () => {
    it('is true on the payment day itself', () => {
      // 2024-01-05 → day 5
      expect(dueForReminder(5, new Date('2024-01-05T08:00:00Z'))).toBe(true);
    });

    it('is true one day before the payment day', () => {
      // 2024-01-04 → day 4, payment day 5 is one day away
      expect(dueForReminder(5, new Date('2024-01-04T08:00:00Z'))).toBe(true);
    });

    it('is false two or more days before the payment day', () => {
      expect(dueForReminder(5, new Date('2024-01-03T08:00:00Z'))).toBe(false);
    });

    it('is false after the payment day has passed', () => {
      expect(dueForReminder(5, new Date('2024-01-06T08:00:00Z'))).toBe(false);
    });

    it('is false for null, zero, or out-of-range payment days', () => {
      const today = new Date('2024-01-05T08:00:00Z');
      expect(dueForReminder(null, today)).toBe(false);
      expect(dueForReminder(undefined, today)).toBe(false);
      expect(dueForReminder(0, today)).toBe(false);
      expect(dueForReminder(29, today)).toBe(false);
    });
  });

  describe('sendPaymentReminders', () => {
    it('queries only active user-expenses', async () => {
      repo.find.mockResolvedValue([]);

      await service.sendPaymentReminders(new Date('2024-01-05T08:00:00Z'));

      expect(repo.find).toHaveBeenCalledWith({ where: { isActive: true } });
    });

    it('creates a payment_reminder notification for each due expense', async () => {
      // today is day 5: expense A (day 5) due, expense B (day 6) due (one day
      // away), expense C (day 20) not due.
      repo.find.mockResolvedValue([
        { userId: 'u-A', categoryId: 'c-A', paymentDay: 5, isActive: true },
        { userId: 'u-B', categoryId: 'c-B', paymentDay: 6, isActive: true },
        { userId: 'u-C', categoryId: 'c-C', paymentDay: 20, isActive: true },
      ]);

      await service.sendPaymentReminders(new Date('2024-01-05T08:00:00Z'));

      expect(notifications.create).toHaveBeenCalledTimes(2);
      expect(notifications.create).toHaveBeenCalledWith(
        'u-A',
        'payment_reminder',
        { categoryId: 'c-A', paymentDay: 5 },
        'in_app',
      );
      expect(notifications.create).toHaveBeenCalledWith(
        'u-B',
        'payment_reminder',
        { categoryId: 'c-B', paymentDay: 6 },
        'in_app',
      );
    });

    it('creates no notifications when no expense is due', async () => {
      repo.find.mockResolvedValue([
        { userId: 'u-A', categoryId: 'c-A', paymentDay: 20, isActive: true },
      ]);

      await service.sendPaymentReminders(new Date('2024-01-05T08:00:00Z'));

      expect(notifications.create).not.toHaveBeenCalled();
    });

    it('skips expenses without a configured payment day', async () => {
      repo.find.mockResolvedValue([
        { userId: 'u-A', categoryId: 'c-A', paymentDay: null, isActive: true },
      ]);

      await service.sendPaymentReminders(new Date('2024-01-05T08:00:00Z'));

      expect(notifications.create).not.toHaveBeenCalled();
    });
  });
});
