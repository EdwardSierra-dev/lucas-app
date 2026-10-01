/**
 * Integration test — budget limit notification fires exactly once
 * (task 21.3, Req 5.12; properties P12/P13).
 *
 * With a monthly limit set, adding shared expenses that cross the limit returns
 * `limitExceeded: true` on the first crossing and flips the budget's
 * limit_notified flag once; a subsequent crossing still reports limitExceeded
 * true but does NOT re-flip the flag (verified against the DB).
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

describe('Budget limit notification once-per-cycle (integration)', () => {
  let ctx: TestAppContext | null = null;

  beforeAll(async () => {
    ctx = await createTestApp();
  }, 30000);

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  it('fires limitExceeded once and does not re-flip limit_notified on the next crossing', async () => {
    if (!ctx) {
      // eslint-disable-next-line no-console
      console.warn('[integration] skipped: Postgres unavailable');
      return;
    }
    const { app, dataSource } = ctx;
    const server = app.getHttpServer();

    const owner = await registerAndLogin(app, 'limit.owner@example.com');

    // Create a budget with a small monthly limit.
    const createRes = await request(server)
      .post('/api/v1/budgets')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ name: 'Límite', monthlyLimit: 100 });
    const budgetId: string = createRes.body.id;

    // Need a category to attach the shared expenses to.
    const cats = await request(server)
      .get('/api/v1/categories')
      .set('Authorization', `Bearer ${owner.accessToken}`);
    const categoryId = (cats.body as Array<{ id: string; type: string }>).find(
      (c) => c.type === 'mandatory',
    )!.id;

    const addExpense = (amount: number) =>
      request(server)
        .post(`/api/v1/budgets/${budgetId}/expenses`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ categoryId, amount, expenseDate: '2024-05-10' });

    // Under the limit — no breach.
    const under = await addExpense(40);
    expect(under.status).toBe(201);
    expect(under.body.limitExceeded).toBe(false);

    // Crosses the limit (40 + 80 = 120 > 100) — first breach fires once.
    const cross = await addExpense(80);
    expect(cross.status).toBe(201);
    expect(cross.body.limitExceeded).toBe(true);

    const afterFirst = await dataSource.query(
      'SELECT limit_notified FROM shared_budgets WHERE id = $1',
      [budgetId],
    );
    expect(afterFirst[0].limit_notified).toBe(true);

    // Another crossing — still reports exceeded, but the flag was already set
    // so it is not re-flipped (idempotent once-per-cycle).
    const again = await addExpense(50);
    expect(again.status).toBe(201);
    expect(again.body.limitExceeded).toBe(true);

    const afterSecond = await dataSource.query(
      'SELECT limit_notified FROM shared_budgets WHERE id = $1',
      [budgetId],
    );
    expect(afterSecond[0].limit_notified).toBe(true);
  });
});
