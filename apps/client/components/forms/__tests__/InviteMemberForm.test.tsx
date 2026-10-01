/**
 * Unit tests for InviteMemberForm (Requirement 5.2, 5.3).
 *
 * Covers client-side email validation (invalid format → inline error and no
 * submit), the submit payload shape `{ inviteeEmail }` on a valid email, and
 * that a `serverError` prop (e.g. "no account found") renders on the field.
 */
import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { InviteMemberForm } from '../InviteMemberForm';

const LABELS = {
  email: 'Correo electrónico del invitado',
  submit: 'Enviar invitación',
} as const;

describe('InviteMemberForm', () => {
  it('shows an inline error and does not call onSubmit for an invalid email', async () => {
    const onSubmit = jest.fn();
    render(<InviteMemberForm onSubmit={onSubmit} />);

    fireEvent.changeText(screen.getByLabelText(LABELS.email), 'not-an-email');
    fireEvent.press(screen.getByLabelText(LABELS.submit));

    await waitFor(() => {
      expect(
        screen.getByText('Ingresa un correo electrónico válido'),
      ).toBeTruthy();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with { inviteeEmail } for a valid email', async () => {
    const onSubmit = jest.fn();
    render(<InviteMemberForm onSubmit={onSubmit} />);

    fireEvent.changeText(
      screen.getByLabelText(LABELS.email),
      '  user@example.com  ',
    );
    fireEvent.press(screen.getByLabelText(LABELS.submit));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    expect(onSubmit.mock.calls[0][0]).toEqual({
      inviteeEmail: 'user@example.com',
    });
  });

  it('renders the serverError prop on the field', () => {
    render(
      <InviteMemberForm
        onSubmit={jest.fn()}
        serverError="No existe una cuenta con ese correo"
      />,
    );

    expect(
      screen.getByText('No existe una cuenta con ese correo'),
    ).toBeTruthy();
  });
});
