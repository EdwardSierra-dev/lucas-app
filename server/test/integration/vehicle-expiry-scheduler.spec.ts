/**
 * Integration test — vehicle expiry scheduler (task 21.4, Req 4.8–4.10).
 *
 * Registers a vehicle whose SOAT expires within the 30-day window, invokes the
 * NotificationSchedulerService.sendVehicleExpiryReminders job, and verifies a
 * `vehicle_expiry` notification row is persisted for the owner. A vehicle whose
 * documents are far in the future yields no notification.
 *
 * Skips cleanly when the local Supabase Postgres DB is not reachable.
 */
import request from 'supertest';
import {
  createTestApp,
  closeTestApp,
  registerAndLogin,
  TestAppContext,
} from './test-app.factory';
import { NotificationSchedulerService } from '../../src/notifications/notification-scheduler.service';

/** YYYY-MM-DD offset from a reference date. */
function isoOffset(from: Date, days: number): string {
  const d = new Date(from.getTime() + days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

describe('Vehicle expiry scheduler (integration)', () => {
  let ctx: TestAppContext | null = null;

  beforeAll(async () => {
    ctx = await createTestApp();
  }, 30000);

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  it('creates a vehicle_expiry notification for a document expiring within 30 days', async () => {
    if (!ctx) {
      // eslint-disable-next-line no-console
      console.warn('[integration] skipped: Postgres unavailable');
      return;
    }
    const { app, dataSource } = ctx;
    const server = app.getHttpServer();
    const today = new Date();

    const owner = await registerAndLogin(app, 'vehicle.owner@example.com');

    // Register a vehicle with SOAT expiring in 10 days (within the window) and
    // the other documents far in the future.
    const createRes = await request(server)
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        vehicleType: 'Carro',
        model: 'Mazda 3',
        purchaseDate: isoOffset(today, -365),
        soatExpiry: isoOffset(today, 10),
        tecnomecanicaExpiry: isoOffset(today, 300),
      });
    expect(createRes.status).toBe(201);

    // Run the scheduler job directly (as the cron would) with "now" = today.
    const scheduler = app.get(NotificationSchedulerService);
    await scheduler.sendVehicleExpiryReminders(today);

    const notifications = await dataSource.query(
      "SELECT type, payload FROM notifications WHERE user_id = $1 AND type = 'vehicle_expiry'",
      [owner.userId],
    );
    expect(notifications.length).toBeGreaterThanOrEqual(1);
    const soat = notifications.find(
      (n: { payload: { document?: string } }) => n.payload?.document === 'soat',
    );
    expect(soat).toBeDefined();
  });

  it('creates no notification when all documents are far in the future', async () => {
    if (!ctx) return;
    const { app, dataSource } = ctx;
    const server = app.getHttpServer();
    const today = new Date();

    const owner = await registerAndLogin(app, 'vehicle.safe@example.com');
    await request(server)
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        vehicleType: 'Moto',
        model: 'Yamaha',
        purchaseDate: isoOffset(today, -200),
        soatExpiry: isoOffset(today, 200),
        tecnomecanicaExpiry: isoOffset(today, 300),
      });

    const scheduler = app.get(NotificationSchedulerService);
    await scheduler.sendVehicleExpiryReminders(today);

    const notifications = await dataSource.query(
      "SELECT id FROM notifications WHERE user_id = $1 AND type = 'vehicle_expiry'",
      [owner.userId],
    );
    expect(notifications).toHaveLength(0);
  });
});
