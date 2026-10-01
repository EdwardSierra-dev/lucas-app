/**
 * BudgetLimitForm — set or clear a shared budget's monthly spending limit
 * (Requirement 5.10, 5.11).
 *
 * MoneyInput constrains the amount to 0.01–999,999,999.99 and passes `null`
 * when the value is blank or out of range. On submit a `null` amount is sent as
 * `monthlyLimit: null`, which clears the limit; otherwise the validated value
 * is sent. The parent screen owns the mutation and passes `onSubmit`,
 * `submitting`, and an optional `initialLimit` to prefill the current value.
 */
import React, { useState } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Button, MoneyInput } from '../ui';
import { Colors } from '../../constants/theme';
import type { SetLimitPayload } from '../../services/sharedBudgetApi';

export interface BudgetLimitFormProps {
  onSubmit: (payload: SetLimitPayload) => void;
  submitting?: boolean;
  /** Current limit to prefill, or null when none is set. */
  initialLimit?: number | null;
}

export function BudgetLimitForm({
  onSubmit,
  submitting = false,
  initialLimit = null,
}: BudgetLimitFormProps): React.JSX.Element {
  const [limit, setLimit] = useState<number | null>(initialLimit);

  const handleSubmit = (): void => {
    onSubmit({ monthlyLimit: limit });
  };

  return (
    <View style={styles.container}>
      <MoneyInput
        label="Límite mensual"
        value={limit}
        onChangeValue={setLimit}
        accessibilityLabel="Límite mensual del presupuesto"
        accessibilityHint="Deja en blanco para quitar el límite"
      />

      <Button
        label="Guardar límite"
        onPress={handleSubmit}
        loading={submitting}
        disabled={submitting}
        accessibilityLabel="Guardar límite mensual"
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
  submit: {
    marginTop: 24,
  } as ViewStyle,
});
