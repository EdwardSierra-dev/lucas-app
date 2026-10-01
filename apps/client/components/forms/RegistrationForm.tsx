/**
 * RegistrationForm — collects email, password, confirmation, and optional
 * display name, validates them client-side with the zod registration schema,
 * and surfaces inline field-level errors (Requirement 1).
 *
 * Validation (Req 1.1–1.6):
 *   • email format checked before submission (Req 1.1, 1.2)
 *   • password policy enforced, each unmet criterion reported (Req 1.3, 1.4)
 *   • password confirmation field rendered and matched (Req 1.5, 1.6)
 *
 * The parent screen owns the network mutation and passes:
 *   • `onSubmit` — called with the validated payload
 *   • `serverEmailError` — e.g. "email already registered" (Req 1.9), rendered
 *     inline on the email field
 *   • `submitting` — drives the submit button's loading state
 *
 * Field values are kept in local state and are never cleared by the parent on
 * a failed submission, satisfying the "do not clear entered values" rule
 * (Req 1.10).
 */
import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Button, Input } from '../ui';
import { Colors } from '../../constants/theme';
import {
  registrationSchema,
  type RegisterPayload,
} from '../../services/registrationSchema';

export interface RegistrationFormProps {
  onSubmit: (payload: RegisterPayload) => void;
  submitting?: boolean;
  /** Server-side email error (e.g. already registered — Req 1.9). */
  serverEmailError?: string;
}

interface FieldErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  displayName?: string;
}

export function RegistrationForm({
  onSubmit,
  submitting = false,
  serverEmailError,
}: RegistrationFormProps): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});

  // The server email error takes precedence over any stale client error so a
  // 409 conflict (Req 1.9) is always visible on the email field.
  const emailError = useMemo(
    () => serverEmailError ?? errors.email,
    [serverEmailError, errors.email],
  );

  const handleSubmit = (): void => {
    const result = registrationSchema.safeParse({
      email,
      password,
      confirmPassword,
      displayName,
    });

    if (!result.success) {
      // Collect the first error per field so each input shows its own message.
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

    const { email: validEmail, password: validPassword, displayName: name } =
      result.data;

    const payload: RegisterPayload = {
      email: validEmail,
      password: validPassword,
    };
    const trimmedName = name?.trim();
    if (trimmedName) {
      payload.displayName = trimmedName;
    }

    onSubmit(payload);
  };

  return (
    <View style={styles.container}>
      <Input
        label="Correo electrónico"
        value={email}
        onChangeText={setEmail}
        error={emailError}
        accessibilityLabel="Correo electrónico"
        accessibilityHint="Ingresa tu dirección de correo electrónico"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        containerStyle={styles.field}
      />

      <Input
        label="Contraseña"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        accessibilityLabel="Contraseña"
        accessibilityHint="Mínimo 8 caracteres, con mayúscula, número y carácter especial"
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        textContentType="newPassword"
        containerStyle={styles.field}
      />

      <Input
        label="Confirmar contraseña"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        error={errors.confirmPassword}
        accessibilityLabel="Confirmar contraseña"
        accessibilityHint="Vuelve a escribir la contraseña"
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        textContentType="newPassword"
        containerStyle={styles.field}
      />

      <Input
        label="Nombre (opcional)"
        value={displayName}
        onChangeText={setDisplayName}
        error={errors.displayName}
        accessibilityLabel="Nombre"
        accessibilityHint="Nombre para mostrar, opcional"
        autoCapitalize="words"
        containerStyle={styles.field}
      />

      <Button
        label="Crear cuenta"
        onPress={handleSubmit}
        loading={submitting}
        disabled={submitting}
        accessibilityLabel="Crear cuenta"
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
