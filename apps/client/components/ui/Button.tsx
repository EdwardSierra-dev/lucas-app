/**
 * Button — primary and secondary variants.
 *
 * Enforces the 44×44 minimum touch target (Req 8.2).
 * Uses Colors.primary background for CTA / primary variant (Req 8.1).
 */
import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors, TouchTarget, Typography } from '../../constants/theme';

export type ButtonVariant = 'primary' | 'secondary';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  accessibilityLabel,
  style,
}: ButtonProps): React.JSX.Element {
  const isPrimary = variant === 'primary';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      style={[
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={isPrimary ? Colors.background : Colors.primary}
          accessibilityLabel="Cargando"
        />
      ) : (
        <Text
          style={[
            styles.label,
            isPrimary ? styles.labelPrimary : styles.labelSecondary,
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    minWidth: TouchTarget.minWidth,
    minHeight: TouchTarget.minHeight,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  primary: {
    backgroundColor: Colors.primary,
  } as ViewStyle,
  secondary: {
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.primary,
  } as ViewStyle,
  disabled: {
    opacity: 0.5,
  } as ViewStyle,
  label: {
    ...Typography.CTAButton,
  } as TextStyle,
  labelPrimary: {
    color: Colors.background,
  } as TextStyle,
  labelSecondary: {
    color: Colors.primary,
  } as TextStyle,
});
