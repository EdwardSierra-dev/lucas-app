/**
 * Monetary formatting utilities.
 * Requirement 8.3 — all monetary values displayed with exactly 2 decimal places
 * and the currency symbol defined in the user's active currency setting.
 */

/**
 * Formats a numeric amount as a currency string using the Colombian locale.
 *
 * @param amount   - The numeric value to format.
 * @param currency - ISO 4217 currency code. Defaults to 'COP'.
 * @returns A string with exactly 2 decimal places and the currency symbol,
 *          e.g. "$ 1.234,56" for COP.
 */
export function formatMoney(amount: number, currency = 'COP'): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
