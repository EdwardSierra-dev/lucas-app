/**
 * Unit tests for VehicleForm (Requirement 4).
 *
 * Covers rendering of all fields, client-side validation of required fields and
 * the cross-field date rules enforced by the zod `vehicleSchema`, and the shape
 * of the payload handed to `onSubmit` (optional kit date omitted when blank).
 */
import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { VehicleForm } from '../VehicleForm';

const LABELS = {
  vehicleType: 'Tipo de vehículo',
  model: 'Modelo del vehículo',
  purchaseDate: 'Fecha de compra o matrícula',
  soatExpiry: 'Fecha de vencimiento del SOAT',
  tecnomecanicaExpiry: 'Fecha de vencimiento de la Tecnomecánica',
  kitExpiry: 'Fecha de renovación del kit de carretera',
  submit: 'Guardar vehículo',
} as const;

/** Fills every required field (and optionally the kit date) with the given values. */
function fillRequiredFields(values: {
  vehicleType: string;
  model: string;
  purchaseDate: string;
  soatExpiry: string;
  tecnomecanicaExpiry: string;
  kitExpiry?: string;
}): void {
  fireEvent.changeText(screen.getByLabelText(LABELS.vehicleType), values.vehicleType);
  fireEvent.changeText(screen.getByLabelText(LABELS.model), values.model);
  fireEvent.changeText(screen.getByLabelText(LABELS.purchaseDate), values.purchaseDate);
  fireEvent.changeText(screen.getByLabelText(LABELS.soatExpiry), values.soatExpiry);
  fireEvent.changeText(
    screen.getByLabelText(LABELS.tecnomecanicaExpiry),
    values.tecnomecanicaExpiry,
  );
  if (values.kitExpiry !== undefined) {
    fireEvent.changeText(screen.getByLabelText(LABELS.kitExpiry), values.kitExpiry);
  }
}

describe('VehicleForm', () => {
  it('renders all fields and the submit button', () => {
    render(<VehicleForm onSubmit={jest.fn()} />);

    expect(screen.getByLabelText(LABELS.vehicleType)).toBeTruthy();
    expect(screen.getByLabelText(LABELS.model)).toBeTruthy();
    expect(screen.getByLabelText(LABELS.purchaseDate)).toBeTruthy();
    expect(screen.getByLabelText(LABELS.soatExpiry)).toBeTruthy();
    expect(screen.getByLabelText(LABELS.tecnomecanicaExpiry)).toBeTruthy();
    expect(screen.getByLabelText(LABELS.kitExpiry)).toBeTruthy();
    expect(screen.getByLabelText(LABELS.submit)).toBeTruthy();
  });

  it('shows validation errors and does not call onSubmit when required fields are empty', async () => {
    const onSubmit = jest.fn();
    render(<VehicleForm onSubmit={onSubmit} />);

    fireEvent.press(screen.getByLabelText(LABELS.submit));

    await waitFor(() => {
      expect(screen.getByText('El tipo de vehículo es obligatorio')).toBeTruthy();
    });
    expect(screen.getByText('El modelo es obligatorio')).toBeTruthy();
    // Required date fields surface the "obligatoria" message.
    expect(screen.getAllByText('La fecha es obligatoria').length).toBeGreaterThan(0);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows the future-date error and does not call onSubmit when purchaseDate is in the future', async () => {
    const onSubmit = jest.fn();
    render(<VehicleForm onSubmit={onSubmit} />);

    fillRequiredFields({
      vehicleType: 'Carro',
      model: 'Mazda 3',
      purchaseDate: '2999-01-01',
      soatExpiry: '2999-06-01',
      tecnomecanicaExpiry: '2999-06-01',
    });
    fireEvent.press(screen.getByLabelText(LABELS.submit));

    await waitFor(() => {
      expect(
        screen.getByText('La fecha de compra no puede ser posterior a hoy'),
      ).toBeTruthy();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows the SOAT-before-purchase error and does not call onSubmit', async () => {
    const onSubmit = jest.fn();
    render(<VehicleForm onSubmit={onSubmit} />);

    fillRequiredFields({
      vehicleType: 'Carro',
      model: 'Mazda 3',
      purchaseDate: '2023-06-01',
      soatExpiry: '2022-01-01',
      tecnomecanicaExpiry: '2024-01-01',
    });
    fireEvent.press(screen.getByLabelText(LABELS.submit));

    await waitFor(() => {
      expect(
        screen.getByText(
          'El vencimiento del SOAT no puede ser anterior a la fecha de compra',
        ),
      ).toBeTruthy();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit once without a kitExpiry key when kit is blank', async () => {
    const onSubmit = jest.fn();
    render(<VehicleForm onSubmit={onSubmit} />);

    fillRequiredFields({
      vehicleType: 'Carro',
      model: 'Mazda 3',
      purchaseDate: '2023-06-01',
      soatExpiry: '2024-06-01',
      tecnomecanicaExpiry: '2024-06-01',
    });
    fireEvent.press(screen.getByLabelText(LABELS.submit));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    const payload = onSubmit.mock.calls[0][0];
    expect(payload).toEqual({
      vehicleType: 'Carro',
      model: 'Mazda 3',
      purchaseDate: '2023-06-01',
      soatExpiry: '2024-06-01',
      tecnomecanicaExpiry: '2024-06-01',
    });
    expect(payload).not.toHaveProperty('kitExpiry');
  });

  it('includes kitExpiry in the payload when provided on or after purchase', async () => {
    const onSubmit = jest.fn();
    render(<VehicleForm onSubmit={onSubmit} />);

    fillRequiredFields({
      vehicleType: 'Moto',
      model: 'Yamaha FZ',
      purchaseDate: '2023-06-01',
      soatExpiry: '2024-06-01',
      tecnomecanicaExpiry: '2024-06-01',
      kitExpiry: '2024-06-01',
    });
    fireEvent.press(screen.getByLabelText(LABELS.submit));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    const payload = onSubmit.mock.calls[0][0];
    expect(payload).toEqual({
      vehicleType: 'Moto',
      model: 'Yamaha FZ',
      purchaseDate: '2023-06-01',
      soatExpiry: '2024-06-01',
      tecnomecanicaExpiry: '2024-06-01',
      kitExpiry: '2024-06-01',
    });
  });
});
