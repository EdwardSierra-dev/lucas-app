/**
 * Property-based tests for the vehicle document expiry reminder window.
 *
 * Feature: lucas-app-v1, Property 10 — Vehicle document expiry notification
 * window (0–30 days). A reminder fires iff the expiry date is within the next
 * 30 days (today..today+30 inclusive) and is not already in the past.
 *
 * Validates: Requirements 4.8, 4.9, 4.10
 */

import * as fc from 'fast-check';
import { withinExpiryWindow } from '../notification-scheduler.service';

// Fixed reference "today" (UTC midnight) so every property is deterministic and
// matches the helper's day-granular UTC comparison. 2024-06-15 is mid-month,
// avoiding any month/year boundary surprises in these ranges.
const TODAY = new Date(Date.UTC(2024, 5, 15)); // 2024-06-15T00:00:00Z

const MS_PER_DAY = 86_400_000;

/**
 * Build a YYYY-MM-DD string offset from TODAY by `days`, using UTC date math so
 * the generated string lines up exactly with the helper's UTC-day comparison.
 */
function expiryDateOffsetDays(days: number): string {
  const d = new Date(TODAY.getTime() + days * MS_PER_DAY);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

describe('P10: Vehicle document expiry notification window (0–30 days)', () => {
  // -------------------------------------------------------------------------
  // P10a — in-window (0..30 days ahead) ⇒ true
  // -------------------------------------------------------------------------
  it('P10a: an expiry 0..30 days ahead is inside the window (true)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 30 }), (d) => {
        const expiry = expiryDateOffsetDays(d);
        expect(withinExpiryWindow(expiry, TODAY)).toBe(true);
      }),
    );
  });

  // -------------------------------------------------------------------------
  // P10b — already past (before today) ⇒ false
  // -------------------------------------------------------------------------
  it('P10b: an expiry before today is outside the window (false)', () => {
    fc.assert(
      fc.property(fc.integer({ min: -365, max: -1 }), (d) => {
        const expiry = expiryDateOffsetDays(d);
        expect(withinExpiryWindow(expiry, TODAY)).toBe(false);
      }),
    );
  });

  // -------------------------------------------------------------------------
  // P10c — beyond the window (31..365 days ahead) ⇒ false
  // -------------------------------------------------------------------------
  it('P10c: an expiry more than 30 days ahead is outside the window (false)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 31, max: 365 }), (d) => {
        const expiry = expiryDateOffsetDays(d);
        expect(withinExpiryWindow(expiry, TODAY)).toBe(false);
      }),
    );
  });

  // -------------------------------------------------------------------------
  // P10d — missing / invalid dates ⇒ false
  // -------------------------------------------------------------------------
  it('P10d: null, undefined, and invalid date strings are outside the window (false)', () => {
    expect(withinExpiryWindow(null, TODAY)).toBe(false);
    expect(withinExpiryWindow(undefined, TODAY)).toBe(false);

    fc.assert(
      fc.property(
        fc.string().filter((s) => Number.isNaN(new Date(s).getTime())),
        (invalid) => {
          expect(withinExpiryWindow(invalid, TODAY)).toBe(false);
        },
      ),
    );
    // A clearly non-date string is always rejected.
    expect(withinExpiryWindow('not-a-date', TODAY)).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Boundary examples — the exact window edges.
  // -------------------------------------------------------------------------
  describe('window boundary examples', () => {
    it('d = 0 (expires today) is inside the window', () => {
      expect(withinExpiryWindow(expiryDateOffsetDays(0), TODAY)).toBe(true);
    });

    it('d = 30 (last day of the window) is inside the window', () => {
      expect(withinExpiryWindow(expiryDateOffsetDays(30), TODAY)).toBe(true);
    });

    it('d = 31 (one day past the window) is outside the window', () => {
      expect(withinExpiryWindow(expiryDateOffsetDays(31), TODAY)).toBe(false);
    });

    it('d = -1 (expired yesterday) is outside the window', () => {
      expect(withinExpiryWindow(expiryDateOffsetDays(-1), TODAY)).toBe(false);
    });
  });
});
