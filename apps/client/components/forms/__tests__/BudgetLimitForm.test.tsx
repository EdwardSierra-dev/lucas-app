/**
 * Unit tests for BudgetLimitForm (Requirement 5.10, 5.11).
 *
 * Covers:
 *   • submitting with a blank MoneyInput → onSubmit called with
 *     `{ monthlyLimit: null }` (clears the limit).
 *   • submitting with a committed value → `{ monthlyLimit: <number> }`.
 *   • `initialLimit` prefills the field with the formatted current value.
 */
import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { BudgetLimitForm } from '../BudgetLimitForm';
import { formatMoney } from '../../../utils/money';

const LABELS = {
  limit: 'Límite mensual del presupuesto',
  submit: 'Guardar límite mensual',
} as const;

/** Drive the MoneyInput commit cycle: focus → type → blur. */
function commitMoney(label: string, text: string): void {
  const input = screen.getByLabelText(label);
  fireEvent(input, 'focus');
  fireEvent.changeText(input, text);
  fireEvent(input, 'blur');
}

describe('BudgetLimitForm', () => {
  it('submits { monthlyLimit: null } when the field is left blank', async () => {
    const onSubmit = jest.fn();
    render(<BudgetLimitForm onSubmit={onSubmit} />);

    fireEvent.press(screen.getByLabelText(LABELS.submit));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    expect(onSubmit.mock.calls[0][0]).toEqual({ monthlyLimit: null });
  });

  it('clears an existing limit when the field is emptied and submitted', async () => {
    const onSubmit = jest.fn();
    render(<BudgetLimitForm onSubmit={onSubmit} initialLimit={1000} />);

    commitMoney(LABELS.limit, '');
    fireEvent.press(screen.getByLabelText(LABELS.submit));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    expect(onSubmit.mock.calls[0][0]).toEqual({ monthlyLimit: null });
  });

  it('submits { monthlyLimit: <number> } when a value is committed', async () => {
    const onSubmit = jest.fn();
    render(<BudgetLimitForm onSubmit={onSubmit} />);

    commitMoney(LABELS.limit, '2000.75');
    fireEvent.press(screen.getByLabelText(LABELS.submit));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    expect(onSubmit.mock.calls[0][0]).toEqual({ monthlyLimit: 2000.75 });
  });

  it('prefills the field from initialLimit', () => {
    render(<BudgetLimitForm onSubmit={jest.fn()} initialLimit={1500} />);

    expect(screen.getByLabelText(LABELS.limit).props.value).toBe(
      formatMoney(1500),
    );
  });
});
