import fc from 'fast-check';
import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { MetricsService } from '../metrics.service';
import { ExpenseRecord } from '../../expenses/entities/expense-record.entity';
import { MetricsQueryDto } from '../dto/metrics-query.dto';

// ---------------------------------------------------------------------------
// Chainable query-builder mock — mirrors metrics.service.test.ts. Every builder
// method returns the builder so the service can fluently chain; getRawMany
// resolves to the queued raw rows. We capture all where/andWhere/etc. calls so
// property assertions can inspect the recorded user scoping and filters.
// ---------------------------------------------------------------------------
interface RecordedCall {
  method: string;
  args: unknown[];
}

interface QueryBuilderMock {
  calls: RecordedCall[];
  leftJoin: jest.Mock;
  where: jest.Mock;
  andWhere: jest.Mock;
  select: jest.Mock;
  addSelect: jest.Mock;
  groupBy: jest.Mock;
  addGroupBy: jest.Mock;
  getRawMany: jest.Mock;
}

function makeQueryBuilderMock(rawRows: unknown[]): QueryBuilderMock {
  const calls: RecordedCall[] = [];
  const qb = { calls } as QueryBuilderMock;
  const record = (method: string) =>
    jest.fn((...args: unknown[]) => {
      calls.push({ method, args });
      return qb;
    });
  qb.leftJoin = record('leftJoin');
  qb.where = record('where');
  qb.andWhere = record('andWhere');
  qb.select = record('select');
  qb.addSelect = record('addSelect');
  qb.groupBy = record('groupBy');
  qb.addGroupBy = record('addGroupBy');
  qb.getRawMany = jest.fn().mockResolvedValue(rawRows);
  return qb;
}

function makeRepoMock(rawRows: unknown[]) {
  const qb = makeQueryBuilderMock(rawRows);
  const repo = {
    createQueryBuilder: jest.fn(() => qb),
    __qb: qb,
  };
  return repo;
}

function makeService(rawRows: unknown[]) {
  const repo = makeRepoMock(rawRows);
  const service = new MetricsService(
    repo as unknown as Repository<ExpenseRecord>,
  );
  return { service, repo };
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

// A raw aggregate row as the query builder would produce it: a non-null key,
// a NUMERIC(14,2) total as a string, and an integer count as a string. Totals
// are built from an integer number of cents to avoid float noise in the
// generator itself.
interface RawRowSpec {
  row: { key: string; label?: string; total: string; count: string };
  cents: number;
}

const rawRowArb: fc.Arbitrary<RawRowSpec> = fc.record({
  key: fc.uuid(),
  // 0 .. ~10 million dollars expressed in cents.
  cents: fc.integer({ min: 0, max: 1_000_000_000 }),
  count: fc.integer({ min: 0, max: 100_000 }),
  withLabel: fc.boolean(),
  label: fc.string(),
}).map(({ key, cents, count, withLabel, label }) => {
  const total = (cents / 100).toFixed(2);
  const row: { key: string; label?: string; total: string; count: string } = {
    key,
    total,
    count: String(count),
  };
  if (withLabel) {
    row.label = label;
  }
  return { row, cents };
});

// An ISO date (YYYY-MM-DD) within a wide, valid range.
const isoDateArb: fc.Arbitrary<string> = fc
  .date({ min: new Date('2000-01-01'), max: new Date('2100-12-31') })
  .map((d) => d.toISOString().slice(0, 10));

// Arbitrary optional filters (never touching from/to, which the properties
// control directly) to exercise user scoping under varied queries.
const filtersArb: fc.Arbitrary<Partial<MetricsQueryDto>> = fc.record(
  {
    categoryIds: fc.array(fc.uuid(), { maxLength: 5 }),
    type: fc.constantFrom(
      'mandatory',
      'optional',
      'vehicle',
      'loan',
      'income',
    ),
    groupBy: fc.constantFrom('category', 'month', 'type'),
  },
  { requiredKeys: [] },
) as fc.Arbitrary<Partial<MetricsQueryDto>>;

describe('MetricsService property-based tests (Requirement 6.x)', () => {
  // P16 — the grand total equals the sum of all breakdown totals.
  // **Validates: Requirements 6.x**
  it('P16: result.total equals the sum of breakdown totals', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(rawRowArb, { maxLength: 50 }), async (specs) => {
        const rawRows = specs.map((s) => s.row);
        const { service } = makeService(rawRows);

        const result = await service.aggregate(
          'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          { groupBy: 'category' } as MetricsQueryDto,
        );

        const sumOfBreakdown = result.breakdown.reduce(
          (acc, r) => acc + r.total,
          0,
        );
        // total is derived from the breakdown, so they must agree within a
        // small epsilon that absorbs float accumulation drift.
        expect(Math.abs(result.total - sumOfBreakdown)).toBeLessThan(1e-6);

        // Cross-check against the independently computed integer-cent sum.
        const expectedCents = specs.reduce((acc, s) => acc + s.cents, 0);
        expect(Math.round(result.total * 100)).toBe(expectedCents);
      }),
    );
  });

  // P17a — an invalid date range (from > to) is rejected and never queries.
  // **Validates: Requirements 6.x**
  it('P17a: rejects from > to with BadRequestException and does not query', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(isoDateArb, isoDateArb).filter(([a, b]) => a !== b),
        async ([d1, d2]) => {
          // Order so that `from` is strictly later than `to`.
          const [earlier, later] = d1 < d2 ? [d1, d2] : [d2, d1];
          const from = later;
          const to = earlier;

          const { service, repo } = makeService([]);

          await expect(
            service.aggregate('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', {
              from,
              to,
            } as MetricsQueryDto),
          ).rejects.toBeInstanceOf(BadRequestException);

          // Rejected before touching the database.
          expect(repo.createQueryBuilder).not.toHaveBeenCalled();
        },
      ),
    );
  });

  // P17b — an empty match yields total 0 and an empty breakdown.
  // **Validates: Requirements 6.x**
  it('P17b: empty result set yields total 0 and empty breakdown', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), filtersArb, async (userId, filters) => {
        const { service } = makeService([]);

        const result = await service.aggregate(
          userId,
          filters as MetricsQueryDto,
        );

        expect(result.total).toBe(0);
        expect(result.breakdown).toEqual([]);
      }),
    );
  });

  // P15 — aggregation only ever includes the requesting user's data: the
  // service always adds a where clause scoping expense.user_id to the exact
  // userId passed in, for arbitrary userIds and filters.
  // **Validates: Requirements 6.x**
  it('P15: always scopes the query to the requesting user id', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), filtersArb, async (userId, filters) => {
        const { service, repo } = makeService([]);

        await service.aggregate(userId, filters as MetricsQueryDto);

        const whereCall = repo.__qb.calls.find((c) => c.method === 'where');
        expect(whereCall).toBeDefined();
        expect(whereCall?.args[0]).toContain('expense.user_id = :userId');
        expect(whereCall?.args[1]).toEqual({ userId });

        // No where/andWhere clause should ever reference a different user id.
        const scopingCalls = repo.__qb.calls.filter(
          (c) => c.method === 'where' || c.method === 'andWhere',
        );
        for (const call of scopingCalls) {
          const params = call.args[1] as Record<string, unknown> | undefined;
          if (params && 'userId' in params) {
            expect(params.userId).toBe(userId);
          }
        }
      }),
    );
  });
});
