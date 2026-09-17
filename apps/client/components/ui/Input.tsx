/**
 * Input — accessible text input with inline error display.
 *
 * - Renders a label above the input (Req 8.1).
 * - Applies Peach border when an error message is present (Req 8.1).
 * - accessibilityLabel forwards to the underlying TextInput (Req 8.2).
 * - accessibilityHint provides additional context for screen readers.
 * - Minimum touch target enforced via minHeight on the TextInput (Req 8.2).
 */
import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { Colors, TouchTarget, Typography } from '../../constants/theme';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  containerStyle?: ViewStyle;
}

export function Input({
  label,
  error,
  accessibilityLabel,
  accessibilityHint,
  containerStyle,
  ...textInputProps
}: InputProps): React.JSX.Element {
  const hasError = Boolean(error);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={styles.label} accessibilityRole="text">
          {label}
        </Text>
      ) : null}

      <TextInput
        {...textInputProps}
        style={[styles.input, hasError && styles.inputError]}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={accessibilityHint}
        placeholderTextColor={Colors.text + '80'} // 50% opacity
      />

      {hasError ? (
        <Text style={styles.errorText} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  } as ViewStyle,
  label: {
    ...Typography.Body,
    marginBottom: 4,
    color: Colors.text,
  },
  input: {
    minHeight: TouchTarget.minHeight,
    borderWidth: 1,
    borderColor: Colors.text,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.background,
    color: Colors.text,
    ...Typography.Body,
  },
  inputError: {
    borderColor: Colors.accent, // Peach on error
  },
  errorText: {
    ...Typography.Caption,
    color: Colors.accent,
    marginTop: 4,
  },
});
