/**
 * Unit tests for the budget store (Requirement 5 — shared budget client state).
 *
 * Verifies the active-budget selection lifecycle: setActiveBudget focuses a
 * budget, and clearActiveBudget resets the selection back to none.
 */
import { useBudgetStore } from '../budgetStore';

describe('budgetStore', () => {
  beforeEach(() => {
    // Start each test from a known, unselected baseline.
    useBudgetStore.getState().clearActiveBudget();
  });

  it('starts with no active budget', () => {
    expect(useBudgetStore.getState().activeBudgetId).toBeNull();
  });

  it('setActiveBudget selects the given budget id', () => {
    useBudgetStore.getState().setActiveBudget('budget-123');

    expect(useBudgetStore.getState().activeBudgetId).toBe('budget-123');
  });

  it('setActiveBudget replaces a previously selected budget', () => {
    useBudgetStore.getState().setActiveBudget('budget-123');
    useBudgetStore.getState().setActiveBudget('budget-456');

    expect(useBudgetStore.getState().activeBudgetId).toBe('budget-456');
  });

  it('clearActiveBudget resets the selection to null', () => {
    useBudgetStore.getState().setActiveBudget('budget-123');

    useBudgetStore.getState().clearActiveBudget();

    expect(useBudgetStore.getState().activeBudgetId).toBeNull();
  });
});
