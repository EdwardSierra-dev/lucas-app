/**
 * Client-side loan validation schema (Requirement 7).
 *
 * Mirrors the server rules enforced by the NestJS LoansModule so the client
 * rejects bad input before it reaches the API. Loans come from one of two
 * sources, and the required fields depend on that source:
 *
 *   • Bank  (`source: 'bank'`)  — only the installment amount (`cuota`) is
 *     collected. It must be strictly greater than zero (Req 7.2, 7.3).
 *   • Person (`source: 'person'`) — capital, interest per installment, and the
 *     total number of installments (plazo) are collected. Capital must be
 *     greater than zero (Req 7.6), interest must be ≥ 0 (Req 7.7), and the
 *     total installments must be ≥ 1 (Req 7.8).
 *
 * Both sources carry a `totalInstallments` (≥ 1), an optional `installmentsPaid`
 * (≥ 0 and never greater than `totalInstallments`), an optional `description`,
 * and an ISO `startDate` (`YYYY-MM-DD`).
 *
 * Source-conditional requirements are expressed with `superRefine` so that each
 * invalid field reports its own path/message (Property P18 — reject with a
 * validation error identifying each invalid field).
 */
import { z } from 'zod';

/** Matches a calendar date in strict ISO `YYYY-MM-DD` form. */
export const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Loan source discriminator shared with the backend. */
export const LOAN_SOURCES = ['bank', 'person'] as const;
export type LoanSource = (typeof LOAN_SOURCES)[number];

/** True when `value` is a syntactically valid, real calendar date in ISO form. */
function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_REGEX.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }
  // Reject values the Date constructor silently rolls over (e.g. 2024-02-31).
  const [year, month, day] = value.split('-').map(Number);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() + 1 === month &&
    parsed.getDate() === day
  );
}

/**
 * The raw object parsed from the form. Numeric amounts arrive as `number | null`
 * because the MoneyInput exposes `null` for empty/invalid input; the schema then
 * rejects `null` for the fields that are required by the chosen source.
 */
const loanObjectSchema = z.object({
  source: z.enum(LOAN_SOURCES, {
    errorMap: () => ({ message: 'Selecciona el origen del préstamo' }),
  }),
  installmentAmount: z.number().nullable().optional(),
  capital: z.number().nullable().optional(),
  interestPerInstallment: z.number().nullable().optional(),
  totalInstallments: z
    .number({ invalid_type_error: 'El plazo es obligatorio' })
    .int('El plazo debe ser un número entero')
    .min(1, 'El plazo debe ser al menos 1'),
  installmentsPaid: z
    .number()
    .int('Las cuotas pagadas deben ser un número entero')
    .min(0, 'Las cuotas pagadas no pueden ser negativas')
    .optional(),
  description: z
    .string()
    .trim()
    .max(255, 'La descripción no debe superar los 255 caracteres')
    .optional(),
  startDate: z
    .string()
    .trim()
    .min(1, 'La fecha de inicio es obligatoria')
    .refine(isValidIsoDate, 'La fecha debe tener el formato AAAA-MM-DD'),
});

export const loanSchema = loanObjectSchema.superRefine((data, ctx) => {
  if (data.source === 'bank') {
    // Req 7.2 / 7.3 — bank loans require only a positive cuota.
    if (data.installmentAmount == null || data.installmentAmount <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['installmentAmount'],
        message: 'La cuota debe ser mayor que cero',
      });
    }
  } else {
    // Req 7.6 — person loans require a positive capital.
    if (data.capital == null || data.capital <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['capital'],
        message: 'El capital debe ser mayor que cero',
      });
    }
    // Req 7.7 — interest per installment must be ≥ 0.
    if (data.interestPerInstallment == null || data.interestPerInstallment < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['interestPerInstallment'],
        message: 'El interés por cuota no puede ser negativo',
      });
    }
    // Req 7.8 — total installments must be ≥ 1 (already enforced above, but a
    // null slips through as a type error there; keep the person path explicit).
  }

  // installmentsPaid, when present, must not exceed the total installments.
  if (
    data.installmentsPaid != null &&
    data.installmentsPaid > data.totalInstallments
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['installmentsPaid'],
      message: 'Las cuotas pagadas no pueden superar el plazo',
    });
  }
});

/** Validated form shape (before normalization into the API payload). */
export type LoanFormValues = z.infer<typeof loanSchema>;

/** Body sent to the Loan_Module API (POST /loans). */
export interface LoanPayload {
  source: LoanSource;
  installmentAmount?: number;
  capital?: number;
  interestPerInstallment?: number;
  totalInstallments: number;
  installmentsPaid?: number;
  description?: string;
  startDate: string;
}

/**
 * Normalizes validated form values into the API payload, keeping only the
 * fields relevant to the chosen source and dropping empty optionals.
 */
export function toLoanPayload(values: LoanFormValues): LoanPayload {
  const payload: LoanPayload = {
    source: values.source,
    totalInstallments: values.totalInstallments,
    startDate: values.startDate,
  };

  if (values.source === 'bank') {
    // installmentAmount is guaranteed non-null for bank loans by the refine.
    payload.installmentAmount = values.installmentAmount ?? 0;
  } else {
    payload.capital = values.capital ?? 0;
    payload.interestPerInstallment = values.interestPerInstallment ?? 0;
  }

  if (values.installmentsPaid != null) {
    payload.installmentsPaid = values.installmentsPaid;
  }

  const description = values.description?.trim();
  if (description) {
    payload.description = description;
  }

  return payload;
}
