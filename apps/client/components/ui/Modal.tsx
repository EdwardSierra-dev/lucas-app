/**
 * Modal — standard and skippable variants.
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
  skippable?: boolean;
  children: React.ReactNode;
}

export function Modal({
  visible,
  onClose,
  skippable = false,
  children,
}: ModalProps): React.JSX.Element {
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
              style={styles.omitirButton}
            >
              <Text style={styles.omitirText}>Omitir</Text>
            </TouchableOpacity>
          )}

          <View style={skippable ? styles.contentWithSkip : styles.content}>
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
  omitirButton: {
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
  content: {
    padding: 24,
  } as ViewStyle,
  contentWithSkip: {
    padding: 24,
    paddingTop: 52, // make room for the Omitir button
  } as ViewStyle,
});
