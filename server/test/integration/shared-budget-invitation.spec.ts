/**
 * Integration test — shared budget invitation & acceptance (task 21.2, Req 5).
 *
 * Owner creates a budget and invites a registered user by email; the invitee
 * accepts and becomes a member. Verified end-to-end against real Postgres:
 *   • POST /budgets creates a budget with the creator as owner;
 *   • POST /budgets/:id/invitations by the owner creates a pending invitation
 *     and dispatches an invitation email (MailService spy);
 *   • POST /invitations/:id/accept by the invitee adds them as a member;
 *   • GET /budgets/:id/members then lists both users.
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

describe('Shared budget invitation & acceptance (integration)', () => {
  let ctx: TestAppContext | null = null;

  beforeAll(async () => {
    ctx = await createTestApp();
  }, 30000);

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  it('owner invites a registered user who accepts and becomes a member', async () => {
    if (!ctx) {
      // eslint-disable-next-line no-console
      console.warn('[integration] skipped: Postgres unavailable');
      return;
    }
    const { app, mail } = ctx;
    const server = app.getHttpServer();

    const owner = await registerAndLogin(app, 'budget.owner@example.com');
    const invitee = await registerAndLogin(app, 'budget.invitee@example.com');

    // Owner creates a budget.
    const createRes = await request(server)
      .post('/api/v1/budgets')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ name: 'Hogar', monthlyLimit: 1000 });
    expect(createRes.status).toBe(201);
    const budgetId: string = createRes.body.id;

    // Owner invites the invitee by email.
    const inviteRes = await request(server)
      .post(`/api/v1/budgets/${budgetId}/invitations`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ inviteeEmail: 'budget.invitee@example.com' });
    expect(inviteRes.status).toBe(201);
    expect(inviteRes.body.status).toBe('pending');
    const invitationId: string = inviteRes.body.id;

    // Invitation email dispatched (Req 5.2).
    expect(mail.sendBudgetInvitation).toHaveBeenCalled();

    // A non-owner cannot invite (Req 5 — owner only).
    const forbidden = await request(server)
      .post(`/api/v1/budgets/${budgetId}/invitations`)
      .set('Authorization', `Bearer ${invitee.accessToken}`)
      .send({ inviteeEmail: 'someone.else@example.com' });
    expect(forbidden.status).toBe(403);

    // Invitee accepts.
    const acceptRes = await request(server)
      .post(`/api/v1/invitations/${invitationId}/accept`)
      .set('Authorization', `Bearer ${invitee.accessToken}`);
    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.role).toBe('member');

    // Members now include both the owner and the invitee.
    const membersRes = await request(server)
      .get(`/api/v1/budgets/${budgetId}/members`)
      .set('Authorization', `Bearer ${owner.accessToken}`);
    expect(membersRes.status).toBe(200);
    const userIds = (membersRes.body as Array<{ userId: string; role: string }>)
      .map((m) => m.userId)
      .sort();
    expect(userIds).toEqual([owner.userId, invitee.userId].sort());
  });
});
