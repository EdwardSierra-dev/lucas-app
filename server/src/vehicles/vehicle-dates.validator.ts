/**
 * Cross-field date validation for vehicle records.
 *
 * These rules cannot be expressed by `class-validator`'s per-field decorators
 * (@IsDateString only checks presence/format), so they live in a reusable pure
 * function that the service runs before persisting a vehicle.
 *
 * Rules (Requirement 4.5, 4.6; design Properties P8, P9):
 *  - P8 (Req 4.5): `purchaseDate` must not be later than the current calendar
 *    date ("today"). A purchase date in the future is rejected.
 *  - P9 (Req 4.6): each expiry date (`soatExpiry`, `tecnomecanicaExpiry`, and
 *    `kitExpiry` when present) must not be earlier than `purchaseDate`.
 *
 * Dates are treated as ISO date strings (YYYY-MM-DD) and compared as `Date`
 * values. Comparison is day-granular: both sides are normalised to UTC
 * midnight so that time-of-day in `today` does not affect the result.
 */

export interface VehicleDatesInput {
  purchaseDate: string;
  soatExpiry: string;
  tecnomecanicaExpiry: string;
  kitExpiry?: string | null;
}

export interface VehicleDatesValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Parse an ISO date string into a UTC-midnight timestamp (ms).
 * Returns `NaN` for values that are not valid dates.
 */
function toUtcMidnight(date: string): number {
  const parsed = new Date(date);
  const time = parsed.getTime();
  if (Number.isNaN(time)) {
    return NaN;
  }
  // Normalise to UTC midnight so comparisons are day-granular and unaffected
  // by any time component carried by the parsed value.
  return Date.UTC(
    parsed.getUTCFullYear(),
    parsed.getUTCMonth(),
    parsed.getUTCDate(),
  );
}

/**
 * Validate the cross-field date rules for a vehicle.
 *
 * @param input  the vehicle date fields
 * @param today  the reference "current date"; defaults to `new Date()`.
 *               Injectable for deterministic testing.
 */
export function validateVehicleDates(
  input: VehicleDatesInput,
  today: Date = new Date(),
): VehicleDatesValidationResult {
  const errors: string[] = [];

  const purchase = toUtcMidnight(input.purchaseDate);
  const todayMidnight = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );

  // P8 — purchase date must not be in the future.
  if (!Number.isNaN(purchase) && purchase > todayMidnight) {
    errors.push('purchaseDate must not be in the future');
  }

  // P9 — each expiry must not be earlier than the purchase date.
  const expiries: Array<{ field: string; value: string | null | undefined }> = [
    { field: 'soatExpiry', value: input.soatExpiry },
    { field: 'tecnomecanicaExpiry', value: input.tecnomecanicaExpiry },
    { field: 'kitExpiry', value: input.kitExpiry },
  ];

  for (const { field, value } of expiries) {
    // kitExpiry is optional; an absent value is valid and skipped.
    if (value === undefined || value === null || value === '') {
      continue;
    }
    const expiry = toUtcMidnight(value);
    if (
      !Number.isNaN(purchase) &&
      !Number.isNaN(expiry) &&
      expiry < purchase
    ) {
      errors.push(`${field} must not be earlier than purchaseDate`);
    }
  }

  return { valid: errors.length === 0, errors };
}
