/**
 * Shared integration-test harness for the Lucas backend.
 *
 * The app's database is Postgres (via Supabase). Integration tests run against
 * a REAL Postgres instance — the local Supabase DB by default
 * (postgresql://postgres:postgres@127.0.0.1:54322/postgres), overridable with
 * TEST_DATABASE_URL. There is NO SQLite / in-memory fallback: entities use
 * Postgres-specific column types (uuid, jsonb, timestamptz, numeric), so tests
 * must exercise the same engine as production.
 *
 * When the DB is unreachable (Docker / `supabase start` not running), the
 * harness degrades gracefully: `createTestApp()` resolves to `null` and the
 * specs skip with a clear message rather than failing CI.
 *
 * WARNING: createTestApp() uses `synchronize: true` + `dropSchema: true`, which
 * DROPS AND RECREATES the public schema on connect. It must only ever point at
 * a throwaway/local database (the local Supabase DB or a dedicated test DB via
 * TEST_DATABASE_URL) — NEVER production.
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Client } from 'pg';

import { AppModule } from '../../src/app.module';
import { MailService } from '../../src/mail/mail.service';

/** Local Supabase Postgres DSN (DB port 54322 per supabase/config.toml). */
export const DEFAULT_TEST_DSN =
  'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

/** The DSN integration tests connect to (env override wins). */
export function testDatabaseUrl(): string {
  return process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DSN;
}

/**
 * Returns true when a Postgres server accepts a connection at `dsn` within a
 * short timeout. Used to decide whether to run or skip the integration suite.
 */
export async function isPostgresReachable(dsn: string): Promise<boolean> {
  const client = new Client({ connectionString: dsn, connectionTimeoutMillis: 2000 });
  try {
    await client.connect();
    await client.query('SELECT 1');
    return true;
  } catch {
    return false;
  } finally {
    try {
      await client.end();
    } catch {
      /* ignore */
    }
  }
}

/** A spy over the stubbed MailService so specs can assert dispatched emails. */
export interface MailSpy {
  sendConfirmationEmail: jest.Mock;
  sendBudgetInvitation: jest.Mock;
}

export interface TestAppContext {
  app: INestApplication;
  dataSource: DataSource;
  mail: MailSpy;
}

/**
 * Boots a Nest application wired to the real feature modules but with the
 * TypeORM root connection overridden to the test Postgres DB (synchronize +
 * dropSchema for an isolated schema). MailService is replaced with jest spies.
 *
 * Resolves to `null` when the test DB is unreachable, so callers can skip.
 */
export async function createTestApp(): Promise<TestAppContext | null> {
  const dsn = testDatabaseUrl();
  if (!(await isPostgresReachable(dsn))) {
    // eslint-disable-next-line no-console
    console.warn(
      `[integration] Postgres not reachable at ${dsn} — skipping integration tests. Run: supabase start`,
    );
    return null;
  }

  const mail: MailSpy = {
    sendConfirmationEmail: jest.fn().mockResolvedValue(undefined),
    sendBudgetInvitation: jest.fn().mockResolvedValue(undefined),
  };

  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    // Replace the production TypeORM root (reads DATABASE_URL) with a test
    // connection against the throwaway Postgres DB.
    .overrideModule(TypeOrmModule)
    .useModule(
      TypeOrmModule.forRoot({
        type: 'postgres',
        url: dsn,
        autoLoadEntities: true,
        synchronize: true,
        dropSchema: true,
      }),
    )
    .overrideProvider(MailService)
    .useValue(mail)
    .compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  await app.init();

  const dataSource = app.get(DataSource);
  return { app, dataSource, mail };
}

/** Closes the app and its DataSource; safe to call with a null context. */
export async function closeTestApp(ctx: TestAppContext | null): Promise<void> {
  if (!ctx) return;
  await ctx.app.close();
}

/**
 * Registers a user and logs in, returning the access token plus the user id.
 * Used by integration specs to exercise JWT-guarded endpoints.
 */
export async function registerAndLogin(
  app: import('@nestjs/common').INestApplication,
  email: string,
  password = 'StrongPass1!',
): Promise<{ accessToken: string; userId: string }> {
  const request = (await import('supertest')).default;
  await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ email, password });

  const login = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password });

  const accessToken: string = login.body.accessToken;

  const ds = app.get(DataSource);
  const rows = await ds.query(
    'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
    [email],
  );
  return { accessToken, userId: rows[0]?.id as string };
}
