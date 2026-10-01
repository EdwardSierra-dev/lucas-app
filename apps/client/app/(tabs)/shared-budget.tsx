/**
 * Shared budget workspace (Requirement 5) — `app/(tabs)/shared-budget.tsx`.
 *
 * Two states driven by budgetStore.activeBudgetId:
 *
 *   1. No active budget → budget picker. Lists the user's budgets (useBudgets)
 *      with a "Crear presupuesto" button that opens BudgetForm in a modal
 *      (useCreateBudget). Selecting a budget calls setActiveBudget.
 *
 *   2. Active budget → workspace. Shows the budget name, monthly limit
 *      (formatMoney or "sin límite"), members (useBudgetMembers), incomes
 *      (useBudgetIncomes) and expenses (useBudgetExpenses) with totals, plus
 *      actions: invite member, add income, add shared expense, and (owner only)
 *      set the monthly limit. "Cambiar presupuesto" clears the selection.
 *
 * When an added expense pushes the month-to-date total over the limit, the
 * add-expense response carries `limitExceeded: true` and the screen shows a
 * Peach alert banner "Se superó el límite mensual" (Req 5.12).
 *
 * All amounts render via formatMoney (Req 8.3); only palette colors are used
 * (Req 8.1); interactive elements rely on the 44×44 primitives (Req 8.2).
 */
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Button, Modal } from '../../components/ui';
import { BudgetForm } from '../../components/forms/BudgetForm';
import { InviteMemberForm } from '../../components/forms/InviteMemberForm';
import { BudgetEntryForm } from '../../components/forms/BudgetEntryForm';
import { BudgetLimitForm } from '../../components/forms/BudgetLimitForm';
import { Colors, Typography } from '../../constants/theme';
import { formatMoney } from '../../utils/money';
import { useBudgetStore } from '../../store/budgetStore';
import { useAuthStore } from '../../store/authStore';
import {
  useBudgets,
  useCreateBudget,
  useBudgetMembers,
  useInviteMember,
  useBudgetIncomes,
  useAddIncome,
  useBudgetExpenses,
  useAddBudgetExpense,
  useSetLimit,
  type SharedBudget,
  type BudgetApiError,
  type AddIncomePayload,
  type AddBudgetExpensePayload,
} from '../../services/sharedBudgetApi';

/** Sum a list of fixed-precision money strings into a number. */
function sumAmounts(items: ReadonlyArray<{ amount: string }>): number {
  return items.reduce((total, item) => {
    const parsed = parseFloat(item.amount);
    return total + (Number.isNaN(parsed) ? 0 : parsed);
  }, 0);
}

/** Extract a human-readable message from a backend error body. */
function errorMessage(error: BudgetApiError | null): string | undefined {
  if (!error) return undefined;
  const body = error.response?.data;
  if (body) {
    const msg = body.message;
    if (Array.isArray(msg)) return msg[0];
    if (typeof msg === 'string') return msg;
  }
  return 'Ocurrió un error. Inténtalo de nuevo.';
}

// ---------------------------------------------------------------------------
// Budget picker (no active budget)
// ---------------------------------------------------------------------------

function BudgetPicker(): React.JSX.Element {
  const setActiveBudget = useBudgetStore((s) => s.setActiveBudget);
  const budgetsQuery = useBudgets();
  const createBudget = useCreateBudget();
  const [createVisible, setCreateVisible] = useState(false);

  const handleCreate = (payload: Parameters<typeof createBudget.mutate>[0]): void => {
    createBudget.mutate(payload, {
      onSuccess: (budget: SharedBudget) => {
        setCreateVisible(false);
        createBudget.reset();
        setActiveBudget(budget.id);
      },
    });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.h1}>Presupuestos compartidos</Text>

      {budgetsQuery.isLoading ? (
        <ActivityIndicator
          color={Colors.primary}
          accessibilityLabel="Cargando presupuestos"
          style={styles.loader}
        />
      ) : budgetsQuery.isError ? (
        <Text style={styles.errorText}>
          {errorMessage(budgetsQuery.error) ??
            'No se pudieron cargar los presupuestos.'}
        </Text>
      ) : budgetsQuery.data && budgetsQuery.data.length > 0 ? (
        <View style={styles.list}>
          {budgetsQuery.data.map((budget) => (
            <View key={budget.id} style={styles.card}>
              <Text style={styles.cardTitle}>
                {budget.name ?? 'Presupuesto sin nombre'}
              </Text>
              <Text style={styles.caption}>
                {budget.monthlyLimit !== null
                  ? `Límite: ${formatMoney(parseFloat(budget.monthlyLimit))}`
                  : 'Sin límite'}
              </Text>
              <Button
                label="Abrir"
                variant="secondary"
                onPress={() => setActiveBudget(budget.id)}
                accessibilityLabel={`Abrir presupuesto ${budget.name ?? ''}`}
                style={styles.cardButton}
              />
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.caption}>
          Aún no tienes presupuestos compartidos. Crea uno para empezar.
        </Text>
      )}

      <Button
        label="Crear presupuesto"
        onPress={() => setCreateVisible(true)}
        accessibilityLabel="Crear presupuesto"
        style={styles.primaryAction}
      />

      <Modal
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        skippable={false}
      >
        <Text style={styles.h2}>Nuevo presupuesto</Text>
        {createBudget.isError ? (
          <Text style={styles.errorText}>
            {errorMessage(createBudget.error)}
          </Text>
        ) : null}
        <BudgetForm onSubmit={handleCreate} submitting={createBudget.isPending} />
      </Modal>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Active budget workspace
// ---------------------------------------------------------------------------

type ActiveModal = 'invite' | 'income' | 'expense' | 'limit' | null;

function BudgetWorkspace({
  budgetId,
}: {
  budgetId: string;
}): React.JSX.Element {
  const clearActiveBudget = useBudgetStore((s) => s.clearActiveBudget);
  const currentUserId = useAuthStore((s) => s.user?.id ?? null);

  const budgetsQuery = useBudgets();
  const membersQuery = useBudgetMembers(budgetId);
  const incomesQuery = useBudgetIncomes(budgetId);
  const expensesQuery = useBudgetExpenses(budgetId);

  const inviteMember = useInviteMember(budgetId);
  const addIncome = useAddIncome(budgetId);
  const addExpense = useAddBudgetExpense(budgetId);
  const setLimit = useSetLimit(budgetId);

  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [limitExceeded, setLimitExceeded] = useState(false);

  const budget = useMemo<SharedBudget | undefined>(
    () => budgetsQuery.data?.find((b) => b.id === budgetId),
    [budgetsQuery.data, budgetId],
  );

  const monthlyLimitValue =
    budget && budget.monthlyLimit !== null
      ? parseFloat(budget.monthlyLimit)
      : null;

  const totalIncome = sumAmounts(incomesQuery.data ?? []);
  const totalExpense = sumAmounts(expensesQuery.data ?? []);

  const isOwner = useMemo(() => {
    if (!currentUserId || !membersQuery.data) return false;
    return membersQuery.data.some(
      (m) => m.userId === currentUserId && m.role === 'owner',
    );
  }, [currentUserId, membersQuery.data]);

  const closeModal = (): void => {
    setActiveModal(null);
    inviteMember.reset();
    addIncome.reset();
    addExpense.reset();
    setLimit.reset();
  };

  const handleInvite = (payload: { inviteeEmail: string }): void => {
    inviteMember.mutate(payload, {
      onSuccess: () => closeModal(),
    });
  };

  const handleAddIncome = (
    payload: AddIncomePayload | AddBudgetExpensePayload,
  ): void => {
    addIncome.mutate(payload as AddIncomePayload, {
      onSuccess: () => closeModal(),
    });
  };

  const handleAddExpense = (
    payload: AddIncomePayload | AddBudgetExpensePayload,
  ): void => {
    addExpense.mutate(payload as AddBudgetExpensePayload, {
      onSuccess: (result) => {
        setLimitExceeded(result.limitExceeded);
        closeModal();
      },
    });
  };

  const handleSetLimit = (payload: {
    monthlyLimit: number | null;
  }): void => {
    setLimit.mutate(payload, {
      onSuccess: () => closeModal(),
    });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Button
        label="← Cambiar presupuesto"
        variant="secondary"
        onPress={clearActiveBudget}
        accessibilityLabel="Cambiar de presupuesto"
        style={styles.backButton}
      />

      <Text style={styles.h1}>
        {budget?.name ?? 'Presupuesto compartido'}
      </Text>
      <Text style={styles.caption}>
        {monthlyLimitValue !== null
          ? `Límite mensual: ${formatMoney(monthlyLimitValue)}`
          : 'Límite mensual: sin límite'}
      </Text>

      {limitExceeded ? (
        <View style={styles.alertBanner} accessibilityRole="alert">
          <Text style={styles.alertText}>Se superó el límite mensual</Text>
        </View>
      ) : null}

      {/* Totals ------------------------------------------------------------ */}
      <View style={styles.totalsRow}>
        <View style={styles.totalBox}>
          <Text style={styles.caption}>Ingresos</Text>
          <Text style={styles.totalValue}>{formatMoney(totalIncome)}</Text>
        </View>
        <View style={styles.totalBox}>
          <Text style={styles.caption}>Gastos</Text>
          <Text style={styles.totalValue}>{formatMoney(totalExpense)}</Text>
        </View>
      </View>

      {/* Actions ----------------------------------------------------------- */}
      <View style={styles.actions}>
        <Button
          label="Invitar miembro"
          onPress={() => setActiveModal('invite')}
          accessibilityLabel="Invitar miembro"
          style={styles.actionButton}
        />
        <Button
          label="Agregar ingreso"
          onPress={() => setActiveModal('income')}
          accessibilityLabel="Agregar ingreso"
          style={styles.actionButton}
        />
        <Button
          label="Agregar gasto"
          onPress={() => setActiveModal('expense')}
          accessibilityLabel="Agregar gasto"
          style={styles.actionButton}
        />
        {isOwner ? (
          <Button
            label="Definir límite"
            variant="secondary"
            onPress={() => setActiveModal('limit')}
            accessibilityLabel="Definir límite mensual"
            style={styles.actionButton}
          />
        ) : null}
      </View>

      {/* Members ----------------------------------------------------------- */}
      <Text style={styles.h2}>Miembros</Text>
      {membersQuery.isLoading ? (
        <ActivityIndicator color={Colors.primary} style={styles.loader} />
      ) : membersQuery.data && membersQuery.data.length > 0 ? (
        membersQuery.data.map((member) => (
          <View key={member.userId} style={styles.row}>
            <Text style={styles.body}>{member.userId}</Text>
            <Text style={styles.caption}>
              {member.role === 'owner' ? 'Propietario' : 'Miembro'}
            </Text>
          </View>
        ))
      ) : (
        <Text style={styles.caption}>Sin miembros todavía.</Text>
      )}

      {/* Incomes ----------------------------------------------------------- */}
      <Text style={styles.h2}>Ingresos</Text>
      {incomesQuery.isLoading ? (
        <ActivityIndicator color={Colors.primary} style={styles.loader} />
      ) : incomesQuery.data && incomesQuery.data.length > 0 ? (
        incomesQuery.data.map((income) => (
          <View key={income.id} style={styles.row}>
            <Text style={styles.body}>
              {income.description ?? 'Ingreso'}
            </Text>
            <Text style={styles.body}>
              {formatMoney(parseFloat(income.amount))}
            </Text>
          </View>
        ))
      ) : (
        <Text style={styles.caption}>Sin ingresos registrados.</Text>
      )}

      {/* Expenses ---------------------------------------------------------- */}
      <Text style={styles.h2}>Gastos</Text>
      {expensesQuery.isLoading ? (
        <ActivityIndicator color={Colors.primary} style={styles.loader} />
      ) : expensesQuery.data && expensesQuery.data.length > 0 ? (
        expensesQuery.data.map((expense) => (
          <View key={expense.id} style={styles.row}>
            <Text style={styles.body}>
              {expense.description ?? 'Gasto'}
            </Text>
            <Text style={styles.body}>
              {formatMoney(parseFloat(expense.amount))}
            </Text>
          </View>
        ))
      ) : (
        <Text style={styles.caption}>Sin gastos registrados.</Text>
      )}

      {/* Modals ------------------------------------------------------------ */}
      <Modal
        visible={activeModal === 'invite'}
        onClose={closeModal}
        skippable={false}
      >
        <Text style={styles.h2}>Invitar miembro</Text>
        <InviteMemberForm
          onSubmit={handleInvite}
          submitting={inviteMember.isPending}
          serverError={errorMessage(inviteMember.error)}
        />
      </Modal>

      <Modal
        visible={activeModal === 'income'}
        onClose={closeModal}
        skippable={false}
      >
        <Text style={styles.h2}>Agregar ingreso</Text>
        <BudgetEntryForm
          mode="income"
          onSubmit={handleAddIncome}
          submitting={addIncome.isPending}
          serverError={errorMessage(addIncome.error)}
        />
      </Modal>

      <Modal
        visible={activeModal === 'expense'}
        onClose={closeModal}
        skippable={false}
      >
        <Text style={styles.h2}>Agregar gasto</Text>
        <BudgetEntryForm
          mode="expense"
          onSubmit={handleAddExpense}
          submitting={addExpense.isPending}
          serverError={errorMessage(addExpense.error)}
        />
      </Modal>

      <Modal
        visible={activeModal === 'limit'}
        onClose={closeModal}
        skippable={false}
      >
        <Text style={styles.h2}>Límite mensual</Text>
        {setLimit.isError ? (
          <Text style={styles.errorText}>{errorMessage(setLimit.error)}</Text>
        ) : null}
        <BudgetLimitForm
          onSubmit={handleSetLimit}
          submitting={setLimit.isPending}
          initialLimit={monthlyLimitValue}
        />
      </Modal>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Screen entry — switch on active budget selection
// ---------------------------------------------------------------------------

export default function SharedBudgetScreen(): React.JSX.Element {
  const activeBudgetId = useBudgetStore((s) => s.activeBudgetId);

  if (activeBudgetId) {
    return <BudgetWorkspace budgetId={activeBudgetId} />;
  }
  return <BudgetPicker />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  } as ViewStyle,
  content: {
    padding: 24,
    gap: 12,
  } as ViewStyle,
  h1: {
    ...Typography.H1,
  } as TextStyle,
  h2: {
    ...Typography.H2,
    marginTop: 8,
  } as TextStyle,
  body: {
    ...Typography.Body,
  } as TextStyle,
  caption: {
    ...Typography.Caption,
  } as TextStyle,
  loader: {
    marginVertical: 16,
  } as ViewStyle,
  errorText: {
    ...Typography.Caption,
    color: Colors.accent,
  } as TextStyle,
  list: {
    gap: 12,
  } as ViewStyle,
  card: {
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    padding: 16,
    gap: 4,
  } as ViewStyle,
  cardTitle: {
    ...Typography.H2,
  } as TextStyle,
  cardButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  } as ViewStyle,
  primaryAction: {
    marginTop: 16,
  } as ViewStyle,
  backButton: {
    alignSelf: 'flex-start',
  } as ViewStyle,
  alertBanner: {
    backgroundColor: Colors.accent,
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  } as ViewStyle,
  alertText: {
    ...Typography.Body,
    color: Colors.background,
    fontWeight: '600',
  } as TextStyle,
  totalsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  } as ViewStyle,
  totalBox: {
    flex: 1,
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    padding: 16,
    gap: 4,
  } as ViewStyle,
  totalValue: {
    ...Typography.H2,
  } as TextStyle,
  actions: {
    gap: 8,
    marginTop: 8,
  } as ViewStyle,
  actionButton: {
    width: '100%',
  } as ViewStyle,
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.secondary,
  } as ViewStyle,
});
