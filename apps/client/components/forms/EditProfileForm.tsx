/**
 * EditProfileForm — lets the authenticated user set or change their display
 * name. The parent owns the mutation and passes `onSubmit` with the trimmed
 * name plus `submitting` for the button state and `initialName` to prefill.
 *
 * Validation mirrors the server (UpdateUserDto): the name is required here
 * (1–100 characters once trimmed). The error surfaces inline on the field.
 */
import React, { useState } from 'react';
import { StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { Button, Input } from '../ui';
import { Colors, Typography } from '../../constants/theme';

export interface EditProfileFormProps {
  onSubmit: (displayName: string) => void;
  submitting?: boolean;
  /** Prefill with the current name (empty string when none is set yet). */
  initialName?: string;
  /** Error from a failed save attempt, shown as a banner above the field. */
  submitError?: string;
}

const MAX_NAME_LENGTH = 100;

export function EditProfileForm({
  onSubmit,
  submitting = false,
  initialName = '',
  submitError,
}: EditProfileFormProps): React.JSX.Element {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | undefined>(undefined);

  const handleSubmit = (): void => {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setError('Ingresa un nombre.');
      return;
    }
    if (trimmed.length > MAX_NAME_LENGTH) {
      setError(`El nombre no puede superar ${MAX_NAME_LENGTH} caracteres.`);
      return;
    }
    setError(undefined);
    onSubmit(trimmed);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        Editar perfil
      </Text>

      {submitError ? (
        <View
          style={styles.errorBanner}
          accessibilityRole="alert"
          accessibilityLabel={submitError}
        >
          <Text style={styles.errorBannerText}>{submitError}</Text>
        </View>
      ) : null}

      <Input
        label="Nombre"
        value={name}
        onChangeText={setName}
        error={error}
        accessibilityLabel="Nombre"
        accessibilityHint="Tu nombre para mostrar en la aplicación"
        autoCapitalize="words"
        maxLength={MAX_NAME_LENGTH}
        placeholder="Tu nombre"
        containerStyle={styles.field}
      />

      <Button
        label="Guardar"
        onPress={handleSubmit}
        loading={submitting}
        disabled={submitting}
        accessibilityLabel="Guardar nombre"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: Colors.background,
  } as ViewStyle,
  title: {
    ...Typography.H2,
    marginBottom: 16,
  } as TextStyle,
  field: {
    marginBottom: 16,
  } as ViewStyle,
  errorBanner: {
    backgroundColor: Colors.accent,
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  } as ViewStyle,
  errorBannerText: {
    ...Typography.Body,
    color: Colors.text,
  } as TextStyle,
});
