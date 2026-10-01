# Project Structure

```
lucas-app/
├── apps/
│   └── client/           # React Native (Expo) — Android & Web
├── server/               # NestJS API backend
├── packages/
│   └── types/            # Shared TypeScript types + pure utilities
├── supabase/             # Local dev config, seed.sql, migrations
├── docs/                 # Architecture docs
├── specs/ · plans/       # Feature specs and planning docs
└── tsconfig.base.json    # Shared TS config extended by every workspace
```

## Client (`apps/client`)

File-based routing via Expo Router. Route groups in parentheses do not add URL segments.

```
app/
├── (auth)/           # login, register
├── (onboarding)/     # vehicle registration, mandatory/optional expenses
├── (tabs)/           # dashboard, expenses, loans, metrics, shared-budget
├── _layout.tsx       # root layout
└── index.tsx         # entry/redirect
components/
├── charts/           # BarChart, CategoryBreakdownChart (barrel: index.ts)
├── forms/            # one component per form (BudgetForm, LoanForm, ...)
└── ui/               # reusable primitives (Button, Input, Modal, MoneyInput, ...; barrel: index.ts)
constants/            # theme.ts (colors, spacing)
services/             # axios API clients + Zod schemas (one *Api.ts per domain)
store/                # Zustand stores
utils/                # client-only helpers
```

### Client conventions

- Components are `PascalCase.tsx`; route files are lowercase (Expo Router convention).
- Each API domain gets its own `services/<domain>Api.ts`; related Zod schemas live beside it (e.g. `loginSchema.ts`).
- Import UI primitives and charts via their barrel `index.ts`.
- Server state goes through React Query; UI/session state goes through Zustand in `store/`.
- Tests live in `__tests__/` folders next to the code they cover, named `*.test.tsx`.

## Server (`server/src`)

Organized by feature module. Each domain folder is a NestJS module:

```
src/
├── <feature>/            # auth, categories, expenses, loans, metrics,
│   ├── entities/         #   notifications, shared-budgets, users, vehicles
│   ├── dto/
│   ├── <feature>.module.ts
│   ├── <feature>.controller.ts
│   ├── <feature>.service.ts
│   └── __tests__/
├── mail/
├── app.module.ts         # root module wiring feature modules
├── main.ts               # bootstrap
└── seed.ts
```

### Server conventions

- One NestJS module per domain; keep controllers thin and put logic in services.
- Request/response shapes are DTOs validated with class-validator; TypeORM entities live in `entities/`.
- Tests live in per-feature `__tests__/` folders.

## Shared Types (`packages/types`)

- `src/index.ts` exports types and pure utilities shared between client and server.
- Must stay framework-free and side-effect-free (no React, no Nest, no I/O).
- When a type crosses the client/server boundary, define it here rather than duplicating it.
