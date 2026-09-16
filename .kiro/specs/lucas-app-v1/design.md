# Design Document — Lucas App v1

## Overview

Lucas is a cross-platform home finance control application targeting Android and Web from a single React Native (Expo) codebase. The system allows individual users and households to track income, mandatory and non-mandatory monthly expenses, vehicle-related costs and document deadlines, shared budgets, financial metrics, and third-party loan repayments.

### Scope

This document covers the complete technical design for the six functional modules defined in the requirements: user registration and authentication (Req 1), mandatory expense configuration (Req 2), non-mandatory expense configuration (Req 3), vehicle expense tracking (Req 4), shared household budgets (Req 5), financial metrics and filtering (Req 6), third-party loan management (Req 7), and UX/UI design standards (Req 8).

### Design Goals

- **Single codebase**: All UI runs on React Native (Expo) targeting Android and Web without branching logic beyond platform-native navigation gestures.
- **Integrity first**: All financial amounts stored with decimal precision; validation enforced on both client and server.
- **Real-time collaboration**: Shared budgets provide read/write access to both members with consistent state.
- **Proactive notifications**: Payment, document expiry, and budget-limit alerts delivered via push and in-app channels.
- **Accessibility**: All interactive elements meet a 44×44 logical pixel touch target minimum.

---

## Architecture

### High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                         │
│                                                             │
│   ┌──────────────────┐         ┌──────────────────────┐    │
│   │   Android App    │         │       Web App        │    │
│   │  (Expo Go / APK) │         │  (Expo Web / Browser)│    │
│   └────────┬─────────┘         └──────────┬───────────┘    │
│            │           React Native        │               │
│            └──────────────┬───────────────┘               │
└───────────────────────────┼───────────────────────────────┘
                            │  HTTPS / REST  (JWT)
                            ▼
┌───────────────────────────────────────────────────────────┐
│                       API LAYER                           │
│              Node.js — NestJS (TypeScript)                │
│                                                           │
│  ┌────────────┐ ┌──────────────┐ ┌──────────────────┐   │
│  │ Auth       │ │ Expense /    │ │  Shared Budget   │   │
│  │ Module     │ │ Vehicle /    │ │  Module          │   │
│  │            │ │ Loan Modules │ │                  │   │
│  └────────────┘ └──────────────┘ └──────────────────┘   │
│                                                           │
│  ┌──────────────────────┐  ┌────────────────────────┐   │
│  │  Metrics Module      │  │  Notification Service  │   │
│  └──────────────────────┘  └────────────────────────┘   │
└───────────────────────┬───────────────────────────────────┘
                        │  Supabase SDK / pg driver
                        ▼
┌───────────────────────────────────────────────────────────┐
│                    DATA LAYER                             │
│            PostgreSQL via Supabase (Cloud)                │
│                                                           │
│  users │ expenses │ categories │ vehicles │               │
│  shared_budgets │ budget_members │ incomes │              │
│  loans │ notifications │ audit_log                        │
└───────────────────────────────────────────────────────────┘
```

### Technology Decisions

| Concern | Choice | Rationale |
|:---|:---|:---|
| Frontend | React Native (Expo SDK 51+) + React Native Web | Single codebase for Android and Web |
| State management | Zustand + React Query | Lightweight global state; server state via React Query cache |
| Navigation | Expo Router (file-based) | Unified routing on both platforms |
| Backend framework | NestJS (TypeScript) | Modules, guards, pipes match our domain decomposition; built-in validation |
| ORM | TypeORM (with PostgreSQL dialect) | First-class NestJS integration; migrations support |
| Database | PostgreSQL via Supabase | ACID compliance for financial data; Supabase adds auth and realtime channels |
| Auth | JWT (access + refresh) / OAuth2 | Stateless; access tokens expire in 15 min; refresh tokens in 7 days |
| Push notifications | Expo Notifications (FCM / APNs) | Cross-platform from single codebase |
| In-app notifications | Supabase Realtime channels | Low-latency delivery inside the app |
| Validation (client) | Zod | Schema-first; shared types possible between client and server |
| Validation (server) | class-validator + class-transformer (NestJS Pipes) | Decorators on DTO classes |
| Testing (unit/property) | Jest + fast-check | Property-based testing via fast-check |

---

## Components and Interfaces

### Backend — NestJS Modules

```
server/
├── src/
│   ├── auth/               # AuthModule
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── jwt.strategy.ts
│   │   └── dto/
│   ├── users/              # UsersModule
│   │   ├── users.service.ts
│   │   └── entities/user.entity.ts
│   ├── expenses/           # ExpensesModule
│   │   ├── expenses.controller.ts
│   │   ├── expenses.service.ts
│   │   └── entities/
│   ├── categories/         # CategoriesModule
│   ├── vehicles/           # VehiclesModule
│   ├── shared-budgets/     # SharedBudgetsModule
│   ├── metrics/            # MetricsModule
│   ├── loans/              # LoansModule
│   ├── notifications/      # NotificationsModule
│   │   ├── notifications.service.ts
│   │   └── scheduler/      # NestJS @Cron jobs
│   └── common/             # Guards, pipes, filters, decorators
```

### Frontend — Expo Router Screen Tree

```
apps/client/
├── app/
│   ├── (auth)/
│   │   ├── register.tsx          # Registration screen
│   │   └── login.tsx             # Login screen
│   ├── (onboarding)/
│   │   ├── mandatory-expenses.tsx
│   │   ├── optional-expenses.tsx
│   │   └── vehicle-registration.tsx
│   ├── (tabs)/
│   │   ├── dashboard.tsx         # Home / overview
│   │   ├── metrics.tsx           # Filters + charts
│   │   ├── loans.tsx             # Loan summary
│   │   └── shared-budget.tsx     # Shared budget workspace
│   └── _layout.tsx
├── components/
│   ├── ui/
│   │   ├── Button.tsx            # Primary / secondary variants
│   │   ├── Input.tsx
│   │   ├── Modal.tsx             # Skippable + standard
│   │   ├── EmojiPicker.tsx
│   │   ├── CategoryCard.tsx
│   │   ├── MoneyInput.tsx        # Formats 2 decimal places
│   │   └── NotificationBadge.tsx
│   ├── forms/
│   │   ├── RegistrationForm.tsx
│   │   ├── ExpenseCategoryForm.tsx
│   │   ├── VehicleForm.tsx
│   │   ├── LoanForm.tsx
│   │   └── BudgetLimitForm.tsx
│   └── charts/
│       ├── SpendingBarChart.tsx
│       └── CategoryPieChart.tsx
├── store/
│   ├── authStore.ts              # Zustand — JWT tokens, user profile
│   ├── expenseStore.ts           # Zustand — categories, selected expenses
│   └── budgetStore.ts            # Zustand — shared budget state
├── services/                     # React Query hooks + API client
│   ├── api.ts                    # Axios instance with interceptors
│   ├── authApi.ts
│   ├── expensesApi.ts
│   ├── vehicleApi.ts
│   ├── sharedBudgetApi.ts
│   ├── metricsApi.ts
│   └── loansApi.ts
└── constants/
    └── theme.ts                  # Color palette, spacing, typography
```

### Key Component Interfaces

```typescript
// theme.ts
export const Colors = {
  primary:    '#B8A9E3', // Soft Lavender — CTA buttons
  secondary:  '#A8D8C2', // Mint Green — panel backgrounds
  accent:     '#F2B8A0', // Peach — alerts and highlights
  background: '#F7F5FF', // Cloud White — neutral background
  text:       '#6B7280', // Slate Gray — text and borders
} as const;

export const TouchTarget = { minWidth: 44, minHeight: 44 } as const;

// MoneyInput — enforces 2 decimal display
interface MoneyInputProps {
  value: number | null;
  onChangeValue: (value: number | null) => void;
  currency?: string;        // defaults to user's active currency
  maxValue?: number;        // defaults to 999_999_999.99
}

// Modal — skippable variant (Req 8.5)
interface ModalProps {
  visible: boolean;
  onClose: () => void;
  skippable?: boolean;      // renders 'Omitir' button top-right when true
  children: React.ReactNode;
}

// CategoryCard
interface CategoryCardProps {
  name: string;
  emoji: string;
  selected: boolean;
  paymentDate?: number;     // 1–28
  onToggle: () => void;
  onDelete?: () => void;    // only for custom categories
  onSetPaymentDate?: (day: number) => void;
}
```

---

## Data Models

### Entity Relationship Overview

```
users ──< expenses >── categories
  │                        │
  │                   (predefined | custom)
  │
  ├──< vehicles
  │
  ├──< loans
  │
  ├──< budget_members >── shared_budgets
  │                              │
  │                        ├──< budget_expenses
  │                        ├──< budget_incomes
  │                        └── monthly_limit
  │
  └──< notifications
```

### Database Schema (PostgreSQL / TypeORM)

#### `users`

```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(254) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  display_name    VARCHAR(100),
  currency        VARCHAR(10) NOT NULL DEFAULT 'COP',
  vehicle_owner   BOOLEAN NOT NULL DEFAULT false,
  email_verified  BOOLEAN NOT NULL DEFAULT false,
  onboarding_done BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `categories`

```sql
CREATE TABLE categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,  -- NULL = predefined
  name          VARCHAR(40) NOT NULL,
  emoji         VARCHAR(10) NOT NULL,
  type          VARCHAR(20) NOT NULL CHECK (type IN ('mandatory','optional','vehicle','loan','income')),
  is_predefined BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)  -- case-insensitive enforced at app layer via citext or lower()
);
```

#### `user_expenses` (configured monthly expense slots)

```sql
CREATE TABLE user_expenses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id    UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  payment_day    SMALLINT CHECK (payment_day BETWEEN 1 AND 28),
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, category_id)
);
```

#### `expense_records` (actual expense entries)

```sql
CREATE TABLE expense_records (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id  UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  budget_id    UUID REFERENCES shared_budgets(id) ON DELETE SET NULL,
  amount       NUMERIC(14,2) NOT NULL CHECK (amount > 0 AND amount <= 999999999.99),
  description  VARCHAR(255),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_expense_records_user_date ON expense_records(user_id, expense_date);
CREATE INDEX idx_expense_records_category  ON expense_records(category_id);
```

#### `vehicles`

```sql
CREATE TABLE vehicles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  vehicle_type          VARCHAR(50) NOT NULL,
  model                 VARCHAR(100) NOT NULL,
  purchase_date         DATE NOT NULL,
  soat_expiry           DATE NOT NULL,
  tecnomecanica_expiry  DATE NOT NULL,
  kit_expiry            DATE,  -- optional
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `shared_budgets`

```sql
CREATE TABLE shared_budgets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(100),
  monthly_limit   NUMERIC(14,2) CHECK (monthly_limit > 0 AND monthly_limit <= 999999999.99),
  limit_notified  BOOLEAN NOT NULL DEFAULT false,  -- tracks if over-limit notification was sent this cycle
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE budget_members (
  budget_id   UUID NOT NULL REFERENCES shared_budgets(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        VARCHAR(20) NOT NULL DEFAULT 'member',
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (budget_id, user_id)
);

CREATE TABLE budget_invitations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id    UUID NOT NULL REFERENCES shared_budgets(id) ON DELETE CASCADE,
  inviter_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_email VARCHAR(254) NOT NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','expired')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 days'
);
```

#### `budget_incomes`

```sql
CREATE TABLE budget_incomes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id   UUID NOT NULL REFERENCES shared_budgets(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount      NUMERIC(14,2) NOT NULL CHECK (amount > 0 AND amount <= 999999999.99),
  description VARCHAR(255),
  income_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `loans`

```sql
CREATE TABLE loans (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source              VARCHAR(10) NOT NULL CHECK (source IN ('bank','person')),
  -- bank loan fields
  installment_amount  NUMERIC(14,2) CHECK (installment_amount > 0),
  -- person loan fields
  capital             NUMERIC(14,2) CHECK (capital > 0),
  interest_per_inst   NUMERIC(14,2) CHECK (interest_per_inst >= 0),
  total_installments  INTEGER CHECK (total_installments > 0),
  installments_paid   INTEGER NOT NULL DEFAULT 0,
  -- common
  description         VARCHAR(255),
  start_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bank_loan_fields  CHECK (source <> 'bank'   OR installment_amount IS NOT NULL),
  CONSTRAINT person_loan_fields CHECK (source <> 'person' OR (capital IS NOT NULL AND interest_per_inst IS NOT NULL AND total_installments IS NOT NULL))
);
```

#### `notifications`

```sql
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(50) NOT NULL,  -- 'payment_reminder' | 'vehicle_expiry' | 'budget_limit' | 'budget_invitation'
  payload     JSONB NOT NULL,
  channel     VARCHAR(20) NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app','push','email')),
  read        BOOLEAN NOT NULL DEFAULT false,
  sent_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON notifications(user_id, read, created_at DESC);
```

### TypeScript Entity Types (shared types)

```typescript
// packages/types/src/index.ts  (shared between client and server)

export type LoanSource = 'bank' | 'person';
export type NotificationType = 'payment_reminder' | 'vehicle_expiry' | 'budget_limit' | 'budget_invitation';
export type ExpenseType = 'mandatory' | 'optional' | 'vehicle' | 'loan' | 'income';

export interface MoneyAmount {
  amount: number;        // stored as number, rendered with 2 decimals
  currency: string;
}

export interface Category {
  id: string;
  userId: string | null;  // null = predefined
  name: string;
  emoji: string;
  type: ExpenseType;
  isPredefined: boolean;
}

export interface Loan {
  id: string;
  userId: string;
  source: LoanSource;
  installmentAmount?: number;    // bank only
  capital?: number;              // person only
  interestPerInstallment?: number;
  totalInstallments?: number;
  installmentsPaid: number;
  description?: string;
  startDate: string;             // ISO date
}

// Derived computations (pure — suitable for property testing)
export function loanTotalRepayment(loan: Loan): number {
  if (loan.source === 'bank') {
    return (loan.installmentAmount ?? 0) * (loan.totalInstallments ?? 0);
  }
  return (loan.capital ?? 0) + (loan.interestPerInstallment ?? 0) * (loan.totalInstallments ?? 0);
}

export function loanRemainingInstallments(loan: Loan): number {
  return (loan.totalInstallments ?? 0) - loan.installmentsPaid;
}

export function loanOutstandingAmount(loan: Loan): number {
  const remaining = loanRemainingInstallments(loan);
  if (loan.source === 'bank') return (loan.installmentAmount ?? 0) * remaining;
  return (loan.interestPerInstallment ?? 0) * remaining;
}
```

---

## API Endpoints

All endpoints are prefixed `/api/v1`. Authentication uses `Authorization: Bearer <access_token>` on protected routes.

### Authentication (`/auth`)

| Method | Path | Auth | Description |
|:---|:---|:---|:---|
| POST | `/auth/register` | — | Create account; triggers confirmation email |
| POST | `/auth/login` | — | Returns `{ accessToken, refreshToken }` |
| POST | `/auth/refresh` | — | Exchange refresh token for new access token |
| POST | `/auth/logout` | ✓ | Invalidate refresh token |
| GET  | `/auth/verify-email?token=` | — | Verify email confirmation link |

**Register Request DTO:**
```typescript
class RegisterDto {
  @IsEmail()
  email: string;

  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;':",.<>?\/]).{8,128}$/)
  password: string;
}
```

### Categories (`/categories`)

| Method | Path | Auth | Description |
|:---|:---|:---|:---|
| GET  | `/categories?type=mandatory\|optional` | ✓ | List predefined + user custom categories |
| POST | `/categories` | ✓ | Create custom category |
| DELETE | `/categories/:id` | ✓ | Delete custom category (only own) |

**Create Category DTO:**
```typescript
class CreateCategoryDto {
  @Length(1, 40)
  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  emoji: string;

  @IsIn(['mandatory', 'optional'])
  type: string;
}
```

### Expenses (`/expenses`)

| Method | Path | Auth | Description |
|:---|:---|:---|:---|
| GET  | `/expenses` | ✓ | List configured user expenses (slots) |
| POST | `/expenses` | ✓ | Configure expense slot (select category + optional payment day) |
| PATCH | `/expenses/:id` | ✓ | Update payment day |
| DELETE | `/expenses/:id` | ✓ | Deactivate expense slot |
| GET  | `/expenses/records` | ✓ | List expense records (filterable) |
| POST | `/expenses/records` | ✓ | Add expense record |
| DELETE | `/expenses/records/:id` | ✓ | Delete expense record |

### Vehicles (`/vehicles`)

| Method | Path | Auth | Description |
|:---|:---|:---|:---|
| GET  | `/vehicles/me` | ✓ | Get current user's vehicle |
| POST | `/vehicles` | ✓ | Register vehicle |
| PATCH | `/vehicles/me` | ✓ | Update vehicle data |

### Shared Budgets (`/shared-budgets`)

| Method | Path | Auth | Description |
|:---|:---|:---|:---|
| POST | `/shared-budgets` | ✓ | Create a new shared budget |
| GET  | `/shared-budgets/me` | ✓ | Get shared budget the user belongs to |
| POST | `/shared-budgets/:id/invite` | ✓ | Invite user by email |
| POST | `/shared-budgets/invitations/:id/accept` | ✓ | Accept invitation |
| POST | `/shared-budgets/invitations/:id/reject` | ✓ | Reject invitation |
| POST | `/shared-budgets/:id/expenses` | ✓ | Add expense record to budget |
| DELETE | `/shared-budgets/:id/expenses/:expId` | ✓ | Remove expense record |
| POST | `/shared-budgets/:id/incomes` | ✓ | Add income record |
| PATCH | `/shared-budgets/:id/limit` | ✓ | Set or update monthly spending limit |

**Set Limit DTO:**
```typescript
class SetLimitDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(999_999_999.99)
  monthlyLimit: number;
}
```

### Metrics (`/metrics`)

| Method | Path | Auth | Description |
|:---|:---|:---|:---|
| POST | `/metrics/expenses` | ✓ | Query filtered expense summary |

**Metrics Query DTO:**
```typescript
class MetricsQueryDto {
  months?: number[];           // up to 5 calendar months (YYYY-M format)
  categoryId?: string;
  startDate?: string;          // ISO date; mutually exclusive with months[]
  endDate?: string;            // ISO date; must be >= startDate
  budgetMemberId?: string;     // filter by specific budget member
}
```

**Response:**
```typescript
interface MetricsResponse {
  totalSum: number;
  records: ExpenseRecordSummary[];
  appliedFilters: MetricsQueryDto;
  computedAt: string;
}
```

### Loans (`/loans`)

| Method | Path | Auth | Description |
|:---|:---|:---|:---|
| GET  | `/loans` | ✓ | List active loans (installments_paid < total_installments) |
| POST | `/loans` | ✓ | Create loan record |
| PATCH | `/loans/:id/installment` | ✓ | Register installment payment (increments installments_paid) |
| DELETE | `/loans/:id` | ✓ | Delete loan record |

---

## Notification System Design

The notification system has two components: **scheduled jobs** that poll for upcoming deadlines, and **event-driven triggers** fired inline when domain events occur.

### Notification Channels

| Channel | Mechanism | Use Case |
|:---|:---|:---|
| In-app | Supabase Realtime (INSERT on `notifications` table) | Budget invitations (≤ 30s), budget limit alerts |
| Push | Expo Notifications → FCM / APNs | Payment reminders, vehicle document expiry |
| Email | SMTP via Supabase Auth or SendGrid | Registration confirmation |

### Scheduled Jobs (NestJS `@nestjs/schedule`)

```typescript
// notifications/scheduler/notifications.scheduler.ts

@Injectable()
export class NotificationsScheduler {

  // Runs daily at 08:50 local time (server runs UTC; offsets managed per user timezone)
  @Cron('50 8 * * *')
  async sendPaymentReminders(): Promise<void> {
    // 1. Find all user_expenses where payment_day = tomorrow OR payment_day = today
    // 2. For each matching slot, create notification record and push via Expo
  }

  // Runs daily at 08:00
  @Cron('0 8 * * *')
  async sendVehicleExpiryReminders(): Promise<void> {
    // 1. Query vehicles where soat_expiry, tecnomecanica_expiry, or kit_expiry
    //    is within 30 days of current date
    // 2. Dispatch one notification per expiring document per user
  }
}
```

### Event-Driven Triggers

#### Budget Invitation (Req 5.4 — within 30 seconds)

```
POST /shared-budgets/:id/invite
  → Budget_Manager validates invitee email → finds user
  → Inserts budget_invitations record
  → Immediately inserts notifications record (channel: in_app)
  → Supabase Realtime fires on INSERT → client receives notification
```

#### Budget Limit Exceeded (Req 5.12 — single alert per crossing)

```
POST /shared-budgets/:id/expenses
  → Budget_Manager persists expense
  → Recalculates total expenses for current month
  → IF total > monthly_limit AND limit_notified = false:
      → INSERT notification for all budget members
      → SET limit_notified = true on shared_budgets
  → Notification resets on first day of each month (via monthly cron job)
```

### Notification Payload Schema

```typescript
type NotificationPayload =
  | { type: 'payment_reminder';  categoryName: string; paymentDay: number }
  | { type: 'vehicle_expiry';    document: 'SOAT' | 'Tecnomecánica' | 'kit_carretera'; expiryDate: string }
  | { type: 'budget_limit';      budgetId: string; totalExpenses: number; limit: number }
  | { type: 'budget_invitation'; budgetId: string; inviterName: string; invitationId: string };
```

---

## UX/UI Design Guidelines

### Color Palette

All UI elements across Android and Web SHALL use exclusively the following palette:

| Token | Color Name | Hex | Usage |
|:---|:---|:---|:---|
| `colors.primary` | Soft Lavender | `#B8A9E3` | CTA buttons, active tab indicators |
| `colors.secondary` | Mint Green | `#A8D8C2` | Panel backgrounds, card surfaces |
| `colors.accent` | Peach | `#F2B8A0` | Alert banners, budget limit warnings, highlights |
| `colors.background` | Cloud White | `#F7F5FF` | Screen backgrounds, modal overlays |
| `colors.text` | Slate Gray | `#6B7280` | Body text, labels, borders, icons |

### Typography

| Level | Size | Weight | Color |
|:---|:---|:---|:---|
| H1 | 24sp | Bold | `#6B7280` |
| H2 | 18sp | SemiBold | `#6B7280` |
| Body | 14sp | Regular | `#6B7280` |
| Caption | 12sp | Regular | `#6B7280` |
| CTA Button | 16sp | SemiBold | `#F7F5FF` on `#B8A9E3` |

### Accessibility

- All interactive elements (buttons, inputs, modals): minimum touch target `44×44` logical pixels.
- Color contrast: Slate Gray `#6B7280` on Cloud White `#F7F5FF` achieves ≥ 4.5:1 for body text.
- All inputs include accessible `accessibilityLabel` props.
- Error messages are associated with their input via `accessibilityDescribedBy`.

### Monetary Display

All monetary values rendered via `MoneyInput` / `formatMoney()`:

```typescript
export function formatMoney(amount: number, currency = 'COP'): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
```

### Skippable Modal Pattern (Req 8.5)

```
┌──────────────────────────────┐
│                    [Omitir]  │  ← 44×44 min tap target, top-right
│                              │
│   <modal content>            │
│                              │
│        [Aceptar]             │
└──────────────────────────────┘
```

`Omitir` closes the modal without completing its flow. Used by mandatory expense modal (Req 2.1) and optional expense modal (Req 3.1).

### Platform Differences

The codebase uses a single component tree. The only permitted platform divergence is:

- `Platform.OS === 'android'`: system back gesture triggers navigation pop.
- Web: browser back button triggers navigation pop via Expo Router.

No layout, color, or component hierarchy differences between platforms.

---


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

---

### Property 1: Email Validation Accepts Valid and Rejects Invalid Addresses

*For any* string `s`, the `Email_Validator` SHALL return `valid = true` if and only if `s` matches the pattern `local-part@domain.tld` where the local part contains only alphanumeric characters, dots, underscores, or hyphens, and the domain contains at least one dot. For any string that does not satisfy this pattern, the validator SHALL return `valid = false`.

**Validates: Requirements 1.1, 1.2**

---

### Property 2: Password Validator Enforces All Criteria and Reports Unmet Ones

*For any* string `p`, the `Password_Validator` SHALL accept `p` (return no errors) if and only if `p` has length between 8 and 128 inclusive, contains at least one uppercase letter, at least one digit, and at least one special character from the defined set. For any string that violates one or more criteria, the validator SHALL return a non-empty error list that includes a distinct message for each unmet criterion — no unmet criterion SHALL be absent from the error list.

**Validates: Requirements 1.3, 1.4**

---

### Property 3: Password Confirmation Match

*For any* two strings `password` and `confirmation` that are not equal, the App SHALL produce a confirmation mismatch error and prevent form submission. For any two equal strings, no confirmation error SHALL be produced.

**Validates: Requirements 1.6**

---

### Property 4: Valid Custom Category Addition

*For any* category name `n` with length between 1 and 40 characters (not purely whitespace) and any non-empty emoji `e`, submitting the custom category form SHALL add the category to the selectable list and the total list length SHALL increase by exactly one.

**Validates: Requirements 2.4**

---

### Property 5: Invalid Custom Category Is Rejected

*For any* submission where the category name is absent, consists entirely of whitespace characters, or the emoji field is empty, the `Expense_Configurator` SHALL not add a category to the list and the list length SHALL remain unchanged.

**Validates: Requirements 2.5, 3.3** *(applies to both mandatory and optional expense flows)*

---

### Property 6: Duplicate Category Name Rejection (Case-Insensitive)

*For any* existing category name `n` already present in the list, and any string `s` such that `lowercase(s) === lowercase(n)`, submitting `s` as a new category name SHALL be rejected and the list SHALL not grow.

**Validates: Requirements 2.6**

---

### Property 7: Payment Day Validation

*For any* integer `d`, assigning `d` as a `Payment_Date` SHALL be accepted if and only if `1 ≤ d ≤ 28`. Any value outside this range SHALL be rejected with a validation error.

**Validates: Requirements 2.8, 3.5**

---

### Property 8: Vehicle Purchase Date Cannot Be in the Future

*For any* date `d` that is strictly greater than the current calendar date, submitting `d` as the vehicle purchase or registration date SHALL be rejected with a validation error and the record SHALL NOT be saved.

**Validates: Requirements 4.5**

---

### Property 9: Vehicle Expiry Date Must Be After Purchase Date

*For any* pair `(purchase_date, expiry_date)` where `expiry_date < purchase_date`, submitting either the SOAT expiry or Tecnomecánica expiry SHALL be rejected with a validation error.

**Validates: Requirements 4.6**

---

### Property 10: Vehicle Document Expiry Notification Window

*For any* document expiry date `e` (SOAT, Tecnomecánica, or road emergency kit when set), if the number of calendar days from the current date to `e` is between 0 and 30 inclusive, the `Notification_Service` SHALL dispatch an expiry reminder notification identifying the specific document. If the number of days is greater than 30 or the date has already passed, no notification SHALL be dispatched for that document on that day.

**Validates: Requirements 4.8, 4.9, 4.10**

---

### Property 11: Financial Entry Amount and Description Validation

*For any* income or expense entry with amount `a` and description `d`: the entry SHALL be accepted and persisted if and only if `0.01 ≤ a ≤ 999,999,999.99` and `len(d) ≤ 255`. Any entry with `a` outside this range or `len(d) > 255` SHALL be rejected with a validation error identifying the offending field.

**Validates: Requirements 5.1, 5.6, 5.7, 5.8**

---

### Property 12: Expense Removal Recalculates Budget Total

*For any* shared budget with a current total expenses value `T` and any expense record with amount `a` belonging to that budget, removing that expense record SHALL result in a new total of exactly `T - a`.

**Validates: Requirements 5.9**

---

### Property 13: Monthly Budget Limit Validation

*For any* numeric value `v` submitted as a monthly spending limit: the limit SHALL be accepted and persisted if and only if `0.01 ≤ v ≤ 999,999,999.99`. Any value of zero, any negative value, or any value exceeding `999,999,999.99` SHALL be rejected with a validation error.

**Validates: Requirements 5.10, 5.11**

---

### Property 14: Budget Limit Exceeded Alert Fires Exactly Once Per Month Cycle

*For any* shared budget with monthly limit `L` and any sequence of expense additions in a given month cycle: the budget-limit-exceeded notification SHALL be dispatched to all members at most once — specifically, at the first moment total expenses cross `L`. Subsequent expense additions in the same month cycle SHALL NOT trigger additional notifications even if total expenses continue to rise.

**Validates: Requirements 5.12**

---

### Property 15: Metrics Filter Returns Only Matching Records

*For any* filter composed of month(s), category, date range, or budget member, every expense record returned by the `Metrics_Engine` SHALL satisfy all applied filter criteria simultaneously. No returned record SHALL have a date outside the specified range, a category differing from the selected category, or an owner differing from the selected member.

**Validates: Requirements 6.1, 6.2, 6.3, 6.4**

---

### Property 16: Metrics Total Sum Equals Sum of Matching Records

*For any* set of expense records and any valid filter configuration, the `total_sum` value returned by the `Metrics_Engine` SHALL equal the arithmetic sum of the `amount` fields of all records that satisfy the filter. This property holds for any combination of up to 5 months and one category filter.

**Validates: Requirements 6.5, 6.6**

---

### Property 17: Metrics Rejects Date Range Where Start Exceeds End

*For any* date range filter `(start, end)` where `start > end`, the `Metrics_Engine` SHALL reject the filter and return a validation error without modifying the currently displayed results.

**Validates: Requirements 6.7**

---

### Property 18: Loan Input Validation

*For any* bank loan submission: the entry SHALL be accepted if and only if the `cuota` value is strictly greater than zero. For any person loan submission: the entry SHALL be accepted if and only if `capital > 0`, `interest_per_installment ≥ 0`, and `total_installments > 0`. Any submission violating these constraints SHALL be rejected with a validation error identifying each invalid field.

**Validates: Requirements 7.3, 7.6, 7.7, 7.8**

---

### Property 19: Person Loan Total Repayment Computation

*For any* valid person loan with `capital` `C`, `interest_per_installment` `I`, and `total_installments` `N`, the computed and displayed total repayment amount SHALL equal exactly `C + (I × N)`.

**Validates: Requirements 7.5**

---

### Property 20: Active Loan Remaining and Outstanding Amount Computation

*For any* active loan record with `total_installments` `N` and `installments_paid` `P` (where `P < N`): the displayed remaining installments SHALL equal `N - P`. For a person loan, the outstanding amount SHALL equal `interest_per_installment × (N - P)`. For a bank loan, the outstanding amount SHALL equal `cuota × (N - P)`.

**Validates: Requirements 7.9**

---

### Property 21: Monetary Formatting Always Produces Two Decimal Places

*For any* numeric value `n`, the `formatMoney(n)` function SHALL return a string that contains exactly 2 decimal digits after the decimal separator and includes the currency symbol defined in the user's active currency setting.

**Validates: Requirements 8.3**

---

### Property 22: Skippable Modal Contains Omitir Button Meeting Touch Target

*For any* Modal rendered with `skippable = true`, the rendered output SHALL contain an "Omitir" labeled element with `minWidth ≥ 44` and `minHeight ≥ 44` logical pixels positioned in the top-right area of the modal.

**Validates: Requirements 8.5**

---


## Error Handling

### Client-Side Validation

All forms validate inputs before sending a request to the server. Client-side validation uses **Zod schemas** and runs on every blur event and on submit.

| Validation trigger | Behavior |
|:---|:---|
| Field blur | Show inline error below the field in Slate Gray `#6B7280` with Peach `#F2B8A0` border |
| Form submit with errors | Prevent submission; scroll to first errored field; all errors visible |
| Server returns 400 | Map server error response to the affected field(s); display inline errors |
| Server returns 409 (duplicate) | Show inline error on the relevant field (e.g., email already registered) |
| Server returns 500 | Show a dismissible toast: "Algo salió mal. Intenta de nuevo." — do NOT clear form values |
| Network error / timeout | Show a dismissible toast with retry button — preserve form state |

### Server-Side Error Responses

All API errors follow a consistent envelope:

```typescript
interface ApiError {
  statusCode: number;
  error: string;
  message: string | string[];  // string[] for validation errors (one per failing field)
  timestamp: string;
  path: string;
}
```

NestJS global exception filter maps:

| Exception type | HTTP status | message content |
|:---|:---|:---|
| `ValidationException` (class-validator) | 400 | Array of field-level messages |
| `ConflictException` (duplicate email) | 409 | Human-readable conflict description |
| `NotFoundException` | 404 | Resource description |
| `UnauthorizedException` | 401 | Generic auth failure |
| `ForbiddenException` | 403 | Action not permitted |
| Unhandled server error | 500 | "Internal server error" (no internal details leaked) |

### Authentication Errors

- Expired access token → client interceptor silently refreshes using the refresh token. If the refresh also fails, user is redirected to login and the auth store is cleared.
- Invalid JWT signature → 401 response; user is logged out.

### Financial Data Integrity

- All `NUMERIC(14,2)` columns enforce constraints at the database level as a final safety net; server-side DTO validation is the primary guard.
- PostgreSQL transactions wrap multi-step operations (expense insert + total recalculation, invitation accept + member creation).
- `limit_notified` flag on `shared_budgets` is reset to `false` by a cron job on the first day of each month to allow the next month's budget-limit notification cycle.

### Notification Failures

- Expo push notification failures (invalid token, device offline) are caught and logged to an `notification_failures` table; no retry storms. Failed push notifications degrade gracefully — the in-app `notifications` record is always created regardless of push success.
- Scheduled job failures are caught per-user; one user's failure does not block processing of remaining users.

---

## Testing Strategy

### Approach

The strategy uses two complementary layers:

- **Unit tests** — concrete examples, edge cases, and integration points
- **Property-based tests** — universal properties across all valid inputs, using **fast-check** (JavaScript/TypeScript PBT library)

Property tests each run a minimum of **100 iterations** via fast-check's default runner. Each property test references the design document property it validates using the tag comment format:

```typescript
// Feature: lucas-app-v1, Property {N}: {property title}
```

### Test Framework Setup

| Layer | Tool | Location |
|:---|:---|:---|
| Backend unit + property | Jest + fast-check | `server/src/**/__tests__/` |
| Frontend unit + component | Jest + React Native Testing Library + fast-check | `apps/client/src/**/__tests__/` |
| End-to-end (integration) | Playwright (Web) / Detox (Android) | `e2e/` |
| API integration | Jest + Supertest | `server/test/` |

### Property-Based Test Coverage

Each of the 22 correctness properties maps to one property-based test:

| Property | Module | fast-check arbitraries |
|:---|:---|:---|
| P1: Email validation | `auth/validators` | `fc.string()`, `fc.emailAddress()` |
| P2: Password validator + error messages | `auth/validators` | `fc.string({ minLength: 0, maxLength: 200 })` |
| P3: Password confirmation match | `auth/validators` | `fc.tuple(fc.string(), fc.string())` |
| P4: Valid custom category addition | `categories/service` | `fc.string({ minLength: 1, maxLength: 40 })`, `fc.string({ minLength: 1, maxLength: 4 })` (emoji) |
| P5: Invalid category rejected | `categories/service` | `fc.string()` filtered to whitespace-only, empty |
| P6: Duplicate name rejection | `categories/service` | `fc.string()` + case permutation |
| P7: Payment day range validation | `expenses/validators` | `fc.integer({ min: -100, max: 200 })` |
| P8: Vehicle purchase date future rejection | `vehicles/validators` | `fc.date({ min: new Date() })` (future dates) |
| P9: Vehicle expiry date ordering | `vehicles/validators` | `fc.tuple(fc.date(), fc.date())` |
| P10: Vehicle document 30-day notification window | `notifications/scheduler` | `fc.date()` |
| P11: Financial entry validation | `expenses/service`, `budgets/service` | `fc.float()`, `fc.string()` |
| P12: Expense removal recalculation | `budgets/service` | `fc.array(fc.float({ min: 0.01, max: 999999999.99 }))` |
| P13: Budget limit validation | `budgets/validators` | `fc.float({ min: -1000, max: 1000000000 })` |
| P14: Budget limit alert fires once | `budgets/service` | `fc.array(fc.float({ min: 0.01 }))` |
| P15: Metrics filter returns matching records only | `metrics/service` | `fc.array(expenseRecordArb)`, `fc.record(filterArb)` |
| P16: Metrics total equals sum of records | `metrics/service` | `fc.array(expenseRecordArb)`, `fc.record(filterArb)` |
| P17: Metrics rejects start > end date range | `metrics/validators` | `fc.tuple(fc.date(), fc.date())` filtered to start > end |
| P18: Loan input validation | `loans/validators` | `fc.record(loanArb)` |
| P19: Person loan total repayment formula | `loans/service` | `fc.tuple(fc.float({ min: 0.01 }), fc.float({ min: 0 }), fc.integer({ min: 1 }))` |
| P20: Active loan remaining/outstanding computation | `loans/service` | `fc.record(activeLoanArb)` |
| P21: Monetary formatting | `common/formatMoney` | `fc.float({ noNaN: true, noDefaultInfinity: true })` |
| P22: Skippable modal Omitir button | `components/Modal` | `fc.record({ skippable: fc.boolean(), children: fc.constant(null) })` |

### Example Property Test (P19)

```typescript
// Feature: lucas-app-v1, Property 19: Person loan total repayment computation
import * as fc from 'fast-check';
import { loanTotalRepayment } from '../../src/loans/loan.utils';

describe('P19: Person loan total repayment formula', () => {
  it('should equal capital + (interestPerInstallment * totalInstallments) for any valid person loan', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0.01, max: 999_999_999.99, noNaN: true }),  // capital
        fc.float({ min: 0,    max: 999_999_999.99, noNaN: true }),  // interest per installment
        fc.integer({ min: 1, max: 1000 }),                          // total installments
        (capital, interest, installments) => {
          const loan = {
            source: 'person' as const,
            capital,
            interestPerInstallment: interest,
            totalInstallments: installments,
            installmentsPaid: 0,
          };
          const total = loanTotalRepayment(loan);
          const expected = capital + interest * installments;
          // Allow floating-point epsilon
          expect(Math.abs(total - expected)).toBeLessThan(0.001);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Example Property Test (P7)

```typescript
// Feature: lucas-app-v1, Property 7: Payment day validation
import * as fc from 'fast-check';
import { isValidPaymentDay } from '../../src/expenses/expenses.validators';

describe('P7: Payment day validation', () => {
  it('should accept any integer from 1 to 28 and reject all others', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100, max: 200 }),
        (day) => {
          const result = isValidPaymentDay(day);
          const expected = day >= 1 && day <= 28;
          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Example Property Test (P16)

```typescript
// Feature: lucas-app-v1, Property 16: Metrics total equals sum of matching records
import * as fc from 'fast-check';
import { computeMetrics } from '../../src/metrics/metrics.service';

const expenseArb = fc.record({
  id: fc.uuid(),
  amount: fc.float({ min: 0.01, max: 999_999_999.99, noNaN: true }),
  expenseDate: fc.date({ min: new Date('2023-01-01'), max: new Date('2025-12-31') }),
  categoryId: fc.uuid(),
  userId: fc.uuid(),
  description: fc.string({ maxLength: 255 }),
});

describe('P16: Metrics total equals sum of matching records', () => {
  it('total sum returned by metrics engine should equal arithmetic sum of returned records', () => {
    fc.assert(
      fc.property(
        fc.array(expenseArb, { minLength: 0, maxLength: 50 }),
        (expenses) => {
          const filter = {};  // no filter — all records match
          const result = computeMetrics(expenses, filter);
          const expectedSum = result.records.reduce((acc, r) => acc + r.amount, 0);
          expect(Math.abs(result.totalSum - expectedSum)).toBeLessThan(0.001);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Unit Test Coverage (Example-Based)

Unit tests cover the EXAMPLE and EDGE_CASE classified criteria:

| Area | Tests |
|:---|:---|
| Registration | Success modal shown; server 409 shows inline error; server 500 preserves form |
| Expense configurator | 8 predefined categories rendered; add + button opens form; deselect/delete operations |
| Vehicle module | Conditional activation on vehicle_owner flag; modal title; optional kit date |
| Shared budget | Invitation flow; acceptance grants access; empty result on unknown email |
| Metrics | Empty result state shows zero total and no-records message |
| Loan flow | Bank loan shows only cuota field; person loan shows 3 fields; selection prompt |
| UI components | Confirmation field presence; Omitir button on skippable modals; currency symbol in monetary display |

### Integration Tests

Integration tests use Supertest against a local NestJS instance backed by a test PostgreSQL database (Supabase local dev via `supabase start`):

- `POST /auth/register` — end-to-end including email confirmation dispatch check
- `POST /shared-budgets/:id/invite` → accept → verify both members can write
- Budget limit: add expenses crossing limit; assert notification record created exactly once in the same month cycle
- Vehicle expiry scheduler: seed vehicles with expiry dates at T+29 and T+31 days; run scheduler; assert notification created for T+29 only

### Running Tests

```bash
# Backend unit + property tests
cd server && npx jest --runInBand

# Frontend unit + component tests
cd apps/client && npx jest --runInBand

# Integration tests (requires local Supabase running)
cd server && npx jest --config jest.integration.config.ts --runInBand

# E2E Web tests
cd e2e && npx playwright test

# E2E Android
cd e2e && npx detox test --configuration android.release
```
