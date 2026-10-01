/**
 * Non-mandatory (optional) expenses onboarding screen
 * (Expo Router route: /(onboarding)/optional-expenses).
 *
 * Mirrors the mandatory expenses step but for discretionary subscriptions and
 * non-essential monthly expenses (categories with `type === 'optional'`).
 * This whole step is skippable — optional expenses are not required.
 *
 *   • Req 3.1 — presents an intro modal with the "Estos gastos son aquellos…"
 *     message and a visible "Omitir" button that dismisses it and proceeds to
 *     the expense list.
 *   • Req 3.2 — renders the predefined optional categories (Netflix, Spotify,
 *     Amazon Prime) alongside any user custom optional categories.
 *   • Req 3.3 — the add (+) button opens a modal (name Input + EmojiPicker) to
 *     create a custom optional category (name 1–40 chars, max 20 custom),
 *     persisted via useCreateCategory({ ..., type: 'optional' }).
 *   • Req 3.4 — custom categories can be deleted via useDeleteCategory;
 *     predefined categories can be deselected and re-selected.
 *   • Req 3.5 — a selected category can be assigned a Payment_Date (1–28).
 *   • "Continuar" persists each selected category as a user-expense slot via
 *     useCreateUserExpense, resets the draft, and advances to the vehicle step.
 *   • "Omitir" skips straight to the vehicle step without any selections.
 */
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import {
  Button,
  CategoryCard,
  EmojiPicker,
  Input,
  Modal,
} from '../../components/ui';
import { Colors, Typography } from '../../constants/theme';
import { useExpenseStore } from '../../store/expenseStore';
import {
  useCategories,
  useCreateCategory,
  useCreateUserExpense,
  useDeleteCategory,
  type Category,
  type CreateUserExpensePayload,
} from '../../services/expensesApi';

// ---------------------------------------------------------------------------
// Constants (inlined to avoid sharing a file with the mandatory step)
// ---------------------------------------------------------------------------

/** Where the flow continues after this (optional) onboarding step. */
const NEXT_ROUTE = '/(onboarding)/vehicle-registration' as const;

/** Req 3.1 — intro modal copy for the optional expenses step. */
const INTRO_MESSAGE =
  'Estos gastos son aquellos que quieres pero no los necesitas 😎 alguien tenía que decírtelo';

/** Req 3.3 — name length bounds and the custom category cap. */
const NAME_MIN = 1;
const NAME_MAX = 40;
const MAX_CUSTOM_CATEGORIES = 20;

/** Default emoji for a new custom category until the user picks one. */
const DEFAULT_EMOJI = '🎬';

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function OptionalExpensesScreen(): React.JSX.Element {
  const router = useRouter();

  const categoriesQuery = useCategories();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();
  const createUserExpense = useCreateUserExpense();

  const selections = useExpenseStore((s) => s.selections);
  const toggleCategory = useExpenseStore((s) => s.toggleCategory);
  const setPaymentDay = useExpenseStore((s) => s.setPaymentDay);
  const resetDraft = useExpenseStore((s) => s.reset);

  // Req 3.1 — the intro modal is visible on first entry.
  const [introVisible, setIntroVisible] = useState(true);

  // Add-custom-category modal state.
  const [addVisible, setAddVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState(DEFAULT_EMOJI);
  const [nameError, setNameError] = useState<string | undefined>(undefined);

  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | undefined>(
    undefined,
  );

  // Req 3.2 — only optional categories belong to this step.
  const optionalCategories = useMemo<Category[]>(
    () => (categoriesQuery.data ?? []).filter((c) => c.type === 'optional'),
    [categoriesQuery.data],
  );

  const customCount = useMemo(
    () => optionalCategories.filter((c) => !c.isPredefined).length,
    [optionalCategories],
  );

  const atCustomLimit = customCount >= MAX_CUSTOM_CATEGORIES;

  // ----- Add custom category (Req 3.3) -------------------------------------

  const openAddModal = (): void => {
    setNewName('');
    setNewEmoji(DEFAULT_EMOJI);
    setNameError(undefined);
    setAddVisible(true);
  };

  const closeAddModal = (): void => {
    setAddVisible(false);
  };

  const validateName = (raw: string): string | undefined => {
    const trimmed = raw.trim();
    if (trimmed.length < NAME_MIN) {
      return 'El nombre es obligatorio.';
    }
    if (trimmed.length > NAME_MAX) {
      return `El nombre no puede superar ${NAME_MAX} caracteres.`;
    }
    // Req 2.6 (shared) — reject a duplicate name, case-insensitive.
    const duplicate = optionalCategories.some(
      (c) => c.name.trim().toLowerCase() === trimmed.toLowerCase(),
    );
    if (duplicate) {
      return 'Ya existe una categoría con ese nombre.';
    }
    return undefined;
  };

  const handleCreateCategory = (): void => {
    const error = validateName(newName);
    if (error) {
      setNameError(error);
      return;
    }
    if (atCustomLimit) {
      setNameError(
        `Alcanzaste el máximo de ${MAX_CUSTOM_CATEGORIES} categorías personalizadas.`,
      );
      return;
    }

    createCategory.mutate(
      { name: newName.trim(), emoji: newEmoji, type: 'optional' },
      {
        onSuccess: () => {
          closeAddModal();
        },
        onError: () => {
          setNameError(
            'No se pudo crear la categoría. Por favor, inténtalo de nuevo.',
          );
        },
      },
    );
  };

  const handleDeleteCategory = (id: string): void => {
    deleteCategory.mutate(id);
  };

  // ----- Payment day (Req 3.5) ---------------------------------------------

  const handleSetPaymentDate = (id: string, day: number): void => {
    setPaymentDay(id, day);
  };

  // ----- Navigation --------------------------------------------------------

  const goNext = (): void => {
    router.push(NEXT_ROUTE);
  };

  /** Req 3.1 — "Omitir": dismiss and skip without any selections. */
  const handleSkip = (): void => {
    resetDraft();
    goNext();
  };

  /** Persist each selected optional category as a user-expense slot. */
  const handleContinue = async (): Promise<void> => {
    setGeneralError(undefined);

    const payloads: CreateUserExpensePayload[] = Object.entries(selections)
      .filter(([, entry]) => entry.selected)
      .map(([categoryId, entry]) => ({
        categoryId,
        amount: entry.amount ?? 0,
        paymentDay: entry.paymentDay ?? 1,
      }));

    // Nothing selected — behaves like a skip (optional step).
    if (payloads.length === 0) {
      handleSkip();
      return;
    }

    setSubmitting(true);
    try {
      await Promise.all(
        payloads.map((payload) =>
          createUserExpense.mutateAsync(payload),
        ),
      );
      resetDraft();
      goNext();
    } catch {
      setGeneralError(
        'No se pudieron guardar tus gastos. Por favor, inténtalo de nuevo.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ----- Render ------------------------------------------------------------

  return (
    <View style={styles.screen}>
      {/* Req 3.1 — intro modal with skippable Omitir button. */}
      <Modal
        visible={introVisible}
        onClose={() => setIntroVisible(false)}
        skippable
      >
        <Text style={styles.modalMessage} accessibilityRole="text">
          {INTRO_MESSAGE}
        </Text>
      </Modal>

      {/* Add custom category modal (Req 3.3). */}
      <Modal visible={addVisible} onClose={closeAddModal}>
        <Text style={styles.modalTitle} accessibilityRole="header">
          Nueva categoría
        </Text>
        <Input
          label="Nombre"
          value={newName}
          onChangeText={(text) => {
            setNewName(text);
            if (nameError) setNameError(undefined);
          }}
          maxLength={NAME_MAX}
          error={nameError}
          placeholder="Ej. HBO Max"
          accessibilityLabel="Nombre de la categoría"
        />
        <Text style={styles.pickerLabel}>Elige un emoji</Text>
        <EmojiPicker
          selectedEmoji={newEmoji}
          onSelectEmoji={setNewEmoji}
          maxHeight={240}
        />
        <View style={styles.modalActions}>
          <Button
            label="Cancelar"
            variant="secondary"
            onPress={closeAddModal}
            disabled={createCategory.isPending}
            style={styles.modalButton}
          />
          <Button
            label="Agregar"
            onPress={handleCreateCategory}
            loading={createCategory.isPending}
            style={styles.modalButton}
          />
        </View>
      </Modal>

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title} accessibilityRole="header">
          ¿Y tus gastos opcionales?
        </Text>
        <Text style={styles.subtitle}>
          Selecciona tus suscripciones y gastos no esenciales. Este paso es
          opcional, puedes omitirlo cuando quieras.
        </Text>

        {generalError ? (
          <View
            style={styles.errorBanner}
            accessibilityRole="alert"
            accessibilityLabel={generalError}
          >
            <Text style={styles.errorBannerText}>{generalError}</Text>
          </View>
        ) : null}

        {categoriesQuery.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={styles.loadingText}>Cargando categorías…</Text>
          </View>
        ) : categoriesQuery.isError ? (
          <View style={styles.errorBanner} accessibilityRole="alert">
            <Text style={styles.errorBannerText}>
              No se pudieron cargar las categorías.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {optionalCategories.map((category) => {
              const entry = selections[category.id];
              return (
                <CategoryCard
                  key={category.id}
                  name={category.name}
                  emoji={category.emoji}
                  selected={entry?.selected ?? false}
                  paymentDate={entry?.paymentDay}
                  onToggle={() => toggleCategory(category.id)}
                  onSetPaymentDate={(day) =>
                    handleSetPaymentDate(category.id, day)
                  }
                  onDelete={
                    category.isPredefined
                      ? undefined
                      : () => handleDeleteCategory(category.id)
                  }
                />
              );
            })}

            {optionalCategories.length === 0 ? (
              <Text style={styles.emptyText}>
                Aún no hay categorías opcionales. Agrega una con el botón de
                abajo.
              </Text>
            ) : null}
          </View>
        )}

        {/* Req 3.3 — add (+) custom optional category. */}
        <Button
          label="＋ Agregar categoría"
          variant="secondary"
          onPress={openAddModal}
          disabled={atCustomLimit || categoriesQuery.isLoading}
          accessibilityLabel="Agregar una categoría personalizada"
          style={styles.addButton}
        />
        {atCustomLimit ? (
          <Text style={styles.limitText}>
            Alcanzaste el máximo de {MAX_CUSTOM_CATEGORIES} categorías
            personalizadas.
          </Text>
        ) : null}

        <View style={styles.footer}>
          <Button
            label="Continuar"
            onPress={() => {
              void handleContinue();
            }}
            loading={submitting}
            accessibilityLabel="Continuar al siguiente paso"
            style={styles.footerButton}
          />
          <Button
            label="Omitir"
            variant="secondary"
            onPress={handleSkip}
            disabled={submitting}
            accessibilityLabel="Omitir los gastos opcionales"
            style={styles.footerButton}
          />
        </View>
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
    padding: 24,
    paddingTop: 64,
  } as ViewStyle,
  title: {
    ...Typography.H1,
    marginBottom: 8,
  } as TextStyle,
  subtitle: {
    ...Typography.Body,
    marginBottom: 24,
  } as TextStyle,
  list: {
    marginBottom: 16,
  } as ViewStyle,
  emptyText: {
    ...Typography.Body,
    color: Colors.text,
    textAlign: 'center',
    paddingVertical: 16,
  } as TextStyle,
  addButton: {
    alignSelf: 'stretch',
    marginBottom: 8,
  } as ViewStyle,
  limitText: {
    ...Typography.Caption,
    color: Colors.accent,
    marginBottom: 8,
  } as TextStyle,
  footer: {
    marginTop: 16,
    gap: 12,
  } as ViewStyle,
  footerButton: {
    alignSelf: 'stretch',
  } as ViewStyle,
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 24,
  } as ViewStyle,
  loadingText: {
    ...Typography.Body,
  } as TextStyle,
  errorBanner: {
    backgroundColor: Colors.accent,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  } as ViewStyle,
  errorBannerText: {
    ...Typography.Body,
    color: Colors.background,
  } as TextStyle,
  modalMessage: {
    ...Typography.H2,
    textAlign: 'center',
  } as TextStyle,
  modalTitle: {
    ...Typography.H2,
    marginBottom: 12,
  } as TextStyle,
  pickerLabel: {
    ...Typography.Body,
    marginTop: 12,
    marginBottom: 6,
  } as TextStyle,
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  } as ViewStyle,
  modalButton: {
    flex: 1,
  } as ViewStyle,
});
