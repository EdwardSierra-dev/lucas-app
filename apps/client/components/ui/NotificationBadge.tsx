/**
 * NotificationBadge — unread notification count indicator.
 *
 * Renders a circular badge using Colors.accent (Peach) background with
 * the unread count displayed in white text (Req 8.1).
 * Hidden when count is 0 and hideWhenZero is true (default).
 */
import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Colors, Typography } from '../../constants/theme';

export interface NotificationBadgeProps {
  count: number;
  hideWhenZero?: boolean;
  /** Forwarded to the outer View for positioning (e.g. absolute placement) */
  style?: ViewStyle;
}

export function NotificationBadge({
  count,
  hideWhenZero = true,
  style,
}: NotificationBadgeProps): React.JSX.Element | null {
  if (hideWhenZero && count === 0) {
    return null;
  }

  // Cap display at 99 to keep the badge compact
  const displayCount = count > 99 ? '99+' : String(count);
  const isWide = count > 9;

  return (
    <View
      style={[styles.badge, isWide ? styles.badgeWide : styles.badgeCircle, style]}
      accessibilityRole="text"
      accessibilityLabel={`${count} notificación${count !== 1 ? 'es' : ''} sin leer`}
    >
      <Text style={styles.text}>{displayCount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 20,
    height: 20,
  } as ViewStyle,
  /** Perfectly circular for single-digit counts */
  badgeCircle: {
    width: 20,
    borderRadius: 10,
  } as ViewStyle,
  /** Pill shape for two-digit+ counts */
  badgeWide: {
    borderRadius: 10,
    paddingHorizontal: 5,
  } as ViewStyle,
  text: {
    ...Typography.Caption,
    color: Colors.background,
    fontWeight: '700',
    lineHeight: 14,
  } as TextStyle,
});
