import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExpenseRecord } from '../expenses/entities/expense-record.entity';
import { MetricsGroupBy, MetricsQueryDto } from './dto/metrics-query.dto';

/**
 * A single aggregated row of the metrics breakdown.
 *  - `key`   — the grouping value (category id, `YYYY-MM`, or expense type)
 *  - `label` — a human-friendly label when one is available (category name)
 *  - `total` — the summed amount for the group (as a number)
 *  - `count` — the number of expense records in the group
 */
export interface MetricsBreakdownRow {
  key: string;
  label?: string;
  total: number;
  count: number;
}

/**
 * The aggregated result returned by `POST /metrics/expenses`.
 *
 * Invariants (Properties P15/P16):
 *  - `total` equals the arithmetic sum of every `breakdown[i].total`.
 *  - An empty match yields `total === 0` and `breakdown === []`.
 */
export interface MetricsResult {
  total: number;
  breakdown: MetricsBreakdownRow[];
  from: string | null;
  to: string | null;
}

// Row shape returned by the aggregation query builder.
interface RawAggregateRow {
  key: string | null;
  label?: string | null;
  total: string | null;
  count: string | null;
}

/**
 * Computes aggregated expense totals for a single user.
 *
 * All queries are scoped to the authenticated user's id; the DTO filters can
 * only ever narrow the result set, never reach another user's records.
 */
@Injectable()
export class MetricsService {
  constructor(
    @InjectRepository(ExpenseRecord)
    private readonly expenseRecordsRepository: Repository<ExpenseRecord>,
  ) {}

  /**
   * Aggregate the authenticated user's expense records under the given filter.
   *
   * @throws BadRequestException when a date range has `from > to`
   *         (Requirement 6.7 / Property P17).
   */
  async aggregate(
    userId: string,
    query: MetricsQueryDto,
  ): Promise<MetricsResult> {
    const from = query.from ?? null;
    const to = query.to ?? null;

    if (from !== null && to !== null && from > to) {
      throw new BadRequestException(
        'Invalid date range: "from" must not be later than "to"',
      );
    }

    const groupBy: MetricsGroupBy = query.groupBy ?? 'category';

    // The category relation is needed to filter/group by expense type and to
    // surface a human label for the breakdown rows.
    const qb = this.expenseRecordsRepository
      .createQueryBuilder('expense')
      .leftJoin('expense.category', 'category')
      .where('expense.user_id = :userId', { userId });

    if (from !== null && to !== null) {
      qb.andWhere('expense.expense_date BETWEEN :from AND :to', { from, to });
    } else if (from !== null) {
      qb.andWhere('expense.expense_date >= :from', { from });
    } else if (to !== null) {
      qb.andWhere('expense.expense_date <= :to', { to });
    }

    if (query.categoryIds && query.categoryIds.length > 0) {
      qb.andWhere('expense.category_id IN (:...categoryIds)', {
        categoryIds: query.categoryIds,
      });
    }

    if (query.type !== undefined) {
      qb.andWhere('category.type = :type', { type: query.type });
    }

    const { keyExpr, labelExpr } = this.groupingExpressions(groupBy);

    qb.select(keyExpr, 'key')
      .addSelect('SUM(expense.amount)', 'total')
      .addSelect('COUNT(expense.id)', 'count')
      .groupBy(keyExpr);

    if (labelExpr) {
      qb.addSelect(labelExpr, 'label').addGroupBy(labelExpr);
    }

    const rows = await qb.getRawMany<RawAggregateRow>();

    const breakdown: MetricsBreakdownRow[] = rows
      // A null key can only occur for records whose grouping dimension is null
      // (e.g. a missing category when grouping by type); skip them so the
      // breakdown keys stay well-defined.
      .filter((row): row is RawAggregateRow & { key: string } => row.key != null)
      .map((row) => {
        const groupTotal = this.parseAmount(row.total);
        const entry: MetricsBreakdownRow = {
          key: row.key,
          total: groupTotal,
          count: Number(row.count ?? 0),
        };
        if (row.label != null) {
          entry.label = row.label;
        }
        return entry;
      });

    // Derive the grand total from the breakdown so P16 holds by construction:
    // total === sum of every breakdown row total.
    const total = breakdown.reduce((acc, row) => acc + row.total, 0);

    return {
      total: this.round2(total),
      breakdown,
      from,
      to,
    };
  }

  /**
   * The SQL expressions used to derive the grouping key (and optional label)
   * for a given `groupBy` dimension.
   */
  private groupingExpressions(groupBy: MetricsGroupBy): {
    keyExpr: string;
    labelExpr: string | null;
  } {
    switch (groupBy) {
      case 'month':
        // YYYY-MM calendar month derived from the record's date.
        return { keyExpr: "to_char(expense.expense_date, 'YYYY-MM')", labelExpr: null };
      case 'type':
        return { keyExpr: 'category.type', labelExpr: null };
      case 'category':
      default:
        return { keyExpr: 'expense.category_id', labelExpr: 'category.name' };
    }
  }

  /** Parse a NUMERIC(14,2) string into a number, treating null as 0. */
  private parseAmount(value: string | null): number {
    if (value == null) {
      return 0;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  /** Round to 2 decimal places to tame floating-point accumulation drift. */
  private round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
