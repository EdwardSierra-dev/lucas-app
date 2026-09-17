/**
 * CategoryCard — expense category selection card.
 *
 * Features:
 * - Toggle selection (Req 2.7, 3.4).
 * - Optional delete action for custom categories (Req 2.7).
 * - Optional payment date assignment per selected category (Req 2.8, 3.5).
 *   Payment date must be an integer between 1 and 28.
 *
 * All interactive elements meet the 44×44 minimum touch target (Req 8.2).
 * Uses only palette colors (Req 8.1).
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors, TouchTarget, Typography } from '../../constants/theme';

export interface CategoryCardProps {
  name: string;
  emoji: string;
  selected: boolean;
  paymentDate?: number; // 1–28
  onToggle: () => void;
  onDelete?: () => void;       // only for custom categories
  onSetPaymentDate?: (day: number) => void;
}

export function CategoryCard({
  name,
  emoji,
  selected,
  paymentDate,
  onToggle,
  onDelete,
  onSetPaymentDate,
}: CategoryCardProps): React.JSX.Element {
  const [editingDate, setEditingDate] = useState(false);
  const [dateInput, setDateInput] = useState(
    paymentDate !== undefined ? String(paymentDate) : '',
  );
  const [dateError, setDateError] = useState<string | null>(null);

  const handleDateSubmit = () => {
    const day = parseInt(dateInput, 10);
    if (isNaN(day) || day < 1 || day > 28) {
      setDateError('Día inválido (1–28)');
      return;
    }
    setDateError(null);
    setEditingDate(false);
    onSetPaymentDate?.(day);
  };

  const handleDateInputChange = (text: string) => {
    // Allow only digits, max 2 chars
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 2);
    setDateInput(cleaned);
    setDateError(null);
  };

  return (
    <View
      style={[styles.card, selected && styles.cardSelected]}
      accessibilityRole="none"
    >
      {/* Main row: emoji + name + actions */}
      <View style={styles.mainRow}>
        {/* Toggle area — covers emoji + name */}
        <TouchableOpacity
          onPress={onToggle}
          accessibilityLabel={`${selected ? 'Deseleccionar' : 'Seleccionar'} ${name}`}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: selected }}
          style={styles.toggleArea}
        >
          <Text style={styles.emoji}>{emoji}</Text>
          <Text
            style={[styles.name, selected && styles.nameSelected]}
            numberOfLines={1}
          >
            {name}
          </Text>
        </TouchableOpacity>

        {/* Right-side actions */}
        <View style={styles.actions}>
          {/* Payment date button — only visible when selected */}
          {selected && onSetPaymentDate ? (
            <TouchableOpacity
              onPress={() => setEditingDate((prev) => !prev)}
              accessibilityLabel={
                paymentDate
                  ? `Fecha de pago: día ${paymentDate}`
                  : 'Asignar fecha de pago'
              }
              accessibilityRole="button"
              style={[styles.actionBtn, styles.dateBtn]}
            >
              <Text style={styles.dateBtnText}>
                {paymentDate ? `Día ${paymentDate}` : '📅'}
              </Text>
            </TouchableOpacity>
          ) : null}

          {/* Delete button — only for custom categories */}
          {onDelete ? (
            <TouchableOpacity
              onPress={onDelete}
              accessibilityLabel={`Eliminar categoría ${name}`}
              accessibilityRole="button"
              style={[styles.actionBtn, styles.deleteBtn]}
            >
              <Text style={styles.deleteBtnText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Inline payment date editor */}
      {editingDate && selected && onSetPaymentDate ? (
        <View style={styles.dateEditor}>
          <TextInput
            value={dateInput}
            onChangeText={handleDateInputChange}
            keyboardType="number-pad"
            maxLength={2}
            placeholder="1–28"
            placeholderTextColor={Colors.text + '80'}
            accessibilityLabel="Día de pago"
            style={[styles.dateField, dateError ? styles.dateFieldError : null]}
            returnKeyType="done"
            onSubmitEditing={handleDateSubmit}
          />
          <TouchableOpacity
            onPress={handleDateSubmit}
            accessibilityLabel="Confirmar fecha de pago"
            accessibilityRole="button"
            style={styles.confirmBtn}
          >
            <Text style={styles.confirmBtnText}>✓</Text>
          </TouchableOpacity>
          {dateError ? (
            <Text style={styles.dateError}>{dateError}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.text + '40',
    borderRadius: 10,
    marginVertical: 4,
    overflow: 'hidden',
  } as ViewStyle,
  cardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.secondary + '40', // Mint Green, faint tint
  } as ViewStyle,
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: TouchTarget.minHeight,
  } as ViewStyle,
  toggleArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    minHeight: TouchTarget.minHeight,
  } as ViewStyle,
  emoji: {
    fontSize: 22,
    marginRight: 10,
  } as TextStyle,
  name: {
    ...Typography.Body,
    color: Colors.text,
    flex: 1,
  } as TextStyle,
  nameSelected: {
    color: Colors.primary,
    fontWeight: '600',
  } as TextStyle,
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  actionBtn: {
    minWidth: TouchTarget.minWidth,
    minHeight: TouchTarget.minHeight,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  dateBtn: {
    paddingHorizontal: 8,
  } as ViewStyle,
  dateBtnText: {
    ...Typography.Caption,
    color: Colors.primary,
    fontWeight: '600',
  } as TextStyle,
  deleteBtn: {
    paddingHorizontal: 12,
  } as ViewStyle,
  deleteBtnText: {
    ...Typography.Body,
    color: Colors.accent,
    fontWeight: '700',
  } as TextStyle,
  // Date editor row
  dateEditor: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  } as ViewStyle,
  dateField: {
    borderWidth: 1,
    borderColor: Colors.text,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 60,
    minHeight: TouchTarget.minHeight,
    backgroundColor: Colors.background,
    ...Typography.Body,  // includes color: Colors.text
    textAlign: 'center',
  } as TextStyle,
  dateFieldError: {
    borderColor: Colors.accent,
  } as TextStyle,
  confirmBtn: {
    minWidth: TouchTarget.minWidth,
    minHeight: TouchTarget.minHeight,
    backgroundColor: Colors.primary,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  } as ViewStyle,
  confirmBtnText: {
    ...Typography.Body,
    color: Colors.background,
    fontWeight: '700',
  } as TextStyle,
  dateError: {
    ...Typography.Caption,
    color: Colors.accent,
    width: '100%',
  } as TextStyle,
});
