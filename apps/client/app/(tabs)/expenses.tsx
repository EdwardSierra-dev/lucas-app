/**
 * Expenses tab screen — personal expense record log (Requirement 5.x) —
 * `app/(tabs)/expenses.tsx`.
 *
 * Lists the authenticated user's expense records (useExpenseRecords), grouped
 * by day and sorted date-descending. Each record shows its category (emoji +
 * name, resolved via useCategories), the amount (formatMoney, Req 8.3), an
 * optional description, and the date, plus a delete action
 * (useDeleteExpenseRecord).
 *
 * A floating "+" opens a Modal hosting ExpenseRecordForm → useCreateExpenseRecord;
 * on a successful create the modal closes and the ['expense-records'] query is
 * invalidated by the mutation so the list refreshes automatically.
 *
 * Optional date-range filter inputs (from / to, YYYY-MM-DD) narrow the list via
 * the query filter. Only palette colors are used (Req 8.1); interactive
 * elements meet the 44×44 touch target (Req 8.2).
 */
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  SectionListData,
} from 'react-native';
import { Modal, Input } from '../../components/ui';
import { ExpenseRecordForm } from '../../components/forms/ExpenseRecordForm';
import { Colors, TouchTarget, Typography } from '../../constants/theme';
import { formatMoney } from '../../utils/money';
import { useCategories, type Category } from '../../services/expensesApi';
import {
  useExpenseRecords,
  useCreateExpenseRecord,
  useDeleteExpenseRecord,
  type ExpenseRecord,
  type ExpenseRecordFilter,
  type CreateExpenseRecordPayload,
} from '../../services/expenseRecordApi';

/** Matches a strict YYYY-MM-DD date string. */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface RecordSection {
  /** The YYYY-MM-DD day the records belong to. */
  title: string;
  data: ExpenseRecord[];
}

/**
 * Group records by their expenseDate (day) and sort both the groups and the
 * records within each group in descending order (most recent first).
 */
function groupByDateDesc(records: ExpenseRecord[]): RecordSection[] {
  const byDate = new Map<string, ExpenseRecord[]>();
  for (const record of records) {
    const bucket = byDate.get(record.expenseDate);
    if (bucket) {
      bucket.push(record);
    } else {
      byDate.set(record.expenseDate, [record]);
    }
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([title, data]) => ({
      title,
      data: [...data].sort((a, b) =>
        a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0,
      ),
    }));
}

export default function ExpensesScreen(): React.JSX.Element {
  const [formVisible, setFormVisible] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Only forward valid YYYY-MM-DD bounds to the query.
  const filter = useMemo<ExpenseRecordFilter | undefined>(() => {
    const next: ExpenseRecordFilter = {};
    if (DATE_PATTERN.test(fromDate.trim())) next.from = fromDate.trim();
    if (DATE_PATTERN.test(toDate.trim())) next.to = toDate.trim();
    return next.from || next.to ? next : undefined;
  }, [fromDate, toDate]);

  const recordsQuery = useExpenseRecords(filter);
  const categoriesQuery = useCategories();
  const createRecord = useCreateExpenseRecord();
  const deleteRecord = useDeleteExpenseRecord();

  const categoriesById = useMemo(() => {
    const map = new Map<string, Category>();
    for (const category of categoriesQuery.data ?? []) {
      map.set(category.id, category);
    }
    return map;
  }, [categoriesQuery.data]);

  const sections = useMemo(
    () => groupByDateDesc(recordsQuery.data ?? []),
    [recordsQuery.data],
  );

  const handleCreate = (payload: CreateExpenseRecordPayload): void => {
    createRecord.mutate(payload, {
      onSuccess: () => {
        setFormVisible(false);
        createRecord.reset();
      },
    });
  };

  const renderRecord = ({
    item,
  }: {
    item: ExpenseRecord;
  }): React.JSX.Element => {
    const category = categoriesById.get(item.categoryId);
    const isDeleting =
      deleteRecord.isPending && deleteRecord.variables === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardMain}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {category ? `${category.emoji} ${category.name}` : 'Gasto'}
          </Text>
          {item.description ? (
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
          <Text style={styles.date}>{item.expenseDate}</Text>
        </View>

        <View style={styles.cardSide}>
          <Text style={styles.amount}>
            {formatMoney(parseFloat(item.amount))}
          </Text>
          <TouchableOpacity
            onPress={() => deleteRecord.mutate(item.id)}
            disabled={isDeleting}
            accessibilityRole="button"
            accessibilityLabel="Eliminar gasto"
            style={styles.deleteButton}
          >
            <Text style={styles.deleteText}>
              {isDeleting ? '...' : 'Eliminar'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSectionHeader = ({
    section,
  }: {
    section: SectionListData<ExpenseRecord, RecordSection>;
  }): React.JSX.Element => (
    <Text style={styles.sectionHeader}>{section.title}</Text>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gastos</Text>
        <TouchableOpacity
          onPress={() => setFormVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Registrar gasto"
          style={styles.addButton}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Date-range filter -------------------------------------------------- */}
      <View style={styles.filterRow}>
        <Input
          label="Desde"
          value={fromDate}
          onChangeText={setFromDate}
          accessibilityLabel="Fecha desde"
          accessibilityHint="Formato año-mes-día"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="numbers-and-punctuation"
          maxLength={10}
          placeholder="AAAA-MM-DD"
          containerStyle={styles.filterField}
        />
        <Input
          label="Hasta"
          value={toDate}
          onChangeText={setToDate}
          accessibilityLabel="Fecha hasta"
          accessibilityHint="Formato año-mes-día"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="numbers-and-punctuation"
          maxLength={10}
          placeholder="AAAA-MM-DD"
          containerStyle={styles.filterField}
        />
      </View>

      {recordsQuery.isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator
            color={Colors.primary}
            accessibilityLabel="Cargando gastos"
          />
        </View>
      ) : recordsQuery.isError ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>
            No se pudieron cargar los gastos.
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(record) => record.id}
          renderItem={renderRecord}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>
                No tienes gastos registrados.
              </Text>
            </View>
          }
        />
      )}

      <Modal visible={formVisible} onClose={() => setFormVisible(false)}>
        <Text style={styles.modalTitle}>Registrar gasto</Text>
        <ExpenseRecordForm
          onSubmit={handleCreate}
          submitting={createRecord.isPending}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingTop: 24,
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  } as ViewStyle,
  title: {
    ...Typography.H1,
  } as TextStyle,
  addButton: {
    minWidth: TouchTarget.minWidth,
    minHeight: TouchTarget.minHeight,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  addButtonText: {
    color: Colors.background,
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 28,
  } as TextStyle,
  filterRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  } as ViewStyle,
  filterField: {
    flex: 1,
  } as ViewStyle,
  listContent: {
    paddingBottom: 24,
  } as ViewStyle,
  centered: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  emptyText: {
    ...Typography.Body,
    textAlign: 'center',
  } as TextStyle,
  sectionHeader: {
    ...Typography.H2,
    marginTop: 12,
    marginBottom: 4,
  } as TextStyle,
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  } as ViewStyle,
  cardMain: {
    flex: 1,
    paddingRight: 12,
    gap: 2,
  } as ViewStyle,
  cardTitle: {
    ...Typography.H2,
  } as TextStyle,
  description: {
    ...Typography.Body,
  } as TextStyle,
  date: {
    ...Typography.Caption,
  } as TextStyle,
  cardSide: {
    alignItems: 'flex-end',
    gap: 4,
  } as ViewStyle,
  amount: {
    ...Typography.Body,
    fontWeight: '600',
  } as TextStyle,
  deleteButton: {
    minHeight: TouchTarget.minHeight,
    justifyContent: 'center',
    paddingHorizontal: 8,
  } as ViewStyle,
  deleteText: {
    ...Typography.Body,
    color: Colors.accent,
    fontWeight: '600',
  } as TextStyle,
  modalTitle: {
    ...Typography.H2,
    marginBottom: 16,
  } as TextStyle,
});
