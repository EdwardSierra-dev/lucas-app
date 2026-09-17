/**
 * EmojiPicker — simple emoji selection grid.
 *
 * Renders a scrollable grid of common emoji grouped by category.
 * Each emoji cell meets the 44×44 minimum touch target (Req 8.2).
 * Uses only palette colors (Req 8.1).
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors, TouchTarget, Typography } from '../../constants/theme';

// ---------------------------------------------------------------------------
// Emoji data — grouped by category, no external library required
// ---------------------------------------------------------------------------

const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: 'Hogar',
    emojis: ['🏠', '🏡', '🛋️', '🛏️', '🚿', '🛁', '🪴', '🔑', '🪟', '🚪', '💡', '🔧', '🪣'],
  },
  {
    label: 'Comida',
    emojis: ['🍎', '🥦', '🍕', '🍔', '🍣', '🍜', '🥗', '🥩', '🧀', '🍞', '🥚', '🛒', '☕'],
  },
  {
    label: 'Transporte',
    emojis: ['🚗', '🚙', '🚌', '🏍️', '🚲', '✈️', '🚂', '⛽', '🅿️', '🛞', '🔑', '🗺️'],
  },
  {
    label: 'Tecnología',
    emojis: ['💻', '📱', '📺', '🎮', '⌨️', '🖥️', '📷', '🎧', '🔋', '📡', '🖨️'],
  },
  {
    label: 'Salud',
    emojis: ['💊', '🏥', '🩺', '🧴', '🪥', '🧼', '🩹', '💉', '🏋️', '🧘'],
  },
  {
    label: 'Educación',
    emojis: ['📚', '🎒', '✏️', '📝', '🖊️', '🎓', '🏫', '📐', '📏'],
  },
  {
    label: 'Entretenimiento',
    emojis: ['🎬', '🎵', '🎸', '🎨', '📖', '🎯', '🎲', '🏆', '🎪', '🎭'],
  },
  {
    label: 'Finanzas',
    emojis: ['💰', '💳', '🏦', '📈', '📉', '💵', '🤑', '🪙', '💸', '🧾'],
  },
  {
    label: 'Servicios',
    emojis: ['💧', '⚡', '🔥', '📶', '📞', '📮', '🌐', '🔐'],
  },
  {
    label: 'Mascotas',
    emojis: ['🐶', '🐱', '🐠', '🐦', '🐾', '🦴', '🐾'],
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface EmojiPickerProps {
  selectedEmoji?: string;
  onSelectEmoji: (emoji: string) => void;
  maxHeight?: number;
}

export function EmojiPicker({
  selectedEmoji,
  onSelectEmoji,
  maxHeight = 300,
}: EmojiPickerProps): React.JSX.Element {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(
    EMOJI_GROUPS[0].label,
  );

  return (
    <View style={styles.container}>
      {/* Group tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabs}
        contentContainerStyle={styles.tabsContent}
      >
        {EMOJI_GROUPS.map((group) => {
          const isActive = expandedGroup === group.label;
          return (
            <TouchableOpacity
              key={group.label}
              onPress={() => setExpandedGroup(isActive ? null : group.label)}
              accessibilityLabel={group.label}
              accessibilityRole="tab"
              style={[styles.tab, isActive && styles.tabActive]}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {group.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Emoji grid for the active group */}
      <ScrollView
        style={[styles.grid, { maxHeight }]}
        showsVerticalScrollIndicator={false}
      >
        {EMOJI_GROUPS.filter((g) => g.label === expandedGroup).map((group) => (
          <View key={group.label} style={styles.emojiRow}>
            {group.emojis.map((emoji) => {
              const isSelected = selectedEmoji === emoji;
              return (
                <TouchableOpacity
                  key={emoji}
                  onPress={() => onSelectEmoji(emoji)}
                  accessibilityLabel={`Emoji ${emoji}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  style={[styles.emojiCell, isSelected && styles.emojiCellSelected]}
                >
                  <Text style={styles.emoji}>{emoji}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: Colors.text,
    borderRadius: 8,
    backgroundColor: Colors.background,
    overflow: 'hidden',
  } as ViewStyle,
  tabs: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.text + '40',
  } as ViewStyle,
  tabsContent: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 4,
  } as ViewStyle,
  tab: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'transparent',
  } as ViewStyle,
  tabActive: {
    backgroundColor: Colors.primary,
  } as ViewStyle,
  tabText: {
    ...Typography.Caption,
    color: Colors.text,
  } as TextStyle,
  tabTextActive: {
    color: Colors.background,
    fontWeight: '600',
  } as TextStyle,
  grid: {
    padding: 8,
  } as ViewStyle,
  emojiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  } as ViewStyle,
  emojiCell: {
    width: TouchTarget.minWidth,
    height: TouchTarget.minHeight,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  } as ViewStyle,
  emojiCellSelected: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.primary,
  } as ViewStyle,
  emoji: {
    fontSize: 22,
  } as TextStyle,
});
