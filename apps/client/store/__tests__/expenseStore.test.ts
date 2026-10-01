/**
 * Unit tests for the expense draft store (Requirements 2.x & 3.x — onboarding
 * expense configuration client state).
 *
 * Verifies the draft selection lifecycle: toggling selects/deselects a
 * category, setPaymentDay/setAmount populate the entry (creating it if needed),
 * and reset clears all drafts.
 */
import { useExpenseStore } from '../expenseStore';

const CAT = 'cat-1';

describe('expenseStore', () => {
  beforeEach(() => {
    // Start each test from an empty draft.
    useExpenseStore.getState().reset();
  });

  it('toggleCategory selects a previously unselected category', () => {
    useExpenseStore.getState().toggleCategory(CAT);

    expect(useExpenseStore.getState().selections[CAT]).toEqual({
      selected: true,
    });
  });

  it('toggleCategory deselects an already-selected category', () => {
    useExpenseStore.getState().toggleCategory(CAT); // select
    useExpenseStore.getState().toggleCategory(CAT); // deselect

    expect(useExpenseStore.getState().selections[CAT]?.selected).toBe(false);
  });

  it('setPaymentDay updates the entry (creating it when absent)', () => {
    useExpenseStore.getState().setPaymentDay(CAT, 15);

    const entry = useExpenseStore.getState().selections[CAT];
    expect(entry?.paymentDay).toBe(15);
    // Entry is created unselected until the user toggles it.
    expect(entry?.selected).toBe(false);
  });

  it('setAmount updates the entry (creating it when absent)', () => {
    useExpenseStore.getState().setAmount(CAT, 250.5);

    expect(useExpenseStore.getState().selections[CAT]?.amount).toBe(250.5);
  });

  it('setPaymentDay / setAmount preserve selection and each other', () => {
    const store = useExpenseStore.getState();
    store.toggleCategory(CAT);
    store.setPaymentDay(CAT, 10);
    store.setAmount(CAT, 99.99);

    expect(useExpenseStore.getState().selections[CAT]).toEqual({
      selected: true,
      paymentDay: 10,
      amount: 99.99,
    });
  });

  it('reset clears all drafts', () => {
    const store = useExpenseStore.getState();
    store.toggleCategory(CAT);
    store.setPaymentDay(CAT, 5);

    store.reset();

    expect(useExpenseStore.getState().selections).toEqual({});
  });
});
