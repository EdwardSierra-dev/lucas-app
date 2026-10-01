/**
 * Integration test — metrics endpoint correctness (task 21.5, Requirement 6).
 *
 * Seeds expense records for a user, then verifies POST /api/v1/metrics/expenses
 * aggregates correctly against real Postgres: the grand total equals the sum of
 * the per-category breakdown, and an invalid date range (from > to) is rejected
 * with 400.
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

describe('Metrics endpoint correctness (integration)', () => {
  let ctx: TestAppContext | null = null;
  let token = '';

  beforeAll(async () => {
    ctx = await createTestApp();
    if (!ctx) return;
    const auth = await registerAndLogin(ctx.app, 'metrics.user@example.com');
    token = auth.accessToken;

    // Seed two categories' worth of expenses via the API so they go through
    // the real validation + persistence path. We need category ids first.
    const cats = await request(ctx.app.getHttpServer())
      .get('/api/v1/categories')
      .set('Authorization', `Bearer ${token}`);
    const mandatory = (cats.body as Array<{ id: string; type: string }>).filter(
      (c) => c.type === 'mandatory',
    );
    const catA = mandatory[0]!;
    const catB = mandatory[1]!;

    const post = (categoryId: string, amount: number, expenseDate: string) =>
      request(ctx!.app.getHttpServer())
        .post('/api/v1/expenses/records')
        .set('Authorization', `Bearer ${token}`)
        .send({ categoryId, amount, expenseDate });

    await post(catA.id, 100.0, '2024-05-10');
    await post(catA.id, 50.5, '2024-05-15');
    await post(catB.id, 25.25, '2024-05-20');
  }, 30000);

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  it('total equals the sum of the category breakdown', async () => {
    if (!ctx) {
      // eslint-disable-next-line no-console
      console.warn('[integration] skipped: Postgres unavailable');
      return;
    }
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/metrics/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({ from: '2024-05-01', to: '2024-05-31', groupBy: 'category' });

    expect(res.status).toBe(200);
    const { total, breakdown } = res.body as {
      total: number;
      breakdown: Array<{ total: number }>;
    };
    const sum = breakdown.reduce((acc, row) => acc + row.total, 0);
    expect(Math.round(total * 100)).toBe(Math.round(sum * 100));
    // 100 + 50.5 + 25.25 = 175.75
    expect(Math.round(total * 100)).toBe(17575);
  });

  it('rejects an invalid date range (from > to) with 400', async () => {
    if (!ctx) return;
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/metrics/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({ from: '2024-06-01', to: '2024-01-01' });

    expect(res.status).toBe(400);
  });

  it('scopes results to the authenticated user (empty for a fresh user)', async () => {
    if (!ctx) return;
    const other = await registerAndLogin(ctx.app, 'metrics.other@example.com');
    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/metrics/expenses')
      .set('Authorization', `Bearer ${other.accessToken}`)
      .send({ groupBy: 'category' });

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
    expect(res.body.breakdown).toEqual([]);
  });
});
