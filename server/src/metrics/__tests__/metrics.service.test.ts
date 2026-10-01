import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { MetricsService } from '../metrics.service';
import { ExpenseRecord } from '../../expenses/entities/expense-record.entity';
import { MetricsQueryDto } from '../dto/metrics-query.dto';

// ---------------------------------------------------------------------------
// A chainable query-builder mock. Every builder method returns the builder so
// the service can fluently chain .leftJoin().where().select()...; getRawMany
// resolves to whatever raw rows the test queues up. We also capture the
// where/andWhere calls so tests can assert the user scoping and filters.
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

const USER_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const CAT_GAS = 'cccccccc-cccc-cccc-cccc-ccccccccccc1';
const CAT_NET = 'cccccccc-cccc-cccc-cccc-ccccccccccc2';

function makeService(rawRows: unknown[]) {
  const repo = makeRepoMock(rawRows);
  const service = new MetricsService(
    repo as unknown as Repository<ExpenseRecord>,
  );
  return { service, repo };
}

describe('MetricsService (Requirements 6.1 – 6.8)', () => {
  it('scopes the query to the authenticated user', async () => {
    const { service, repo } = makeService([]);

    await service.aggregate(USER_A, {} as MetricsQueryDto);

    const whereCall = repo.__qb.calls.find((c) => c.method === 'where');
    expect(whereCall).toBeDefined();
    expect(whereCall?.args[0]).toContain('expense.user_id = :userId');
    expect(whereCall?.args[1]).toEqual({ userId: USER_A });
  });

  it('yields total 0 and an empty breakdown when nothing matches (Req 6.8)', async () => {
    const { service } = makeService([]);

    const result = await service.aggregate(USER_A, {} as MetricsQueryDto);

    expect(result.total).toBe(0);
    expect(result.breakdown).toEqual([]);
  });

  it('sums amounts as numbers and total equals sum of breakdown totals (P16)', async () => {
    const { service } = makeService([
      { key: CAT_GAS, label: 'Gas', total: '120.50', count: '3' },
      { key: CAT_NET, label: 'Netflix', total: '15.99', count: '1' },
    ]);

    const result = await service.aggregate(USER_A, {
      groupBy: 'category',
    } as MetricsQueryDto);

    expect(result.breakdown).toEqual([
      { key: CAT_GAS, label: 'Gas', total: 120.5, count: 3 },
      { key: CAT_NET, label: 'Netflix', total: 15.99, count: 1 },
    ]);

    const sumOfBreakdown = result.breakdown.reduce((a, r) => a + r.total, 0);
    expect(result.total).toBeCloseTo(sumOfBreakdown, 5);
    expect(result.total).toBe(136.49);
  });

  it('returns correct per-category totals when grouping by category', async () => {
    const { service, repo } = makeService([
      { key: CAT_GAS, label: 'Gas', total: '200.00', count: '2' },
    ]);

    const result = await service.aggregate(USER_A, {
      groupBy: 'category',
    } as MetricsQueryDto);

    // Grouping key/label expressions were wired for the category dimension.
    const groupByCall = repo.__qb.calls.find((c) => c.method === 'groupBy');
    expect(groupByCall?.args[0]).toBe('expense.category_id');

    expect(result.breakdown).toHaveLength(1);
    expect(result.breakdown[0]).toEqual({
      key: CAT_GAS,
      label: 'Gas',
      total: 200,
      count: 2,
    });
    expect(result.total).toBe(200);
  });

  it('applies an inclusive BETWEEN filter for a date range', async () => {
    const { service, repo } = makeService([]);

    await service.aggregate(USER_A, {
      from: '2024-01-01',
      to: '2024-01-31',
    } as MetricsQueryDto);

    const rangeCall = repo.__qb.calls.find(
      (c) =>
        c.method === 'andWhere' &&
        typeof c.args[0] === 'string' &&
        (c.args[0] as string).includes('BETWEEN'),
    );
    expect(rangeCall).toBeDefined();
    expect(rangeCall?.args[1]).toEqual({
      from: '2024-01-01',
      to: '2024-01-31',
    });

    const result = await service.aggregate(USER_A, {
      from: '2024-01-01',
      to: '2024-01-31',
    } as MetricsQueryDto);
    expect(result.from).toBe('2024-01-01');
    expect(result.to).toBe('2024-01-31');
  });

  it('rejects a date range where from > to (Req 6.7 / P17)', async () => {
    const { service, repo } = makeService([]);

    await expect(
      service.aggregate(USER_A, {
        from: '2024-02-01',
        to: '2024-01-01',
      } as MetricsQueryDto),
    ).rejects.toBeInstanceOf(BadRequestException);

    // Rejected before touching the database.
    expect(repo.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('filters by category ids using an IN clause', async () => {
    const { service, repo } = makeService([]);

    await service.aggregate(USER_A, {
      categoryIds: [CAT_GAS, CAT_NET],
    } as MetricsQueryDto);

    const inCall = repo.__qb.calls.find(
      (c) =>
        c.method === 'andWhere' &&
        typeof c.args[0] === 'string' &&
        (c.args[0] as string).includes('IN (:...categoryIds)'),
    );
    expect(inCall).toBeDefined();
    expect(inCall?.args[1]).toEqual({ categoryIds: [CAT_GAS, CAT_NET] });
  });

  it('skips breakdown rows with a null grouping key', async () => {
    const { service } = makeService([
      { key: null, label: null, total: '50.00', count: '1' },
      { key: 'income', total: '10.00', count: '1' },
    ]);

    const result = await service.aggregate(USER_A, {
      groupBy: 'type',
    } as MetricsQueryDto);

    expect(result.breakdown).toEqual([{ key: 'income', total: 10, count: 1 }]);
    // total only reflects the well-keyed rows.
    expect(result.total).toBe(10);
  });
});
