/**
 * VehicleForm — collects the vehicle details and document expiry dates,
 * validates them client-side with the zod vehicle schema, and surfaces inline
 * field-level errors (Requirement 4).
 *
 * Fields (Req 4.2–4.6):
 *   • vehicleType, model — required text
 *   • purchaseDate       — required ISO date, not in the future (Req 4.5)
 *   • soatExpiry         — required ISO date, ≥ purchaseDate (Req 4.6)
 *   • tecnomecanicaExpiry — required ISO date, ≥ purchaseDate (Req 4.6)
 *   • kitExpiry          — optional ISO date; blank is valid (Req 4.4)
 *
 * Dates are entered as plain `YYYY-MM-DD` text (no date-picker dependency).
 * The parent screen owns the network mutation and passes `onSubmit` with the
 * validated payload, plus `submitting` for the button state and optional
 * `initialValues` to prefill (edit flow).
 */
import React, { useState } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Button, Input } from '../ui';
import { Colors } from '../../constants/theme';
import {
  vehicleSchema,
  toVehiclePayload,
  type VehiclePayload,
} from '../../services/vehicleSchema';

export interface VehicleFormProps {
  onSubmit: (payload: VehiclePayload) => void;
  submitting?: boolean;
  /** Prefill values for the edit flow. */
  initialValues?: Partial<VehiclePayload>;
}

interface FieldErrors {
  vehicleType?: string;
  model?: string;
  purchaseDate?: string;
  soatExpiry?: string;
  tecnomecanicaExpiry?: string;
  kitExpiry?: string;
}

const DATE_PLACEHOLDER = 'AAAA-MM-DD';

export function VehicleForm({
  onSubmit,
  submitting = false,
  initialValues,
}: VehicleFormProps): React.JSX.Element {
  const [vehicleType, setVehicleType] = useState(
    initialValues?.vehicleType ?? '',
  );
  const [model, setModel] = useState(initialValues?.model ?? '');
  const [purchaseDate, setPurchaseDate] = useState(
    initialValues?.purchaseDate ?? '',
  );
  const [soatExpiry, setSoatExpiry] = useState(
    initialValues?.soatExpiry ?? '',
  );
  const [tecnomecanicaExpiry, setTecnomecanicaExpiry] = useState(
    initialValues?.tecnomecanicaExpiry ?? '',
  );
  const [kitExpiry, setKitExpiry] = useState(initialValues?.kitExpiry ?? '');
  const [errors, setErrors] = useState<FieldErrors>({});

  const handleSubmit = (): void => {
    const result = vehicleSchema.safeParse({
      vehicleType,
      model,
      purchaseDate,
      soatExpiry,
      tecnomecanicaExpiry,
      kitExpiry,
    });

    if (!result.success) {
      // Collect the first error per field so each input shows its own message
      // (Req 4.3 — identify each missing/invalid field).
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
    onSubmit(toVehiclePayload(result.data));
  };

  return (
    <View style={styles.container}>
      <Input
        label="Tipo de vehículo"
        value={vehicleType}
        onChangeText={setVehicleType}
        error={errors.vehicleType}
        accessibilityLabel="Tipo de vehículo"
        accessibilityHint="Ejemplo: carro, moto, camioneta"
        autoCapitalize="sentences"
        containerStyle={styles.field}
      />

      <Input
        label="Modelo"
        value={model}
        onChangeText={setModel}
        error={errors.model}
        accessibilityLabel="Modelo del vehículo"
        accessibilityHint="Marca y modelo del vehículo"
        autoCapitalize="sentences"
        containerStyle={styles.field}
      />

      <Input
        label="Fecha de compra o matrícula"
        value={purchaseDate}
        onChangeText={setPurchaseDate}
        error={errors.purchaseDate}
        accessibilityLabel="Fecha de compra o matrícula"
        accessibilityHint="Formato año-mes-día, por ejemplo 2023-05-14"
        placeholder={DATE_PLACEHOLDER}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="numbers-and-punctuation"
        containerStyle={styles.field}
      />

      <Input
        label="Vencimiento del SOAT"
        value={soatExpiry}
        onChangeText={setSoatExpiry}
        error={errors.soatExpiry}
        accessibilityLabel="Fecha de vencimiento del SOAT"
        accessibilityHint="Formato año-mes-día, por ejemplo 2025-05-14"
        placeholder={DATE_PLACEHOLDER}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="numbers-and-punctuation"
        containerStyle={styles.field}
      />

      <Input
        label="Vencimiento de la Tecnomecánica"
        value={tecnomecanicaExpiry}
        onChangeText={setTecnomecanicaExpiry}
        error={errors.tecnomecanicaExpiry}
        accessibilityLabel="Fecha de vencimiento de la Tecnomecánica"
        accessibilityHint="Formato año-mes-día, por ejemplo 2025-05-14"
        placeholder={DATE_PLACEHOLDER}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="numbers-and-punctuation"
        containerStyle={styles.field}
      />

      <Input
        label="Fecha kit de carretera (opcional)"
        value={kitExpiry}
        onChangeText={setKitExpiry}
        error={errors.kitExpiry}
        accessibilityLabel="Fecha de renovación del kit de carretera"
        accessibilityHint="Opcional. Formato año-mes-día, por ejemplo 2025-05-14"
        placeholder={DATE_PLACEHOLDER}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="numbers-and-punctuation"
        containerStyle={styles.field}
      />

      <Button
        label="Guardar vehículo"
        onPress={handleSubmit}
        loading={submitting}
        disabled={submitting}
        accessibilityLabel="Guardar vehículo"
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
