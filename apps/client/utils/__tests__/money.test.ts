import { formatMoney } from '../money';

describe('formatMoney', () => {
  describe('basic formatting', () => {
    it('formats a positive integer with two decimal places', () => {
      const result = formatMoney(1000);
      // Must contain exactly "1.000,00" (es-CO grouping/decimal conventions)
      expect(result).toMatch(/1\.000,00/);
    });

    it('formats a positive decimal amount with two decimal places', () => {
      const result = formatMoney(1234.5);
      expect(result).toMatch(/1\.234,50/);
    });

    it('formats an amount that already has two decimal places unchanged', () => {
      const result = formatMoney(99.99);
      expect(result).toMatch(/99,99/);
    });

    it('formats zero with two decimal places', () => {
      const result = formatMoney(0);
      expect(result).toMatch(/0,00/);
    });

    it('always produces exactly two digits after the decimal separator', () => {
      const amounts = [1, 1.1, 1.12, 1.123, 100, 0.01];
      for (const amount of amounts) {
        const result = formatMoney(amount);
        // The decimal separator in es-CO is a comma; assert two digits follow it
        expect(result).toMatch(/,\d{2}(?!\d)/);
      }
    });
  });

  describe('currency symbol', () => {
    it('includes a COP currency symbol/indicator by default', () => {
      const result = formatMoney(500);
      // Intl renders COP as "$" in es-CO locale
      expect(result).toMatch(/\$|COP/);
    });

    it('includes USD currency symbol when currency is USD', () => {
      const result = formatMoney(500, 'USD');
      expect(result).toMatch(/US\$|USD|\$/);
    });

    it('includes EUR currency symbol when currency is EUR', () => {
      const result = formatMoney(500, 'EUR');
      expect(result).toMatch(/€|EUR/);
    });
  });

  describe('default currency parameter', () => {
    it('defaults to COP when no currency is provided', () => {
      const withDefault = formatMoney(100);
      const withCOP = formatMoney(100, 'COP');
      expect(withDefault).toBe(withCOP);
    });
  });

  describe('edge cases', () => {
    it('formats the minimum valid amount (0.01)', () => {
      const result = formatMoney(0.01);
      expect(result).toMatch(/0,01/);
    });

    it('formats a large amount (999,999,999.99)', () => {
      const result = formatMoney(999_999_999.99);
      expect(result).toMatch(/999\.999\.999,99/);
    });

    it('formats a negative amount with two decimal places', () => {
      const result = formatMoney(-50.5);
      expect(result).toMatch(/50,50/);
    });
  });
});
