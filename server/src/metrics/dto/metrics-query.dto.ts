import {
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsUUID,
} from 'class-validator';
import type { ExpenseType } from '../../categories/entities/category.entity';

/**
 * How the metrics aggregation groups its breakdown rows:
 *  - `category` — one row per category id
 *  - `month`    — one row per YYYY-MM calendar month (by expenseDate)
 *  - `type`     — one row per category expense type
 */
export type MetricsGroupBy = 'category' | 'month' | 'type';

/**
 * Filter + grouping payload for `POST /metrics/expenses`.
 *
 * Every field is optional: an empty body means "all of the authenticated
 * user's expense records, grouped by category". The query is always scoped to
 * the requesting user by the service — none of these fields can widen the scope
 * to another user's data.
 *
 * Date bounds are inclusive on both ends (`expenseDate BETWEEN from AND to`).
 * When both are supplied, the service rejects a range where `from > to`
 * (Requirement 6.7 / Property P17).
 */
export class MetricsQueryDto {
  /** Inclusive lower bound on expenseDate (ISO date, e.g. `2024-01-01`). */
  @IsOptional()
  @IsDateString()
  from?: string;

  /** Inclusive upper bound on expenseDate (ISO date, e.g. `2024-01-31`). */
  @IsOptional()
  @IsDateString()
  to?: string;

  /** Restrict to these category ids (OR-ed together). */
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  categoryIds?: string[];

  /** Restrict to categories of this expense type. */
  @IsOptional()
  @IsIn(['mandatory', 'optional', 'vehicle', 'loan', 'income'])
  type?: ExpenseType;

  /** Dimension used to group the breakdown rows. Defaults to `category`. */
  @IsOptional()
  @IsIn(['category', 'month', 'type'])
  groupBy?: MetricsGroupBy;
}
