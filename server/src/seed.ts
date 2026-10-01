/**
 * Standalone seed script — inserts the 11 predefined categories required by
 * Requirements 2.2 (mandatory) and 3.2 (optional).
 *
 * These are normally seeded by supabase/seed.sql via the Supabase CLI. When
 * bringing the MVP up against a managed Postgres (cloud) without that CLI, run:
 *
 *   npm run seed
 *
 * It is idempotent: predefined categories (user_id IS NULL) are only inserted
 * when missing, matched case-insensitively by name.
 *
 * Reuses the Nest application context so the DB connection (SSL, synchronize,
 * DATABASE_URL) matches exactly what the running server uses.
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { Category, ExpenseType } from './categories/entities/category.entity';

interface SeedCategory {
  name: string;
  emoji: string;
  type: ExpenseType;
}

const PREDEFINED: SeedCategory[] = [
  // Mandatory (Req 2.2)
  { name: 'Agua', emoji: '💧', type: 'mandatory' },
  { name: 'Luz', emoji: '💡', type: 'mandatory' },
  { name: 'Gas', emoji: '🔥', type: 'mandatory' },
  { name: 'Arriendo', emoji: '🏠', type: 'mandatory' },
  { name: 'Comida', emoji: '🍔', type: 'mandatory' },
  { name: 'Internet', emoji: '🌐', type: 'mandatory' },
  { name: 'Colegio', emoji: '🎒', type: 'mandatory' },
  { name: 'Transporte', emoji: '🚌', type: 'mandatory' },
  // Optional (Req 3.2)
  { name: 'Netflix', emoji: '🎬', type: 'optional' },
  { name: 'Spotify', emoji: '🎵', type: 'optional' },
  { name: 'Amazon Prime', emoji: '📦', type: 'optional' },
];

async function seed(): Promise<void> {
  const logger = new Logger('Seed');
  const appContext = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const dataSource = appContext.get(DataSource);
    const repo = dataSource.getRepository(Category);

    let created = 0;
    for (const cat of PREDEFINED) {
      const existing = await repo
        .createQueryBuilder('c')
        .where('c.user_id IS NULL')
        .andWhere('LOWER(c.name) = LOWER(:name)', { name: cat.name })
        .getOne();

      if (existing) {
        continue;
      }

      await repo.save(
        repo.create({
          userId: null,
          name: cat.name,
          emoji: cat.emoji,
          type: cat.type,
          isPredefined: true,
        }),
      );
      created += 1;
    }

    logger.log(
      `Seed complete: ${created} predefined categories created, ${PREDEFINED.length - created} already present.`,
    );
  } finally {
    await appContext.close();
  }
}

seed().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Seed failed:', err);
  process.exit(1);
});
