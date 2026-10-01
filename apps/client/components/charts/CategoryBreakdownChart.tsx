/**
 * CategoryBreakdownChart — metrics breakdown adapter over {@link BarChart}
 * (Requirements 6.6, 8.1, 8.3).
 *
 * Takes the aggregated breakdown rows produced by the Metrics_Engine and
 * renders them as a horizontal bar chart, formatting each bar's value as money
 * via `formatMoney` (Req 8.3). Below each bar it shows the record count for the
 * group, so a single component conveys both magnitude and volume.
 *
 * This is a thin, presentational wrapper: it owns no state and performs no data
 * fetching. The metrics screen (task 15.1 / 15.4) can pass its `breakdown`
 * array straight through.
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Typography } from '../../constants/theme';
import { formatMoney } from '../../utils/money';
import { BarChart, type BarChartDatum } from './BarChart';

/** A single metrics breakdown row (mirrors `MetricsBreakdownRow`). */
export interface CategoryBreakdownRow {
  /** Grouping identifier (category id, `YYYY-MM`, or expense type). */
  key: string;
  /** Human-friendly label; falls back to `key` when absent. */
  label?: string;
  /** Summed amount for the group. */
  total: number;
  /** Number of expense records in the group. */
  count: number;
}

export interface CategoryBreakdownChartProps {
  /** The breakdown rows to render, in display order. */
  rows: CategoryBreakdownRow[];
  /** ISO 4217 currency code used to format totals. Defaults to the app default. */
  currency?: string;
}

export function CategoryBreakdownChart({
  rows,
  currency,
}: CategoryBreakdownChartProps): React.JSX.Element {
  const data = useMemo<BarChartDatum[]>(
    () =>
      rows.map((row) => ({
        key: row.key,
        label: row.label ?? row.key,
        value: row.total,
      })),
    [rows],
  );

  const formatValue = useMemo(
    () => (value: number) =>
      currency ? formatMoney(value, currency) : formatMoney(value),
    [currency],
  );

  return (
    <View style={styles.container}>
      <BarChart data={data} formatValue={formatValue} />
      <View style={styles.countList}>
        {rows.map((row) => (
          <Text key={row.key} style={styles.count}>
            {(row.label ?? row.key) + ': '}
            {row.count} {row.count === 1 ? 'registro' : 'registros'}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  } as ViewStyle,
  countList: {
    gap: 2,
  } as ViewStyle,
  count: {
    ...Typography.Caption,
  } as TextStyle,
});
