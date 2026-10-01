import {
  NotificationSchedulerService,
  dueForReminder,
  withinExpiryWindow,
} from '../notification-scheduler.service';

/**
 * Unit tests for NotificationSchedulerService (Requirements 2.9, 3.6 — payment
 * reminders). The UserExpense repository and NotificationsService are mocked so
 * the tests exercise only scheduler logic — no database or real clock.
 */
describe('NotificationSchedulerService — payment reminders', () => {
  let service: NotificationSchedulerService;
  let repo: { find: jest.Mock };
  let vehiclesRepo: { find: jest.Mock };
  let sharedBudgetsRepo: { update: jest.Mock };
  let notifications: { create: jest.Mock };

  beforeEach(() => {
    repo = { find: jest.fn() };
    vehiclesRepo = { find: jest.fn() };
    sharedBudgetsRepo = { update: jest.fn().mockResolvedValue({ affected: 0 }) };
    notifications = { create: jest.fn().mockResolvedValue({ id: 'n-1' }) };
    service = new NotificationSchedulerService(
      repo as never,
      vehiclesRepo as never,
      sharedBudgetsRepo as never,
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

  describe('withinExpiryWindow (pure helper)', () => {
    const today = new Date('2024-01-01T00:00:00Z');

    it('is true for a date 10 days out', () => {
      expect(withinExpiryWindow('2024-01-11', today)).toBe(true);
    });

    it('is true at exactly 30 days out (inclusive)', () => {
      expect(withinExpiryWindow('2024-01-31', today)).toBe(true);
    });

    it('is false at 31 days out (beyond the window)', () => {
      expect(withinExpiryWindow('2024-02-01', today)).toBe(false);
    });

    it('is false for a date in the past', () => {
      expect(withinExpiryWindow('2023-12-31', today)).toBe(false);
    });

    it('is true on the window start (today itself)', () => {
      expect(withinExpiryWindow('2024-01-01', today)).toBe(true);
    });

    it('is false for null or undefined', () => {
      expect(withinExpiryWindow(null, today)).toBe(false);
      expect(withinExpiryWindow(undefined, today)).toBe(false);
    });
  });

  describe('sendVehicleExpiryReminders', () => {
    const today = new Date('2024-01-01T00:00:00Z');

    it('loads all vehicles', async () => {
      vehiclesRepo.find.mockResolvedValue([]);

      await service.sendVehicleExpiryReminders(today);

      expect(vehiclesRepo.find).toHaveBeenCalledWith();
    });

    it('creates a vehicle_expiry notification for each document within the window', async () => {
      vehiclesRepo.find.mockResolvedValue([
        {
          userId: 'u-1',
          soatExpiry: '2024-01-10', // within window
          tecnomecanicaExpiry: '2024-01-25', // within window
          kitExpiry: '2025-06-01', // far future, excluded
        },
      ]);

      await service.sendVehicleExpiryReminders(today);

      expect(notifications.create).toHaveBeenCalledTimes(2);
      expect(notifications.create).toHaveBeenCalledWith(
        'u-1',
        'vehicle_expiry',
        { document: 'soat', expiryDate: '2024-01-10' },
        'in_app',
      );
      expect(notifications.create).toHaveBeenCalledWith(
        'u-1',
        'vehicle_expiry',
        { document: 'tecnomecanica', expiryDate: '2024-01-25' },
        'in_app',
      );
    });

    it('creates no notifications when all dates are far in the future', async () => {
      vehiclesRepo.find.mockResolvedValue([
        {
          userId: 'u-1',
          soatExpiry: '2025-01-10',
          tecnomecanicaExpiry: '2025-01-25',
          kitExpiry: '2025-06-01',
        },
      ]);

      await service.sendVehicleExpiryReminders(today);

      expect(notifications.create).not.toHaveBeenCalled();
    });

    it('skips a null kit expiry', async () => {
      vehiclesRepo.find.mockResolvedValue([
        {
          userId: 'u-1',
          soatExpiry: '2025-01-10',
          tecnomecanicaExpiry: '2025-01-25',
          kitExpiry: null,
        },
      ]);

      await service.sendVehicleExpiryReminders(today);

      expect(notifications.create).not.toHaveBeenCalled();
    });
  });

  describe('resetBudgetLimitNotifications', () => {
    it('clears limit_notified on all shared budgets', async () => {
      await service.resetBudgetLimitNotifications();

      expect(sharedBudgetsRepo.update).toHaveBeenCalledWith(
        {},
        { limitNotified: false },
      );
    });
  });
});
