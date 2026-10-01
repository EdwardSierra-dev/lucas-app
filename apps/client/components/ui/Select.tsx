/**
 * Select — a searchable dropdown / combobox built from React Native primitives
 * so it works on both web and Android without an external library.
 *
 * - A pressable trigger shows the current selection (optional emoji + label)
 *   or a placeholder.
 * - Tapping the trigger opens an overlay with a search field and a scrollable,
 *   filtered list of options.
 * - Each option can carry an `emoji`, which is preserved both in the dropdown
 *   list and in the selected trigger state.
 * - Inline error display mirrors the Input component (Peach border, Req 8.1).
 *
 * All interactive elements meet the 44×44 minimum touch target (Req 8.2) and
 * only palette colors are used (Req 8.1).
 */
import React, { useMemo, useState } from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors, TouchTarget, Typography } from '../../constants/theme';

export interface SelectOption {
  /** Stable value returned via onChange. */
  value: string;
  /** Visible text for the option. */
  label: string;
  /** Optional leading emoji, preserved in the list and selected state. */
  emoji?: string;
}

export interface SelectProps {
  label?: string;
  value: string | null;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  /** Placeholder for the in-dropdown search field. */
  searchPlaceholder?: string;
  error?: string;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  containerStyle?: ViewStyle;
}

export function Select({
  label,
  value,
  options,
  onChange,
  placeholder = 'Seleccionar',
  searchPlaceholder = 'Buscar...',
  error,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  containerStyle,
}: SelectProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const hasError = Boolean(error);

  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (term === '') {
      return options;
    }
    return options.filter((option) =>
      option.label.toLowerCase().includes(term),
    );
  }, [options, query]);

  const openDropdown = (): void => {
    if (disabled) {
      return;
    }
    setQuery('');
    setOpen(true);
  };

  const closeDropdown = (): void => {
    setOpen(false);
    setQuery('');
  };

  const handleSelect = (optionValue: string): void => {
    onChange(optionValue);
    closeDropdown();
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={styles.label} accessibilityRole="text">
          {label}
        </Text>
      ) : null}

      <TouchableOpacity
        onPress={openDropdown}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ expanded: open, disabled }}
        style={[
          styles.trigger,
          hasError && styles.triggerError,
          disabled && styles.triggerDisabled,
        ]}
      >
        {selected ? (
          <Text style={styles.triggerText} numberOfLines={1}>
            {selected.emoji ? `${selected.emoji} ` : ''}
            {selected.label}
          </Text>
        ) : (
          <Text style={styles.placeholderText} numberOfLines={1}>
            {placeholder}
          </Text>
        )}
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>

      {hasError ? (
        <Text style={styles.errorText} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      <RNModal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={closeDropdown}
        statusBarTranslucent
      >
        <TouchableWithoutFeedback onPress={closeDropdown}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.sheet}>
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder={searchPlaceholder}
                  placeholderTextColor={Colors.text + '80'}
                  accessibilityLabel={searchPlaceholder}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                  style={styles.search}
                />

                <FlatList
                  data={filtered}
                  keyExtractor={(option) => option.value}
                  keyboardShouldPersistTaps="handled"
                  style={styles.list}
                  renderItem={({ item }) => {
                    const isSelected = item.value === value;
                    return (
                      <TouchableOpacity
                        onPress={() => handleSelect(item.value)}
                        accessibilityRole="button"
                        accessibilityLabel={
                          item.emoji
                            ? `${item.label}`
                            : item.label
                        }
                        accessibilityState={{ selected: isSelected }}
                        style={[
                          styles.option,
                          isSelected && styles.optionSelected,
                        ]}
                      >
                        {item.emoji ? (
                          <Text style={styles.optionEmoji}>{item.emoji}</Text>
                        ) : null}
                        <Text
                          style={[
                            styles.optionLabel,
                            isSelected && styles.optionLabelSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  }}
                  ListEmptyComponent={
                    <View style={styles.empty}>
                      <Text style={styles.emptyText}>Sin resultados</Text>
                    </View>
                  }
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </RNModal>
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
  } as TextStyle,
  trigger: {
    minHeight: TouchTarget.minHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.text,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.background,
  } as ViewStyle,
  triggerError: {
    borderColor: Colors.accent,
  } as ViewStyle,
  triggerDisabled: {
    opacity: 0.5,
  } as ViewStyle,
  triggerText: {
    ...Typography.Body,
    flex: 1,
  } as TextStyle,
  placeholderText: {
    ...Typography.Body,
    color: Colors.text + '80',
    flex: 1,
  } as TextStyle,
  chevron: {
    ...Typography.Body,
    color: Colors.text,
    marginLeft: 8,
  } as TextStyle,
  errorText: {
    ...Typography.Caption,
    color: Colors.accent,
    marginTop: 4,
  } as TextStyle,
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(107, 114, 128, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  } as ViewStyle,
  sheet: {
    width: '100%',
    maxHeight: '70%',
    backgroundColor: Colors.background,
    borderRadius: 12,
    overflow: 'hidden',
    paddingVertical: 8,
  } as ViewStyle,
  search: {
    minHeight: TouchTarget.minHeight,
    borderWidth: 1,
    borderColor: Colors.text,
    borderRadius: 8,
    marginHorizontal: 12,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.background,
    ...Typography.Body,
  } as TextStyle,
  list: {
    paddingHorizontal: 8,
  } as ViewStyle,
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: TouchTarget.minHeight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  } as ViewStyle,
  optionSelected: {
    backgroundColor: Colors.secondary + '40',
  } as ViewStyle,
  optionEmoji: {
    fontSize: 20,
    marginRight: 10,
  } as TextStyle,
  optionLabel: {
    ...Typography.Body,
    flex: 1,
  } as TextStyle,
  optionLabelSelected: {
    color: Colors.primary,
    fontWeight: '600',
  } as TextStyle,
  empty: {
    paddingVertical: 24,
    alignItems: 'center',
  } as ViewStyle,
  emptyText: {
    ...Typography.Caption,
  } as TextStyle,
});
