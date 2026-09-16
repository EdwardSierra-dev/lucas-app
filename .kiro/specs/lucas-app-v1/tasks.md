# Implementation Plan: Lucas App v1

## Overview

Full-stack implementation of the Lucas home finance control app across a React Native (Expo) frontend and a NestJS backend, backed by PostgreSQL via Supabase. Tasks are organized from infrastructure setup through domain modules, ending with notifications, property-based tests, and integration/E2E tests. Each task references the specific requirements and design properties it satisfies.

---

## Tasks

- [ ] 1. Project scaffolding and monorepo setup
  - [ ] 1.1 Initialize monorepo workspace with npm/yarn workspaces and create `apps/client/`, `server/`, `packages/types/`, and `docs/` directories
    - Configure `package.json` at the root with `workspaces` pointing to `apps/client`, `server`, and `packages/types`
    - Add `.gitignore`, `.editorconfig`, and root `tsconfig.base.json`
    - _Requirements: all (foundational)_

  - [ ] 1.2 Bootstrap the NestJS backend in `server/`
    - Run `nest new server` (or manual scaffold) with TypeScript strict mode
    - Install and configure: `@nestjs/config`, `@nestjs/typeorm`, `typeorm`, `pg`, `class-validator`, `class-transformer`, `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `@nestjs/schedule`, `fast-check` (dev), `jest` (dev), `supertest` (dev)
    - Create `server/.env.example` with `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SMTP_*` placeholders
    - Configure `TypeOrmModule.forRootAsync` using environment variables
    - _Requirements: all backend (foundational)_

  - [ ] 1.3 Bootstrap the Expo client in `apps/client/`
    - Initialize with `npx create-expo-app` (SDK 51+) and enable React Native Web via `@expo/webpack-config` or Metro
    - Install: `expo-router`, `zustand`, `@tanstack/react-query`, `axios`, `zod`, `react-native-testing-library` (dev), `jest` (dev), `fast-check` (dev)
    - Set up `app/_layout.tsx` as the root layout with Expo Router
    - _Requirements: all frontend (foundational)_

  - [ ] 1.4 Configure Supabase local dev environment
    - Add `supabase/config.toml` and seed files; document `supabase start` in README
    - Add `supabase/migrations/` directory for future migration files
    - _Requirements: all database (foundational)_

  - [ ] 1.5 Create `packages/types/` shared package
    - Define `LoanSource`, `NotificationType`, `ExpenseType`, shared interfaces (`Category`, `Loan`, `MoneyAmount`), and pure utility functions: `loanTotalRepayment`, `loanRemainingInstallments`, `loanOutstandingAmount`
    - Configure `packages/types/tsconfig.json` and export from `packages/types/src/index.ts`
    - _Requirements: 7.5, 7.9_

  - [ ]* 1.6 Verify monorepo wiring — checkpoint
    - Ensure all packages resolve; run `tsc --noEmit` across all workspaces
    - _Requirements: all (foundational)_

---

- [ ] 2. Theme constants, UI primitives, and shared components
  - [ ] 2.1 Create `apps/client/constants/theme.ts` with the full color palette and touch target constants
    - Export `Colors` object: `primary: '#B8A9E3'`, `secondary: '#A8D8C2'`, `accent: '#F2B8A0'`, `background: '#F7F5FF'`, `text: '#6B7280'`
    - Export `TouchTarget = { minWidth: 44, minHeight: 44 }`
    - Export typography scale (H1 24sp, H2 18sp, Body 14sp, Caption 12sp, CTA Button 16sp)
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ] 2.2 Implement core UI primitives in `apps/client/components/ui/`
    - `Button.tsx` — primary/secondary variants, enforces `44×44` minimum touch target, uses `colors.primary` background for CTA
    - `Input.tsx` — accessible label + `accessibilityLabel`, inline error display with Peach border on error, `accessibilityDescribedBy` wiring
    - `Modal.tsx` — standard and skippable variants; skippable renders "Omitir" button top-right with `44×44` min target
    - `MoneyInput.tsx` — wraps `Input`, enforces 2 decimal display via `formatMoney()`, exposes `onChangeValue(number | null)`
    - `NotificationBadge.tsx` — unread count indicator
    - `EmojiPicker.tsx` — emoji selection component
    - `CategoryCard.tsx` — selection toggle, optional delete action (custom categories), optional payment date assignment
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ] 2.3 Implement `formatMoney` utility in `apps/client/constants/theme.ts` (or `apps/client/utils/money.ts`)
    - `formatMoney(amount: number, currency?: string): string` using `Intl.NumberFormat('es-CO', { style: 'currency', minimumFractionDigits: 2, maximumFractionDigits: 2 })`
    - _Requirements: 8.3_

  - [ ]* 2.4 Write property test for `formatMoney` — P21
    - **Property 21: Monetary formatting always produces two decimal places**
    - **Validates: Requirements 8.3**
    - Use `fc.float({ noNaN: true, noDefaultInfinity: true })` as arbitrary

  - [ ]* 2.5 Write unit tests for Modal skippable variant — P22
    - **Property 22: Skippable modal renders Omitir button meeting touch target**
    - **Validates: Requirements 8.5**
    - Use React Native Testing Library to assert "Omitir" element and style dimensions

---

- [ ] 3. Authentication — backend
  - [ ] 3.1 Create the `users` database migration and `User` TypeORM entity
    - Columns: `id` UUID PK, `email` VARCHAR(254) UNIQUE, `password_hash`, `display_name`, `currency` DEFAULT 'COP', `vehicle_owner` BOOLEAN, `email_verified` BOOLEAN, `onboarding_done` BOOLEAN, `created_at`, `updated_at`
    - _Requirements: 1.1 – 1.10_

  - [ ] 3.2 Implement `AuthModule` with register, login, refresh, logout, and email-verify endpoints
    - `POST /auth/register` — hash password with bcrypt, insert user, dispatch confirmation email within 60 s, return 201
    - `POST /auth/login` — validate credentials, return `{ accessToken, refreshToken }` (access TTL 15 min, refresh TTL 7 days)
    - `POST /auth/refresh` — exchange valid refresh token for new access token
    - `POST /auth/logout` — invalidate refresh token
    - `GET /auth/verify-email?token=` — mark `email_verified = true`
    - Implement `RegisterDto` with `@IsEmail()` and `@Matches` regex for password policy
    - Implement `JwtStrategy` and `JwtAuthGuard`
    - _Requirements: 1.1 – 1.10_

  - [ ] 3.3 Implement server-side password policy validation in `RegisterDto`
    - Regex: `^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;':",.<>?\/]).{8,128}$`
    - Map validation failures to field-level error messages array
    - Return 409 if email already registered
    - _Requirements: 1.3, 1.4, 1.9_

  - [ ]* 3.4 Write property-based test for email validator — P1
    - **Property 1: Email validation accepts valid and rejects invalid addresses**
    - **Validates: Requirements 1.1, 1.2**
    - Test both the client-side Zod schema and server-side `@IsEmail()` guard

  - [ ]* 3.5 Write property-based test for password validator — P2 and P3
    - **Property 2: Password validator enforces all criteria and reports unmet ones**
    - **Property 3: Password confirmation match**
    - **Validates: Requirements 1.3, 1.4, 1.6**
    - Use `fc.string({ minLength: 0, maxLength: 200 })` and `fc.tuple(fc.string(), fc.string())`

---

- [ ] 4. Authentication — frontend
  - [ ] 4.1 Implement registration screen `apps/client/app/(auth)/register.tsx` and `RegistrationForm.tsx`
    - Email field with `Email_Validator` (Zod `z.string().email()` regex aligned with Req 1.1) — show inline error on blur/submit if invalid (Req 1.2)
    - Password field with `Password_Validator` — enforce min 8 / max 128 chars, 1 uppercase, 1 digit, 1 special char; show per-criterion inline errors (Req 1.3, 1.4)
    - Password confirmation field — show mismatch error if values differ (Req 1.5, 1.6)
    - On successful registration: show success modal with email-sent message (Req 1.7)
    - On 409 from server: show inline email error "already registered" (Req 1.9)
    - On 500 / network error: show dismissible toast, preserve form values (Req 1.10)
    - All interactive elements ≥ 44×44 px (Req 8.2); use only palette colors (Req 8.1)
    - _Requirements: 1.1 – 1.10, 8.1, 8.2_

  - [ ] 4.2 Implement login screen `apps/client/app/(auth)/login.tsx`
    - Email + password fields, submit calls `POST /auth/login`, stores tokens in `authStore`
    - Inline error on invalid credentials (401 response)
    - Axios interceptor for silent token refresh on 401 with valid refresh token
    - _Requirements: 1 (auth flow), design auth section_

  - [ ] 4.3 Implement `authStore.ts` (Zustand) and `authApi.ts` (React Query + Axios)
    - Store: `accessToken`, `refreshToken`, `user` profile, `clearAuth()` action
    - API hooks: `useRegister`, `useLogin`, `useLogout`, `useRefreshToken`
    - Axios instance with `Authorization: Bearer` interceptor and refresh-on-401 logic
    - _Requirements: 1, design auth section_

  - [ ]* 4.4 Write unit tests for RegistrationForm
    - Test: success modal shown after registration; 409 shows inline email error; 500 preserves form values; password mismatch error; each password criterion error listed individually
    - _Requirements: 1.2, 1.4, 1.7, 1.9, 1.10_

- [ ] 5. Checkpoint — auth layer complete
  - Ensure all auth backend unit + property tests pass (`cd server && npx jest --runInBand --testPathPattern=auth`)
  - Ensure registration form renders and validates correctly in Expo Web
  - Ask user if any adjustments are needed before proceeding.

---

- [ ] 6. Categories module — backend
  - [ ] 6.1 Create `categories` database migration and `Category` TypeORM entity
    - Columns per schema: `id`, `user_id` (nullable for predefined), `name` VARCHAR(40), `emoji` VARCHAR(10), `type` enum, `is_predefined`, `created_at`
    - Seed predefined categories: Agua, Luz, Gas, Arriendo, Comida, Internet, Colegio, Transporte (mandatory); Netflix, Spotify, Amazon Prime (optional)
    - _Requirements: 2.2, 3.2_

  - [ ] 6.2 Implement `CategoriesModule` with controller and service
    - `GET /categories?type=mandatory|optional` — returns predefined + user's custom categories
    - `POST /categories` — create custom category; validate name 1–40 chars, non-empty emoji, reject duplicate name case-insensitively (`LOWER(name)` check), enforce 20-category max for optional (Req 3.3)
    - `DELETE /categories/:id` — only owner can delete custom; predefined categories cannot be deleted
    - `CreateCategoryDto` with `@Length(1,40)`, `@IsNotEmpty()` on both name and emoji
    - _Requirements: 2.3 – 2.7, 3.2 – 3.4_

  - [ ]* 6.3 Write property-based tests for custom category validation — P4, P5, P6
    - **Property 4: Valid custom category addition**
    - **Property 5: Invalid custom category is rejected**
    - **Property 6: Duplicate category name rejection (case-insensitive)**
    - **Validates: Requirements 2.4, 2.5, 2.6, 3.3**

---

- [ ] 7. Onboarding flow — mandatory and non-mandatory expenses
  - [ ] 7.1 Create `user_expenses` database migration and `UserExpense` TypeORM entity
    - Columns: `id`, `user_id`, `category_id`, `payment_day` SMALLINT CHECK 1–28, `is_active`, `created_at`, `updated_at`
    - Unique constraint `(user_id, category_id)`
    - _Requirements: 2.8, 3.5_

  - [ ] 7.2 Implement `ExpensesModule` — user expense slots endpoints
    - `GET /expenses` — list configured expense slots for authenticated user
    - `POST /expenses` — configure slot (category_id + optional payment_day 1–28)
    - `PATCH /expenses/:id` — update payment_day
    - `DELETE /expenses/:id` — deactivate slot
    - Validate `payment_day` is 1–28; return 400 with field error otherwise
    - _Requirements: 2.7, 2.8, 3.4, 3.5_

  - [ ]* 7.3 Write property-based test for payment day validation — P7
    - **Property 7: Payment day validation accepts 1–28, rejects all others**
    - **Validates: Requirements 2.8, 3.5**
    - Use `fc.integer({ min: -100, max: 200 })`

  - [ ] 7.4 Implement mandatory expenses onboarding screen `apps/client/app/(onboarding)/mandatory-expenses.tsx`
    - On entry: show skippable modal with message "Estos gastos mensuales son aquellos que no puedes dejar de pagar o sino pailas papi 💪🏻"; dismiss closes modal and shows list (Req 2.1)
    - Render multi-select list of predefined mandatory categories using `CategoryCard` components (Req 2.2)
    - "+" button opens `ExpenseCategoryForm.tsx` — name input (1–30 chars for mandatory), `EmojiPicker`, submit adds to list (Req 2.3, 2.4)
    - Validation errors for empty name, whitespace-only, empty emoji, duplicate name (case-insensitive) displayed inline without closing form (Req 2.5, 2.6)
    - Deselect removes from active list; delete removes custom category permanently (Req 2.7)
    - Payment date selector per selected category (1–28 integer input) (Req 2.8)
    - Vehicle ownership Yes/No question at bottom; "Yes" triggers Vehicle_Module activation (`PATCH /users/me` → `vehicle_owner = true`) (Req 2.10, 2.11)
    - _Requirements: 2.1 – 2.11, 8.1, 8.2, 8.5_

  - [ ] 7.5 Implement non-mandatory expenses onboarding screen `apps/client/app/(onboarding)/optional-expenses.tsx`
    - On entry: show skippable modal with message "Estos gastos son aquellos que quieres pero no los necesitas 😎 alguien tenía que decírtelo" and "Omitir" button (Req 3.1)
    - Render multi-select list with Netflix, Spotify, Amazon Prime predefined categories (Req 3.2)
    - "+" button allows adding custom optional category (name 1–40 chars, emoji), max 20 custom categories (Req 3.3)
    - Removing a predefined category allows re-adding from predefined list; removing custom deletes it from list (Req 3.4)
    - Payment date input per selected category (1–28) (Req 3.5)
    - _Requirements: 3.1 – 3.5, 8.1, 8.2, 8.5_

  - [ ] 7.6 Implement `expenseStore.ts` (Zustand) and `expensesApi.ts` (React Query)
    - Store: selected categories map, custom categories list
    - Hooks: `useCategories`, `useConfigureExpense`, `useUpdatePaymentDay`, `useDeleteExpenseSlot`
    - _Requirements: 2, 3_

  - [ ]* 7.7 Write unit tests for expense configurator screens
    - Test: 8 predefined mandatory categories rendered; "+" button opens form; duplicate name shows error; custom category added to list; deselect removes from active list; 3 predefined optional categories rendered; max-20 custom limit enforced
    - _Requirements: 2.2, 2.4, 2.5, 2.6, 2.7, 3.2, 3.3_

- [ ] 8. Checkpoint — onboarding categories complete
  - Run `npx jest --runInBand --testPathPattern=categories|expenses` in server
  - Run `npx jest --runInBand --testPathPattern=mandatory|optional` in apps/client
  - Ask user if any adjustments are needed before proceeding.

---

- [ ] 9. Vehicle module — backend and frontend
  - [ ] 9.1 Create `vehicles` database migration and `Vehicle` TypeORM entity
    - Columns: `id`, `user_id` UNIQUE, `vehicle_type`, `model`, `purchase_date` DATE, `soat_expiry` DATE, `tecnomecanica_expiry` DATE, `kit_expiry` DATE (nullable), `created_at`, `updated_at`
    - _Requirements: 4.1 – 4.10_

  - [ ] 9.2 Implement `VehiclesModule` with controller and service
    - `GET /vehicles/me` — get authenticated user's vehicle record
    - `POST /vehicles` — register vehicle; validate all required fields present (Req 4.2, 4.3); reject `purchase_date` > today (Req 4.5); reject expiry date < purchase_date (Req 4.6); `kit_expiry` is optional (Req 4.4)
    - `PATCH /vehicles/me` — update vehicle data with same validations
    - On successful save: dismiss modal signal (Req 4.7)
    - _Requirements: 4.2 – 4.7_

  - [ ]* 9.3 Write property-based tests for vehicle date validations — P8, P9
    - **Property 8: Vehicle purchase date cannot be in the future**
    - **Property 9: Vehicle expiry date must be after purchase date**
    - **Validates: Requirements 4.5, 4.6**
    - Use `fc.date()` arbitraries filtered to future and past/future pairs

  - [ ] 9.4 Implement vehicle registration screen `apps/client/app/(onboarding)/vehicle-registration.tsx` and `VehicleForm.tsx`
    - Conditionally rendered only when `vehicle_owner = true` (Req 2.11)
    - Modal title: "Páseme los datos del maquinón" (Req 4.1)
    - Required fields: vehicle type, model, purchase/registration date, SOAT expiry, Tecnomecánica expiry (Req 4.2)
    - Optional field: road emergency kit renewal date; empty value is valid (Req 4.4)
    - Inline validation errors per missing/invalid field (Req 4.3); purchase date future rejection (Req 4.5); expiry date ordering (Req 4.6)
    - On success: save record, dismiss modal, advance navigation (Req 4.7)
    - _Requirements: 4.1 – 4.7, 8.1, 8.2_

  - [ ]* 9.5 Write unit tests for VehicleForm
    - Test: required field errors on empty submit; purchase date > today rejected; expiry date < purchase date rejected; kit date field absent from validation errors when empty; successful submission dismisses modal
    - _Requirements: 4.3 – 4.7_

---

- [ ] 10. Expense records module — backend and frontend
  - [ ] 10.1 Create `expense_records` database migration and `ExpenseRecord` TypeORM entity
    - Columns and indexes per schema: `(user_id, expense_date)` composite index, `category_id` index
    - Enforce `amount` NUMERIC(14,2) CHECK > 0 AND ≤ 999_999_999.99, `description` VARCHAR(255)
    - _Requirements: 5.6, 5.7, 5.8_

  - [ ] 10.2 Implement expense records endpoints in `ExpensesModule`
    - `GET /expenses/records` — list expense records, support query params for filtering (month, category, date range)
    - `POST /expenses/records` — add expense record; validate amount 0.01–999_999_999.99, description ≤ 255 chars
    - `DELETE /expenses/records/:id` — delete record; only owner can delete
    - _Requirements: 5.6, 5.7, 5.8, 5.9_

  - [ ]* 10.3 Write property-based test for financial entry validation — P11
    - **Property 11: Financial entry amount and description validation**
    - **Validates: Requirements 5.1, 5.6, 5.7, 5.8**
    - Use `fc.float()` and `fc.string()` arbitraries spanning valid and invalid ranges

  - [ ] 10.4 Implement expense record UI components and screens in `apps/client`
    - `MoneyInput.tsx` — already scaffolded in task 2.2; wire to expense record form
    - Add expense record form accessible from dashboard: category selector, amount (`MoneyInput`), description (max 255 chars), date picker
    - Display validation errors inline for amount and description
    - _Requirements: 5.6, 5.7, 5.8, 8.1, 8.2, 8.3_

---

- [ ] 11. Shared budget module — backend
  - [ ] 11.1 Create `shared_budgets`, `budget_members`, `budget_invitations`, `budget_incomes` database migrations and TypeORM entities
    - `shared_budgets`: `id`, `name`, `monthly_limit` NUMERIC(14,2), `limit_notified` BOOLEAN DEFAULT false, timestamps
    - `budget_members`: composite PK `(budget_id, user_id)`, `role`, `joined_at`
    - `budget_invitations`: `id`, `budget_id`, `inviter_id`, `invitee_email`, `status` enum, `expires_at`
    - `budget_incomes`: `id`, `budget_id`, `user_id`, `amount`, `description`, `income_date`
    - _Requirements: 5.1 – 5.12_

  - [ ] 11.2 Implement `SharedBudgetsModule` — core endpoints
    - `POST /shared-budgets` — create shared budget
    - `GET /shared-budgets/me` — get budget the authenticated user belongs to
    - `POST /shared-budgets/:id/invite` — invite user by email; reject if email not found with error message (Req 5.3); immediately insert in-app notification (Req 5.4)
    - `POST /shared-budgets/invitations/:id/accept` — grant read/write access to both members (Req 5.5)
    - `POST /shared-budgets/invitations/:id/reject`
    - _Requirements: 5.2 – 5.5_

  - [ ] 11.3 Implement shared budget expense, income, and limit endpoints
    - `POST /shared-budgets/:id/expenses` — validate amount 0.01–999_999_999.99, description ≤ 255; after insert recalculate total; if total > monthly_limit and `limit_notified = false`, dispatch budget-limit notification to all members and set `limit_notified = true` (Req 5.12)
    - `DELETE /shared-budgets/:id/expenses/:expId` — delete and recalculate total (Req 5.9)
    - `POST /shared-budgets/:id/incomes` — validate same amount/description rules (Req 5.6)
    - `PATCH /shared-budgets/:id/limit` — validate `SetLimitDto`: `@Min(0.01) @Max(999_999_999.99)` (Req 5.10, 5.11)
    - _Requirements: 5.6 – 5.12_

  - [ ]* 11.4 Write property-based tests for shared budget validation — P11, P12, P13, P14
    - **Property 11: Financial entry amount and description validation** (shared budget variant)
    - **Property 12: Expense removal recalculates budget total exactly**
    - **Property 13: Monthly budget limit validation**
    - **Property 14: Budget limit exceeded alert fires exactly once per month cycle**
    - **Validates: Requirements 5.8, 5.9, 5.10, 5.11, 5.12**

---

- [ ] 12. Shared budget — frontend
  - [ ] 12.1 Implement shared budget screen `apps/client/app/(tabs)/shared-budget.tsx` and related forms
    - `BudgetLimitForm.tsx` — `MoneyInput` for monthly limit, validation error on invalid amount
    - Income entry form — amount + description fields with validation
    - Expense entry form — amount + description fields with validation
    - Invite flow — email input, error on unknown email (Req 5.3), in-app notification badge update on invitation acceptance
    - Display current total expenses vs monthly limit with Peach accent alert when limit exceeded
    - _Requirements: 5.1 – 5.12, 8.1, 8.2, 8.3_

  - [ ] 12.2 Implement `budgetStore.ts` (Zustand) and `sharedBudgetApi.ts` (React Query)
    - Store: budget state, members list, expenses list, incomes list, limit
    - Subscribe to Supabase Realtime channel for `notifications` INSERT events to receive budget invitations ≤ 30 s (Req 5.4)
    - Hooks: `useSharedBudget`, `useInviteUser`, `useAcceptInvitation`, `useAddBudgetExpense`, `useRemoveBudgetExpense`, `useAddBudgetIncome`, `useSetBudgetLimit`
    - _Requirements: 5.4, 5.5_

  - [ ]* 12.3 Write unit tests for shared budget UI
    - Test: invitation error shown for unknown email; expense form rejects amount=0; limit form rejects limit=0; expense list updates after delete
    - _Requirements: 5.3, 5.8, 5.11_

- [ ] 13. Checkpoint — shared budget complete
  - Run `npx jest --runInBand --testPathPattern=shared-budget` in server and apps/client
  - Ask user if any adjustments are needed before proceeding.

---

- [ ] 14. Metrics module — backend
  - [ ] 14.1 Implement `MetricsModule` with `POST /metrics/expenses`
    - Accept `MetricsQueryDto`: optional `months[]` (up to 5), `categoryId`, `startDate`, `endDate` (ISO date), `budgetMemberId`
    - Reject filter if `startDate > endDate` with 400 validation error (Req 6.7)
    - Execute filtered query against `expense_records` with all applicable WHERE clauses; use database-level filtering for performance
    - Return `MetricsResponse`: `totalSum`, `records[]` (each with `amount`, `date`, `category`, `description`), `appliedFilters`, `computedAt` within 2 s (Req 6.5)
    - Return `totalSum: 0` and empty records array when no matches (Req 6.8)
    - _Requirements: 6.1 – 6.8_

  - [ ]* 14.2 Write property-based tests for metrics — P15, P16, P17
    - **Property 15: Metrics filter returns only matching records**
    - **Property 16: Metrics total sum equals sum of matching records**
    - **Property 17: Metrics rejects date range where start exceeds end**
    - **Validates: Requirements 6.1 – 6.8**
    - Use `fc.array(expenseRecordArb)` and `fc.record(filterArb)` arbitraries

---

- [ ] 15. Metrics — frontend
  - [ ] 15.1 Implement metrics screen `apps/client/app/(tabs)/metrics.tsx`
    - Month selector (up to 5 calendar months) — chips/toggle UI using `colors.primary`
    - Category dropdown filter
    - Date range picker (start + end); show error "rango de fechas inválido" if start > end without clearing results (Req 6.7)
    - Budget member filter when Shared_Budget is active (single member per operation) (Req 6.4)
    - On filter confirm: call `POST /metrics/expenses`, display total sum and per-record breakdown (amount, date, category, description) (Req 6.6)
    - Show zero total and "no records found" message on empty results (Req 6.8)
    - _Requirements: 6.1 – 6.8, 8.1, 8.2, 8.3_

  - [ ] 15.2 Implement chart components
    - `SpendingBarChart.tsx` — bar chart of totals by month using palette colors
    - `CategoryPieChart.tsx` — pie chart of totals by category
    - Wire charts to metrics response data
    - _Requirements: 6.6, 8.1_

  - [ ] 15.3 Implement `metricsApi.ts` React Query hook `useMetrics(filter: MetricsQueryDto)`
    - Returns `{ totalSum, records, isLoading, isError }`
    - _Requirements: 6.5_

  - [ ]* 15.4 Write unit tests for metrics screen
    - Test: date range error shown without clearing results; zero-result state displayed; correct total sum rendered for given records
    - _Requirements: 6.7, 6.8_

---

- [ ] 16. Loans module — backend and frontend
  - [ ] 16.1 Create `loans` database migration and `Loan` TypeORM entity
    - Columns per schema with CHECK constraints for bank/person fields
    - `CONSTRAINT bank_loan_fields`, `CONSTRAINT person_loan_fields` as defined in design
    - _Requirements: 7.1 – 7.9_

  - [ ] 16.2 Implement `LoansModule` — endpoints
    - `GET /loans` — list active loans where `installments_paid < total_installments`; compute and return `remainingInstallments` and `outstandingAmount` using shared utilities (Req 7.9)
    - `POST /loans` — create loan; validate by source type: bank requires `cuota > 0` (Req 7.3); person requires `capital > 0`, `interest_per_installment ≥ 0`, `total_installments > 0` (Req 7.6, 7.7, 7.8); compute and return `totalRepayment` before confirmation (Req 7.5)
    - `PATCH /loans/:id/installment` — increment `installments_paid`
    - `DELETE /loans/:id` — delete loan record
    - _Requirements: 7.1 – 7.9_

  - [ ]* 16.3 Write property-based tests for loan validation and computation — P18, P19, P20
    - **Property 18: Loan input validation (bank and person)**
    - **Property 19: Person loan total repayment computation = capital + (interest × installments)**
    - **Property 20: Active loan remaining and outstanding amount computation**
    - **Validates: Requirements 7.3, 7.5, 7.6, 7.7, 7.8, 7.9**
    - Use `fc.tuple(fc.float(...), fc.float(...), fc.integer(...))` as per design test strategy

  - [ ] 16.4 Implement loans screen `apps/client/app/(tabs)/loans.tsx` and `LoanForm.tsx`
    - When user selects "Préstamo" as expense category, show two-option prompt: "Banco" or "Persona" (Req 7.1)
    - Bank path: show only `cuota` input; validation error if ≤ 0 (Req 7.2, 7.3)
    - Person path: show capital, interest per installment, total installments fields; compute and display total repayment `C + I × N` before confirmation (Req 7.4, 7.5); validation errors per field (Req 7.6 – 7.8)
    - Dedicated loans summary view: list active loans with remaining installments and outstanding amount per loan (Req 7.9)
    - All amounts rendered via `MoneyInput` / `formatMoney` (Req 8.3)
    - _Requirements: 7.1 – 7.9, 8.1, 8.2, 8.3_

  - [ ]* 16.5 Write unit tests for LoanForm
    - Test: bank path shows only cuota field; person path shows 3 fields; cuota=0 shows error; capital=0 shows error; interest<0 shows error; installments=0 shows error; total repayment formula displayed correctly
    - _Requirements: 7.1 – 7.8_

- [ ] 17. Checkpoint — domain modules complete
  - Run full backend test suite: `cd server && npx jest --runInBand`
  - Run full frontend test suite: `cd apps/client && npx jest --runInBand`
  - Ask user if any adjustments are needed before proceeding to notifications.

---

- [ ] 18. Notification system — backend scheduler and event triggers
  - [ ] 18.1 Create `notifications` database migration and `Notification` TypeORM entity
    - Columns: `id`, `user_id`, `type` VARCHAR(50), `payload` JSONB, `channel` VARCHAR(20) CHECK ('in_app','push','email'), `read` BOOLEAN, `sent_at`, `created_at`
    - Index: `(user_id, read, created_at DESC)`
    - _Requirements: 2.9, 3.6, 4.8, 4.9, 4.10, 5.4, 5.12_

  - [ ] 18.2 Implement `NotificationsModule` with `NotificationsService`
    - `createNotification(userId, type, payload, channel)` — insert into `notifications` table
    - `GET /notifications` — list unread notifications for authenticated user
    - `PATCH /notifications/:id/read` — mark as read
    - Wire Supabase Realtime channel subscription on client to `notifications` table INSERT for user
    - _Requirements: 5.4, general notification delivery_

  - [ ] 18.3 Implement scheduled payment reminder job
    - `@Cron('50 8 * * *')` — `sendPaymentReminders()`: query `user_expenses` where `payment_day = tomorrow OR payment_day = today`; dispatch push notification per slot (Req 2.9, 3.6)
    - Non-mandatory reminder dispatched at 09:00 local time on payment day (Req 3.6)
    - One-day-away reminder for mandatory expenses (Req 2.9)
    - _Requirements: 2.9, 3.6_

  - [ ] 18.4 Implement vehicle document expiry reminder job
    - `@Cron('0 8 * * *')` — `sendVehicleExpiryReminders()`: query vehicles where `soat_expiry`, `tecnomecanica_expiry`, or `kit_expiry` is within 30 calendar days of today
    - Dispatch one notification per expiring document per user identifying the document (Req 4.8, 4.9, 4.10)
    - No notification if expiry > 30 days away or already past
    - _Requirements: 4.8, 4.9, 4.10_

  - [ ] 18.5 Implement monthly cron job to reset `limit_notified`
    - `@Cron('0 0 1 * *')` — reset `limit_notified = false` on all `shared_budgets` at start of each month
    - _Requirements: 5.12, design error handling section_

  - [ ]* 18.6 Write property-based test for vehicle expiry notification window — P10
    - **Property 10: Vehicle document expiry notification window (0–30 days)**
    - **Validates: Requirements 4.8, 4.9, 4.10**
    - Use `fc.date()` arbitraries; assert notification dispatched iff days-to-expiry ∈ [0, 30]

  - [ ]* 18.7 Write unit tests for notification scheduler
    - Test: payment reminder job dispatches for payment_day = today and tomorrow; vehicle expiry dispatches for T+29, not T+31; budget limit notification created exactly once when expenses cross limit; in-app notification inserted within budget invite path
    - _Requirements: 2.9, 3.6, 4.8 – 4.10, 5.4, 5.12_

---

- [ ] 19. Notification system — frontend
  - [ ] 19.1 Register push notification token via Expo Notifications
    - On app startup, call `Notifications.getExpoPushTokenAsync()` and persist token to `PATCH /users/me` (or dedicated endpoint)
    - Request permissions with user-friendly prompt
    - _Requirements: 2.9, 3.6, 4.8 – 4.10_

  - [ ] 19.2 Wire Supabase Realtime in-app notification listener
    - Subscribe to Supabase Realtime channel for authenticated user's `notifications` table INSERT events
    - On new notification: update `NotificationBadge` count in `budgetStore` / dedicated notification slice
    - Display in-app alert for `budget_invitation` type notifications within 30 s (Req 5.4)
    - _Requirements: 5.4_

  - [ ]* 19.3 Write unit tests for notification frontend integration
    - Test: NotificationBadge count increments on new in-app notification; budget limit alert banner shows when limit exceeded; push token registration called on startup
    - _Requirements: 5.4, 5.12_

- [ ] 20. Checkpoint — notifications complete
  - Run full backend test suite including scheduler tests
  - Ask user if any adjustments are needed before final integration tests.

---

- [ ] 21. API integration tests (Supertest + local Supabase)
  - [ ]* 21.1 Write integration test for full registration flow
    - `POST /auth/register` success → assert 201, user in DB, email job queued
    - `POST /auth/register` with existing email → assert 409 with conflict message
    - _Requirements: 1.7, 1.8, 1.9_

  - [ ]* 21.2 Write integration test for shared budget invitation and acceptance flow
    - Create budget → invite by email → accept invitation → assert both members can write expenses and incomes
    - _Requirements: 5.2 – 5.5_

  - [ ]* 21.3 Write integration test for budget limit notification fires exactly once
    - Seed shared budget with limit L; add expenses summing to > L; assert `notifications` has exactly one budget_limit record for that month cycle; add more expenses; assert still exactly one record
    - _Requirements: 5.12_

  - [ ]* 21.4 Write integration test for vehicle expiry scheduler
    - Seed vehicles with `soat_expiry = today + 29 days` and `soat_expiry = today + 31 days`; run scheduler manually; assert notification created for T+29 only
    - _Requirements: 4.8_

  - [ ]* 21.5 Write integration test for metrics endpoint correctness
    - Seed expense records spanning multiple months and categories; call `POST /metrics/expenses` with various filter combinations; assert `totalSum` equals arithmetic sum of returned records
    - _Requirements: 6.5, 6.6_

---

- [ ] 22. E2E and final wiring
  - [ ] 22.1 Wire all onboarding navigation in `apps/client/app/_layout.tsx`
    - Unauthenticated users → `(auth)/register` or `(auth)/login`
    - Authenticated + `onboarding_done = false` → `(onboarding)/mandatory-expenses` → `(onboarding)/optional-expenses` → conditionally `(onboarding)/vehicle-registration` → set `onboarding_done = true` → `(tabs)/dashboard`
    - Authenticated + `onboarding_done = true` → `(tabs)/dashboard`
    - _Requirements: 2, 3, 4, design navigation section_

  - [ ] 22.2 Implement `apps/client/app/(tabs)/dashboard.tsx` overview screen
    - Display summary of current month expenses vs monthly limit (if shared budget active)
    - Quick-add expense button; navigation to metrics, loans, shared-budget tabs
    - Use palette colors and `44×44` touch targets throughout (Req 8.1, 8.2)
    - _Requirements: 8.1, 8.2, 8.4_

  - [ ]* 22.3 Write Playwright E2E tests for Web (critical flows)
    - Test: registration → onboarding → dashboard navigation renders correctly
    - Test: add expense → metrics filter shows correct total
    - Test: shared budget invite → accept → both members see the same budget
    - _Requirements: 1, 5, 6_

  - [ ]* 22.4 Write Detox E2E test for Android (smoke tests)
    - Test: app launch → registration screen rendered; login flow; notification permission prompt
    - _Requirements: 8.4_

- [ ] 23. Final checkpoint — all tests pass
  - Run `cd server && npx jest --runInBand` (unit + property + integration)
  - Run `cd apps/client && npx jest --runInBand` (unit + component + property)
  - Run `cd e2e && npx playwright test` (Web E2E)
  - Fix any failing tests before considering implementation complete.
  - Ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; all PBT and E2E sub-tasks are optional.
- Each task references specific requirements for full traceability.
- Checkpoints (tasks 5, 8, 13, 17, 20, 23) validate incremental progress and prevent regressions.
- Property tests validate universal correctness properties (P1–P22) defined in the design document.
- Unit tests validate specific examples and edge cases.
- All 22 correctness properties defined in the design are covered by property-based test sub-tasks.
- The implementation language is TypeScript throughout: NestJS on the backend and React Native (Expo) on the frontend.

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4"] },
    { "id": 2, "tasks": ["1.5", "1.6"] },
    { "id": 3, "tasks": ["2.1", "2.2", "2.3", "3.1"] },
    { "id": 4, "tasks": ["2.4", "2.5", "3.2", "3.3"] },
    { "id": 5, "tasks": ["3.4", "3.5", "4.1", "6.1", "7.1", "9.1", "10.1", "11.1", "16.1", "18.1"] },
    { "id": 6, "tasks": ["4.2", "4.3", "6.2", "7.2", "9.2", "10.2", "11.2", "14.1", "16.2"] },
    { "id": 7, "tasks": ["4.4", "6.3", "7.3", "9.3", "10.3", "11.3", "14.2", "16.3"] },
    { "id": 8, "tasks": ["7.4", "7.5", "7.6", "9.4", "10.4", "11.4", "12.1", "12.2", "15.1", "16.4", "18.2"] },
    { "id": 9, "tasks": ["7.7", "9.5", "12.3", "15.2", "15.3", "16.5", "18.3", "18.4", "18.5"] },
    { "id": 10, "tasks": ["15.4", "18.6", "18.7", "19.1", "19.2"] },
    { "id": 11, "tasks": ["19.3", "22.1", "22.2"] },
    { "id": 12, "tasks": ["21.1", "21.2", "21.3", "21.4", "21.5"] },
    { "id": 13, "tasks": ["22.3", "22.4"] }
  ]
}
```
