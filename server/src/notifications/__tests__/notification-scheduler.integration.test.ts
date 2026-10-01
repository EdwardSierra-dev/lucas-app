import { NotificationSchedulerService } from '../notification-scheduler.service';

/**
 * Additional unit coverage for NotificationSchedulerService (Requirements 2.9,
 * 4.8–4.10, 5.12). This file complements the happy-path/helper coverage in
 * notification-scheduler.service.test.ts by exercising aggregation across
 * multiple records, boundary cases, empty/rejection paths, and the exact
 * NotificationType/channel string literals emitted.
 *
 * The UserExpense repo, Vehicle repo, SharedBudget repo, and NotificationsService
 * are all mocked. Constructor order mirrors the service:
 * (userExpensesRepository, vehiclesRepository, sharedBudgetsRepository,
 * notificationsService).
 */
describe('NotificationSchedulerService — aggregation & edge cases', () => {
  let service: NotificationSchedulerService;
  let repo: { find: jest.Mock };
  let vehiclesRepo: { find: jest.Mock };
  let sharedBudgetsRepo: { update: jest.Mock };
  let notifications: { create: jest.Mock };

  beforeEach(() => {
    repo = { find: jest.fn() };
    vehiclesRepo = { find: jest.fn() };
    sharedBudgetsRepo = { update: jest.fn().mockResolvedValue({ affected: 3 }) };
    notifications = { create: jest.fn().mockResolvedValue({ id: 'n-1' }) };
    service = new NotificationSchedulerService(
      repo as never,
      vehiclesRepo as never,
      sharedBudgetsRepo as never,
      notifications as never,
    );
  });

  describe('sendPaymentReminders', () => {
    it('creates one notification per due expense across multiple users', async () => {
      // today is day 10. Users A and B each have a due expense (day 10 and the
      // one-day-away day 11); user C has one due (day 11) and one not-due (day 25).
      repo.find.mockResolvedValue([
        { userId: 'u-A', categoryId: 'c-A', paymentDay: 10, isActive: true },
        { userId: 'u-B', categoryId: 'c-B', paymentDay: 11, isActive: true },
        { userId: 'u-C', categoryId: 'c-C1', paymentDay: 11, isActive: true },
        { userId: 'u-C', categoryId: 'c-C2', paymentDay: 25, isActive: true },
      ]);

      await service.sendPaymentReminders(new Date('2024-01-10T08:00:00Z'));

      expect(notifications.create).toHaveBeenCalledTimes(3);
      const targetedUsers = notifications.create.mock.calls.map((c) => c[0]);
      expect(targetedUsers).toEqual(['u-A', 'u-B', 'u-C']);
    });

    it('does not re-filter the active set returned by the repository', async () => {
      // The repo mock returns only active expenses (as the real query would via
      // where: { isActive: true }). The service must trust that filter and not
      // drop a due expense for any other reason. Here isActive is intentionally
      // omitted on the records to prove the service relies on the query, not an
      // in-memory re-check.
      repo.find.mockResolvedValue([
        { userId: 'u-A', categoryId: 'c-A', paymentDay: 10 },
        { userId: 'u-B', categoryId: 'c-B', paymentDay: 10 },
      ]);

      await service.sendPaymentReminders(new Date('2024-01-10T08:00:00Z'));

      expect(notifications.create).toHaveBeenCalledTimes(2);
    });

    it('creates nothing when the repository returns an empty result', async () => {
      repo.find.mockResolvedValue([]);

      await service.sendPaymentReminders(new Date('2024-01-10T08:00:00Z'));

      expect(notifications.create).not.toHaveBeenCalled();
    });

    it('awaits each create and surfaces a rejection from NotificationsService', async () => {
      // Documents actual behavior: create is awaited inside the loop, so a
      // rejection propagates out of the job (the promise rejects).
      repo.find.mockResolvedValue([
        { userId: 'u-A', categoryId: 'c-A', paymentDay: 10, isActive: true },
      ]);
      const boom = new Error('persistence failed');
      notifications.create.mockRejectedValueOnce(boom);

      await expect(
        service.sendPaymentReminders(new Date('2024-01-10T08:00:00Z')),
      ).rejects.toBe(boom);
    });

    it('emits the payment_reminder type over the in_app channel', async () => {
      repo.find.mockResolvedValue([
        { userId: 'u-A', categoryId: 'c-A', paymentDay: 10, isActive: true },
      ]);

      await service.sendPaymentReminders(new Date('2024-01-10T08:00:00Z'));

      const [, type, , channel] = notifications.create.mock.calls[0];
      expect(type).toBe('payment_reminder');
      expect(channel).toBe('in_app');
    });
  });

  describe('sendVehicleExpiryReminders', () => {
    const today = new Date('2024-01-01T00:00:00Z');

    it('creates three notifications when all documents are in-window', async () => {
      vehiclesRepo.find.mockResolvedValue([
        {
          userId: 'u-1',
          soatExpiry: '2024-01-05',
          tecnomecanicaExpiry: '2024-01-15',
          kitExpiry: '2024-01-20',
        },
      ]);

      await service.sendVehicleExpiryReminders(today);

      expect(notifications.create).toHaveBeenCalledTimes(3);
      const documents = notifications.create.mock.calls.map((c) => c[2].document);
      expect(documents).toEqual(['soat', 'tecnomecanica', 'kit']);
    });

    it('aggregates notifications across multiple vehicles', async () => {
      vehiclesRepo.find.mockResolvedValue([
        {
          userId: 'u-1',
          soatExpiry: '2024-01-05', // in window
          tecnomecanicaExpiry: '2025-01-15', // far future
          kitExpiry: null,
        },
        {
          userId: 'u-2',
          soatExpiry: null,
          tecnomecanicaExpiry: '2024-01-20', // in window
          kitExpiry: '2024-01-25', // in window
        },
      ]);

      await service.sendVehicleExpiryReminders(today);

      expect(notifications.create).toHaveBeenCalledTimes(3);
      const targetedUsers = notifications.create.mock.calls.map((c) => c[0]);
      expect(targetedUsers).toEqual(['u-1', 'u-2', 'u-2']);
    });

    it('includes a kit expiry sitting exactly on the 30-day boundary', async () => {
      // today 2024-01-01, +30 days = 2024-01-31 (inclusive boundary).
      vehiclesRepo.find.mockResolvedValue([
        {
          userId: 'u-1',
          soatExpiry: null,
          tecnomecanicaExpiry: null,
          kitExpiry: '2024-01-31',
        },
      ]);

      await service.sendVehicleExpiryReminders(today);

      expect(notifications.create).toHaveBeenCalledTimes(1);
      expect(notifications.create).toHaveBeenCalledWith(
        'u-1',
        'vehicle_expiry',
        { document: 'kit', expiryDate: '2024-01-31' },
        'in_app',
      );
    });

    it('emits the vehicle_expiry type over the in_app channel', async () => {
      vehiclesRepo.find.mockResolvedValue([
        {
          userId: 'u-1',
          soatExpiry: '2024-01-05',
          tecnomecanicaExpiry: null,
          kitExpiry: null,
        },
      ]);

      await service.sendVehicleExpiryReminders(today);

      const [, type, , channel] = notifications.create.mock.calls[0];
      expect(type).toBe('vehicle_expiry');
      expect(channel).toBe('in_app');
    });
  });

  describe('resetBudgetLimitNotifications', () => {
    it('awaits the update against the all-rows criteria', async () => {
      let resolved = false;
      sharedBudgetsRepo.update.mockImplementation(async () => {
        resolved = true;
        return { affected: 3 };
      });

      await service.resetBudgetLimitNotifications();

      expect(resolved).toBe(true);
      expect(sharedBudgetsRepo.update).toHaveBeenCalledTimes(1);
      expect(sharedBudgetsRepo.update).toHaveBeenCalledWith(
        {},
        { limitNotified: false },
      );
    });
  });
});
