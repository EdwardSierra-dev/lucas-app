/**
 * Client-side vehicle validation schema (Requirement 4).
 *
 * Mirrors the server rules enforced by the NestJS VehiclesModule so the client
 * rejects bad input before it reaches the API:
 *   • vehicleType, model: required non-empty strings (Req 4.2, 4.3)
 *   • purchaseDate: required ISO date (YYYY-MM-DD) that is not in the future
 *     (Req 4.5, Property P8)
 *   • soatExpiry, tecnomecanicaExpiry: required ISO dates that are not earlier
 *     than the purchase date (Req 4.6, Property P9)
 *   • kitExpiry: optional ISO date (road emergency kit renewal); an empty value
 *     is valid and does not block submission, but when present it must be on or
 *     after the purchase date (Req 4.4)
 *
 * Dates are plain `YYYY-MM-DD` strings. Because that format is lexicographically
 * ordered, string comparison is equivalent to chronological comparison, which
 * is what the cross-field checks rely on.
 */
import { z } from 'zod';

/** Matches a calendar date in strict ISO `YYYY-MM-DD` form. */
export const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Returns today's date as a `YYYY-MM-DD` string in the local timezone.
 * Used as the upper bound for the purchase date (Req 4.5).
 */
export function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** True when `value` is a syntactically valid, real calendar date in ISO form. */
function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_REGEX.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }
  // Reject values the Date constructor silently rolls over (e.g. 2024-02-31).
  const [year, month, day] = value.split('-').map(Number);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() + 1 === month &&
    parsed.getDate() === day
  );
}

const isoDateSchema = z
  .string()
  .trim()
  .min(1, 'La fecha es obligatoria')
  .refine(isValidIsoDate, 'La fecha debe tener el formato AAAA-MM-DD');

export const vehicleSchema = z
  .object({
    vehicleType: z
      .string()
      .trim()
      .min(1, 'El tipo de vehículo es obligatorio')
      .max(50, 'El tipo de vehículo no debe superar los 50 caracteres'),
    model: z
      .string()
      .trim()
      .min(1, 'El modelo es obligatorio')
      .max(100, 'El modelo no debe superar los 100 caracteres'),
    purchaseDate: isoDateSchema.refine(
      (value) => value <= todayIsoDate(),
      // Req 4.5 / Property P8 — purchase date cannot be in the future.
      'La fecha de compra no puede ser posterior a hoy',
    ),
    soatExpiry: isoDateSchema,
    tecnomecanicaExpiry: isoDateSchema,
    kitExpiry: z
      .string()
      .trim()
      .optional()
      .or(z.literal(''))
      // When present, the kit date must still be a valid ISO date (Req 4.4).
      .refine(
        (value) => !value || isValidIsoDate(value),
        'La fecha debe tener el formato AAAA-MM-DD',
      ),
  })
  // Req 4.6 / Property P9 — SOAT expiry must not precede the purchase date.
  .refine((data) => data.soatExpiry >= data.purchaseDate, {
    message: 'El vencimiento del SOAT no puede ser anterior a la fecha de compra',
    path: ['soatExpiry'],
  })
  // Req 4.6 / Property P9 — Tecnomecánica expiry must not precede the purchase date.
  .refine((data) => data.tecnomecanicaExpiry >= data.purchaseDate, {
    message:
      'El vencimiento de la Tecnomecánica no puede ser anterior a la fecha de compra',
    path: ['tecnomecanicaExpiry'],
  })
  // Req 4.4 — when the optional kit date is set it must be on/after purchase.
  .refine((data) => !data.kitExpiry || data.kitExpiry >= data.purchaseDate, {
    message:
      'La fecha del kit de carretera no puede ser anterior a la fecha de compra',
    path: ['kitExpiry'],
  });

export type VehicleFormValues = z.infer<typeof vehicleSchema>;

/** Shape sent to the Vehicle_Module API. `kitExpiry` omitted when blank. */
export interface VehiclePayload {
  vehicleType: string;
  model: string;
  purchaseDate: string;
  soatExpiry: string;
  tecnomecanicaExpiry: string;
  kitExpiry?: string;
}

/**
 * Normalizes validated form values into the API payload, dropping an empty
 * optional kit date so it is sent as absent rather than an empty string.
 */
export function toVehiclePayload(values: VehicleFormValues): VehiclePayload {
  const payload: VehiclePayload = {
    vehicleType: values.vehicleType.trim(),
    model: values.model.trim(),
    purchaseDate: values.purchaseDate,
    soatExpiry: values.soatExpiry,
    tecnomecanicaExpiry: values.tecnomecanicaExpiry,
  };
  const kit = values.kitExpiry?.trim();
  if (kit) {
    payload.kitExpiry = kit;
  }
  return payload;
}
