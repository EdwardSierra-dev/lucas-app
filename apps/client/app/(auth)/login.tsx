/**
 * Login screen (Expo Router route: /(auth)/login).
 *
 * Hosts the sign-in form and the useLogin mutation (Requirement 1 — login flow,
 * Req 1.1–1.10):
 *   • Validates email + password with loginSchema on submit, surfacing inline
 *     per-field errors through the Input `error` prop.
 *   • On success, stores tokens via authStore (handled inside useLogin) and
 *     navigates to the app home.
 *   • A 401 surfaces an inline "Correo o contraseña incorrectos" banner without
 *     clearing the email field.
 *   • Any other failure shows a generic retry banner (values are preserved).
 *   • Offers a link to the registration screen.
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
import { Button, Input } from '../../components/ui';
import { Colors, Typography } from '../../constants/theme';
import { useLogin } from '../../services/authApi';
import { loginSchema } from '../../services/loginSchema';
import type { LoginPayload } from '../../services/loginSchema';

export default function LoginScreen(): React.JSX.Element {
  const router = useRouter();
  const login = useLogin();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [passwordError, setPasswordError] = useState<string | undefined>(
    undefined,
  );
  const [generalError, setGeneralError] = useState<string | undefined>(
    undefined,
  );

  const handleSubmit = (): void => {
    // Clear prior error state before each attempt.
    setEmailError(undefined);
    setPasswordError(undefined);
    setGeneralError(undefined);

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setEmailError(fieldErrors.email?.[0]);
      setPasswordError(fieldErrors.password?.[0]);
      return;
    }

    const payload: LoginPayload = {
      email: result.data.email,
      password: result.data.password,
    };

    login.mutate(payload, {
      onSuccess: () => {
        router.replace('/(tabs)/dashboard');
      },
      onError: (error) => {
        if (error.response?.status === 401) {
          // Invalid credentials — shown as a banner, email field preserved.
          setGeneralError('Correo o contraseña incorrectos');
          return;
        }
        // Any other failure — prompt to retry, values are preserved.
        setGeneralError(
          'No se pudo iniciar sesión. Por favor, inténtalo de nuevo.',
        );
      },
    });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title} accessibilityRole="header">
        Iniciar sesión
      </Text>
      <Text style={styles.subtitle}>
        Bienvenido de nuevo. Accede para gestionar tus finanzas.
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

      <View style={styles.field}>
        <Input
          label="Correo electrónico"
          value={email}
          onChangeText={setEmail}
          error={emailError}
          accessibilityLabel="Correo electrónico"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          placeholder="tu@correo.com"
        />
      </View>

      <View style={styles.field}>
        <Input
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          error={passwordError}
          accessibilityLabel="Contraseña"
          autoCapitalize="none"
          autoComplete="password"
          textContentType="password"
          secureTextEntry
          placeholder="Tu contraseña"
        />
      </View>

      <Button
        label="Iniciar sesión"
        onPress={handleSubmit}
        loading={login.isPending}
        accessibilityLabel="Iniciar sesión"
        style={styles.submitButton}
      />

      <View style={styles.registerRow}>
        <Text style={styles.registerPrompt}>¿No tienes una cuenta?</Text>
        <Button
          label="Crear cuenta"
          variant="secondary"
          onPress={() => router.push('/(auth)/register')}
          accessibilityLabel="Ir a crear cuenta"
          style={styles.registerButton}
        />
      </View>
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
  field: {
    marginBottom: 16,
  } as ViewStyle,
  submitButton: {
    alignSelf: 'stretch',
    marginTop: 8,
  } as ViewStyle,
  registerRow: {
    marginTop: 24,
    alignItems: 'center',
  } as ViewStyle,
  registerPrompt: {
    ...Typography.Body,
    marginBottom: 8,
  } as TextStyle,
  registerButton: {
    alignSelf: 'stretch',
  } as ViewStyle,
});
