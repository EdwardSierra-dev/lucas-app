/**
 * Unit tests for the Metrics screen (Requirement 6 — Metrics_Engine).
 *
 * The `useMetrics` hook is fully mocked so the screen renders synchronously
 * without a React Query provider. A controllable `mockUseMetrics` lets each
 * test shape the React Query result ({ data, isLoading, isError }).
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import MetricsScreen from '../metrics';
import { formatMoney } from '../../../utils/money';
import type { MetricsResult } from '../../../services/metricsApi';

// --- metricsApi mock --------------------------------------------------------
// A single controllable function drives every render; each test sets its
// return value before rendering. We re-export only `useMetrics` because that
// is all the screen imports from the module at runtime (the rest are types).
const mockUseMetrics = jest.fn();

jest.mock('../../../services/metricsApi', () => ({
  useMetrics: () => mockUseMetrics(),
}));

/** Build a React-Query-shaped result for the mocked hook. */
function queryResult(overrides: Partial<{
  data: MetricsResult | undefined;
  isLoading: boolean;
  isError: boolean;
}>) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    ...overrides,
  };
}

const SAMPLE_RESULT: MetricsResult = {
  total: 136.49,
  breakdown: [
    { key: 'cat-1', label: 'Comida', total: 90.0, count: 3 },
    { key: 'cat-2', label: 'Transporte', total: 46.49, count: 1 },
  ],
  from: null,
  to: null,
};

beforeEach(() => {
  mockUseMetrics.mockReset();
  // Default to a loaded empty-but-valid result; tests override as needed.
  mockUseMetrics.mockReturnValue(
    queryResult({
      data: { total: 0, breakdown: [], from: null, to: null },
    }),
  );
});

describe('MetricsScreen', () => {
  it('renders the title, the three groupBy chips, from/to inputs, and the Aplicar button', () => {
    render(<MetricsScreen />);

    expect(screen.getByRole('header', { name: 'Métricas' })).toBeTruthy();

    // Three groupBy chips (addressable by their accessibility labels).
    expect(screen.getByLabelText('Agrupar por Categoría')).toBeTruthy();
    expect(screen.getByLabelText('Agrupar por Mes')).toBeTruthy();
    expect(screen.getByLabelText('Agrupar por Tipo')).toBeTruthy();

    // Date inputs.
    expect(screen.getByLabelText('Fecha desde')).toBeTruthy();
    expect(screen.getByLabelText('Fecha hasta')).toBeTruthy();

    // Apply button.
    expect(screen.getByRole('button', { name: 'Aplicar' })).toBeTruthy();
  });

  it('renders the total and each breakdown row (label + formatted amount + count)', () => {
    mockUseMetrics.mockReturnValue(queryResult({ data: SAMPLE_RESULT }));

    render(<MetricsScreen />);

    // Total — accessibilityLabel includes the formatted total.
    expect(
      screen.getByLabelText(`Total ${formatMoney(SAMPLE_RESULT.total)}`),
    ).toBeTruthy();

    // Each breakdown row: label, formatted amount, and count text.
    expect(screen.getByText('Comida')).toBeTruthy();
    expect(screen.getByText(formatMoney(90.0))).toBeTruthy();
    expect(screen.getByText('3 registros')).toBeTruthy();

    expect(screen.getByText('Transporte')).toBeTruthy();
    expect(screen.getByText(formatMoney(46.49))).toBeTruthy();
    // Singular form for a count of one.
    expect(screen.getByText('1 registro')).toBeTruthy();
  });

  it('shows the "no records" message when the breakdown is empty', () => {
    mockUseMetrics.mockReturnValue(
      queryResult({
        data: { total: 0, breakdown: [], from: null, to: null },
      }),
    );

    render(<MetricsScreen />);

    expect(
      screen.getByText(
        'No se encontraron registros para los filtros seleccionados.',
      ),
    ).toBeTruthy();
  });

  it('shows the loading indicator while loading', () => {
    mockUseMetrics.mockReturnValue(
      queryResult({ data: undefined, isLoading: true }),
    );

    render(<MetricsScreen />);

    expect(screen.getByLabelText('Cargando métricas')).toBeTruthy();
  });

  it('shows the error message on error', () => {
    mockUseMetrics.mockReturnValue(
      queryResult({ data: undefined, isError: true }),
    );

    render(<MetricsScreen />);

    expect(
      screen.getByText('No se pudieron cargar las métricas. Intenta de nuevo.'),
    ).toBeTruthy();
  });

  it('shows a range error when "from" is after "to" and Aplicar is pressed', () => {
    // The screen-local validation runs regardless of the (mocked) query result.
    mockUseMetrics.mockReturnValue(queryResult({ data: SAMPLE_RESULT }));

    render(<MetricsScreen />);

    fireEvent.changeText(screen.getByLabelText('Fecha desde'), '2024-02-01');
    fireEvent.changeText(screen.getByLabelText('Fecha hasta'), '2024-01-01');
    fireEvent.press(screen.getByRole('button', { name: 'Aplicar' }));

    expect(screen.getByText('Rango de fechas inválido')).toBeTruthy();
    // Results are left intact (total still shown).
    expect(
      screen.getByLabelText(`Total ${formatMoney(SAMPLE_RESULT.total)}`),
    ).toBeTruthy();
  });

  it('updates the selected groupBy chip when pressed', () => {
    render(<MetricsScreen />);

    const categoria = screen.getByLabelText('Agrupar por Categoría');
    const mes = screen.getByLabelText('Agrupar por Mes');

    // Default selection is "Categoría".
    expect(categoria.props.accessibilityState).toMatchObject({ selected: true });
    expect(mes.props.accessibilityState).toMatchObject({ selected: false });

    fireEvent.press(mes);

    expect(
      screen.getByLabelText('Agrupar por Mes').props.accessibilityState,
    ).toMatchObject({ selected: true });
    expect(
      screen.getByLabelText('Agrupar por Categoría').props.accessibilityState,
    ).toMatchObject({ selected: false });
  });
});
