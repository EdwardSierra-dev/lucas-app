/**
 * DatePicker — a visual, cross-platform date selector built from React Native
 * primitives (no external library), so it behaves the same on web and Android.
 *
 * - A pressable trigger shows the selected date (YYYY-MM-DD) or a placeholder.
 * - Tapping it opens an overlay with a month grid calendar; users navigate
 *   months and tap a day to pick it.
 * - The value is the ISO `YYYY-MM-DD` string the forms already use, so this is
 *   a drop-in replacement for the previous text inputs.
 * - An optional "Limpiar" action clears the value (useful for filters).
 *
 * All interactive elements meet the 44×44 minimum touch target (Req 8.2) and
 * only palette colors are used (Req 8.1).
 */
import React, { useMemo, useState } from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors, TouchTarget, Typography } from '../../constants/theme';

export interface DatePickerProps {
  label?: string;
  /** ISO YYYY-MM-DD value, or empty string / null when unset. */
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  /** Show a "Limpiar" button to reset the value (defaults to false). */
  clearable?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  containerStyle?: ViewStyle;
}

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function toIso(year: number, monthIndex: number, day: number): string {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

/** Parse an ISO date into {year, monthIndex, day}, or null when invalid. */
function parseIso(
  value: string | null,
): { year: number; monthIndex: number; day: number } | null {
  if (!value || !ISO_PATTERN.test(value)) {
    return null;
  }
  const parts = value.split('-').map(Number);
  const y = parts[0] ?? NaN;
  const m = parts[1] ?? NaN;
  const d = parts[2] ?? NaN;
  if (
    !Number.isFinite(y) ||
    m < 1 ||
    m > 12 ||
    d < 1 ||
    d > 31
  ) {
    return null;
  }
  return { year: y, monthIndex: m - 1, day: d };
}

/** Monday-first weekday index (0 = Monday ... 6 = Sunday) for a given date. */
function mondayFirstWeekday(year: number, monthIndex: number, day: number): number {
  const js = new Date(year, monthIndex, day).getDay(); // 0 = Sunday
  return (js + 6) % 7;
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function DatePicker({
  label,
  value,
  onChange,
  placeholder = 'Seleccionar fecha',
  error,
  clearable = false,
  accessibilityLabel,
  accessibilityHint,
  containerStyle,
}: DatePickerProps): React.JSX.Element {
  const [open, setOpen] = useState(false);

  const hasError = Boolean(error);
  const parsed = useMemo(() => parseIso(value), [value]);

  // The month currently shown in the calendar grid.
  const [viewYear, setViewYear] = useState(
    () => parsed?.year ?? new Date().getFullYear(),
  );
  const [viewMonth, setViewMonth] = useState(
    () => parsed?.monthIndex ?? new Date().getMonth(),
  );

  const openCalendar = (): void => {
    const base = parseIso(value) ?? {
      year: new Date().getFullYear(),
      monthIndex: new Date().getMonth(),
    };
    setViewYear(base.year);
    setViewMonth(base.monthIndex);
    setOpen(true);
  };

  const goPrevMonth = (): void => {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  };

  const goNextMonth = (): void => {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  };

  const handlePickDay = (day: number): void => {
    onChange(toIso(viewYear, viewMonth, day));
    setOpen(false);
  };

  const handleClear = (): void => {
    onChange('');
    setOpen(false);
  };

  // Build the grid cells: leading blanks for alignment + the month's days.
  const cells = useMemo<(number | null)[]>(() => {
    const leading = mondayFirstWeekday(viewYear, viewMonth, 1);
    const total = daysInMonth(viewYear, viewMonth);
    const result: (number | null)[] = [];
    for (let i = 0; i < leading; i += 1) {
      result.push(null);
    }
    for (let d = 1; d <= total; d += 1) {
      result.push(d);
    }
    return result;
  }, [viewYear, viewMonth]);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={styles.label} accessibilityRole="text">
          {label}
        </Text>
      ) : null}

      <TouchableOpacity
        onPress={openCalendar}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ expanded: open }}
        style={[styles.trigger, hasError && styles.triggerError]}
      >
        <Text
          style={value ? styles.triggerText : styles.placeholderText}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        <Text style={styles.icon}>📅</Text>
      </TouchableOpacity>

      {hasError ? (
        <Text style={styles.errorText} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      <RNModal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent
      >
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.sheet}>
                {/* Month navigation header */}
                <View style={styles.navRow}>
                  <TouchableOpacity
                    onPress={goPrevMonth}
                    accessibilityRole="button"
                    accessibilityLabel="Mes anterior"
                    style={styles.navButton}
                  >
                    <Text style={styles.navText}>‹</Text>
                  </TouchableOpacity>
                  <Text style={styles.monthLabel}>
                    {MONTHS[viewMonth]} {viewYear}
                  </Text>
                  <TouchableOpacity
                    onPress={goNextMonth}
                    accessibilityRole="button"
                    accessibilityLabel="Mes siguiente"
                    style={styles.navButton}
                  >
                    <Text style={styles.navText}>›</Text>
                  </TouchableOpacity>
                </View>

                {/* Weekday headers */}
                <View style={styles.weekRow}>
                  {WEEKDAYS.map((wd) => (
                    <View key={wd} style={styles.weekCell}>
                      <Text style={styles.weekText}>{wd}</Text>
                    </View>
                  ))}
                </View>

                {/* Day grid */}
                <View style={styles.grid}>
                  {cells.map((day, index) => {
                    if (day === null) {
                      return (
                        <View
                          key={`blank-${index}`}
                          style={styles.dayCell}
                        />
                      );
                    }
                    const iso = toIso(viewYear, viewMonth, day);
                    const isSelected = iso === value;
                    return (
                      <TouchableOpacity
                        key={iso}
                        onPress={() => handlePickDay(day)}
                        accessibilityRole="button"
                        accessibilityLabel={iso}
                        accessibilityState={{ selected: isSelected }}
                        style={[
                          styles.dayCell,
                          isSelected && styles.dayCellSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            isSelected && styles.dayTextSelected,
                          ]}
                        >
                          {day}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {clearable ? (
                  <TouchableOpacity
                    onPress={handleClear}
                    accessibilityRole="button"
                    accessibilityLabel="Limpiar fecha"
                    style={styles.clearButton}
                  >
                    <Text style={styles.clearText}>Limpiar</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </RNModal>
    </View>
  );
}

const CELL = `${100 / 7}%`;

const styles = StyleSheet.create({
  container: {
    width: '100%',
  } as ViewStyle,
  label: {
    ...Typography.Body,
    marginBottom: 4,
    color: Colors.text,
  } as TextStyle,
  trigger: {
    minHeight: TouchTarget.minHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.text,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.background,
  } as ViewStyle,
  triggerError: {
    borderColor: Colors.accent,
  } as ViewStyle,
  triggerText: {
    ...Typography.Body,
    flex: 1,
  } as TextStyle,
  placeholderText: {
    ...Typography.Body,
    color: Colors.text + '80',
    flex: 1,
  } as TextStyle,
  icon: {
    fontSize: 18,
    marginLeft: 8,
  } as TextStyle,
  errorText: {
    ...Typography.Caption,
    color: Colors.accent,
    marginTop: 4,
  } as TextStyle,
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(107, 114, 128, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  } as ViewStyle,
  sheet: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
  } as ViewStyle,
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  } as ViewStyle,
  navButton: {
    minWidth: TouchTarget.minWidth,
    minHeight: TouchTarget.minHeight,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  } as ViewStyle,
  navText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
    lineHeight: 28,
    includeFontPadding: false,
  } as TextStyle,
  monthLabel: {
    ...Typography.H2,
  } as TextStyle,
  weekRow: {
    flexDirection: 'row',
  } as ViewStyle,
  weekCell: {
    width: CELL,
    alignItems: 'center',
    paddingVertical: 4,
  } as ViewStyle,
  weekText: {
    ...Typography.Caption,
    fontWeight: '600',
  } as TextStyle,
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  } as ViewStyle,
  dayCell: {
    width: CELL,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  } as ViewStyle,
  dayCellSelected: {
    backgroundColor: Colors.primary,
  } as ViewStyle,
  dayText: {
    ...Typography.Body,
  } as TextStyle,
  dayTextSelected: {
    color: Colors.background,
    fontWeight: '700',
  } as TextStyle,
  clearButton: {
    minHeight: TouchTarget.minHeight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.text,
  } as ViewStyle,
  clearText: {
    ...Typography.Body,
    fontWeight: '600',
  } as TextStyle,
});
