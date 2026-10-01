/**
 * InviteMemberForm — invite another user to a shared budget by email
 * (Requirement 5.2, 5.3).
 *
 * Collects the invitee's registered email address and validates its format
 * client-side before submitting. The parent screen owns the invite mutation
 * and passes `onSubmit`, `submitting`, and an optional `serverError` (e.g. the
 * "no account found for this email" message from a rejected invite, Req 5.3).
 * The email input is never cleared on error so the user can correct it.
 */
import React, { useState } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Button, Input } from '../ui';
import { Colors } from '../../constants/theme';
import type { InviteMemberPayload } from '../../services/sharedBudgetApi';

export interface InviteMemberFormProps {
  onSubmit: (payload: InviteMemberPayload) => void;
  submitting?: boolean;
  /** Server-side error (e.g. unknown email) shown inline on the field. */
  serverError?: string;
}

// Mirrors the email shape described in Req 1.1 / Req 5.2.
const EMAIL_REGEX = /^[A-Za-z0-9._-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/;

export function InviteMemberForm({
  onSubmit,
  submitting = false,
  serverError,
}: InviteMemberFormProps): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [localError, setLocalError] = useState<string | undefined>(undefined);

  const handleSubmit = (): void => {
    const trimmed = email.trim();
    if (!EMAIL_REGEX.test(trimmed)) {
      setLocalError('Ingresa un correo electrónico válido');
      return;
    }
    setLocalError(undefined);
    onSubmit({ inviteeEmail: trimmed });
  };

  return (
    <View style={styles.container}>
      <Input
        label="Correo del invitado"
        value={email}
        onChangeText={setEmail}
        error={localError ?? serverError}
        accessibilityLabel="Correo electrónico del invitado"
        accessibilityHint="Debe corresponder a una cuenta registrada"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        containerStyle={styles.field}
      />

      <Button
        label="Enviar invitación"
        onPress={handleSubmit}
        loading={submitting}
        disabled={submitting}
        accessibilityLabel="Enviar invitación"
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
  field: {
    marginBottom: 16,
  } as ViewStyle,
  submit: {
    marginTop: 8,
  } as ViewStyle,
});
