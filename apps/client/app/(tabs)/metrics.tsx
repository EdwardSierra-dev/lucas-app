/**
 * Metrics screen (Requirement 6 — Metrics_Engine).
 *
 * Lets the user filter their expense records and view an aggregated summary:
 *   • A groupBy selector (category / month / type) — Req 6.1, 6.2.
 *   • Optional from / to date inputs defining an inclusive range — Req 6.3.
 *   • A total sum display and a per-group breakdown rendered as inline
 *     proportional bars (label + amount + count) — Req 6.6.
 *
 * Behaviour notes:
 *   • The draft filter (the inputs the user is editing) is kept separate from
 *     the committed filter that drives the query. Pressing "Aplicar" validates
 *     the draft and, only if valid, commits it. An invalid date range (start >
 *     end) shows an error and leaves the previously displayed results intact
 *     (Req 6.7).
 *   • When the applied filters match zero records, a total of zero and a
 *     "no records found" message are shown (Req 6.8).
 *
 * Visuals use only the palette colors and the shared typography scale
 * (Req 8.1); all monetary values are rendered via `formatMoney` (Req 8.3);
 * interactive controls meet the 44×44 minimum touch target (Req 8.2).
 */
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Button, Input } from '../../components/ui';
import { Colors, TouchTarget, Typography } from '../../constants/theme';
import { formatMoney } from '../../utils/money';
import {
  useMetrics,
  type MetricsGroupBy,
  type MetricsQuery,
  type MetricsBreakdownRow,
} from '../../services/metricsApi';

const GROUP_BY_OPTIONS: ReadonlyArray<{ value: MetricsGroupBy; label: string }> =
  [
    { value: 'category', label: 'Categoría' },
    { value: 'month', label: 'Mes' },
    { value: 'type', label: 'Tipo' },
  ];

/** Matches an ISO calendar date, e.g. `2024-01-31`. */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** A trimmed value, or undefined when blank — keeps the filter body clean. */
function emptyToUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export default function MetricsScreen(): React.JSX.Element {
  // Draft (editable) filter state.
  const [groupBy, setGroupBy] = useState<MetricsGroupBy>('category');
  const [fromText, setFromText] = useState('');
  const [toText, setToText] = useState('');
  const [rangeError, setRangeError] = useState<string | null>(null);

  // Committed filter: the only thing the query depends on. Starts applied with
  // the default grouping so the screen shows data on first render.
  const [appliedFilter, setAppliedFilter] = useState<MetricsQuery>({
    groupBy: 'category',
  });

  const { data, isLoading, isError } = useMetrics(appliedFilter);

  const breakdown = data?.breakdown ?? [];
  const maxTotal = useMemo(
    () => breakdown.reduce((max, row) => Math.max(max, row.total), 0),
    [breakdown],
  );

  const applyFilter = (): void => {
    const from = emptyToUndefined(fromText);
    const to = emptyToUndefined(toText);

    // Reject a malformed date rather than sending it to the server.
    if ((from && !ISO_DATE_RE.test(from)) || (to && !ISO_DATE_RE.test(to))) {
      setRangeError('Formato de fecha inválido (usa AAAA-MM-DD)');
      return;
    }

    // Req 6.7: start > end is invalid; surface the error and keep the
    // currently displayed results untouched (we do not touch appliedFilter).
    if (from && to && from > to) {
      setRangeError('Rango de fechas inválido');
      return;
    }

    setRangeError(null);
    const next: MetricsQuery = { groupBy };
    if (from) {
      next.from = from;
    }
    if (to) {
      next.to = to;
    }
    setAppliedFilter(next);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title} accessibilityRole="header">
        Métricas
      </Text>

      {/* groupBy selector --------------------------------------------------*/}
      <Text style={styles.sectionLabel}>Agrupar por</Text>
      <View style={styles.chipRow}>
        {GROUP_BY_OPTIONS.map((option) => {
          const selected = groupBy === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              onPress={() => setGroupBy(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Agrupar por ${option.label}`}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text
                style={[
                  styles.chipLabel,
                  selected && styles.chipLabelSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* date range --------------------------------------------------------*/}
      <View style={styles.dateRow}>
        <View style={styles.dateField}>
          <Input
            label="Desde"
            placeholder="AAAA-MM-DD"
            value={fromText}
            onChangeText={setFromText}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Fecha desde"
          />
        </View>
        <View style={styles.dateField}>
          <Input
            label="Hasta"
            placeholder="AAAA-MM-DD"
            value={toText}
            onChangeText={setToText}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Fecha hasta"
          />
        </View>
      </View>

      {rangeError ? (
        <Text style={styles.rangeError} accessibilityRole="alert">
          {rangeError}
        </Text>
      ) : null}

      <Button label="Aplicar" onPress={applyFilter} style={styles.applyButton} />

      {/* results -----------------------------------------------------------*/}
      {isLoading ? (
        <View style={styles.stateBox}>
          <ActivityIndicator
            color={Colors.primary}
            accessibilityLabel="Cargando métricas"
          />
        </View>
      ) : isError ? (
        <View style={styles.stateBox}>
          <Text style={styles.stateText} accessibilityRole="alert">
            No se pudieron cargar las métricas. Intenta de nuevo.
          </Text>
        </View>
      ) : (
        <ResultsView
          total={data?.total ?? 0}
          breakdown={breakdown}
          maxTotal={maxTotal}
        />
      )}
    </ScrollView>
  );
}

interface ResultsViewProps {
  total: number;
  breakdown: MetricsBreakdownRow[];
  maxTotal: number;
}

function ResultsView({
  total,
  breakdown,
  maxTotal,
}: ResultsViewProps): React.JSX.Element {
  const isEmpty = breakdown.length === 0;

  return (
    <View style={styles.results}>
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue} accessibilityLabel={`Total ${formatMoney(total)}`}>
          {formatMoney(total)}
        </Text>
      </View>

      {isEmpty ? (
        <View style={styles.stateBox}>
          <Text style={styles.stateText}>
            No se encontraron registros para los filtros seleccionados.
          </Text>
        </View>
      ) : (
        <View style={styles.breakdownList}>
          {breakdown.map((row) => {
            // Width proportional to the largest group; guard against a zero
            // max so a single zero-total group still renders a visible track.
            const ratio = maxTotal > 0 ? row.total / maxTotal : 0;
            const widthPct = `${Math.max(2, Math.round(ratio * 100))}%`;
            const label = row.label ?? row.key;
            return (
              <View key={row.key} style={styles.breakdownRow}>
                <View style={styles.breakdownHeader}>
                  <Text style={styles.breakdownLabel} numberOfLines={1}>
                    {label}
                  </Text>
                  <Text style={styles.breakdownAmount}>
                    {formatMoney(row.total)}
                  </Text>
                </View>
                <View style={styles.barTrack}>
                  <View
                    style={[styles.barFill, { width: widthPct } as ViewStyle]}
                  />
                </View>
                <Text style={styles.breakdownCount}>
                  {row.count} {row.count === 1 ? 'registro' : 'registros'}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  } as ViewStyle,
  content: {
    padding: 16,
    gap: 12,
  } as ViewStyle,
  title: {
    ...Typography.H1,
  } as TextStyle,
  sectionLabel: {
    ...Typography.Body,
    fontWeight: '600',
  } as TextStyle,
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  } as ViewStyle,
  chip: {
    minWidth: TouchTarget.minWidth,
    minHeight: TouchTarget.minHeight,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  chipSelected: {
    backgroundColor: Colors.primary,
  } as ViewStyle,
  chipLabel: {
    ...Typography.Body,
    color: Colors.primary,
  } as TextStyle,
  chipLabelSelected: {
    color: Colors.background,
  } as TextStyle,
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  } as ViewStyle,
  dateField: {
    flex: 1,
  } as ViewStyle,
  rangeError: {
    ...Typography.Caption,
    color: Colors.accent,
  } as TextStyle,
  applyButton: {
    alignSelf: 'flex-start',
  } as ViewStyle,
  results: {
    gap: 12,
  } as ViewStyle,
  totalCard: {
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    padding: 16,
  } as ViewStyle,
  totalLabel: {
    ...Typography.Caption,
    color: Colors.text,
  } as TextStyle,
  totalValue: {
    ...Typography.H1,
  } as TextStyle,
  breakdownList: {
    gap: 12,
  } as ViewStyle,
  breakdownRow: {
    gap: 4,
  } as ViewStyle,
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  } as ViewStyle,
  breakdownLabel: {
    ...Typography.Body,
    flexShrink: 1,
  } as TextStyle,
  breakdownAmount: {
    ...Typography.Body,
    fontWeight: '600',
  } as TextStyle,
  barTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.primary,
    overflow: 'hidden',
  } as ViewStyle,
  barFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: Colors.primary,
  } as ViewStyle,
  breakdownCount: {
    ...Typography.Caption,
  } as TextStyle,
  stateBox: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  stateText: {
    ...Typography.Body,
    textAlign: 'center',
  } as TextStyle,
});
