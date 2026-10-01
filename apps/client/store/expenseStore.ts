/**
 * Expense store (Zustand) — onboarding / configuration DRAFT state
 * (Requirements 2.x & 3.x — mandatory and optional expense configuration).
 *
 * Design reference: design.md "Frontend State Management" — Zustand owns the
 * transient selection state the onboarding screens build up (which categories
 * the user picked, and the payment day / amount they are entering for each)
 * BEFORE anything is persisted. The actual server state (saved categories and
 * user expenses) lives in the React Query cache via `services/expensesApi.ts`.
 *
 * This store is intentionally draft-only: no persistence. Once the user
 * confirms an onboarding step, the selections here are turned into
 * `POST /user-expenses` calls and the draft is `reset()`.
 *
 * Selections are modelled as a `Record<categoryId, ExpenseDraftEntry>` so a
 * screen can look up a single category in O(1) and iterate selected entries
 * for submission.
 */
import { create } from 'zustand';

/**
 * Draft configuration a user is building for one category during onboarding.
 * `paymentDay` / `amount` stay optional until the user fills them in — the
 * mandatory flow requires both before submit, the optional flow is laxer.
 */
export interface ExpenseDraftEntry {
  /** Whether this category is currently selected for configuration. */
  selected: boolean;
  /** Day of month (1–28) the expense is due; undefined until chosen. */
  paymentDay?: number;
  /** Configured amount; undefined until entered. */
  amount?: number;
}

export interface ExpenseState {
  /** Draft entries keyed by category id. */
  selections: Record<string, ExpenseDraftEntry>;
  /**
   * Toggle a category's selection. Selecting creates (or re-flags) an entry;
   * deselecting flips `selected` to false but keeps any paymentDay/amount the
   * user already entered, so re-selecting restores their work.
   */
  toggleCategory: (id: string) => void;
  /** Set the payment day for a category (creates the entry if absent). */
  setPaymentDay: (id: string, day: number) => void;
  /** Set the amount for a category (creates the entry if absent). */
  setAmount: (id: string, amount: number) => void;
  /** Clear all draft selections (called after a step is submitted). */
  reset: () => void;
}

/** A fresh, unselected draft entry. */
function emptyEntry(): ExpenseDraftEntry {
  return { selected: false };
}

export const useExpenseStore = create<ExpenseState>()((set) => ({
  selections: {},

  toggleCategory: (id) =>
    set((state) => {
      const existing = state.selections[id] ?? emptyEntry();
      return {
        selections: {
          ...state.selections,
          [id]: { ...existing, selected: !existing.selected },
        },
      };
    }),

  setPaymentDay: (id, day) =>
    set((state) => {
      const existing = state.selections[id] ?? emptyEntry();
      return {
        selections: {
          ...state.selections,
          [id]: { ...existing, paymentDay: day },
        },
      };
    }),

  setAmount: (id, amount) =>
    set((state) => {
      const existing = state.selections[id] ?? emptyEntry();
      return {
        selections: {
          ...state.selections,
          [id]: { ...existing, amount },
        },
      };
    }),

  reset: () => set({ selections: {} }),
}));
