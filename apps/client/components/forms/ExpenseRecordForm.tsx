/**
 * ExpenseRecordForm — log a personal expense entry (Requirement 5.x).
 *
 * Fields:
 *   • category   — a searchable Select (dropdown) fed by useCategories, with the
 *                  category emoji preserved in both the options and the selected
 *                  state. Exactly one category must be chosen.
 *   • amount     — MoneyInput (0.01–999,999,999.99); `null` means out of range
 *                  or blank, which surfaces an inline validation error.
 *   • description — optional free text, capped at 255 characters.
 *   • expenseDate — optional YYYY-MM-DD; defaults to today. Validated against a
 *                  strict YYYY-MM-DD shape before submit.
 *
 * The parent owns the mutation and passes `onSubmit` + `submitting`. On submit
 * the form emits a CreateExpenseRecordPayload with the chosen category, the
 * amount, and only the optional fields that have values.
 */
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Button, Input, MoneyInput, Select, DatePicker } from '../ui';
import type { SelectOption } from '../ui';
import { Colors, Typography } from '../../constants/theme';
import { useCategories } from '../../services/expensesApi';
import type { CreateExpenseRecordPayload } from '../../services/expenseRecordApi';

export interface ExpenseRecordFormProps {
  onSubmit: (payload: CreateExpenseRecordPayload) => void;
  submitting?: boolean;
}

const MAX_DESCRIPTION_LENGTH = 255;

/** Matches a strict YYYY-MM-DD calendar-ish date string. */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface FieldErrors {
  categoryId?: string;
  amount?: string;
  expenseDate?: string;
}

/** Today's date formatted as YYYY-MM-DD in local time. */
function todayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function ExpenseRecordForm({
  onSubmit,
  submitting = false,
}: ExpenseRecordFormProps): React.JSX.Element {
  const categoriesQuery = useCategories();

  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(todayIso());
  const [errors, setErrors] = useState<FieldErrors>({});

  const categories = useMemo(
    () => categoriesQuery.data ?? [],
    [categoriesQuery.data],
  );

  // Map categories to Select options, preserving each category's emoji so it
  // shows in both the dropdown list and the selected trigger state.
  const categoryOptions = useMemo<SelectOption[]>(
    () =>
      categories.map((category) => ({
        value: category.id,
        label: category.name,
        emoji: category.emoji,
      })),
    [categories],
  );

  const handleSubmit = (): void => {
    const nextErrors: FieldErrors = {};

    if (categoryId.trim().length === 0) {
      nextErrors.categoryId = 'Selecciona una categoría';
    }
    if (amount === null) {
      nextErrors.amount = 'Ingresa un monto entre 0,01 y 999.999.999,99';
    }

    const trimmedDate = expenseDate.trim();
    if (trimmedDate.length > 0 && !DATE_PATTERN.test(trimmedDate)) {
      nextErrors.expenseDate = 'Usa el formato AAAA-MM-DD';
    }

    if (nextErrors.categoryId || nextErrors.amount || nextErrors.expenseDate) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});

    const payload: CreateExpenseRecordPayload = {
      categoryId: categoryId.trim(),
      // amount is guaranteed non-null by the guard above.
      amount: amount as number,
    };

    const trimmedDescription = description.trim();
    if (trimmedDescription.length > 0) {
      payload.description = trimmedDescription;
    }
    if (trimmedDate.length > 0) {
      payload.expenseDate = trimmedDate;
    }

    onSubmit(payload);
  };

  return (
    <View style={styles.container}>
      {categoriesQuery.isLoading ? (
        <>
          <Text style={styles.sectionLabel}>Categoría</Text>
          <ActivityIndicator
            color={Colors.primary}
            accessibilityLabel="Cargando categorías"
            style={styles.loader}
          />
        </>
      ) : categoriesQuery.isError ? (
        <>
          <Text style={styles.sectionLabel}>Categoría</Text>
          <Text style={styles.errorText}>
            No se pudieron cargar las categorías.
          </Text>
        </>
      ) : categories.length > 0 ? (
        <Select
          label="Categoría"
          value={categoryId === '' ? null : categoryId}
          options={categoryOptions}
          onChange={setCategoryId}
          placeholder="Selecciona una categoría"
          searchPlaceholder="Buscar categoría..."
          error={errors.categoryId}
          accessibilityLabel="Categoría del gasto"
          accessibilityHint="Abre la lista de categorías para buscar y seleccionar"
        />
      ) : (
        <>
          <Text style={styles.sectionLabel}>Categoría</Text>
          <Text style={styles.caption}>
            No hay categorías disponibles todavía.
          </Text>
        </>
      )}

      <View style={styles.field}>
        <MoneyInput
          label="Monto"
          value={amount}
          onChangeValue={setAmount}
          error={errors.amount}
          accessibilityLabel="Monto del gasto"
        />
      </View>

      <Input
        label="Descripción (opcional)"
        value={description}
        onChangeText={setDescription}
        accessibilityLabel="Descripción"
        accessibilityHint={`Hasta ${MAX_DESCRIPTION_LENGTH} caracteres`}
        autoCapitalize="sentences"
        maxLength={MAX_DESCRIPTION_LENGTH}
        containerStyle={styles.field}
      />

      <DatePicker
        label="Fecha"
        value={expenseDate}
        onChange={setExpenseDate}
        error={errors.expenseDate}
        accessibilityLabel="Fecha del gasto"
        accessibilityHint="Abre el calendario para elegir la fecha del gasto"
        containerStyle={styles.field}
      />

      <Button
        label="Registrar gasto"
        onPress={handleSubmit}
        loading={submitting}
        disabled={submitting}
        accessibilityLabel="Registrar gasto"
        style={styles.submit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: Colors.background,
  } as ViewStyle,
  sectionLabel: {
    ...Typography.Body,
    marginBottom: 4,
  } as TextStyle,
  loader: {
    marginVertical: 12,
  } as ViewStyle,
  caption: {
    ...Typography.Caption,
  } as TextStyle,
  errorText: {
    ...Typography.Caption,
    color: Colors.accent,
    marginTop: 4,
  } as TextStyle,
  field: {
    marginTop: 16,
  } as ViewStyle,
  submit: {
    marginTop: 24,
  } as ViewStyle,
});
