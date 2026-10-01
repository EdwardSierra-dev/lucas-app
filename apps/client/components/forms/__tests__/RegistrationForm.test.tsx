/**
 * Unit tests for RegistrationForm (Requirements 1.1–1.10).
 *
 * Covers rendering, client-side validation (email format, password policy,
 * confirmation match), the valid-submit payload shape, server email error
 * surfacing, and value preservation after a failed submit.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { RegistrationForm } from '../RegistrationForm';

describe('RegistrationForm', () => {
  const EMAIL_LABEL = 'Correo electrónico';
  const PASSWORD_LABEL = 'Contraseña';
  const CONFIRM_LABEL = 'Confirmar contraseña';
  const NAME_LABEL = 'Nombre';
  const SUBMIT_LABEL = 'Crear cuenta';

  const STRONG_PASSWORD = 'StrongPass1!';

  it('renders all fields and the submit button', () => {
    const { getByLabelText } = render(
      <RegistrationForm onSubmit={jest.fn()} />,
    );

    expect(getByLabelText(EMAIL_LABEL)).toBeTruthy();
    expect(getByLabelText(PASSWORD_LABEL)).toBeTruthy();
    expect(getByLabelText(CONFIRM_LABEL)).toBeTruthy();
    expect(getByLabelText(NAME_LABEL)).toBeTruthy();
    expect(getByLabelText(SUBMIT_LABEL)).toBeTruthy();
  });

  it('shows validation errors and does not call onSubmit when fields are empty', async () => {
    const onSubmit = jest.fn();
    const { getByLabelText, getByText } = render(
      <RegistrationForm onSubmit={onSubmit} />,
    );

    fireEvent.press(getByLabelText(SUBMIT_LABEL));

    await waitFor(() => {
      expect(getByText('El correo es obligatorio')).toBeTruthy();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows an email error and does not call onSubmit for an invalid email', async () => {
    const onSubmit = jest.fn();
    const { getByLabelText, getByText } = render(
      <RegistrationForm onSubmit={onSubmit} />,
    );

    fireEvent.changeText(getByLabelText(EMAIL_LABEL), 'not-an-email');
    fireEvent.changeText(getByLabelText(PASSWORD_LABEL), STRONG_PASSWORD);
    fireEvent.changeText(getByLabelText(CONFIRM_LABEL), STRONG_PASSWORD);
    fireEvent.press(getByLabelText(SUBMIT_LABEL));

    await waitFor(() => {
      expect(
        getByText('El formato del correo electrónico no es válido'),
      ).toBeTruthy();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows a password error and does not call onSubmit for a weak password', async () => {
    const onSubmit = jest.fn();
    const { getByLabelText, getByText } = render(
      <RegistrationForm onSubmit={onSubmit} />,
    );

    fireEvent.changeText(getByLabelText(EMAIL_LABEL), 'x@y.com');
    fireEvent.changeText(getByLabelText(PASSWORD_LABEL), 'abc');
    fireEvent.changeText(getByLabelText(CONFIRM_LABEL), 'abc');
    fireEvent.press(getByLabelText(SUBMIT_LABEL));

    await waitFor(() => {
      expect(
        getByText('La contraseña debe tener al menos 8 caracteres'),
      ).toBeTruthy();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows the mismatch error and does not call onSubmit when passwords differ', async () => {
    const onSubmit = jest.fn();
    const { getByLabelText, getByText } = render(
      <RegistrationForm onSubmit={onSubmit} />,
    );

    fireEvent.changeText(getByLabelText(EMAIL_LABEL), 'x@y.com');
    fireEvent.changeText(getByLabelText(PASSWORD_LABEL), STRONG_PASSWORD);
    fireEvent.changeText(getByLabelText(CONFIRM_LABEL), 'DifferentPass1!');
    fireEvent.press(getByLabelText(SUBMIT_LABEL));

    await waitFor(() => {
      expect(getByText('Las contraseñas no coinciden')).toBeTruthy();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit once with the validated payload for valid values', async () => {
    const onSubmit = jest.fn();
    const { getByLabelText } = render(
      <RegistrationForm onSubmit={onSubmit} />,
    );

    fireEvent.changeText(getByLabelText(EMAIL_LABEL), 'user@example.com');
    fireEvent.changeText(getByLabelText(PASSWORD_LABEL), STRONG_PASSWORD);
    fireEvent.changeText(getByLabelText(CONFIRM_LABEL), STRONG_PASSWORD);
    fireEvent.changeText(getByLabelText(NAME_LABEL), 'Lucas');
    fireEvent.press(getByLabelText(SUBMIT_LABEL));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    expect(onSubmit).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: STRONG_PASSWORD,
      displayName: 'Lucas',
    });

    const payload = onSubmit.mock.calls[0][0];
    expect(payload).not.toHaveProperty('confirmPassword');
  });

  it('omits displayName from the payload when it is left blank', async () => {
    const onSubmit = jest.fn();
    const { getByLabelText } = render(
      <RegistrationForm onSubmit={onSubmit} />,
    );

    fireEvent.changeText(getByLabelText(EMAIL_LABEL), 'user@example.com');
    fireEvent.changeText(getByLabelText(PASSWORD_LABEL), STRONG_PASSWORD);
    fireEvent.changeText(getByLabelText(CONFIRM_LABEL), STRONG_PASSWORD);
    fireEvent.press(getByLabelText(SUBMIT_LABEL));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    const payload = onSubmit.mock.calls[0][0];
    expect(payload).toEqual({
      email: 'user@example.com',
      password: STRONG_PASSWORD,
    });
    expect(payload).not.toHaveProperty('displayName');
  });

  it('shows the server email error on the email field (Req 1.9)', () => {
    const { getByText } = render(
      <RegistrationForm
        onSubmit={jest.fn()}
        serverEmailError="El correo ya está registrado"
      />,
    );

    expect(getByText('El correo ya está registrado')).toBeTruthy();
  });

  it('preserves entered values after a failed submit (Req 1.10)', async () => {
    const onSubmit = jest.fn();
    const { getByLabelText, getByText } = render(
      <RegistrationForm onSubmit={onSubmit} />,
    );

    const emailInput = getByLabelText(EMAIL_LABEL);
    fireEvent.changeText(emailInput, 'user@example.com');
    // Weak password → submission fails.
    fireEvent.changeText(getByLabelText(PASSWORD_LABEL), 'abc');
    fireEvent.changeText(getByLabelText(CONFIRM_LABEL), 'abc');
    fireEvent.press(getByLabelText(SUBMIT_LABEL));

    await waitFor(() => {
      expect(
        getByText('La contraseña debe tener al menos 8 caracteres'),
      ).toBeTruthy();
    });

    expect(onSubmit).not.toHaveBeenCalled();
    // The email value is retained (component owns its own state).
    expect(getByLabelText(EMAIL_LABEL).props.value).toBe('user@example.com');
  });
});
