/**
 * Render tests for NotificationBadge (notification frontend integration —
 * Task 19.3).
 *
 * Verifies the unread-count badge behaviour the in-app notification flow relies
 * on when a new notification arrives (Req 5.4):
 *   • count 0 with default hideWhenZero → nothing rendered;
 *   • count 0 with hideWhenZero={false} → shows "0";
 *   • count 3 → shows "3";
 *   • count > 99 → shows "99+";
 *   • exposes an accessibilityLabel describing the unread count (Spanish copy,
 *     singular / plural handled).
 *
 * Validates: Requirements 5.4
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { NotificationBadge } from '../NotificationBadge';

describe('NotificationBadge', () => {
  it('renders nothing when count is 0 and hideWhenZero defaults to true', () => {
    render(<NotificationBadge count={0} />);

    expect(screen.queryByText('0')).toBeNull();
    expect(screen.queryByLabelText(/sin leer/)).toBeNull();
  });

  it('renders "0" when count is 0 but hideWhenZero is false', () => {
    render(<NotificationBadge count={0} hideWhenZero={false} />);

    expect(screen.getByText('0')).toBeTruthy();
  });

  it('shows the exact count for a small number', () => {
    render(<NotificationBadge count={3} />);

    expect(screen.getByText('3')).toBeTruthy();
  });

  it('caps the display at "99+" when count exceeds 99', () => {
    render(<NotificationBadge count={150} />);

    expect(screen.getByText('99+')).toBeTruthy();
    expect(screen.queryByText('150')).toBeNull();
  });

  it('shows "99" exactly at the boundary (not capped)', () => {
    render(<NotificationBadge count={99} />);

    expect(screen.getByText('99')).toBeTruthy();
  });

  it('exposes a pluralized accessibility label for multiple unread', () => {
    render(<NotificationBadge count={3} />);

    // Matches the exact label produced by NotificationBadge (count !== 1 → "es").
    expect(screen.getByLabelText('3 notificaciónes sin leer')).toBeTruthy();
  });

  it('exposes a singular accessibility label for a single unread', () => {
    render(<NotificationBadge count={1} />);

    expect(screen.getByLabelText('1 notificación sin leer')).toBeTruthy();
  });
});
