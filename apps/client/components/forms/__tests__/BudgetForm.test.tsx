/**
 * Unit tests for BudgetForm (Requirement 5).
 *
 * Covers rendering of the required name field and the optional monthly limit
 * (MoneyInput), the inline name-required validation, and the shape of the
 * payload handed to `onSubmit`: `{ name }` with no `monthlyLimit` key when the
 * limit is left blank, and `{ name, monthlyLimit }` when a value is committed
 * through the MoneyInput focus → changeText → blur cycle.
 */
import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { BudgetForm } from '../BudgetForm';

const LABELS = {
  name: 'Nombre del presupuesto',
  limit: 'Límite mensual del presupuesto',
  submit: 'Crear presupuesto',
} as const;

/** Drive the MoneyInput commit cycle: focus → type → blur. */
function commitMoney(label: string, text: string): void {
  const input = screen.getByLabelText(label);
  fireEvent(input, 'focus');
  fireEvent.changeText(input, text);
  fireEvent(input, 'blur');
}

describe('BudgetForm', () => {
  it('renders the name field, optional limit, and submit button', () => {
    render(<BudgetForm onSubmit={jest.fn()} />);

    expect(screen.getByLabelText(LABELS.name)).toBeTruthy();
    expect(screen.getByLabelText(LABELS.limit)).toBeTruthy();
    expect(screen.getByLabelText(LABELS.submit)).toBeTruthy();
  });

  it('shows a name error and does not call onSubmit when the name is empty', async () => {
    const onSubmit = jest.fn();
    render(<BudgetForm onSubmit={onSubmit} />);

    fireEvent.press(screen.getByLabelText(LABELS.submit));

    await waitFor(() => {
      expect(
        screen.getByText('Ingresa un nombre para el presupuesto'),
      ).toBeTruthy();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with only { name } when no limit is provided', async () => {
    const onSubmit = jest.fn();
    render(<BudgetForm onSubmit={onSubmit} />);

    fireEvent.changeText(screen.getByLabelText(LABELS.name), '  Hogar  ');
    fireEvent.press(screen.getByLabelText(LABELS.submit));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    const payload = onSubmit.mock.calls[0][0];
    expect(payload).toEqual({ name: 'Hogar' });
    expect(payload).not.toHaveProperty('monthlyLimit');
  });

  it('includes monthlyLimit when a value is committed through MoneyInput', async () => {
    const onSubmit = jest.fn();
    render(<BudgetForm onSubmit={onSubmit} />);

    fireEvent.changeText(screen.getByLabelText(LABELS.name), 'Pareja');
    commitMoney(LABELS.limit, '1500.50');
    fireEvent.press(screen.getByLabelText(LABELS.submit));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    expect(onSubmit.mock.calls[0][0]).toEqual({
      name: 'Pareja',
      monthlyLimit: 1500.5,
    });
  });
});
