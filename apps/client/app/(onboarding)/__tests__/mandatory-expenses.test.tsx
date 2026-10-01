/**
 * Rendering tests for the mandatory expenses onboarding screen (Requirement 2).
 *
 * The screen pulls server state through React Query hooks in
 * `services/expensesApi` and navigation through `expo-router`. Both are fully
 * mocked here so the component renders synchronously without a QueryClient or a
 * router context, letting the test focus on the screen's own behaviour:
 *   • it renders the predefined mandatory categories returned by useCategories,
 *   • it filters out non-mandatory categories,
 *   • toggling a CategoryCard drives the real expense draft store (observable
 *     via the store state and the re-rendered selection styling).
 *
 * The expense draft store is intentionally NOT mocked — it is the pure client
 * state under test — but it is reset before each test for isolation.
 */
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';

import type { Category } from '../../../services/expensesApi';
import { useExpenseStore } from '../../../store/expenseStore';

// --- Mock expo-router: the screen only uses useRouter().push -----------------
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

// --- Mock the expenses API hooks so no real network requests happen ----------
const mockUseCategories = jest.fn();
const noopMutation = () => ({
  mutate: jest.fn(),
  mutateAsync: jest.fn(),
  isPending: false,
  isError: false,
  isSuccess: false,
  reset: jest.fn(),
});

jest.mock('../../../services/expensesApi', () => ({
  useCategories: () => mockUseCategories(),
  useCreateCategory: () => noopMutation(),
  useDeleteCategory: () => noopMutation(),
  useCreateUserExpense: () => noopMutation(),
}));

// Imported after the mocks are declared.
import MandatoryExpensesScreen from '../mandatory-expenses';

const MANDATORY: Category[] = [
  {
    id: 'rent',
    userId: null,
    name: 'Arriendo',
    emoji: '🏠',
    type: 'mandatory',
    isPredefined: true,
  },
  {
    id: 'utilities',
    userId: null,
    name: 'Servicios',
    emoji: '💡',
    type: 'mandatory',
    isPredefined: true,
  },
];

const OPTIONAL: Category = {
  id: 'netflix',
  userId: null,
  name: 'Netflix',
  emoji: '🎬',
  type: 'optional',
  isPredefined: true,
};

function mockCategoriesSuccess(data: Category[]) {
  mockUseCategories.mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  });
}

describe('MandatoryExpensesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useExpenseStore.getState().reset();
  });

  it('renders the predefined mandatory categories and the screen title', () => {
    mockCategoriesSuccess(MANDATORY);

    render(<MandatoryExpensesScreen />);

    expect(screen.getByText('¿Cuáles son tus gastos fijos?')).toBeTruthy();
    expect(screen.getByText('Arriendo')).toBeTruthy();
    expect(screen.getByText('Servicios')).toBeTruthy();
  });

  it('shows only mandatory categories, filtering out other types', () => {
    mockCategoriesSuccess([...MANDATORY, OPTIONAL]);

    render(<MandatoryExpensesScreen />);

    expect(screen.getByText('Arriendo')).toBeTruthy();
    expect(screen.queryByText('Netflix')).toBeNull();
  });

  it('toggling a category card updates the draft store selection', () => {
    mockCategoriesSuccess(MANDATORY);

    render(<MandatoryExpensesScreen />);

    // Initially nothing is selected.
    expect(useExpenseStore.getState().selections.rent?.selected).toBeFalsy();

    // The toggle control is labelled "Seleccionar <name>" when unselected.
    fireEvent.press(screen.getByLabelText('Seleccionar Arriendo'));

    expect(useExpenseStore.getState().selections.rent?.selected).toBe(true);

    // After selection the card re-renders with the deselect label.
    fireEvent.press(screen.getByLabelText('Deseleccionar Arriendo'));
    expect(useExpenseStore.getState().selections.rent?.selected).toBe(false);
  });

  it('shows a loading indicator while categories are loading', () => {
    mockUseCategories.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: jest.fn(),
    });

    render(<MandatoryExpensesScreen />);

    expect(screen.getByLabelText('Cargando categorías')).toBeTruthy();
  });

  it('shows an error state with a retry action when the query fails', () => {
    mockUseCategories.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: jest.fn(),
    });

    render(<MandatoryExpensesScreen />);

    expect(
      screen.getByText('No se pudieron cargar las categorías.'),
    ).toBeTruthy();
    expect(screen.getByText('Reintentar')).toBeTruthy();
  });
});
