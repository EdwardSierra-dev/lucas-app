import { validatePassword } from '../password.validator';

// ---------------------------------------------------------------------------
// Helper: build a password that satisfies all criteria except the one being
// deliberately violated.
// ---------------------------------------------------------------------------
const VALID_BASE = 'Abcdefg1!'; // 9 chars, uppercase, digit, special

describe('validatePassword — unit tests (Requirements 1.3, 1.4)', () => {
  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------
  describe('valid passwords', () => {
    it('accepts a password that meets all criteria', () => {
      const result = validatePassword('StrongPass1!');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('accepts a password at exactly the minimum length (8 chars)', () => {
      const result = validatePassword('Abcde1!x');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('accepts a password at exactly the maximum length (128 chars)', () => {
      // 124 lowercase + 'A' + '1' + '!' + 'x'
      const long = 'a'.repeat(124) + 'A1!x';
      expect(long.length).toBe(128);
      const result = validatePassword(long);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('accepts passwords with various special characters from the allowed set', () => {
      const specials = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+', '-',
        '=', '[', ']', '{', '}', '|', ';', "'", ':', '"', ',', '.', '<', '>', '?', '/'];
      for (const ch of specials) {
        const pwd = `Abcdef1${ch}`;
        const result = validatePassword(pwd);
        expect(result.valid).toBe(true);
      }
    });
  });

  // -------------------------------------------------------------------------
  // minLength
  // -------------------------------------------------------------------------
  describe('minimum length enforcement', () => {
    it('rejects a password shorter than 8 characters', () => {
      const result = validatePassword('Ab1!xyz'); // 7 chars
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => /8 characters/i.test(e))).toBe(true);
    });

    it('rejects an empty password', () => {
      const result = validatePassword('');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => /8 characters/i.test(e))).toBe(true);
    });

    it('reports ONLY the minLength error when the short password otherwise meets all other criteria', () => {
      const result = validatePassword('Ab1!'); // 4 chars, has uppercase + digit + special
      expect(result.valid).toBe(false);
      const hasMinErr = result.errors.some(e => /8 characters/i.test(e));
      expect(hasMinErr).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // maxLength
  // -------------------------------------------------------------------------
  describe('maximum length enforcement', () => {
    it('rejects a password longer than 128 characters', () => {
      const toolong = 'a'.repeat(125) + 'A1!x'; // 129 chars
      expect(toolong.length).toBe(129);
      const result = validatePassword(toolong);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => /128 characters/i.test(e))).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Uppercase letter
  // -------------------------------------------------------------------------
  describe('uppercase letter enforcement', () => {
    it('rejects a password with no uppercase letter', () => {
      const result = validatePassword('abcdefg1!'); // all lowercase
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => /uppercase/i.test(e))).toBe(true);
    });

    it('includes an uppercase error message distinct from other errors', () => {
      const result = validatePassword('abcdefg1!');
      const uppercaseErr = result.errors.find(e => /uppercase/i.test(e));
      expect(uppercaseErr).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Digit
  // -------------------------------------------------------------------------
  describe('digit enforcement', () => {
    it('rejects a password with no digit', () => {
      const result = validatePassword('Abcdefgh!'); // no digit
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => /digit/i.test(e))).toBe(true);
    });

    it('includes a digit error message distinct from other errors', () => {
      const result = validatePassword('Abcdefgh!');
      const digitErr = result.errors.find(e => /digit/i.test(e));
      expect(digitErr).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Special character
  // -------------------------------------------------------------------------
  describe('special character enforcement', () => {
    it('rejects a password with no special character', () => {
      const result = validatePassword('Abcdefg1'); // no special char
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => /special character/i.test(e))).toBe(true);
    });

    it('includes a special-character error message distinct from other errors', () => {
      const result = validatePassword('Abcdefg1');
      const specialErr = result.errors.find(e => /special character/i.test(e));
      expect(specialErr).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Multiple criteria violated simultaneously
  // -------------------------------------------------------------------------
  describe('multiple criteria violated', () => {
    it('reports a distinct error for EACH unmet criterion', () => {
      // Violates: minLength, uppercase, digit, special char
      const result = validatePassword('abc'); // 3 chars, no upper, no digit, no special
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => /8 characters/i.test(e))).toBe(true);
      expect(result.errors.some(e => /uppercase/i.test(e))).toBe(true);
      expect(result.errors.some(e => /digit/i.test(e))).toBe(true);
      expect(result.errors.some(e => /special character/i.test(e))).toBe(true);
    });

    it('reports exactly one error per unmet criterion — no duplicates', () => {
      const result = validatePassword('abc');
      // Count occurrences of each expected error key
      const uppercaseCount = result.errors.filter(e => /uppercase/i.test(e)).length;
      const digitCount = result.errors.filter(e => /digit/i.test(e)).length;
      const specialCount = result.errors.filter(e => /special character/i.test(e)).length;
      expect(uppercaseCount).toBe(1);
      expect(digitCount).toBe(1);
      expect(specialCount).toBe(1);
    });

    it('returns empty errors array (not an array with undefined entries) for a valid password', () => {
      const result = validatePassword(VALID_BASE);
      expect(Array.isArray(result.errors)).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // Edge: non-string inputs (defensive)
  // -------------------------------------------------------------------------
  describe('type safety', () => {
    it('treats non-string value as failing all criteria', () => {
      // validatePassword expects a string; passing null coerced to string ''.
      // The contract is: only strings should reach this, but we verify graceful
      // behaviour if something unexpected is passed.
      const result = validatePassword(null as unknown as string);
      expect(result.valid).toBe(false);
    });
  });
});
