/**
 * Deeper unit tests for the expense draft store, exercising the scenarios the
 * expense configurator screens drive (Requirements 2.x & 3.x).
 *
 * The basic lifecycle (single-category toggle/set/reset) is covered in
 * `expenseStore.test.ts`; this file adds the multi-category and
 * work-preservation behaviours the mandatory/optional onboarding screens rely
 * on when a user configures several categories at once.
 */
import { useExpenseStore } from '../expenseStore';

const CAT_A = 'cat-a';
const CAT_B = 'cat-b';
const CAT_C = 'cat-c';

describe('expenseStore — configurator scenarios', () => {
  beforeEach(() => {
    useExpenseStore.getState().reset();
  });

  it('tracks multiple categories independently', () => {
    const store = useExpenseStore.getState();
    store.toggleCategory(CAT_A);
    store.toggleCategory(CAT_B);
    store.setPaymentDay(CAT_A, 5);
    store.setAmount(CAT_A, 100);
    store.setPaymentDay(CAT_B, 20);
    store.setAmount(CAT_B, 55.5);

    const { selections } = useExpenseStore.getState();
    expect(selections[CAT_A]).toEqual({
      selected: true,
      paymentDay: 5,
      amount: 100,
    });
    expect(selections[CAT_B]).toEqual({
      selected: true,
      paymentDay: 20,
      amount: 55.5,
    });
  });

  it('toggling one category does not affect the others', () => {
    const store = useExpenseStore.getState();
    store.toggleCategory(CAT_A);
    store.toggleCategory(CAT_B);

    // Deselect only A.
    store.toggleCategory(CAT_A);

    const { selections } = useExpenseStore.getState();
    expect(selections[CAT_A]?.selected).toBe(false);
    expect(selections[CAT_B]?.selected).toBe(true);
  });

  it('re-selecting a deselected category preserves its amount and payment day', () => {
    const store = useExpenseStore.getState();
    store.toggleCategory(CAT_A); // select
    store.setPaymentDay(CAT_A, 12);
    store.setAmount(CAT_A, 320);

    store.toggleCategory(CAT_A); // deselect — keeps the configured values
    let entry = useExpenseStore.getState().selections[CAT_A];
    expect(entry?.selected).toBe(false);
    expect(entry?.paymentDay).toBe(12);
    expect(entry?.amount).toBe(320);

    store.toggleCategory(CAT_A); // re-select — work restored
    entry = useExpenseStore.getState().selections[CAT_A];
    expect(entry).toEqual({ selected: true, paymentDay: 12, amount: 320 });
  });

  it('updating payment day / amount keeps the latest value (last write wins)', () => {
    const store = useExpenseStore.getState();
    store.toggleCategory(CAT_A);
    store.setPaymentDay(CAT_A, 3);
    store.setPaymentDay(CAT_A, 28);
    store.setAmount(CAT_A, 10);
    store.setAmount(CAT_A, 999.99);

    const entry = useExpenseStore.getState().selections[CAT_A];
    expect(entry?.paymentDay).toBe(28);
    expect(entry?.amount).toBe(999.99);
    expect(entry?.selected).toBe(true);
  });

  it('reset clears every configured category at once', () => {
    const store = useExpenseStore.getState();
    store.toggleCategory(CAT_A);
    store.toggleCategory(CAT_B);
    store.toggleCategory(CAT_C);
    store.setAmount(CAT_C, 42);

    store.reset();

    expect(useExpenseStore.getState().selections).toEqual({});
  });

  it('exposes only the selected entries for submission filtering', () => {
    const store = useExpenseStore.getState();
    store.toggleCategory(CAT_A); // selected
    store.toggleCategory(CAT_B); // selected
    store.toggleCategory(CAT_B); // deselected again
    store.setAmount(CAT_C, 10); // configured but never selected

    const selectedIds = Object.entries(useExpenseStore.getState().selections)
      .filter(([, entry]) => entry.selected)
      .map(([id]) => id);

    expect(selectedIds).toEqual([CAT_A]);
  });
});
