/**
 * Integration test — full registration flow (task 21.1, Requirements 1.1–1.10).
 *
 * Exercises POST /api/v1/auth/register end-to-end against a real Postgres DB:
 *   • a valid email + strong password creates the user (201), persists it, and
 *     dispatches a confirmation email (Req 1.7, 1.8);
 *   • registering the same email again is rejected with 409 (Req 1.9);
 *   • a weak password is rejected with 400 and validation messages (Req 1.3, 1.4).
 *
 * Skips cleanly when the local Supabase Postgres DB is not reachable.
 */
import request from 'supertest';
import { createTestApp, closeTestApp, TestAppContext } from './test-app.factory';

describe('Registration flow (integration)', () => {
  let ctx: TestAppContext | null = null;

  beforeAll(async () => {
    ctx = await createTestApp();
  }, 30000);

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  const strongPassword = 'StrongPass1!';
  const email = 'integration.user@example.com';

  it('registers a new user, persists it, and dispatches a confirmation email', async () => {
    if (!ctx) {
      // eslint-disable-next-line no-console
      console.warn('[integration] skipped: Postgres unavailable');
      return;
    }
    const { app, dataSource, mail } = ctx;

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: strongPassword });

    expect(res.status).toBe(201);

    // User persisted.
    const rows = await dataSource.query(
      'SELECT email, email_verified FROM users WHERE LOWER(email) = LOWER($1)',
      [email],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].email).toBe(email);

    // Confirmation email dispatched (Req 1.8).
    expect(mail.sendConfirmationEmail).toHaveBeenCalledWith(
      email,
      expect.any(String),
    );
  });

  it('rejects a duplicate email with 409', async () => {
    if (!ctx) return;
    const { app } = ctx;

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: strongPassword });

    expect(res.status).toBe(409);
  });

  it('rejects a weak password with 400 and validation messages', async () => {
    if (!ctx) return;
    const { app } = ctx;

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'another.user@example.com', password: 'weak' });

    expect(res.status).toBe(400);
    // class-validator surfaces an array of messages under `message`.
    const message = res.body?.message;
    expect(Array.isArray(message) ? message.join(' ') : String(message)).toMatch(
      /password/i,
    );
  });
});
