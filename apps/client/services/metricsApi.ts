/**
 * Metrics API — React Query hook for the Metrics_Engine (Requirement 6).
 *
 * Backed by the NestJS MetricsModule: `POST /metrics/expenses` accepts a
 * structured filter body and returns an aggregated breakdown scoped to the
 * authenticated user (the server derives the user from the JWT; none of these
 * filters can widen scope to another user's data).
 *
 * Request / response shapes mirror the backend exactly:
 *   • Request  — MetricsQuery  (server: MetricsQueryDto)
 *   • Response — MetricsResult (server: MetricsResult)
 *
 * All requests go through the shared `api` axios instance (bearer token +
 * silent-refresh interceptors from `services/api.ts`).
 */
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { api } from './api';
import type { ApiErrorBody } from './authApi';
import type { ExpenseType } from './expensesApi';

/**
 * Dimension used to group the breakdown rows (mirrors the backend):
 *  - `category` — one row per category (with the category name as label)
 *  - `month`    — one row per `YYYY-MM` calendar month
 *  - `type`     — one row per category expense type
 */
export type MetricsGroupBy = 'category' | 'month' | 'type';

/**
 * Filter + grouping payload for `POST /metrics/expenses`.
 *
 * Every field is optional: an empty body means "all of the authenticated
 * user's expense records, grouped by category". Date bounds are inclusive on
 * both ends; the server rejects a range where `from > to` with a 400
 * (Requirement 6.7).
 */
export interface MetricsQuery {
  /** Inclusive lower bound on expense date (ISO date, e.g. `2024-01-01`). */
  from?: string;
  /** Inclusive upper bound on expense date (ISO date, e.g. `2024-01-31`). */
  to?: string;
  /** Restrict to these category ids (OR-ed together). */
  categoryIds?: string[];
  /** Restrict to categories of this expense type. */
  type?: ExpenseType;
  /** Dimension used to group the breakdown rows. Defaults to `category`. */
  groupBy?: MetricsGroupBy;
}

/**
 * A single aggregated row of the metrics breakdown.
 *  - `key`   — the grouping value (category id, `YYYY-MM`, or expense type)
 *  - `label` — human-friendly label when available (the category name)
 *  - `total` — summed amount for the group
 *  - `count` — number of expense records in the group
 */
export interface MetricsBreakdownRow {
  key: string;
  label?: string;
  total: number;
  count: number;
}

/**
 * Aggregated result returned by `POST /metrics/expenses`.
 *
 * Invariant: `total` equals the arithmetic sum of every `breakdown[i].total`.
 * An empty match yields `total === 0` and `breakdown === []` (Requirement 6.8).
 */
export interface MetricsResult {
  total: number;
  breakdown: MetricsBreakdownRow[];
  from: string | null;
  to: string | null;
}

export type MetricsApiError = AxiosError<ApiErrorBody>;

/** Build a stable React Query key for a given filter. */
export function metricsQueryKey(filter: MetricsQuery): readonly unknown[] {
  return ['metrics', filter] as const;
}

async function fetchMetrics(filter: MetricsQuery): Promise<MetricsResult> {
  const { data } = await api.post<MetricsResult>('/metrics/expenses', filter);
  return data;
}

/**
 * React Query hook that fetches the aggregated expense metrics for the given
 * filter. The query key includes the filter so changing any criterion fetches
 * (and caches) a distinct result.
 *
 * @param filter   The metrics filter / grouping payload.
 * @param enabled  When `false`, the query stays idle (useful to defer the
 *                 request until the user confirms a filter). Defaults to true.
 */
export function useMetrics(
  filter: MetricsQuery,
  enabled = true,
): UseQueryResult<MetricsResult, MetricsApiError> {
  return useQuery<MetricsResult, MetricsApiError>({
    queryKey: metricsQueryKey(filter),
    queryFn: () => fetchMetrics(filter),
    enabled,
  });
}
