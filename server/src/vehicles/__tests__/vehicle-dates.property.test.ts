import fc from 'fast-check';
import { validateVehicleDates } from '../vehicle-dates.validator';

// ---------------------------------------------------------------------------
// Property-based tests for the vehicle cross-field date rules.
//
// A fixed "today" is injected into validateVehicleDates for determinism, so
// the generated dates can be bounded relative to a stable reference point.
//
// Properties under test (see design.md):
//   P8 — Vehicle purchase date cannot be in the future.      (Requirement 4.5)
//   P9 — Vehicle expiry date must not be earlier than         (Requirement 4.6)
//        the purchase date.
// ---------------------------------------------------------------------------

/** Fixed reference date used as "today" across all cases. */
const TODAY = new Date(Date.UTC(2024, 5, 15)); // 2024-06-15

/** Format a Date as a YYYY-MM-DD ISO date string (UTC). */
function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** A purchase date safely in the past (used when P8 should not fire). */
const SAFE_PURCHASE = '2020-01-01';

/**
 * Generator for day-aligned dates (UTC midnight) within a bounded range.
 *
 * The validator compares dates at day granularity, so generators must produce
 * day-aligned values; otherwise two instants on the same calendar day (which
 * the validator treats as equal) could differ by milliseconds and break the
 * test's own ordering assumptions.
 */
const DAY_MS = 24 * 60 * 60 * 1000;
function dayDate(minDays: number, maxDays: number): fc.Arbitrary<Date> {
  return fc
    .integer({ min: minDays, max: maxDays })
    .map((days) => new Date(days * DAY_MS));
}

describe('validateVehicleDates — property tests (Requirements 4.5, 4.6)', () => {
  // -------------------------------------------------------------------------
  // Property 8: purchase date cannot be in the future.
  // Validates: Requirements 4.5
  // -------------------------------------------------------------------------
  describe('P8: purchase date must not be in the future', () => {
    it('rejects any purchaseDate strictly after today', () => {
      fc.assert(
        fc.property(
          // Strictly after TODAY (one day past, up to several years ahead).
          fc.date({
            min: new Date(Date.UTC(2024, 5, 16)),
            max: new Date(Date.UTC(2030, 11, 31)),
          }),
          (futureDate) => {
            const purchaseDate = toIsoDate(futureDate);
            const result = validateVehicleDates(
              {
                purchaseDate,
                // Expiries on/after the (future) purchase date so only P8 fires.
                soatExpiry: purchaseDate,
                tecnomecanicaExpiry: purchaseDate,
              },
              TODAY,
            );

            expect(result.valid).toBe(false);
            expect(result.errors).toContain(
              'purchaseDate must not be in the future',
            );
          },
        ),
      );
    });

    it('accepts any purchaseDate on or before today when expiries are valid', () => {
      fc.assert(
        fc.property(
          // On or before TODAY.
          fc.date({
            min: new Date(Date.UTC(2015, 0, 1)),
            max: TODAY,
          }),
          (pastDate) => {
            const purchaseDate = toIsoDate(pastDate);
            const result = validateVehicleDates(
              {
                purchaseDate,
                // Expiries not earlier than purchase date (10 years ahead).
                soatExpiry: toIsoDate(
                  new Date(pastDate.getTime() + 10 * 365 * 24 * 60 * 60 * 1000),
                ),
                tecnomecanicaExpiry: toIsoDate(
                  new Date(pastDate.getTime() + 10 * 365 * 24 * 60 * 60 * 1000),
                ),
              },
              TODAY,
            );

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
          },
        ),
      );
    });
  });

  // -------------------------------------------------------------------------
  // Property 9: expiry dates must not be earlier than the purchase date.
  // Validates: Requirements 4.6
  // -------------------------------------------------------------------------
  describe('P9: expiry dates must not be earlier than purchaseDate', () => {
    it('rejects a SOAT expiry earlier than purchaseDate', () => {
      fc.assert(
        fc.property(
          // A pair of day-aligned dates; the test orders them so expiry < purchase.
          fc.tuple(dayDate(16436, 19723), dayDate(16436, 19723)),
          ([a, b]) => {
            // purchase is the later of the two; expiry is strictly earlier.
            const purchase = a.getTime() >= b.getTime() ? a : b;
            const expiry = a.getTime() >= b.getTime() ? b : a;
            fc.pre(expiry.getTime() < purchase.getTime());

            const purchaseDate = toIsoDate(purchase);
            const result = validateVehicleDates(
              {
                purchaseDate,
                soatExpiry: toIsoDate(expiry),
                // Keep tecnomecanica valid so only the SOAT rule fires here.
                tecnomecanicaExpiry: purchaseDate,
              },
              TODAY,
            );

            expect(result.valid).toBe(false);
            expect(result.errors).toContain(
              'soatExpiry must not be earlier than purchaseDate',
            );
          },
        ),
      );
    });

    it('rejects a tecnomecanica expiry earlier than purchaseDate', () => {
      fc.assert(
        fc.property(
          fc.tuple(dayDate(16436, 19723), dayDate(16436, 19723)),
          ([a, b]) => {
            const purchase = a.getTime() >= b.getTime() ? a : b;
            const expiry = a.getTime() >= b.getTime() ? b : a;
            fc.pre(expiry.getTime() < purchase.getTime());

            const purchaseDate = toIsoDate(purchase);
            const result = validateVehicleDates(
              {
                purchaseDate,
                soatExpiry: purchaseDate,
                tecnomecanicaExpiry: toIsoDate(expiry),
              },
              TODAY,
            );

            expect(result.valid).toBe(false);
            expect(result.errors).toContain(
              'tecnomecanicaExpiry must not be earlier than purchaseDate',
            );
          },
        ),
      );
    });

    it('rejects a kit expiry earlier than purchaseDate when present', () => {
      fc.assert(
        fc.property(
          fc.tuple(dayDate(16436, 19723), dayDate(16436, 19723)),
          ([a, b]) => {
            const purchase = a.getTime() >= b.getTime() ? a : b;
            const expiry = a.getTime() >= b.getTime() ? b : a;
            fc.pre(expiry.getTime() < purchase.getTime());

            const purchaseDate = toIsoDate(purchase);
            const result = validateVehicleDates(
              {
                purchaseDate,
                soatExpiry: purchaseDate,
                tecnomecanicaExpiry: purchaseDate,
                kitExpiry: toIsoDate(expiry),
              },
              TODAY,
            );

            expect(result.valid).toBe(false);
            expect(result.errors).toContain(
              'kitExpiry must not be earlier than purchaseDate',
            );
          },
        ),
      );
    });

    it('accepts expiries on or after purchaseDate (purchase date not in future)', () => {
      fc.assert(
        fc.property(
          // Non-negative day offsets added to a fixed, safely-past purchase.
          fc.nat({ max: 3650 }),
          fc.nat({ max: 3650 }),
          fc.option(fc.nat({ max: 3650 }), { nil: undefined }),
          (soatOffset, tecnoOffset, kitOffset) => {
            const purchase = new Date(`${SAFE_PURCHASE}T00:00:00.000Z`);
            const dayMs = 24 * 60 * 60 * 1000;

            const result = validateVehicleDates(
              {
                purchaseDate: SAFE_PURCHASE,
                soatExpiry: toIsoDate(
                  new Date(purchase.getTime() + soatOffset * dayMs),
                ),
                tecnomecanicaExpiry: toIsoDate(
                  new Date(purchase.getTime() + tecnoOffset * dayMs),
                ),
                kitExpiry:
                  kitOffset === undefined
                    ? null
                    : toIsoDate(
                        new Date(purchase.getTime() + kitOffset * dayMs),
                      ),
              },
              TODAY,
            );

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
          },
        ),
      );
    });
  });
});
