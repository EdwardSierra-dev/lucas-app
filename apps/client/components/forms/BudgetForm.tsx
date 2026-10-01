/**
 * BudgetForm — create a shared budget (Requirement 5).
 *
 * Collects a budget name (required) and an optional monthly spending limit via
 * MoneyInput. The parent screen owns the create mutation and passes `onSubmit`
 * with the validated payload, plus `submitting` for the button state.
 *
 * Validation (client-side, inline errors kept open on failure):
 *   • name  — required, 1–100 chars after trimming (Req 5, design `name VARCHAR(100)`).
 *   • monthlyLimit — optional; when provided MoneyInput already constrains it to
 *     the 0.01–999,999,999.99 range (Req 5.10). A blank value means "no limit".
 */
import React, { useState } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Button, Input, MoneyInput } from '../ui';
import { Colors } from '../../constants/theme';
import type { CreateBudgetPayload } from '../../services/sharedBudgetApi';

export interface BudgetFormProps {
  onSubmit: (payload: CreateBudgetPayload) => void;
  submitting?: boolean;
}

const MAX_NAME_LENGTH = 100;

export function BudgetForm({
  onSubmit,
  submitting = false,
}: BudgetFormProps): React.JSX.Element {
  const [name, setName] = useState('');
  const [monthlyLimit, setMonthlyLimit] = useState<number | null>(null);
  const [nameError, setNameError] = useState<string | undefined>(undefined);

  const handleSubmit = (): void => {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setNameError('Ingresa un nombre para el presupuesto');
      return;
    }
    if (trimmed.length > MAX_NAME_LENGTH) {
      setNameError(`El nombre no puede superar ${MAX_NAME_LENGTH} caracteres`);
      return;
    }

    setNameError(undefined);
    const payload: CreateBudgetPayload = { name: trimmed };
    if (monthlyLimit !== null) {
      payload.monthlyLimit = monthlyLimit;
    }
    onSubmit(payload);
  };

  return (
    <View style={styles.container}>
      <Input
        label="Nombre del presupuesto"
        value={name}
        onChangeText={setName}
        error={nameError}
        accessibilityLabel="Nombre del presupuesto"
        accessibilityHint="Por ejemplo: Hogar, Pareja, Casa"
        autoCapitalize="sentences"
        maxLength={MAX_NAME_LENGTH}
        containerStyle={styles.field}
      />

      <MoneyInput
        label="Límite mensual (opcional)"
        value={monthlyLimit}
        onChangeValue={setMonthlyLimit}
        accessibilityLabel="Límite mensual del presupuesto"
        accessibilityHint="Opcional. Deja en blanco para no definir un límite"
      />

      <Button
        label="Crear presupuesto"
        onPress={handleSubmit}
        loading={submitting}
        disabled={submitting}
        accessibilityLabel="Crear presupuesto"
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
    marginBottom: 16,
  } as ViewStyle,
  submit: {
    marginTop: 24,
  } as ViewStyle,
});
