import * as fc from 'fast-check';
import { validatePassword } from '../password.validator';

// ---------------------------------------------------------------------------
// Shared character sets — kept in sync with the validator's criteria.
// ---------------------------------------------------------------------------
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const DIGITS = '0123456789'.split('');
// Exact special-character set accepted by password.validator.ts (includes '|').
const SPECIAL = `!@#$%^&*()_+-=[]{}|;':",.<>?/`.split('');
// A "filler" alphabet that contributes none of the required criteria on its
// own (lowercase letters only) so we can pad to a desired length safely.
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz'.split('');

describe('Password validator — property tests (Requirements 1.3, 1.4)', () => {
  // -------------------------------------------------------------------------
  // Property 2: Password meeting ALL criteria is accepted.
  //
  // We construct passwords guaranteed to satisfy every criterion:
  //   - at least one uppercase, one digit, one special char
  //   - total length between 8 and 128 inclusive
  // and assert the validator accepts all of them.
  // -------------------------------------------------------------------------
  describe('P2: a password meeting all criteria is accepted', () => {
    it('accepts every generated all-criteria-satisfying password', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...UPPERCASE),
          fc.constantFrom(...DIGITS),
          fc.constantFrom(...SPECIAL),
          // Filler: 5..125 lowercase chars so total length (3 required + filler)
          // stays within [8, 128].
          fc.array(fc.constantFrom(...LOWERCASE), { minLength: 5, maxLength: 125 }),
          // Shuffle index controls where the 3 required chars are inserted.
          fc.array(fc.nat(), { minLength: 3, maxLength: 3 }),
          (upper, digit, special, filler, positions) => {
            const chars = [...filler];
            // Insert the required chars at pseudo-random positions so they are
            // not always adjacent / at the start.
            const required = [upper, digit, special];
            required.forEach((ch, i) => {
              const pos = positions[i] ?? 0;
              const idx = pos % (chars.length + 1);
              chars.splice(idx, 0, ch);
            });
            const password = chars.join('');

            // Guard the invariant our generator is supposed to uphold.
            expect(password.length).toBeGreaterThanOrEqual(8);
            expect(password.length).toBeLessThanOrEqual(128);

            const result = validatePassword(password);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
          },
        ),
        { numRuns: 300 },
      );
    });

    it('accepts passwords at the exact length boundaries (8 and 128)', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...UPPERCASE),
          fc.constantFrom(...DIGITS),
          fc.constantFrom(...SPECIAL),
          fc.constantFrom(8, 128),
          (upper, digit, special, targetLen) => {
            const fillerLen = targetLen - 3;
            const filler = 'a'.repeat(fillerLen);
            const password = `${upper}${digit}${special}${filler}`;
            expect(password.length).toBe(targetLen);

            const result = validatePassword(password);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  // -------------------------------------------------------------------------
  // Property 3: A password missing ANY single criterion is rejected.
  //
  // Starting from a valid base password, we remove exactly one criterion at a
  // time and assert the validator rejects it, surfacing the matching error.
  // -------------------------------------------------------------------------
  describe('P3: a password missing exactly one criterion is rejected', () => {
    // Build a valid base password from generated parts.
    const validBaseArb = fc
      .tuple(
        fc.constantFrom(...UPPERCASE),
        fc.constantFrom(...DIGITS),
        fc.constantFrom(...SPECIAL),
        fc.array(fc.constantFrom(...LOWERCASE), { minLength: 5, maxLength: 30 }),
      )
      .map(([upper, digit, special, filler]) => ({
        upper,
        digit,
        special,
        filler: filler.join(''),
      }));

    it('rejects a password with no uppercase letter', () => {
      fc.assert(
        fc.property(validBaseArb, ({ digit, special, filler }) => {
          // Compose from digit + special + lowercase filler only (no uppercase).
          const password = `${digit}${special}${filler}`.padEnd(8, 'a');
          const result = validatePassword(password);
          expect(result.valid).toBe(false);
          expect(result.errors.some((e) => /uppercase/i.test(e))).toBe(true);
        }),
        { numRuns: 200 },
      );
    });

    it('rejects a password with no digit', () => {
      fc.assert(
        fc.property(validBaseArb, ({ upper, special, filler }) => {
          const password = `${upper}${special}${filler}`.padEnd(8, 'a');
          const result = validatePassword(password);
          expect(result.valid).toBe(false);
          expect(result.errors.some((e) => /digit/i.test(e))).toBe(true);
        }),
        { numRuns: 200 },
      );
    });

    it('rejects a password with no special character', () => {
      fc.assert(
        fc.property(validBaseArb, ({ upper, digit, filler }) => {
          const password = `${upper}${digit}${filler}`.padEnd(8, 'a');
          const result = validatePassword(password);
          expect(result.valid).toBe(false);
          expect(result.errors.some((e) => /special character/i.test(e))).toBe(
            true,
          );
        }),
        { numRuns: 200 },
      );
    });

    it('rejects a password that is too short (< 8 chars) even with all other criteria', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...UPPERCASE),
          fc.constantFrom(...DIGITS),
          fc.constantFrom(...SPECIAL),
          // 0..4 lowercase filler => total length 3..7 (always < 8).
          fc.array(fc.constantFrom(...LOWERCASE), { minLength: 0, maxLength: 4 }),
          (upper, digit, special, filler) => {
            const password = `${upper}${digit}${special}${filler.join('')}`;
            expect(password.length).toBeLessThan(8);
            const result = validatePassword(password);
            expect(result.valid).toBe(false);
            expect(result.errors.some((e) => /8 characters/i.test(e))).toBe(
              true,
            );
          },
        ),
        { numRuns: 200 },
      );
    });
  });
});
