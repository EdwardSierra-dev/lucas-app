/**
 * MoneyInput — monetary amount input component.
 *
 * Wraps the base Input component and:
 * - Displays the formatted value with exactly 2 decimal places and the
 *   currency symbol via formatMoney() (Req 8.3).
 * - Exposes onChangeValue(number | null) instead of raw text onChange.
 * - Enforces a configurable maxValue (defaults to 999_999_999.99).
 * - All interactive elements meet the 44×44 minimum touch target (Req 8.2).
 */
import React, { useState, useCallback } from 'react';
import { Input } from './Input';
import { formatMoney } from '../../utils/money';

export interface MoneyInputProps {
  value: number | null;
  onChangeValue: (value: number | null) => void;
  currency?: string;
  maxValue?: number;
  label?: string;
  error?: string;
  placeholder?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function MoneyInput({
  value,
  onChangeValue,
  currency = 'COP',
  maxValue = 999_999_999.99,
  label,
  error,
  placeholder,
  accessibilityLabel,
  accessibilityHint,
}: MoneyInputProps): React.JSX.Element {
  // Raw text while the user is editing; null means we show the formatted value
  const [rawText, setRawText] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  // While focused the user sees plain numeric text; on blur it formats
  const displayValue = isFocused
    ? (rawText ?? (value !== null ? String(value) : ''))
    : (value !== null ? formatMoney(value, currency) : '');

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    // Seed raw text with the current numeric value for easy editing
    setRawText(value !== null ? String(value) : '');
  }, [value]);

  const handleChangeText = useCallback((text: string) => {
    // Only allow digits, one dot, and at most 2 decimal places
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    let sanitised = parts[0];
    if (parts.length > 1) {
      sanitised += '.' + parts[1].slice(0, 2);
    }
    setRawText(sanitised);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    if (rawText === null || rawText === '') {
      onChangeValue(null);
      setRawText(null);
      return;
    }
    const parsed = parseFloat(rawText);
    if (isNaN(parsed) || parsed < 0.01 || parsed > maxValue) {
      // Let parent decide on validation; pass null so it knows input is invalid
      onChangeValue(null);
    } else {
      // Round to 2 decimal places before propagating
      const rounded = Math.round(parsed * 100) / 100;
      onChangeValue(rounded);
    }
    setRawText(null);
  }, [rawText, maxValue, onChangeValue]);

  return (
    <Input
      label={label}
      error={error}
      value={displayValue}
      onChangeText={handleChangeText}
      onFocus={handleFocus}
      onBlur={handleBlur}
      keyboardType="decimal-pad"
      accessibilityLabel={accessibilityLabel ?? label ?? 'Monto'}
      accessibilityHint={
        accessibilityHint ??
        `Ingrese un valor entre 0.01 y ${formatMoney(maxValue, currency)}`
      }
      placeholder={placeholder ?? `$ 0,00`}
      returnKeyType="done"
    />
  );
}
