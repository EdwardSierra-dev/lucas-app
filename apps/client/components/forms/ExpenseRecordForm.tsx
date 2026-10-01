/**
 * ExpenseRecordForm — log a personal expense entry (Requirement 5.x).
 *
 * Fields:
 *   • category   — a horizontal picker of CategoryCards fed by useCategories.
 *                  Exactly one category must be chosen.
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
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Button, Input, MoneyInput, CategoryCard } from '../ui';
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
      <Text style={styles.sectionLabel}>Categoría</Text>
      {categoriesQuery.isLoading ? (
        <ActivityIndicator
          color={Colors.primary}
          accessibilityLabel="Cargando categorías"
          style={styles.loader}
        />
      ) : categoriesQuery.isError ? (
        <Text style={styles.errorText}>
          No se pudieron cargar las categorías.
        </Text>
      ) : categories.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
          keyboardShouldPersistTaps="handled"
        >
          {categories.map((category) => (
            <View key={category.id} style={styles.categoryItem}>
              <CategoryCard
                name={category.name}
                emoji={category.emoji}
                selected={categoryId === category.id}
                onToggle={() =>
                  setCategoryId((current) =>
                    current === category.id ? '' : category.id,
                  )
                }
              />
            </View>
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.caption}>
          No hay categorías disponibles todavía.
        </Text>
      )}
      {errors.categoryId ? (
        <Text style={styles.errorText} accessibilityRole="alert">
          {errors.categoryId}
        </Text>
      ) : null}

      <MoneyInput
        label="Monto"
        value={amount}
        onChangeValue={setAmount}
        error={errors.amount}
        accessibilityLabel="Monto del gasto"
      />

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

      <Input
        label="Fecha (AAAA-MM-DD)"
        value={expenseDate}
        onChangeText={setExpenseDate}
        error={errors.expenseDate}
        accessibilityLabel="Fecha del gasto"
        accessibilityHint="Formato año-mes-día, por ejemplo 2024-05-31"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="numbers-and-punctuation"
        maxLength={10}
        placeholder="AAAA-MM-DD"
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
  categoryRow: {
    gap: 8,
    paddingVertical: 4,
  } as ViewStyle,
  categoryItem: {
    minWidth: 140,
  } as ViewStyle,
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
