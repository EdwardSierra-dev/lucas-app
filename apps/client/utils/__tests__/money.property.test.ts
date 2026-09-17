/**
 * Property-based tests for formatMoney utility.
 *
 * Feature: lucas-app-v1, Property 21: Monetary formatting always produces two decimal places
 *
 * Validates: Requirements 8.3
 */

import * as fc from 'fast-check';
import { formatMoney } from '../money';

// In the es-CO locale, the decimal separator is a comma (',').
// A valid formatted string must have exactly 2 digits after the last comma.
const TWO_DECIMALS_AFTER_COMMA = /,\d{2}$/;

// The COP currency symbol used by Intl.NumberFormat('es-CO') is '$' (or 'COP' as a fallback).
// We accept either form since runtime ICU data may vary.
const CURRENCY_SYMBOL_RE = /\$|COP/;

describe('P21: Monetary formatting always produces two decimal places', () => {
  it('always produces exactly 2 decimal digits after the decimal separator for any finite float', () => {
    // Validates: Requirements 8.3
    fc.assert(
      fc.property(
        fc.float({ noNaN: true, noDefaultInfinity: true }),
        (amount) => {
          const result = formatMoney(amount);
          expect(TWO_DECIMALS_AFTER_COMMA.test(result)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('always includes a currency symbol in the formatted output', () => {
    // Validates: Requirements 8.3
    fc.assert(
      fc.property(
        fc.float({ noNaN: true, noDefaultInfinity: true }),
        (amount) => {
          const result = formatMoney(amount);
          expect(CURRENCY_SYMBOL_RE.test(result)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('produces the same output whether currency is omitted or explicitly set to COP', () => {
    // Validates: Requirements 8.3 — default currency consistency
    fc.assert(
      fc.property(
        fc.float({ noNaN: true, noDefaultInfinity: true }),
        (amount) => {
          expect(formatMoney(amount)).toBe(formatMoney(amount, 'COP'));
        },
      ),
      { numRuns: 100 },
    );
  });
});
