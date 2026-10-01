/**
 * BudgetEntryForm — add an income or a shared expense to a budget
 * (Requirement 5.6, 5.7, 5.8).
 *
 * One form drives both flows via the `mode` prop:
 *   • mode="income"  → amount + description → AddIncomePayload
 *   • mode="expense" → amount + description + categoryId → AddBudgetExpensePayload
 *
 * MoneyInput already constrains the amount to 0.01–999,999,999.99 (and passes
 * `null` when the value is out of range or blank), so an amount of `null` on
 * submit surfaces the inline validation error (Req 5.8). The description is
 * optional but capped at 255 characters (Req 5.6–5.8). The parent owns the
 * mutation and passes `onSubmit`, `submitting`, and optional `serverError`.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Button, Input, MoneyInput } from '../ui';
import { Colors, Typography } from '../../constants/theme';
import type {
  AddBudgetExpensePayload,
  AddIncomePayload,
} from '../../services/sharedBudgetApi';

export type BudgetEntryMode = 'income' | 'expense';

export interface BudgetEntryFormProps {
  mode: BudgetEntryMode;
  onSubmit: (payload: AddIncomePayload | AddBudgetExpensePayload) => void;
  submitting?: boolean;
  /** Server-side error (e.g. rejected amount/description) shown inline. */
  serverError?: string;
}

const MAX_DESCRIPTION_LENGTH = 255;

interface FieldErrors {
  amount?: string;
  categoryId?: string;
}

export function BudgetEntryForm({
  mode,
  onSubmit,
  submitting = false,
  serverError,
}: BudgetEntryFormProps): React.JSX.Element {
  const [amount, setAmount] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});

  const isExpense = mode === 'expense';

  const handleSubmit = (): void => {
    const nextErrors: FieldErrors = {};

    if (amount === null) {
      nextErrors.amount =
        'Ingresa un monto entre 0,01 y 999.999.999,99';
    }
    if (isExpense && categoryId.trim().length === 0) {
      nextErrors.categoryId = 'Selecciona una categoría';
    }

    if (nextErrors.amount || nextErrors.categoryId) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    const trimmedDescription = description.trim();

    if (isExpense) {
      const payload: AddBudgetExpensePayload = {
        // amount is guaranteed non-null by the guard above.
        amount: amount as number,
        categoryId: categoryId.trim(),
      };
      if (trimmedDescription.length > 0) {
        payload.description = trimmedDescription;
      }
      onSubmit(payload);
      return;
    }

    const payload: AddIncomePayload = { amount: amount as number };
    if (trimmedDescription.length > 0) {
      payload.description = trimmedDescription;
    }
    onSubmit(payload);
  };

  return (
    <View style={styles.container}>
      <MoneyInput
        label="Monto"
        value={amount}
        onChangeValue={setAmount}
        error={errors.amount}
        accessibilityLabel={isExpense ? 'Monto del gasto' : 'Monto del ingreso'}
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

      {isExpense ? (
        <Input
          label="Categoría"
          value={categoryId}
          onChangeText={setCategoryId}
          error={errors.categoryId}
          accessibilityLabel="Identificador de la categoría del gasto"
          accessibilityHint="Categoría a la que pertenece este gasto"
          autoCapitalize="none"
          autoCorrect={false}
          containerStyle={styles.field}
        />
      ) : null}

      {serverError ? (
        <Text
          style={styles.serverError}
          accessibilityRole="alert"
          accessibilityLabel={serverError}
        >
          {serverError}
        </Text>
      ) : null}

      <Button
        label={isExpense ? 'Agregar gasto' : 'Agregar ingreso'}
        onPress={handleSubmit}
        loading={submitting}
        disabled={submitting}
        accessibilityLabel={isExpense ? 'Agregar gasto' : 'Agregar ingreso'}
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
  field: {
    marginTop: 16,
  } as ViewStyle,
  serverError: {
    ...Typography.Caption,
    color: Colors.accent,
    marginTop: 12,
  } as TextStyle,
  submit: {
    marginTop: 24,
  } as ViewStyle,
});
