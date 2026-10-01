/**
 * Dashboard — the home / overview tab (Requirements 8.1, 8.2, 8.4).
 *
 * Gives the authenticated user a single-glance financial overview:
 *   • A greeting with their name/email + an unread-notification badge.
 *   • This month's total expenses (via the Metrics_Engine, grouped by
 *     category) and a {@link CategoryBreakdownChart} of the breakdown.
 *   • Outstanding loan balance (sum of each loan's `outstandingAmount`).
 *   • Upcoming payment reminders — configured user-expenses whose
 *     `paymentDay` falls within the next 7 days.
 *   • Vehicle document expiry alerts (SOAT / tecnomecánica / kit) landing in
 *     the next 30 days.
 *   • Quick-add expense CTA + navigation to the metrics / loans /
 *     shared-budget tabs.
 *
 * All colors come from the theme palette and interactive elements meet the
 * 44×44 touch-target minimum (Req 8.1, 8.2). Monetary values are rendered via
 * `formatMoney` (Req 8.3). Loading and empty states are handled throughout.
 *
 * This screen owns no navigator config — the Tabs navigator is defined by
 * `app/(tabs)/_layout.tsx` (task 22.1).
 */
import { useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { CategoryBreakdownChart } from '../../components/charts';
import { Button, NotificationBadge } from '../../components/ui';
import { Colors, TouchTarget, Typography } from '../../constants/theme';
import { api } from '../../services/api';
import { useExpenseRecords } from '../../services/expenseRecordApi';
import { useCategories, useUserExpenses } from '../../services/expensesApi';
import { useLoans } from '../../services/loanApi';
import { useMetrics } from '../../services/metricsApi';
import { useNotificationSubscription } from '../../services/realtimeNotifications';
import { useVehicle } from '../../services/vehicleApi';
import { useAuthStore } from '../../store/authStore';
import { formatMoney } from '../../utils/money';

// ---------------------------------------------------------------------------
// Date helpers (pure — kept local to the screen)
// ---------------------------------------------------------------------------

/** Pad a 1-based month/day to a 2-char string. */
function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/** First day of the given date's month as `YYYY-MM-DD`. */
function firstOfMonth(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-01`;
}

/** The given date as `YYYY-MM-DD`. */
function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/**
 * Whole days from `now` until the given ISO date (negative = already past).
 * Both ends are reduced to midnight so partial days don't skew the count.
 */
function daysUntil(iso: string, now: Date): number {
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return Number.POSITIVE_INFINITY;
  const a = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  const b = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((a - b) / (1000 * 60 * 60 * 24));
}

/**
 * Days from today until the next occurrence of a monthly `paymentDay`
 * (1–28). Returns 0 when it is today, otherwise the forward distance within
 * this month or into the next.
 */
function daysUntilPaymentDay(paymentDay: number, now: Date): number {
  const today = now.getDate();
  if (paymentDay >= today) return paymentDay - today;
  // Already passed this month — count to the same day next month.
  const next = new Date(now.getFullYear(), now.getMonth() + 1, paymentDay);
  return daysUntil(toIsoDate(next), now);
}

// ---------------------------------------------------------------------------
// Inline unread-notification count (a shared hook isn't created yet)
// ---------------------------------------------------------------------------

interface UnreadCountResponse {
  count: number;
}

const unreadCountQueryKey = ['notifications', 'unread-count'] as const;

/**
 * Fetches the unread in-app notification count (GET /notifications/unread-count).
 * Kept inline on purpose — a shared notifications hook does not exist yet and
 * this screen is the only consumer. Resolves to 0 on any error so a missing /
 * not-yet-implemented endpoint never breaks the dashboard.
 */
function useUnreadNotificationCount(enabled: boolean) {
  return useQuery<number, AxiosError>({
    queryKey: unreadCountQueryKey,
    queryFn: async () => {
      try {
        const { data } = await api.get<UnreadCountResponse>(
          '/notifications/unread-count',
        );
        return data.count;
      } catch {
        return 0;
      }
    },
    enabled,
  });
}

// ---------------------------------------------------------------------------
// Reminder / alert view-model types
// ---------------------------------------------------------------------------

interface PaymentReminder {
  key: string;
  label: string;
  amount: number;
  daysAway: number;
}

interface ExpiryAlert {
  key: string;
  label: string;
  daysAway: number;
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

const UPCOMING_PAYMENT_WINDOW_DAYS = 7;
const EXPIRY_WINDOW_DAYS = 30;

export default function DashboardScreen(): React.JSX.Element {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const now = useMemo(() => new Date(), []);
  const monthFrom = useMemo(() => firstOfMonth(now), [now]);
  const monthTo = useMemo(() => toIsoDate(now), [now]);

  // This month's expenses, grouped by category (Metrics_Engine).
  const metrics = useMetrics({
    from: monthFrom,
    to: monthTo,
    groupBy: 'category',
  });

  const loans = useLoans();
  const userExpenses = useUserExpenses();
  const categories = useCategories();
  const vehicle = useVehicle();

  // Keep the unread badge live via the realtime notifications channel.
  const unread = useUnreadNotificationCount(Boolean(user));
  useNotificationSubscription(user?.id ?? null, () => {
    void unread.refetch();
  });

  // --- Derived view models -------------------------------------------------

  const monthTotal = metrics.data?.total ?? 0;
  const breakdownRows = metrics.data?.breakdown ?? [];

  const outstandingLoanTotal = useMemo(
    () =>
      (loans.data ?? []).reduce(
        (sum, loan) => sum + (loan.outstandingAmount ?? 0),
        0,
      ),
    [loans.data],
  );

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const category of categories.data ?? []) {
      map.set(category.id, `${category.emoji} ${category.name}`);
    }
    return map;
  }, [categories.data]);

  const paymentReminders = useMemo<PaymentReminder[]>(() => {
    const expenses = userExpenses.data ?? [];
    return expenses
      .filter((expense) => expense.isActive)
      .map((expense) => ({
        key: expense.id,
        label: categoryNameById.get(expense.categoryId) ?? 'Gasto',
        amount: expense.amount,
        daysAway: daysUntilPaymentDay(expense.paymentDay, now),
      }))
      .filter((reminder) => reminder.daysAway <= UPCOMING_PAYMENT_WINDOW_DAYS)
      .sort((a, b) => a.daysAway - b.daysAway);
  }, [userExpenses.data, categoryNameById, now]);

  const expiryAlerts = useMemo<ExpiryAlert[]>(() => {
    const v = vehicle.data;
    if (!v) return [];
    const candidates: Array<{ key: string; label: string; iso: string | null }> =
      [
        { key: 'soat', label: 'SOAT', iso: v.soatExpiry },
        {
          key: 'tecnomecanica',
          label: 'Tecnomecánica',
          iso: v.tecnomecanicaExpiry,
        },
        { key: 'kit', label: 'Kit de carretera', iso: v.kitExpiry },
      ];
    return candidates
      .filter((c): c is { key: string; label: string; iso: string } =>
        Boolean(c.iso),
      )
      .map((c) => ({
        key: c.key,
        label: c.label,
        daysAway: daysUntil(c.iso, now),
      }))
      .filter((alert) => alert.daysAway <= EXPIRY_WINDOW_DAYS)
      .sort((a, b) => a.daysAway - b.daysAway);
  }, [vehicle.data, now]);

  const greetingName = user?.email ?? 'Bienvenido';

  // --- Render --------------------------------------------------------------

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      testID="dashboard-screen"
    >
      {/* Header: greeting + unread badge */}
      <View style={styles.header}>
        <View style={styles.greetingWrap}>
          <Text style={styles.greetingHello}>Hola,</Text>
          <Text style={styles.greetingName} numberOfLines={1}>
            {greetingName}
          </Text>
        </View>
        <NotificationBadge count={unread.data ?? 0} />
      </View>

      {/* This month's total expenses */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Gastos de este mes</Text>
        {metrics.isLoading ? (
          <ActivityIndicator color={Colors.primary} accessibilityLabel="Cargando" />
        ) : metrics.isError ? (
          <Text style={styles.errorText}>
            No se pudieron cargar los gastos.
          </Text>
        ) : (
          <Text style={styles.bigMoney}>{formatMoney(monthTotal)}</Text>
        )}
      </View>

      {/* Category breakdown */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Desglose por categoría</Text>
        {metrics.isLoading ? (
          <ActivityIndicator color={Colors.primary} accessibilityLabel="Cargando" />
        ) : breakdownRows.length === 0 ? (
          <Text style={styles.emptyText}>
            Aún no has registrado gastos este mes.
          </Text>
        ) : (
          <CategoryBreakdownChart rows={breakdownRows} />
        )}
      </View>

      {/* Outstanding loans */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Préstamos pendientes</Text>
        {loans.isLoading ? (
          <ActivityIndicator color={Colors.primary} accessibilityLabel="Cargando" />
        ) : (loans.data ?? []).length === 0 ? (
          <Text style={styles.emptyText}>No tienes préstamos activos.</Text>
        ) : (
          <>
            <Text style={styles.bigMoney}>
              {formatMoney(outstandingLoanTotal)}
            </Text>
            <Text style={styles.caption}>
              {(loans.data ?? []).length}{' '}
              {(loans.data ?? []).length === 1 ? 'préstamo' : 'préstamos'}{' '}
              activo
              {(loans.data ?? []).length === 1 ? '' : 's'}
            </Text>
          </>
        )}
      </View>

      {/* Upcoming payment reminders */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Próximos pagos</Text>
        {userExpenses.isLoading ? (
          <ActivityIndicator color={Colors.primary} accessibilityLabel="Cargando" />
        ) : paymentReminders.length === 0 ? (
          <Text style={styles.emptyText}>
            No hay pagos en los próximos {UPCOMING_PAYMENT_WINDOW_DAYS} días.
          </Text>
        ) : (
          <View style={styles.list}>
            {paymentReminders.map((reminder) => (
              <View key={reminder.key} style={styles.listRow}>
                <View style={styles.listRowMain}>
                  <Text style={styles.listLabel} numberOfLines={1}>
                    {reminder.label}
                  </Text>
                  <Text style={styles.caption}>
                    {reminder.daysAway === 0
                      ? 'Hoy'
                      : `En ${reminder.daysAway} día${reminder.daysAway === 1 ? '' : 's'}`}
                  </Text>
                </View>
                <Text style={styles.listAmount}>
                  {formatMoney(reminder.amount)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Vehicle document expiry alerts */}
      {(vehicle.isLoading || expiryAlerts.length > 0) && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Vencimientos del vehículo</Text>
          {vehicle.isLoading ? (
            <ActivityIndicator
              color={Colors.primary}
              accessibilityLabel="Cargando"
            />
          ) : (
            <View style={styles.list}>
              {expiryAlerts.map((alert) => (
                <View key={alert.key} style={[styles.listRow, styles.alertRow]}>
                  <Text style={styles.listLabel} numberOfLines={1}>
                    {alert.label}
                  </Text>
                  <Text style={styles.caption}>
                    {alert.daysAway < 0
                      ? `Vencido hace ${Math.abs(alert.daysAway)} día${Math.abs(alert.daysAway) === 1 ? '' : 's'}`
                      : alert.daysAway === 0
                        ? 'Vence hoy'
                        : `Vence en ${alert.daysAway} día${alert.daysAway === 1 ? '' : 's'}`}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Quick actions */}
      <View style={styles.actions}>
        <Button
          label="Registrar gasto"
          onPress={() => router.push('/(tabs)/expenses')}
          accessibilityLabel="Registrar un nuevo gasto"
        />
        <View style={styles.navRow}>
          <Button
            label="Métricas"
            variant="secondary"
            onPress={() => router.push('/(tabs)/metrics')}
            style={styles.navButton}
          />
          <Button
            label="Préstamos"
            variant="secondary"
            onPress={() => router.push('/(tabs)/loans')}
            style={styles.navButton}
          />
          <Button
            label="Presupuesto"
            variant="secondary"
            onPress={() => router.push('/(tabs)/shared-budget')}
            style={styles.navButton}
          />
        </View>
      </View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  } as ViewStyle,
  content: {
    padding: 16,
    gap: 16,
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  } as ViewStyle,
  greetingWrap: {
    flexShrink: 1,
  } as ViewStyle,
  greetingHello: {
    ...Typography.Body,
  } as TextStyle,
  greetingName: {
    ...Typography.H1,
  } as TextStyle,
  card: {
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  } as ViewStyle,
  cardTitle: {
    ...Typography.H2,
  } as TextStyle,
  bigMoney: {
    ...Typography.H1,
  } as TextStyle,
  caption: {
    ...Typography.Caption,
  } as TextStyle,
  emptyText: {
    ...Typography.Body,
  } as TextStyle,
  errorText: {
    ...Typography.Body,
    color: Colors.accent,
  } as TextStyle,
  list: {
    gap: 8,
  } as ViewStyle,
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: TouchTarget.minHeight,
  } as ViewStyle,
  alertRow: {
    backgroundColor: Colors.accent,
    borderRadius: 8,
    paddingHorizontal: 10,
  } as ViewStyle,
  listRowMain: {
    flexShrink: 1,
    gap: 2,
  } as ViewStyle,
  listLabel: {
    ...Typography.Body,
    fontWeight: '600',
  } as TextStyle,
  listAmount: {
    ...Typography.Body,
    fontWeight: '600',
  } as TextStyle,
  actions: {
    gap: 12,
  } as ViewStyle,
  navRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  } as ViewStyle,
  navButton: {
    flexGrow: 1,
    flexBasis: '30%',
  } as ViewStyle,
});
