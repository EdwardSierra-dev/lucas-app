/**
 * Unit tests for the Modal skippable variant.
 *
 * Property 22: Skippable modal always renders an "Omitir" button with a
 * 44×44 minimum touch target.
 *
 * **Validates: Requirement 8.5**
 */
import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Modal } from '../Modal';
import { TouchTarget } from '../../../constants/theme';

describe('Modal — skippable variant (P22)', () => {
  it('renders an element labeled "Omitir" when skippable and visible', () => {
    render(
      <Modal visible skippable onClose={jest.fn()}>
        <Text>Contenido</Text>
      </Modal>
    );

    expect(screen.getByLabelText('Omitir')).toBeTruthy();
  });

  it('does not render the "Omitir" button when skippable is false', () => {
    render(
      <Modal visible skippable={false} onClose={jest.fn()}>
        <Text>Contenido</Text>
      </Modal>
    );

    expect(screen.queryByLabelText('Omitir')).toBeNull();
  });

  it('does not render the "Omitir" button when skippable is omitted', () => {
    render(
      <Modal visible onClose={jest.fn()}>
        <Text>Contenido</Text>
      </Modal>
    );

    expect(screen.queryByLabelText('Omitir')).toBeNull();
  });

  it('calls onClose when the "Omitir" button is pressed', () => {
    const onClose = jest.fn();
    render(
      <Modal visible skippable onClose={onClose}>
        <Text>Contenido</Text>
      </Modal>
    );

    fireEvent.press(screen.getByLabelText('Omitir'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('enforces a minimum 44×44 touch target on the "Omitir" button', () => {
    render(
      <Modal visible skippable onClose={jest.fn()}>
        <Text>Contenido</Text>
      </Modal>
    );

    const omitir = screen.getByLabelText('Omitir');
    const flattened = StyleSheet.flatten(omitir.props.style);

    expect(flattened.minWidth).toBeGreaterThanOrEqual(44);
    expect(flattened.minHeight).toBeGreaterThanOrEqual(44);
    // Also confirm the dimensions come from the shared TouchTarget constant.
    expect(flattened.minWidth).toBe(TouchTarget.minWidth);
    expect(flattened.minHeight).toBe(TouchTarget.minHeight);
  });

  it('renders an "X" close button for standard (non-skippable) modals', () => {
    render(
      <Modal visible onClose={jest.fn()}>
        <Text>Contenido</Text>
      </Modal>
    );

    expect(screen.getByLabelText('Cerrar')).toBeTruthy();
  });

  it('calls onClose when the "X" close button is pressed', () => {
    const onClose = jest.fn();
    render(
      <Modal visible onClose={onClose}>
        <Text>Contenido</Text>
      </Modal>
    );

    fireEvent.press(screen.getByLabelText('Cerrar'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render the "X" close button when closable is false', () => {
    render(
      <Modal visible closable={false} onClose={jest.fn()}>
        <Text>Contenido</Text>
      </Modal>
    );

    expect(screen.queryByLabelText('Cerrar')).toBeNull();
  });

  it('shows "Omitir" instead of "X" for skippable modals', () => {
    render(
      <Modal visible skippable onClose={jest.fn()}>
        <Text>Contenido</Text>
      </Modal>
    );

    expect(screen.getByLabelText('Omitir')).toBeTruthy();
    expect(screen.queryByLabelText('Cerrar')).toBeNull();
  });

  it('renders children when the modal is visible', () => {
    render(
      <Modal visible onClose={jest.fn()}>
        <Text>Contenido visible</Text>
      </Modal>
    );

    expect(screen.getByText('Contenido visible')).toBeTruthy();
  });

  it('does not display children when the modal is not visible', () => {
    render(
      <Modal visible={false} onClose={jest.fn()}>
        <Text>Contenido oculto</Text>
      </Modal>
    );

    // The underlying RN Modal is not shown when visible={false}, so its
    // children are not present in the rendered tree.
    expect(screen.queryByText('Contenido oculto')).toBeNull();
  });
});
