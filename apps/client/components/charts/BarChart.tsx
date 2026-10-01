/**
 * BarChart — dependency-free horizontal bar chart (Requirements 6.6, 8.1).
 *
 * Renders a list of data points as horizontal proportional bars, each with a
 * label and a formatted value. Bars are sized relative to the largest value in
 * the dataset so the widest bar fills the track and the rest scale down.
 *
 * No external chart library is used: bars are plain React Native Views whose
 * width is a percentage string. Colors come exclusively from the theme palette
 * (Req 8.1), cycling through [primary, secondary, accent] unless a data point
 * supplies its own `color`. Each bar exposes an accessibility label of the form
 * `${label}: ${formattedValue}` (Req 8.2 touch targets are not relevant here —
 * bars are non-interactive, but they remain screen-reader friendly).
 */
import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors, Typography } from '../../constants/theme';

/** A single bar's data. */
export interface BarChartDatum {
  /** Stable React key / grouping identifier. */
  key: string;
  /** Human-friendly label shown above the bar. */
  label: string;
  /** Numeric magnitude driving the bar width. */
  value: number;
  /** Optional explicit bar color; falls back to the cycling palette. */
  color?: string;
}

export interface BarChartProps {
  /** The data points to render, in display order. */
  data: BarChartDatum[];
  /**
   * Formats a numeric value for display next to each bar. Defaults to the
   * value's own `toString()`.
   */
  formatValue?: (value: number) => string;
}

/** Palette colors bars cycle through when no explicit color is provided. */
const PALETTE = [Colors.primary, Colors.secondary, Colors.accent] as const;

/** Minimum visible width (%) so a non-zero value always renders a sliver. */
const MIN_BAR_PCT = 2;

export function BarChart({ data, formatValue }: BarChartProps): React.JSX.Element {
  const format = formatValue ?? ((value: number) => String(value));

  const maxValue = useMemo(
    () => data.reduce((max, datum) => Math.max(max, datum.value), 0),
    [data],
  );

  return (
    <View style={styles.container}>
      {data.map((datum, index) => {
        const ratio = maxValue > 0 ? datum.value / maxValue : 0;
        const widthPct = `${Math.max(MIN_BAR_PCT, Math.round(ratio * 100))}%`;
        const color = datum.color ?? PALETTE[index % PALETTE.length];
        const formatted = format(datum.value);
        return (
          <View key={datum.key} style={styles.row}>
            <View style={styles.header}>
              <Text style={styles.label} numberOfLines={1}>
                {datum.label}
              </Text>
              <Text style={styles.value}>{formatted}</Text>
            </View>
            <View
              style={styles.track}
              accessible
              accessibilityLabel={`${datum.label}: ${formatted}`}
            >
              <View
                style={[
                  styles.fill,
                  { width: widthPct, backgroundColor: color } as ViewStyle,
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  } as ViewStyle,
  row: {
    gap: 4,
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  } as ViewStyle,
  label: {
    ...Typography.Body,
    flexShrink: 1,
  } as TextStyle,
  value: {
    ...Typography.Body,
    fontWeight: '600',
  } as TextStyle,
  track: {
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.primary,
    overflow: 'hidden',
  } as ViewStyle,
  fill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: Colors.primary,
  } as ViewStyle,
});
