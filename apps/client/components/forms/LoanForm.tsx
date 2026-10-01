/**
 * LoanForm — collects a loan record, switching the visible fields based on the
 * selected source, validates with the zod loan schema, and surfaces inline
 * field-level errors (Requirement 7).
 *
 * Source selection (Req 7.1):
 *   • "Banco"   → shows only the installment amount (cuota) via MoneyInput
 *     (Req 7.2). Error if ≤ 0 (Req 7.3).
 *   • "Persona" → shows capital, interest per installment, and total
 *     installments (Req 7.4); the total repayment `C + I × N` is computed and
 *     displayed live before confirmation (Req 7.5). Errors per field
 *     (Req 7.6–7.8).
 *
 * Both sources collect the total installments, an optional installments-paid
 * count, an optional description, and the ISO start date. Amounts use
 * MoneyInput / formatMoney for display (Req 8.3). The parent screen owns the
 * network mutation and passes `onSubmit` with the validated payload plus
 * `submitting` for the button state.
 */
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Button, Input, MoneyInput } from '../ui';
import { Colors, TouchTarget, Typography } from '../../constants/theme';
import { formatMoney } from '../../utils/money';
import {
  loanSchema,
  toLoanPayload,
  type LoanPayload,
  type LoanSource,
} from '../../services/loanSchema';

export interface LoanFormProps {
  onSubmit: (payload: LoanPayload) => void;
  submitting?: boolean;
}

interface FieldErrors {
  source?: string;
  installmentAmount?: string;
  capital?: string;
  interestPerInstallment?: string;
  totalInstallments?: string;
  installmentsPaid?: string;
  description?: string;
  startDate?: string;
}

const DATE_PLACEHOLDER = 'AAAA-MM-DD';

/** Parses an integer text field into a number, or null when blank/invalid. */
function parseIntOrNull(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function LoanForm({
  onSubmit,
  submitting = false,
}: LoanFormProps): React.JSX.Element {
  const [source, setSource] = useState<LoanSource | null>(null);
  const [installmentAmount, setInstallmentAmount] = useState<number | null>(
    null,
  );
  const [capital, setCapital] = useState<number | null>(null);
  const [interestPerInstallment, setInterestPerInstallment] = useState<
    number | null
  >(null);
  const [totalInstallmentsText, setTotalInstallmentsText] = useState('');
  const [installmentsPaidText, setInstallmentsPaidText] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});

  const totalInstallments = parseIntOrNull(totalInstallmentsText);

  // Req 7.5 — live total repayment preview for person loans: C + I × N.
  const personTotalRepayment = useMemo(() => {
    if (
      source !== 'person' ||
      capital == null ||
      interestPerInstallment == null ||
      totalInstallments == null
    ) {
      return null;
    }
    return capital + interestPerInstallment * totalInstallments;
  }, [source, capital, interestPerInstallment, totalInstallments]);

  const handleSubmit = (): void => {
    if (source === null) {
      setErrors({ source: 'Selecciona el origen del préstamo' });
      return;
    }

    const installmentsPaid = parseIntOrNull(installmentsPaidText);

    const result = loanSchema.safeParse({
      source,
      installmentAmount,
      capital,
      interestPerInstallment,
      totalInstallments: totalInstallments ?? undefined,
      installmentsPaid: installmentsPaid ?? undefined,
      description: description.trim() === '' ? undefined : description,
      startDate,
    });

    if (!result.success) {
      // Collect the first error per field so each input shows its own message
      // (Property P18 — identify each invalid field).
      const nextErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FieldErrors | undefined;
        if (field && !nextErrors[field]) {
          nextErrors[field] = issue.message;
        }
      }
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    onSubmit(toLoanPayload(result.data));
  };

  return (
    <View style={styles.container}>
      {/* Source selector (Req 7.1) */}
      <Text style={styles.label}>Origen del préstamo</Text>
      <View style={styles.sourceRow}>
        <TouchableOpacity
          onPress={() => setSource('bank')}
          accessibilityRole="button"
          accessibilityLabel="Banco"
          accessibilityState={{ selected: source === 'bank' }}
          style={[
            styles.sourceOption,
            source === 'bank' && styles.sourceOptionSelected,
          ]}
        >
          <Text
            style={[
              styles.sourceOptionText,
              source === 'bank' && styles.sourceOptionTextSelected,
            ]}
          >
            Banco
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setSource('person')}
          accessibilityRole="button"
          accessibilityLabel="Persona"
          accessibilityState={{ selected: source === 'person' }}
          style={[
            styles.sourceOption,
            source === 'person' && styles.sourceOptionSelected,
          ]}
        >
          <Text
            style={[
              styles.sourceOptionText,
              source === 'person' && styles.sourceOptionTextSelected,
            ]}
          >
            Persona
          </Text>
        </TouchableOpacity>
      </View>
      {errors.source ? (
        <Text style={styles.sourceError} accessibilityRole="alert">
          {errors.source}
        </Text>
      ) : null}

      {/* Bank path — only the cuota (Req 7.2, 7.3) */}
      {source === 'bank' ? (
        <View style={styles.field}>
          <MoneyInput
            label="Cuota"
            value={installmentAmount}
            onChangeValue={setInstallmentAmount}
            error={errors.installmentAmount}
            accessibilityLabel="Valor de la cuota"
            accessibilityHint="Monto de cada cuota del préstamo bancario"
          />
        </View>
      ) : null}

      {/* Person path — capital, interest, installments (Req 7.4–7.8) */}
      {source === 'person' ? (
        <>
          <View style={styles.field}>
            <MoneyInput
              label="Capital"
              value={capital}
              onChangeValue={setCapital}
              error={errors.capital}
              accessibilityLabel="Capital del préstamo"
              accessibilityHint="Monto prestado"
            />
          </View>

          <View style={styles.field}>
            <MoneyInput
              label="Interés por cuota"
              value={interestPerInstallment}
              onChangeValue={setInterestPerInstallment}
              error={errors.interestPerInstallment}
              accessibilityLabel="Interés por cuota"
              accessibilityHint="Interés cobrado en cada cuota"
            />
          </View>
        </>
      ) : null}

      {/* Shared fields — only shown once a source is chosen */}
      {source !== null ? (
        <>
          <Input
            label="Plazo (número de cuotas)"
            value={totalInstallmentsText}
            onChangeText={setTotalInstallmentsText}
            error={errors.totalInstallments}
            accessibilityLabel="Número total de cuotas"
            accessibilityHint="Cantidad total de cuotas del préstamo"
            keyboardType="number-pad"
            placeholder="0"
            containerStyle={styles.field}
          />

          <Input
            label="Cuotas pagadas (opcional)"
            value={installmentsPaidText}
            onChangeText={setInstallmentsPaidText}
            error={errors.installmentsPaid}
            accessibilityLabel="Cuotas ya pagadas"
            accessibilityHint="Cantidad de cuotas ya pagadas; opcional"
            keyboardType="number-pad"
            placeholder="0"
            containerStyle={styles.field}
          />

          <Input
            label="Fecha de inicio"
            value={startDate}
            onChangeText={setStartDate}
            error={errors.startDate}
            accessibilityLabel="Fecha de inicio del préstamo"
            accessibilityHint="Formato año-mes-día, por ejemplo 2024-05-14"
            placeholder={DATE_PLACEHOLDER}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="numbers-and-punctuation"
            containerStyle={styles.field}
          />

          <Input
            label="Descripción (opcional)"
            value={description}
            onChangeText={setDescription}
            error={errors.description}
            accessibilityLabel="Descripción del préstamo"
            accessibilityHint="Nota opcional sobre el préstamo"
            autoCapitalize="sentences"
            containerStyle={styles.field}
          />

          {/* Total repayment preview for person loans (Req 7.5) */}
          {source === 'person' && personTotalRepayment !== null ? (
            <View
              style={styles.totalBox}
              accessibilityLabel={`Total a pagar ${formatMoney(
                personTotalRepayment,
              )}`}
            >
              <Text style={styles.totalLabel}>Total a pagar</Text>
              <Text style={styles.totalValue}>
                {formatMoney(personTotalRepayment)}
              </Text>
            </View>
          ) : null}

          <Button
            label="Guardar préstamo"
            onPress={handleSubmit}
            loading={submitting}
            disabled={submitting}
            accessibilityLabel="Guardar préstamo"
            style={styles.submit}
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: Colors.background,
  } as ViewStyle,
  label: {
    ...Typography.Body,
    marginBottom: 8,
    color: Colors.text,
  } as TextStyle,
  sourceRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  } as ViewStyle,
  sourceOption: {
    flex: 1,
    minHeight: TouchTarget.minHeight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  } as ViewStyle,
  sourceOptionSelected: {
    backgroundColor: Colors.primary,
  } as ViewStyle,
  sourceOptionText: {
    ...Typography.CTAButton,
    color: Colors.primary,
  } as TextStyle,
  sourceOptionTextSelected: {
    color: Colors.background,
  } as TextStyle,
  sourceError: {
    ...Typography.Caption,
    color: Colors.accent,
    marginBottom: 8,
  } as TextStyle,
  field: {
    marginBottom: 16,
  } as ViewStyle,
  totalBox: {
    backgroundColor: Colors.secondary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  } as ViewStyle,
  totalLabel: {
    ...Typography.Caption,
    color: Colors.text,
  } as TextStyle,
  totalValue: {
    ...Typography.H2,
    color: Colors.text,
  } as TextStyle,
  submit: {
    marginTop: 8,
  } as ViewStyle,
});
