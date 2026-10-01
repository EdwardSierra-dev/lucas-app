/**
 * Modal — standard, closable, and skippable variants.
 *
 * Closable variant (default for non-skippable modals) renders an "X" button in
 * the top-right corner so users can dismiss the modal without completing the
 * flow. The X calls `onClose`, which the parent uses to flip its visibility
 * state.
 *
 * Skippable variant renders an "Omitir" button in the top-right corner
 * with a minimum 44×44 touch target (Req 8.5).
 *
 * Uses only palette colors (Req 8.1). All interactive elements meet
 * the 44×44 minimum touch target requirement (Req 8.2).
 */
import React from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors, TouchTarget } from '../../constants/theme';

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  /**
   * When true, renders the "Omitir" (skip) button instead of the "X" close
   * button. Used by onboarding flows (Req 8.5).
   */
  skippable?: boolean;
  /**
   * Whether to show the top-right "X" close button. Defaults to true for
   * non-skippable modals and is ignored when `skippable` is true.
   */
  closable?: boolean;
  children: React.ReactNode;
}

export function Modal({
  visible,
  onClose,
  skippable = false,
  closable = true,
  children,
}: ModalProps): React.JSX.Element {
  // Skippable takes precedence; otherwise show the X when closable.
  const showClose = !skippable && closable;
  const hasTopAction = skippable || showClose;

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Top-right Omitir button for skippable modals (Req 8.5) */}
          {skippable && (
            <TouchableOpacity
              onPress={onClose}
              accessibilityLabel="Omitir"
              accessibilityRole="button"
              accessibilityHint="Cierra este modal sin completar el flujo"
              style={styles.topRightButton}
            >
              <Text style={styles.omitirText}>Omitir</Text>
            </TouchableOpacity>
          )}

          {/* Top-right X close button for standard modals */}
          {showClose && (
            <TouchableOpacity
              onPress={onClose}
              accessibilityLabel="Cerrar"
              accessibilityRole="button"
              accessibilityHint="Cierra este modal sin guardar"
              style={styles.topRightButton}
            >
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          )}

          <View style={hasTopAction ? styles.contentWithTopAction : styles.content}>
            {children}
          </View>
        </View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(107, 114, 128, 0.5)', // Colors.text at 50%
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  } as ViewStyle,
  sheet: {
    width: '100%',
    backgroundColor: Colors.background,
    borderRadius: 12,
    overflow: 'hidden',
  } as ViewStyle,
  topRightButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: TouchTarget.minWidth,
    minHeight: TouchTarget.minHeight,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    zIndex: 1,
  } as ViewStyle,
  omitirText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  } as TextStyle,
  closeText: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
    includeFontPadding: false,
    textAlignVertical: 'center',
  } as TextStyle,
  content: {
    padding: 24,
  } as ViewStyle,
  contentWithTopAction: {
    padding: 24,
    paddingTop: 52, // make room for the top-right action button
  } as ViewStyle,
});
