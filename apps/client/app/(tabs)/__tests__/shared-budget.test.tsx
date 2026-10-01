/**
 * Rendering tests for the shared budget workspace screen (Requirement 5).
 *
 * The screen pulls server state through React Query hooks in
 * `services/sharedBudgetApi`; those are fully mocked here so the component
 * renders synchronously without a QueryClient. The budget store is the real
 * client state (it drives picker vs. workspace) and is reset before each test.
 *
 * These tests exercise the picker branch (no active budget): with an empty
 * budget list the screen shows the empty-state copy and the "Crear
 * presupuesto" button. The screen does not use expo-router directly, so no
 * router mock is needed; authStore is only read in the workspace branch, which
 * is not rendered here.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { useBudgetStore } from '../../../store/budgetStore';

// --- Mock the shared budget API hooks so no real network requests happen -----
const mockUseBudgets = jest.fn();
const noopMutation = () => ({
  mutate: jest.fn(),
  mutateAsync: jest.fn(),
  isPending: false,
  isError: false,
  isSuccess: false,
  error: null,
  reset: jest.fn(),
});

jest.mock('../../../services/sharedBudgetApi', () => ({
  useBudgets: () => mockUseBudgets(),
  useCreateBudget: () => noopMutation(),
  useBudgetMembers: () => ({ data: [], isLoading: false, isError: false }),
  useInviteMember: () => noopMutation(),
  useBudgetIncomes: () => ({ data: [], isLoading: false, isError: false }),
  useAddIncome: () => noopMutation(),
  useBudgetExpenses: () => ({ data: [], isLoading: false, isError: false }),
  useAddBudgetExpense: () => noopMutation(),
  useSetLimit: () => noopMutation(),
}));

// Imported after the mocks are declared.
import SharedBudgetScreen from '../shared-budget';

describe('SharedBudgetScreen (picker, no active budget)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useBudgetStore.getState().clearActiveBudget();
  });

  it('renders the empty state and the create button when there are no budgets', () => {
    mockUseBudgets.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<SharedBudgetScreen />);

    expect(screen.getByText('Presupuestos compartidos')).toBeTruthy();
    expect(
      screen.getByText(
        'Aún no tienes presupuestos compartidos. Crea uno para empezar.',
      ),
    ).toBeTruthy();
    expect(screen.getByLabelText('Crear presupuesto')).toBeTruthy();
  });

  it('shows a loading indicator while budgets are loading', () => {
    mockUseBudgets.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    });

    render(<SharedBudgetScreen />);

    expect(screen.getByLabelText('Cargando presupuestos')).toBeTruthy();
  });
});
