/**
 * Unit tests for LoanForm (Requirement 7).
 *
 * Covers source selection, source-conditional field visibility, required-field
 * validation errors, and successful submission payloads for both bank and
 * person loans.
 *
 * Driving MoneyInput: the component commits its numeric value on blur. To set a
 * value in tests we focus the inner TextInput (seeds the raw text), fire a
 * changeText with the numeric string, then fire blur so onChangeValue runs.
 */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { LoanForm } from '../LoanForm';

/**
 * Sets a MoneyInput's numeric value by replicating the focus → change → blur
 * flow the real keyboard produces, which is what commits the value.
 */
function setMoneyInput(
  getByLabelText: (label: string) => any,
  label: string,
  text: string,
): void {
  const input = getByLabelText(label);
  fireEvent(input, 'focus');
  fireEvent.changeText(input, text);
  fireEvent(input, 'blur');
}

/**
 * Picks a date on a DatePicker trigger. Opens the calendar via the trigger's
 * accessibility label, navigates from the currently shown month to the target
 * month, then taps the day cell (each cell is labeled with its ISO date).
 *
 * @param triggerLabel accessibility label of the DatePicker trigger
 * @param iso          target date as YYYY-MM-DD
 */
function pickDate(
  getByLabelText: (label: string) => any,
  triggerLabel: string,
  iso: string,
): void {
  const parts = iso.split('-').map(Number);
  const year = parts[0] ?? 0;
  const month = parts[1] ?? 1;

  // Open the calendar.
  fireEvent.press(getByLabelText(triggerLabel));

  // The calendar opens on today's month; walk forward/back to the target.
  // "Mes anterior" / "Mes siguiente" step one month at a time.
  const now = new Date();
  const currentIndex = now.getFullYear() * 12 + now.getMonth();
  const targetIndex = year * 12 + (month - 1);
  const delta = targetIndex - currentIndex;
  const navLabel = delta >= 0 ? 'Mes siguiente' : 'Mes anterior';
  for (let i = 0; i < Math.abs(delta); i += 1) {
    fireEvent.press(getByLabelText(navLabel));
  }

  // Tap the day cell. The day label is unique within the shown month.
  fireEvent.press(getByLabelText(iso));
}

describe('LoanForm', () => {
  it('shows only the source selector before a source is chosen', () => {
    const onSubmit = jest.fn();
    const { queryByLabelText } = render(<LoanForm onSubmit={onSubmit} />);

    // The source selector buttons are always present.
    expect(queryByLabelText('Banco')).toBeTruthy();
    expect(queryByLabelText('Persona')).toBeTruthy();

    // No shared fields and no submit button until a source is selected.
    expect(queryByLabelText('Número total de cuotas')).toBeNull();
    expect(queryByLabelText('Fecha de inicio del préstamo')).toBeNull();
    expect(queryByLabelText('Guardar préstamo')).toBeNull();
    expect(queryByLabelText('Valor de la cuota')).toBeNull();
    expect(queryByLabelText('Capital del préstamo')).toBeNull();
  });

  it('shows the cuota field for a bank loan and capital + interest for a person loan', () => {
    const onSubmit = jest.fn();
    const { getByLabelText, queryByLabelText } = render(
      <LoanForm onSubmit={onSubmit} />,
    );

    // Choosing "Banco" reveals the cuota MoneyInput and hides person fields.
    fireEvent.press(getByLabelText('Banco'));
    expect(queryByLabelText('Valor de la cuota')).toBeTruthy();
    expect(queryByLabelText('Capital del préstamo')).toBeNull();
    expect(queryByLabelText('Interés por cuota')).toBeNull();
    expect(queryByLabelText('Guardar préstamo')).toBeTruthy();

    // Switching to "Persona" reveals capital + interest and hides the cuota.
    fireEvent.press(getByLabelText('Persona'));
    expect(queryByLabelText('Capital del préstamo')).toBeTruthy();
    expect(queryByLabelText('Interés por cuota')).toBeTruthy();
    expect(queryByLabelText('Valor de la cuota')).toBeNull();
  });

  it('bank: submitting with an empty cuota shows the cuota error and does not call onSubmit', () => {
    const onSubmit = jest.fn();
    const { getByLabelText, getByText } = render(
      <LoanForm onSubmit={onSubmit} />,
    );

    fireEvent.press(getByLabelText('Banco'));
    // Provide valid plazo + startDate so the only failing field is the cuota.
    fireEvent.changeText(getByLabelText('Número total de cuotas'), '12');
    pickDate(getByLabelText, 'Fecha de inicio del préstamo', '2024-05-14');

    fireEvent.press(getByLabelText('Guardar préstamo'));

    expect(getByText('La cuota debe ser mayor que cero')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('person: submitting with an empty capital shows the capital error and does not call onSubmit', () => {
    const onSubmit = jest.fn();
    const { getByLabelText, getByText } = render(
      <LoanForm onSubmit={onSubmit} />,
    );

    fireEvent.press(getByLabelText('Persona'));
    fireEvent.changeText(getByLabelText('Número total de cuotas'), '6');
    pickDate(getByLabelText, 'Fecha de inicio del préstamo', '2024-05-14');
    // Supply interest so capital is the failing field we assert on.
    setMoneyInput(getByLabelText, 'Interés por cuota', '50');

    fireEvent.press(getByLabelText('Guardar préstamo'));

    expect(getByText('El capital debe ser mayor que cero')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit once with a bank payload for a valid bank loan', () => {
    const onSubmit = jest.fn();
    const { getByLabelText } = render(<LoanForm onSubmit={onSubmit} />);

    fireEvent.press(getByLabelText('Banco'));
    setMoneyInput(getByLabelText, 'Valor de la cuota', '150000');
    fireEvent.changeText(getByLabelText('Número total de cuotas'), '12');
    pickDate(getByLabelText, 'Fecha de inicio del préstamo', '2024-05-14');

    fireEvent.press(getByLabelText('Guardar préstamo'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.source).toBe('bank');
    expect(payload.installmentAmount).toBe(150000);
    expect(payload.totalInstallments).toBe(12);
    expect(payload.startDate).toBe('2024-05-14');
    expect(payload.capital).toBeUndefined();
    expect(payload.interestPerInstallment).toBeUndefined();
  });

  it('calls onSubmit once with a person payload for a valid person loan', () => {
    const onSubmit = jest.fn();
    const { getByLabelText } = render(<LoanForm onSubmit={onSubmit} />);

    fireEvent.press(getByLabelText('Persona'));
    setMoneyInput(getByLabelText, 'Capital del préstamo', '1000000');
    setMoneyInput(getByLabelText, 'Interés por cuota', '20000');
    fireEvent.changeText(getByLabelText('Número total de cuotas'), '10');
    pickDate(getByLabelText, 'Fecha de inicio del préstamo', '2024-05-14');

    fireEvent.press(getByLabelText('Guardar préstamo'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.source).toBe('person');
    expect(payload.capital).toBe(1000000);
    expect(payload.interestPerInstallment).toBe(20000);
    expect(payload.totalInstallments).toBe(10);
    expect(payload.startDate).toBe('2024-05-14');
    expect(payload.installmentAmount).toBeUndefined();
  });
});

