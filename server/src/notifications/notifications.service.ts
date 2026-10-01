import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { NotificationType } from '@lucas/types';
import {
  Notification,
  NotificationChannel,
} from './entities/notification.entity';

/** Options accepted by {@link NotificationsService.listForUser}. */
export interface ListNotificationsOptions {
  /** When true, only unread notifications are returned. */
  unreadOnly?: boolean;
}

/**
 * Owns persistence and querying of in-app notifications (Req 2.9, 2.6, 4.8–4.10,
 * 5.4, 5.12). Scheduler jobs and event-driven triggers (tasks 18.3–18.5) inject
 * this service to create notification records; the controller exposes the
 * read/mark-read surface the client consumes (feeds the NotificationBadge).
 */
@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
  ) {}

  /**
   * Persist a notification for a user. Defaults to the in-app channel and an
   * unread (`read = false`) state. Returns the saved entity so callers can
   * dispatch over push/email channels afterwards.
   */
  async create(
    userId: string,
    type: NotificationType,
    payload: Record<string, unknown>,
    channel: NotificationChannel = 'in_app',
  ): Promise<Notification> {
    const notification = this.notificationsRepository.create({
      userId,
      type,
      payload,
      channel,
      read: false,
    });
    return this.notificationsRepository.save(notification);
  }

  /**
   * List the user's notifications newest first. When `unreadOnly` is set, only
   * unread notifications are returned.
   */
  async listForUser(
    userId: string,
    opts: ListNotificationsOptions = {},
  ): Promise<Notification[]> {
    const where = opts.unreadOnly
      ? { userId, read: false }
      : { userId };
    return this.notificationsRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  /** Count the user's unread notifications (feeds the NotificationBadge). */
  async unreadCount(userId: string): Promise<number> {
    return this.notificationsRepository.count({
      where: { userId, read: false },
    });
  }

  /**
   * Mark a single notification owned by the user as read. Throws NotFound when
   * the notification does not exist or belongs to another user.
   */
  async markRead(userId: string, notificationId: string): Promise<Notification> {
    const notification = await this.notificationsRepository.findOne({
      where: { id: notificationId, userId },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    notification.read = true;
    return this.notificationsRepository.save(notification);
  }

  /** Mark all of the user's notifications as read. Returns the number updated. */
  async markAllRead(userId: string): Promise<{ updated: number }> {
    const result = await this.notificationsRepository.update(
      { userId, read: false },
      { read: true },
    );
    return { updated: result.affected ?? 0 };
  }
}
