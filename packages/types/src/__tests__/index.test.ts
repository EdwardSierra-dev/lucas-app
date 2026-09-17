import {
  loanTotalRepayment,
  loanRemainingInstallments,
  loanOutstandingAmount,
  Loan,
} from '../index';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function bankLoan(overrides: Partial<Loan> = {}): Loan {
  return {
    id: 'loan-bank-1',
    userId: 'user-1',
    source: 'bank',
    installmentAmount: 500,
    totalInstallments: 12,
    installmentsPaid: 0,
    startDate: '2024-01-01',
    ...overrides,
  };
}

function personLoan(overrides: Partial<Loan> = {}): Loan {
  return {
    id: 'loan-person-1',
    userId: 'user-1',
    source: 'person',
    capital: 1_000_000,
    interestPerInstallment: 50_000,
    totalInstallments: 10,
    installmentsPaid: 0,
    startDate: '2024-01-01',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// loanTotalRepayment
// ---------------------------------------------------------------------------

describe('loanTotalRepayment', () => {
  describe('bank loan', () => {
    it('computes installmentAmount × totalInstallments', () => {
      const loan = bankLoan({ installmentAmount: 500, totalInstallments: 12 });
      expect(loanTotalRepayment(loan)).toBe(6_000);
    });

    it('returns 0 when installmentAmount is 0', () => {
      const loan = bankLoan({ installmentAmount: 0, totalInstallments: 12 });
      expect(loanTotalRepayment(loan)).toBe(0);
    });

    it('returns 0 when totalInstallments is 0', () => {
      const loan = bankLoan({ installmentAmount: 500, totalInstallments: 0 });
      expect(loanTotalRepayment(loan)).toBe(0);
    });

    it('falls back to 0 for undefined installmentAmount', () => {
      const loan = bankLoan({ installmentAmount: undefined, totalInstallments: 6 });
      expect(loanTotalRepayment(loan)).toBe(0);
    });

    it('falls back to 0 for undefined totalInstallments', () => {
      const loan = bankLoan({ installmentAmount: 200, totalInstallments: undefined });
      expect(loanTotalRepayment(loan)).toBe(0);
    });
  });

  describe('person loan', () => {
    it('computes capital + (interestPerInstallment × totalInstallments)', () => {
      const loan = personLoan({
        capital: 1_000_000,
        interestPerInstallment: 50_000,
        totalInstallments: 10,
      });
      // 1_000_000 + 50_000 × 10 = 1_500_000
      expect(loanTotalRepayment(loan)).toBe(1_500_000);
    });

    it('works with zero interest (interest-free loan)', () => {
      const loan = personLoan({
        capital: 500_000,
        interestPerInstallment: 0,
        totalInstallments: 5,
      });
      expect(loanTotalRepayment(loan)).toBe(500_000);
    });

    it('falls back to 0 for undefined capital', () => {
      const loan = personLoan({ capital: undefined, interestPerInstallment: 1_000, totalInstallments: 5 });
      expect(loanTotalRepayment(loan)).toBe(5_000);
    });

    it('falls back to 0 for undefined interestPerInstallment', () => {
      const loan = personLoan({
        capital: 200_000,
        interestPerInstallment: undefined,
        totalInstallments: 4,
      });
      expect(loanTotalRepayment(loan)).toBe(200_000);
    });
  });
});

// ---------------------------------------------------------------------------
// loanRemainingInstallments
// ---------------------------------------------------------------------------

describe('loanRemainingInstallments', () => {
  it('returns totalInstallments when no payments have been made', () => {
    expect(loanRemainingInstallments(bankLoan({ totalInstallments: 12, installmentsPaid: 0 }))).toBe(12);
  });

  it('returns 0 when all installments are paid', () => {
    expect(loanRemainingInstallments(bankLoan({ totalInstallments: 12, installmentsPaid: 12 }))).toBe(0);
  });

  it('returns the correct remainder after partial payments', () => {
    expect(loanRemainingInstallments(bankLoan({ totalInstallments: 10, installmentsPaid: 3 }))).toBe(7);
  });

  it('falls back to 0 for undefined totalInstallments', () => {
    const loan = bankLoan({ totalInstallments: undefined, installmentsPaid: 0 });
    expect(loanRemainingInstallments(loan)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// loanOutstandingAmount
// ---------------------------------------------------------------------------

describe('loanOutstandingAmount', () => {
  describe('bank loan', () => {
    it('computes installmentAmount × remainingInstallments', () => {
      const loan = bankLoan({ installmentAmount: 500, totalInstallments: 12, installmentsPaid: 4 });
      // remaining = 8 → 500 × 8 = 4_000
      expect(loanOutstandingAmount(loan)).toBe(4_000);
    });

    it('returns 0 when all installments are paid', () => {
      const loan = bankLoan({ installmentAmount: 500, totalInstallments: 12, installmentsPaid: 12 });
      expect(loanOutstandingAmount(loan)).toBe(0);
    });

    it('returns full amount when no installments are paid', () => {
      const loan = bankLoan({ installmentAmount: 300, totalInstallments: 6, installmentsPaid: 0 });
      expect(loanOutstandingAmount(loan)).toBe(1_800);
    });
  });

  describe('person loan', () => {
    it('computes interestPerInstallment × remainingInstallments', () => {
      const loan = personLoan({
        interestPerInstallment: 50_000,
        totalInstallments: 10,
        installmentsPaid: 3,
      });
      // remaining = 7 → 50_000 × 7 = 350_000
      expect(loanOutstandingAmount(loan)).toBe(350_000);
    });

    it('returns 0 when all installments are paid', () => {
      const loan = personLoan({
        interestPerInstallment: 50_000,
        totalInstallments: 10,
        installmentsPaid: 10,
      });
      expect(loanOutstandingAmount(loan)).toBe(0);
    });

    it('returns 0 with zero interest and remaining installments', () => {
      const loan = personLoan({
        interestPerInstallment: 0,
        totalInstallments: 5,
        installmentsPaid: 2,
      });
      expect(loanOutstandingAmount(loan)).toBe(0);
    });
  });
});
