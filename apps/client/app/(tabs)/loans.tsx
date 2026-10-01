/**
 * Loans tab screen — dedicated loans summary view (Requirement 7.9).
 *
 * Lists active loans (installments_paid < total_installments) with, per loan:
 *   • the source (Banco / Persona),
 *   • the outstanding amount (formatMoney, Req 8.3),
 *   • the remaining installments, and
 *   • the payment progress (installmentsPaid / totalInstallments).
 *
 * Each loan offers:
 *   • "Registrar pago" → useRegisterInstallment (increments installments_paid),
 *   • a delete action → useDeleteLoan.
 *
 * A floating "+" opens a Modal hosting the LoanForm → useCreateLoan. On a
 * successful create the modal closes; the ['loans'] query is invalidated by the
 * mutation so the list refreshes automatically.
 *
 * All amounts are rendered via formatMoney and only palette colors are used
 * (Req 8.1); interactive elements meet the 44×44 touch target (Req 8.2).
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ListRenderItemInfo,
} from 'react-native';
import { Modal } from '../../components/ui';
import { LoanForm } from '../../components/forms/LoanForm';
import { Colors, TouchTarget, Typography } from '../../constants/theme';
import { formatMoney } from '../../utils/money';
import {
  useLoans,
  useCreateLoan,
  useRegisterInstallment,
  useDeleteLoan,
  type Loan,
} from '../../services/loanApi';
import type { LoanPayload } from '../../services/loanSchema';

/** Human-readable Spanish label for a loan source. */
function sourceLabel(source: Loan['source']): string {
  return source === 'bank' ? 'Banco' : 'Persona';
}

export default function LoansScreen(): React.JSX.Element {
  const [formVisible, setFormVisible] = useState(false);

  const loansQuery = useLoans();
  const createLoan = useCreateLoan();
  const registerInstallment = useRegisterInstallment();
  const deleteLoan = useDeleteLoan();

  const handleCreate = (payload: LoanPayload): void => {
    createLoan.mutate(payload, {
      onSuccess: () => {
        setFormVisible(false);
      },
    });
  };

  const renderLoan = ({
    item,
  }: ListRenderItemInfo<Loan>): React.JSX.Element => {
    const isRegistering =
      registerInstallment.isPending &&
      registerInstallment.variables === item.id;
    const isDeleting =
      deleteLoan.isPending && deleteLoan.variables === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{sourceLabel(item.source)}</Text>
          <TouchableOpacity
            onPress={() => deleteLoan.mutate(item.id)}
            disabled={isDeleting}
            accessibilityRole="button"
            accessibilityLabel="Eliminar préstamo"
            style={styles.deleteButton}
          >
            <Text style={styles.deleteText}>
              {isDeleting ? '...' : 'Eliminar'}
            </Text>
          </TouchableOpacity>
        </View>

        {item.description ? (
          <Text style={styles.description}>{item.description}</Text>
        ) : null}

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Saldo pendiente</Text>
          <Text style={styles.rowValue}>
            {formatMoney(item.outstandingAmount)}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Cuotas restantes</Text>
          <Text style={styles.rowValue}>{item.remainingInstallments}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Progreso</Text>
          <Text style={styles.rowValue}>
            {item.installmentsPaid}/{item.totalInstallments}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => registerInstallment.mutate(item.id)}
          disabled={isRegistering}
          accessibilityRole="button"
          accessibilityLabel="Registrar pago"
          style={styles.payButton}
        >
          {isRegistering ? (
            <ActivityIndicator color={Colors.background} />
          ) : (
            <Text style={styles.payButtonText}>Registrar pago</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Préstamos</Text>
        <TouchableOpacity
          onPress={() => setFormVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Agregar préstamo"
          style={styles.addButton}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {loansQuery.isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator
            color={Colors.primary}
            accessibilityLabel="Cargando préstamos"
          />
        </View>
      ) : loansQuery.isError ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>
            No se pudieron cargar los préstamos.
          </Text>
        </View>
      ) : (
        <FlatList
          data={loansQuery.data ?? []}
          keyExtractor={(loan) => loan.id}
          renderItem={renderLoan}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>
                No tienes préstamos activos.
              </Text>
            </View>
          }
        />
      )}

      <Modal visible={formVisible} onClose={() => setFormVisible(false)}>
        <Text style={styles.modalTitle}>Nuevo préstamo</Text>
        <LoanForm onSubmit={handleCreate} submitting={createLoan.isPending} />
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
  card: {
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  } as ViewStyle,
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  } as ViewStyle,
  cardTitle: {
    ...Typography.H2,
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
  description: {
    ...Typography.Body,
    marginBottom: 8,
  } as TextStyle,
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  } as ViewStyle,
  rowLabel: {
    ...Typography.Body,
  } as TextStyle,
  rowValue: {
    ...Typography.Body,
    fontWeight: '600',
  } as TextStyle,
  payButton: {
    marginTop: 12,
    minHeight: TouchTarget.minHeight,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  } as ViewStyle,
  payButtonText: {
    ...Typography.CTAButton,
    color: Colors.background,
  } as TextStyle,
  modalTitle: {
    ...Typography.H2,
    marginBottom: 16,
  } as TextStyle,
});
