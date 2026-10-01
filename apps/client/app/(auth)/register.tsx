/**
 * Registration screen (Expo Router route: /(auth)/register).
 *
 * Hosts the RegistrationForm and the useRegister mutation (Requirement 1):
 *   • Req 1.7/1.8 — on success, shows a modal confirming registration and that
 *     a confirmation email was sent.
 *   • Req 1.9 — a 409 Conflict surfaces an inline "email already registered"
 *     error on the email field.
 *   • Req 1.10 — any other failure shows a retry banner without clearing the
 *     form (the form keeps its own state, so values are preserved).
 */
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Button, Modal } from '../../components/ui';
import { RegistrationForm } from '../../components/forms/RegistrationForm';
import { Colors, Typography } from '../../constants/theme';
import { useRegister } from '../../services/authApi';
import type { RegisterPayload } from '../../services/registrationSchema';

export default function RegisterScreen(): React.JSX.Element {
  const router = useRouter();
  const register = useRegister();

  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [generalError, setGeneralError] = useState<string | undefined>(
    undefined,
  );
  const [successVisible, setSuccessVisible] = useState(false);

  const handleSubmit = (payload: RegisterPayload): void => {
    // Clear prior error state before each attempt.
    setEmailError(undefined);
    setGeneralError(undefined);

    register.mutate(payload, {
      onSuccess: () => {
        setSuccessVisible(true);
      },
      onError: (error) => {
        if (error.response?.status === 409) {
          // Req 1.9 — email already registered, shown inline on the field.
          setEmailError('Este correo electrónico ya está registrado');
          return;
        }
        // Req 1.10 — generic failure; prompt to retry, values are preserved.
        setGeneralError(
          'No se pudo completar el registro. Por favor, inténtalo de nuevo.',
        );
      },
    });
  };

  const handleSuccessDismiss = (): void => {
    setSuccessVisible(false);
    router.replace('/(auth)/login');
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title} accessibilityRole="header">
        Crear cuenta
      </Text>
      <Text style={styles.subtitle}>
        Regístrate para empezar a controlar tus finanzas.
      </Text>

      {generalError ? (
        <View
          style={styles.errorBanner}
          accessibilityRole="alert"
          accessibilityLabel={generalError}
        >
          <Text style={styles.errorBannerText}>{generalError}</Text>
        </View>
      ) : null}

      <RegistrationForm
        onSubmit={handleSubmit}
        submitting={register.isPending}
        serverEmailError={emailError}
      />

      <View style={styles.loginRow}>
        <Text style={styles.loginPrompt}>¿Ya tienes una cuenta?</Text>
        <Button
          label="Iniciar sesión"
          variant="secondary"
          onPress={() => router.replace('/(auth)/login')}
          accessibilityLabel="Ir a iniciar sesión"
          style={styles.loginButton}
        />
      </View>

      {/* Req 1.7 / 1.8 — success + confirmation email modal */}
      <Modal visible={successVisible} onClose={handleSuccessDismiss}>
        <Text style={styles.modalTitle} accessibilityRole="header">
          ¡Registro exitoso!
        </Text>
        <Text style={styles.modalBody}>
          Te enviamos un correo de confirmación. Revisa tu bandeja de entrada
          para activar tu cuenta.
        </Text>
        <Button
          label="Entendido"
          onPress={handleSuccessDismiss}
          accessibilityLabel="Cerrar y continuar"
          style={styles.modalButton}
        />
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  } as ViewStyle,
  content: {
    padding: 24,
    paddingTop: 64,
  } as ViewStyle,
  title: {
    ...Typography.H1,
    marginBottom: 8,
  } as TextStyle,
  subtitle: {
    ...Typography.Body,
    marginBottom: 24,
  } as TextStyle,
  errorBanner: {
    backgroundColor: Colors.accent,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  } as ViewStyle,
  errorBannerText: {
    ...Typography.Body,
    color: Colors.background,
  } as TextStyle,
  loginRow: {
    marginTop: 24,
    alignItems: 'center',
  } as ViewStyle,
  loginPrompt: {
    ...Typography.Body,
    marginBottom: 8,
  } as TextStyle,
  loginButton: {
    alignSelf: 'stretch',
  } as ViewStyle,
  modalTitle: {
    ...Typography.H2,
    marginBottom: 12,
  } as TextStyle,
  modalBody: {
    ...Typography.Body,
    marginBottom: 20,
  } as TextStyle,
  modalButton: {
    alignSelf: 'stretch',
  } as ViewStyle,
});
