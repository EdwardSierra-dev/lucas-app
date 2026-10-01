/**
 * Mandatory expenses onboarding screen (Requirement 2).
 *
 * Flow:
 *  - On entry: show a skippable intro modal with the Req 2.1 message; dismissing
 *    it reveals the expense list.
 *  - Render the predefined mandatory categories (type === 'mandatory') plus the
 *    user's custom mandatory categories as CategoryCard components (Req 2.2).
 *  - Tapping a card toggles selection (expenseStore.toggleCategory). A selected
 *    category can be assigned a payment day 1–28 (onSetPaymentDate →
 *    expenseStore.setPaymentDay) and an amount via the inline MoneyInput
 *    (Req 2.7, 2.8).
 *  - "+" opens a modal with a name Input + EmojiPicker to create a custom
 *    mandatory category (Req 2.3–2.6) via useCreateCategory.
 *  - Custom categories can be deleted (onDelete → useDeleteCategory); predefined
 *    ones are not deletable (Req 2.7).
 *  - A Yes/No vehicle-ownership question is shown (Req 2.10/2.11); the answer is
 *    forwarded to the next step.
 *  - "Continuar" validates that every selected category has a payment day, then
 *    persists each selection via useCreateUserExpense, resets the draft store,
 *    and navigates to the optional-expenses step.
 *
 * UX: palette colors only (Req 8.1), 44×44 touch targets (Req 8.2), skippable
 * modal with Omitir (Req 8.5).
 */
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Button,
  CategoryCard,
  EmojiPicker,
  Input,
  Modal,
  MoneyInput,
} from '../../components/ui';
import { Colors, TouchTarget, Typography } from '../../constants/theme';
import { useExpenseStore } from '../../store/expenseStore';
import {
  useCategories,
  useCreateCategory,
  useCreateUserExpense,
  useDeleteCategory,
  type Category,
} from '../../services/expensesApi';

const INTRO_MESSAGE =
  'Estos gastos mensuales son aquellos que no puedes dejar de pagar o sino pailas papi 💪🏻';

/** Max length for a custom mandatory category name (Req 2.3). */
const MAX_NAME_LENGTH = 30;

export default function MandatoryExpensesScreen(): React.JSX.Element {
  const router = useRouter();

  // Intro modal (Req 2.1) — visible on entry, dismissed to show the list.
  const [introVisible, setIntroVisible] = useState(true);

  // Draft selection state (Zustand).
  const selections = useExpenseStore((s) => s.selections);
  const toggleCategory = useExpenseStore((s) => s.toggleCategory);
  const setPaymentDay = useExpenseStore((s) => s.setPaymentDay);
  const setAmount = useExpenseStore((s) => s.setAmount);
  const resetSelections = useExpenseStore((s) => s.reset);

  // Server state.
  const { data: categories, isLoading, isError, refetch } = useCategories();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();
  const createUserExpense = useCreateUserExpense();

  // Only mandatory categories are relevant here (predefined + custom).
  const mandatoryCategories = useMemo<Category[]>(
    () => (categories ?? []).filter((c) => c.type === 'mandatory'),
    [categories],
  );

  // Add-custom-category modal state.
  const [addVisible, setAddVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Vehicle ownership question (Req 2.10).
  const [vehicleOwner, setVehicleOwner] = useState<boolean | null>(null);

  // Continue-time validation guidance.
  const [continueError, setContinueError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // -------------------------------------------------------------------------
  // Add custom category (Req 2.3 – 2.6)
  // -------------------------------------------------------------------------

  const openAddForm = () => {
    setNewName('');
    setNewEmoji('');
    setFormError(null);
    setAddVisible(true);
  };

  const handleCreateCategory = () => {
    const trimmed = newName.trim();

    // Req 2.5 — missing / whitespace-only name or missing emoji.
    if (trimmed.length === 0) {
      setFormError('Ingresa un nombre para la categoría.');
      return;
    }
    if (trimmed.length > MAX_NAME_LENGTH) {
      setFormError(`El nombre no puede superar ${MAX_NAME_LENGTH} caracteres.`);
      return;
    }
    if (newEmoji.length === 0) {
      setFormError('Selecciona un emoji.');
      return;
    }

    // Req 2.6 — duplicate name (case-insensitive) against existing categories.
    const isDuplicate = mandatoryCategories.some(
      (c) => c.name.trim().toLowerCase() === trimmed.toLowerCase(),
    );
    if (isDuplicate) {
      setFormError('Ya existe una categoría con ese nombre.');
      return;
    }

    setFormError(null);
    createCategory.mutate(
      { name: trimmed, emoji: newEmoji, type: 'mandatory' },
      {
        onSuccess: () => {
          setAddVisible(false);
        },
        onError: () => {
          setFormError('No se pudo crear la categoría. Intenta de nuevo.');
        },
      },
    );
  };

  // -------------------------------------------------------------------------
  // Delete custom category (Req 2.7)
  // -------------------------------------------------------------------------

  const handleDeleteCategory = (category: Category) => {
    deleteCategory.mutate(category.id);
  };

  // -------------------------------------------------------------------------
  // Continue — persist selections (Req 2.8) then advance
  // -------------------------------------------------------------------------

  const selectedEntries = useMemo(
    () =>
      mandatoryCategories
        .map((category) => ({ category, draft: selections[category.id] }))
        .filter((e) => e.draft?.selected === true),
    [mandatoryCategories, selections],
  );

  const handleContinue = async () => {
    setContinueError(null);

    // Validate that every selected category has a payment day (Req 2.8).
    const missingDay = selectedEntries.filter(
      (e) => e.draft?.paymentDay === undefined,
    );
    if (missingDay.length > 0) {
      const names = missingDay.map((e) => e.category.name).join(', ');
      setContinueError(
        `Asigna un día de pago a: ${names}.`,
      );
      return;
    }

    setSubmitting(true);
    try {
      // Persist each selected category as a configured user expense.
      await Promise.all(
        selectedEntries.map((e) =>
          createUserExpense.mutateAsync({
            categoryId: e.category.id,
            amount: e.draft?.amount ?? 0,
            paymentDay: e.draft?.paymentDay as number,
          }),
        ),
      );

      resetSelections();
      router.push({
        pathname: '/(onboarding)/optional-expenses',
        params: { vehicleOwner: vehicleOwner === true ? '1' : '0' },
      });
    } catch {
      setContinueError(
        'No se pudieron guardar los gastos. Intenta de nuevo.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <View style={styles.screen}>
      {/* Intro modal (Req 2.1, skippable per Req 8.5) */}
      <Modal
        visible={introVisible}
        onClose={() => setIntroVisible(false)}
        skippable
      >
        <Text style={styles.modalMessage}>{INTRO_MESSAGE}</Text>
        <Button
          label="Entendido"
          onPress={() => setIntroVisible(false)}
          accessibilityLabel="Cerrar mensaje y continuar"
        />
      </Modal>

      {/* Add custom category modal (Req 2.3 – 2.6) */}
      <Modal visible={addVisible} onClose={() => setAddVisible(false)}>
        <Text style={styles.modalTitle}>Nueva categoría</Text>
        <Input
          label="Nombre"
          value={newName}
          onChangeText={(text) => {
            setNewName(text);
            setFormError(null);
          }}
          maxLength={MAX_NAME_LENGTH}
          placeholder="Ej. Mascota"
          accessibilityLabel="Nombre de la categoría"
          error={formError ?? undefined}
        />

        <Text style={styles.fieldLabel}>Emoji</Text>
        <EmojiPicker
          selectedEmoji={newEmoji || undefined}
          onSelectEmoji={(emoji) => {
            setNewEmoji(emoji);
            setFormError(null);
          }}
          maxHeight={220}
        />

        <View style={styles.modalActions}>
          <Button
            label="Cancelar"
            variant="secondary"
            onPress={() => setAddVisible(false)}
            style={styles.modalActionBtn}
          />
          <Button
            label="Agregar"
            onPress={handleCreateCategory}
            loading={createCategory.isPending}
            style={styles.modalActionBtn}
            accessibilityLabel="Agregar categoría"
          />
        </View>
      </Modal>

      {/* Main content */}
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>¿Cuáles son tus gastos fijos?</Text>
        <Text style={styles.subtitle}>
          Selecciona los gastos que debes pagar cada mes y asígnales un día de
          pago.
        </Text>

        {isLoading ? (
          <ActivityIndicator
            color={Colors.primary}
            accessibilityLabel="Cargando categorías"
            style={styles.loader}
          />
        ) : null}

        {isError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              No se pudieron cargar las categorías.
            </Text>
            <Button
              label="Reintentar"
              variant="secondary"
              onPress={() => {
                void refetch();
              }}
            />
          </View>
        ) : null}

        {/* Category list (Req 2.2, 2.7) */}
        {mandatoryCategories.map((category) => {
          const draft = selections[category.id];
          const isSelected = draft?.selected === true;
          return (
            <View key={category.id}>
              <CategoryCard
                name={category.name}
                emoji={category.emoji}
                selected={isSelected}
                paymentDate={draft?.paymentDay}
                onToggle={() => toggleCategory(category.id)}
                onSetPaymentDate={(day) => setPaymentDay(category.id, day)}
                onDelete={
                  category.isPredefined
                    ? undefined
                    : () => handleDeleteCategory(category)
                }
              />
              {/* Amount input for a selected category (Req 2.8) */}
              {isSelected ? (
                <View style={styles.amountRow}>
                  <MoneyInput
                    label={`Monto de ${category.name}`}
                    value={draft?.amount ?? null}
                    onChangeValue={(value) =>
                      setAmount(category.id, value ?? 0)
                    }
                    accessibilityLabel={`Monto de ${category.name}`}
                  />
                </View>
              ) : null}
            </View>
          );
        })}

        {/* Add custom category button (Req 2.3) */}
        <TouchableOpacity
          onPress={openAddForm}
          accessibilityLabel="Agregar categoría personalizada"
          accessibilityRole="button"
          style={styles.addButton}
        >
          <Text style={styles.addButtonText}>＋ Agregar categoría</Text>
        </TouchableOpacity>

        {/* Vehicle ownership question (Req 2.10) */}
        <View style={styles.vehicleBox}>
          <Text style={styles.vehicleQuestion}>¿Tienes un vehículo?</Text>
          <View style={styles.vehicleOptions}>
            <Button
              label="Sí"
              variant={vehicleOwner === true ? 'primary' : 'secondary'}
              onPress={() => setVehicleOwner(true)}
              style={styles.vehicleOptionBtn}
              accessibilityLabel="Sí, tengo vehículo"
            />
            <Button
              label="No"
              variant={vehicleOwner === false ? 'primary' : 'secondary'}
              onPress={() => setVehicleOwner(false)}
              style={styles.vehicleOptionBtn}
              accessibilityLabel="No tengo vehículo"
            />
          </View>
        </View>

        {/* Continue validation guidance */}
        {continueError ? (
          <Text style={styles.continueError} accessibilityRole="alert">
            {continueError}
          </Text>
        ) : null}

        <Button
          label="Continuar"
          onPress={() => {
            void handleContinue();
          }}
          loading={submitting}
          style={styles.continueButton}
          accessibilityLabel="Continuar a gastos opcionales"
        />
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  } as ViewStyle,
  content: {
    padding: 20,
    paddingBottom: 48,
  } as ViewStyle,
  title: {
    ...Typography.H1,
    marginBottom: 8,
  } as TextStyle,
  subtitle: {
    ...Typography.Body,
    marginBottom: 16,
  } as TextStyle,
  loader: {
    marginVertical: 24,
  } as ViewStyle,
  errorBox: {
    gap: 12,
    marginVertical: 16,
  } as ViewStyle,
  errorText: {
    ...Typography.Body,
    color: Colors.accent,
  } as TextStyle,
  amountRow: {
    paddingLeft: 12,
    paddingRight: 4,
    marginTop: 4,
    marginBottom: 8,
  } as ViewStyle,
  addButton: {
    minHeight: TouchTarget.minHeight,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 10,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
  } as ViewStyle,
  addButtonText: {
    ...Typography.Body,
    color: Colors.primary,
    fontWeight: '600',
  } as TextStyle,
  vehicleBox: {
    marginTop: 24,
    padding: 16,
    borderRadius: 10,
    backgroundColor: Colors.secondary + '40',
  } as ViewStyle,
  vehicleQuestion: {
    ...Typography.H2,
    marginBottom: 12,
  } as TextStyle,
  vehicleOptions: {
    flexDirection: 'row',
    gap: 12,
  } as ViewStyle,
  vehicleOptionBtn: {
    flex: 1,
  } as ViewStyle,
  continueError: {
    ...Typography.Caption,
    color: Colors.accent,
    marginTop: 16,
  } as TextStyle,
  continueButton: {
    marginTop: 24,
  } as ViewStyle,
  modalMessage: {
    ...Typography.Body,
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  } as TextStyle,
  modalTitle: {
    ...Typography.H2,
    marginBottom: 12,
  } as TextStyle,
  fieldLabel: {
    ...Typography.Body,
    marginTop: 12,
    marginBottom: 4,
  } as TextStyle,
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  } as ViewStyle,
  modalActionBtn: {
    flex: 1,
  } as ViewStyle,
});
