/**
 * Vehicle registration onboarding screen
 * (Expo Router route: /(onboarding)/vehicle-registration).
 *
 * Shown only when the Vehicle_Module is active (Req 4.1), after the user has
 * configured mandatory and non-mandatory expenses. It hosts the VehicleForm
 * and the useCreateVehicle mutation:
 *   • Req 4.1 — presents the "Páseme los datos del maquinón" title.
 *   • Req 4.4 — the optional kit date is handled by the form/schema.
 *   • Req 4.7 — on success, saves the record and advances to the dashboard.
 *   • The vehicle step is optional, so an "Omitir" action lets the user skip
 *     straight to the dashboard without registering a vehicle.
 *   • A 409 Conflict (vehicle already registered) surfaces an inline banner.
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
import { Button } from '../../components/ui';
import { VehicleForm } from '../../components/forms/VehicleForm';
import { Colors, Typography } from '../../constants/theme';
import { useCreateVehicle } from '../../services/vehicleApi';
import type { VehiclePayload } from '../../services/vehicleSchema';

/** Where the flow continues after this (optional) onboarding step. */
const NEXT_ROUTE = '/(tabs)/dashboard' as const;

export default function VehicleRegistrationScreen(): React.JSX.Element {
  const router = useRouter();
  const createVehicle = useCreateVehicle();

  const [generalError, setGeneralError] = useState<string | undefined>(
    undefined,
  );

  const goNext = (): void => {
    router.replace(NEXT_ROUTE);
  };

  const handleSubmit = (payload: VehiclePayload): void => {
    setGeneralError(undefined);

    createVehicle.mutate(payload, {
      // Req 4.7 — on success the record is saved; advance past the step.
      onSuccess: () => {
        goNext();
      },
      onError: (error) => {
        if (error.response?.status === 409) {
          setGeneralError(
            'Ya tienes un vehículo registrado en tu cuenta.',
          );
          return;
        }
        setGeneralError(
          'No se pudo guardar el vehículo. Por favor, inténtalo de nuevo.',
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
      {/* Req 4.1 — vehicle registration title. */}
      <Text style={styles.title} accessibilityRole="header">
        Páseme los datos del maquinón
      </Text>
      <Text style={styles.subtitle}>
        Registra tu vehículo para hacerle seguimiento a gastos y fechas de
        vencimiento. Este paso es opcional.
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

      <VehicleForm
        onSubmit={handleSubmit}
        submitting={createVehicle.isPending}
      />

      {/* Optional step — allow skipping straight to the dashboard. */}
      <Button
        label="Omitir por ahora"
        variant="secondary"
        onPress={goNext}
        disabled={createVehicle.isPending}
        accessibilityLabel="Omitir el registro del vehículo"
        style={styles.skip}
      />
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
  skip: {
    marginTop: 16,
    alignSelf: 'stretch',
  } as ViewStyle,
});
