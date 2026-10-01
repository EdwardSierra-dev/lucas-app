/**
 * Budget store (Zustand) — holds the client-side UI state for the shared
 * budget workspace (Requirement 5).
 *
 * Design reference: design.md "Frontend State Management" — Zustand owns the
 * global/UI state (which budget the workspace is currently focused on) while
 * React Query (see services/sharedBudgetApi.ts) owns the server state (the
 * budgets, members, incomes and expenses fetched from the backend).
 *
 * This store deliberately keeps only lightweight client-side state:
 *   • activeBudgetId — the budget currently selected in the workspace. Screens
 *     read this to decide which budget's data to query/display. It is `null`
 *     when no budget is selected.
 *
 * It is intentionally NOT persisted: the active selection is ephemeral UI
 * state that should reset between app launches (unlike auth tokens).
 */
import { create } from 'zustand';

export interface BudgetState {
  /** Id of the budget the workspace is currently focused on (null = none). */
  activeBudgetId: string | null;
  /** Select the active budget shown in the shared-budget workspace. */
  setActiveBudget: (id: string) => void;
  /** Clear the current selection (e.g. on leaving the workspace). */
  clearActiveBudget: () => void;
}

export const useBudgetStore = create<BudgetState>()((set) => ({
  activeBudgetId: null,

  setActiveBudget: (id) => set({ activeBudgetId: id }),

  clearActiveBudget: () => set({ activeBudgetId: null }),
}));
