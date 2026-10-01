/**
 * Unit tests for BudgetEntryForm (Requirement 5.6, 5.7, 5.8).
 *
 * Covers both modes:
 *   • income  — amount required (blank → inline error, no submit); a valid
 *     amount → onSubmit called with `{ amount }` (plus optional description).
 *   • expense — amount AND categoryId required (blank category → error); a
 *     valid entry → onSubmit called with `{ amount, categoryId }`.
 *
 * The amount is driven through the MoneyInput focus → changeText → blur cycle.
 */
import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { BudgetEntryForm } from '../BudgetEntryForm';

const LABELS = {
  incomeAmount: 'Monto del ingreso',
  expenseAmount: 'Monto del gasto',
  description: 'Descripción',
  category: 'Identificador de la categoría del gasto',
  submitIncome: 'Agregar ingreso',
  submitExpense: 'Agregar gasto',
} as const;

/** Drive the MoneyInput commit cycle: focus → type → blur. */
function commitMoney(label: string, text: string): void {
  const input = screen.getByLabelText(label);
  fireEvent(input, 'focus');
  fireEvent.changeText(input, text);
  fireEvent(input, 'blur');
}

describe('BudgetEntryForm (income)', () => {
  it('shows an amount error and does not call onSubmit when the amount is blank', async () => {
    const onSubmit = jest.fn();
    render(<BudgetEntryForm mode="income" onSubmit={onSubmit} />);

    fireEvent.press(screen.getByLabelText(LABELS.submitIncome));

    await waitFor(() => {
      expect(
        screen.getByText('Ingresa un monto entre 0,01 y 999.999.999,99'),
      ).toBeTruthy();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with { amount } for a valid income', async () => {
    const onSubmit = jest.fn();
    render(<BudgetEntryForm mode="income" onSubmit={onSubmit} />);

    commitMoney(LABELS.incomeAmount, '2500');
    fireEvent.press(screen.getByLabelText(LABELS.submitIncome));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    const payload = onSubmit.mock.calls[0][0];
    expect(payload).toEqual({ amount: 2500 });
    expect(payload).not.toHaveProperty('description');
  });

  it('includes an optional description when provided', async () => {
    const onSubmit = jest.fn();
    render(<BudgetEntryForm mode="income" onSubmit={onSubmit} />);

    commitMoney(LABELS.incomeAmount, '100.25');
    fireEvent.changeText(screen.getByLabelText(LABELS.description), '  Salario  ');
    fireEvent.press(screen.getByLabelText(LABELS.submitIncome));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    expect(onSubmit.mock.calls[0][0]).toEqual({
      amount: 100.25,
      description: 'Salario',
    });
  });
});

describe('BudgetEntryForm (expense)', () => {
  it('requires a categoryId and does not call onSubmit when it is blank', async () => {
    const onSubmit = jest.fn();
    render(<BudgetEntryForm mode="expense" onSubmit={onSubmit} />);

    commitMoney(LABELS.expenseAmount, '50');
    fireEvent.press(screen.getByLabelText(LABELS.submitExpense));

    await waitFor(() => {
      expect(screen.getByText('Selecciona una categoría')).toBeTruthy();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with { amount, categoryId } for a valid expense', async () => {
    const onSubmit = jest.fn();
    render(<BudgetEntryForm mode="expense" onSubmit={onSubmit} />);

    commitMoney(LABELS.expenseAmount, '75.50');
    fireEvent.changeText(screen.getByLabelText(LABELS.category), '  cat-123  ');
    fireEvent.press(screen.getByLabelText(LABELS.submitExpense));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    const payload = onSubmit.mock.calls[0][0];
    expect(payload).toEqual({ amount: 75.5, categoryId: 'cat-123' });
    expect(payload).not.toHaveProperty('description');
  });
});
