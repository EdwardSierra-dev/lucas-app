import { NotFoundException } from '@nestjs/common';
import type { NotificationType } from '@lucas/types';
import { NotificationsService } from '../notifications.service';
import type { NotificationChannel } from '../entities/notification.entity';

/**
 * Structural stand-in for the Notification entity so the test does not import
 * the TypeORM entity class (whose decorator-populated fields would otherwise
 * trip strict property-initialization during ts-jest compilation).
 */
interface TestNotification {
  id: string;
  userId: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  channel: NotificationChannel;
  read: boolean;
  sentAt: Date | null;
  createdAt: Date;
}

/**
 * Unit tests for NotificationsService (Requirements 2.9, 4.8–4.10, 5.4, 5.12).
 * The TypeORM repository is mocked so the tests exercise only service logic —
 * no database access.
 */
describe('NotificationsService — unit tests', () => {
  let service: NotificationsService;
  let repo: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    count: jest.Mock;
    update: jest.Mock;
  };

  const USER = 'user-uuid-1';

  beforeEach(() => {
    repo = {
      create: jest.fn((data) => data),
      save: jest.fn((n) => Promise.resolve({ id: 'notif-1', ...n })),
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    };
    service = new NotificationsService(repo as never);
  });

  describe('create', () => {
    it('persists a notification with read=false and the default in_app channel', async () => {
      const payload = { categoryName: 'Rent', paymentDay: 5 };

      const result = await service.create(USER, 'payment_reminder', payload);

      expect(repo.create).toHaveBeenCalledWith({
        userId: USER,
        type: 'payment_reminder',
        payload,
        channel: 'in_app',
        read: false,
      });
      expect(repo.save).toHaveBeenCalledTimes(1);
      expect(result.read).toBe(false);
      expect(result.channel).toBe('in_app');
    });

    it('honours an explicit channel argument', async () => {
      await service.create(USER, 'vehicle_expiry', { document: 'SOAT' }, 'push');

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ channel: 'push', read: false }),
      );
    });
  });

  describe('listForUser', () => {
    it('lists all notifications newest first', async () => {
      const rows: TestNotification[] = [];
      repo.find.mockResolvedValue(rows);

      const result = await service.listForUser(USER);

      expect(repo.find).toHaveBeenCalledWith({
        where: { userId: USER },
        order: { createdAt: 'DESC' },
      });
      expect(result).toBe(rows);
    });

    it('filters to unread notifications when unreadOnly is set', async () => {
      repo.find.mockResolvedValue([]);

      await service.listForUser(USER, { unreadOnly: true });

      expect(repo.find).toHaveBeenCalledWith({
        where: { userId: USER, read: false },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('unreadCount', () => {
    it('returns the count of unread notifications', async () => {
      repo.count.mockResolvedValue(3);

      const result = await service.unreadCount(USER);

      expect(repo.count).toHaveBeenCalledWith({
        where: { userId: USER, read: false },
      });
      expect(result).toBe(3);
    });
  });

  describe('markRead', () => {
    it('marks a notification owned by the user as read', async () => {
      const notification = {
        id: 'notif-1',
        userId: USER,
        read: false,
      };
      repo.findOne.mockResolvedValue(notification);

      const result = await service.markRead(USER, 'notif-1');

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: 'notif-1', userId: USER },
      });
      expect(result.read).toBe(true);
      expect(repo.save).toHaveBeenCalledTimes(1);
    });

    it('throws NotFound when the notification is not owned by the user', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.markRead(USER, 'missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('markAllRead', () => {
    it('updates all unread notifications and returns the count updated', async () => {
      repo.update.mockResolvedValue({ affected: 4 });

      const result = await service.markAllRead(USER);

      expect(repo.update).toHaveBeenCalledWith(
        { userId: USER, read: false },
        { read: true },
      );
      expect(result).toEqual({ updated: 4 });
    });

    it('reports zero updated when affected is undefined', async () => {
      repo.update.mockResolvedValue({});

      const result = await service.markAllRead(USER);

      expect(result).toEqual({ updated: 0 });
    });
  });
});
