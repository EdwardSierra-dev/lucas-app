# Tech Stack

## Monorepo

npm workspaces, Node.js >= 20, npm >= 10. Workspaces:

- `apps/client` — React Native (Expo SDK 51+) app for Android & Web
- `server` — NestJS (TypeScript) API
- `packages/types` — shared TypeScript types and pure utilities

TypeScript everywhere, extending `tsconfig.base.json` (strict mode, `noUncheckedIndexedAccess`, `composite`).

## Client (`apps/client`)

- React Native 0.74 + React Native Web, Expo Router (file-based routing)
- State: **Zustand** (local/UI state) + **React Query** (`@tanstack/react-query`) for server state
- HTTP: **axios** (see `services/`)
- Validation: **Zod** (schemas live alongside API services, e.g. `loginSchema.ts`)
- Backend data: Supabase JS SDK where applicable
- Storage: AsyncStorage
- Notifications: `expo-notifications`

## Server (`server`)

- **NestJS 10** organized by feature module (auth, expenses, loans, metrics, etc.)
- ORM: **TypeORM** 0.3 over PostgreSQL
- Validation: **class-validator** + **class-transformer** on DTOs
- Auth: `@nestjs/jwt` + Passport (`passport-jwt`), passwords hashed with `bcryptjs`
- Scheduling: `@nestjs/schedule`
- Path aliases resolved via `tsconfig-paths`

## Database

PostgreSQL via **Supabase** (local stack through Docker + Supabase CLI). Migrations and `seed.sql` live in `supabase/`. Use `supabase db reset` to re-run migrations + seed locally.

## Testing

- **Jest** across all workspaces, with **fast-check** for property-based tests
- Client: `jest-expo` + `@testing-library/react-native`
- Server: `ts-jest`, with a separate integration config and `supertest`

## Common Commands

Run from the repo root (fan out across workspaces):

```bash
npm install          # install all workspace deps
npm run build        # build all workspaces
npm run test         # test all workspaces
npm run lint         # lint all workspaces
npm run typecheck    # tsc --noEmit across workspaces
```

### Client (`apps/client`)

```bash
npx expo start       # dev server (press w = web, a = android)
npm run test         # jest (single run)
npm run typecheck
npm run lint
```

### Server (`server`)

```bash
npm run start:dev        # ts-node with hot reload (http://localhost:3000)
npm run test             # jest --runInBand
npm run test:integration # requires local Supabase running
npm run seed
```

### Supabase (from repo root)

```bash
supabase start       # start local stack (Docker must be running)
supabase stop
supabase db reset    # re-run migrations + seed
supabase migration new <name>
```

Note: this is a Windows/PowerShell environment — chain commands with `;`, not `&&`.
