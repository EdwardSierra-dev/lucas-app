# Lucas — Home Finance Control

> **Lucas** is a cross-platform web and mobile application designed to help households intuitively and collaboratively manage their income, expenses, budgets, and savings goals.

---

## UI Color Palette

| Role | Color Name | Hex |
| :--- | :--- | :--- |
| Primary / CTA Buttons | Soft Lavender | `#B8A9E3` |
| Secondary / Panel Backgrounds | Mint Green | `#A8D8C2` |
| Accent / Alerts & Highlights | Peach | `#F2B8A0` |
| Neutral Background | Cloud White | `#F7F5FF` |
| Text & Borders | Slate Gray | `#6B7280` |

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| Frontend (Android & Web) | React Native (Expo SDK 51+) + React Native Web |
| Backend API | NestJS (TypeScript) |
| Database | PostgreSQL via Supabase |
| Authentication | JWT (access 15 min / refresh 7 days) |
| State management | Zustand + React Query |
| Navigation | Expo Router (file-based) |
| Validation | Zod (client) · class-validator (server) |
| Testing | Jest + fast-check (property-based) |

---

## Project Structure

```
lucas-app/
├── apps/
│   └── client/           # React Native (Expo) — Android & Web
├── server/               # NestJS API backend
├── packages/
│   └── types/            # Shared TypeScript types and pure utilities
├── supabase/
│   ├── config.toml       # Supabase local dev configuration
│   ├── seed.sql          # Initial / reference data for local DB
│   └── migrations/       # TypeORM migration files
├── e2e/                  # Playwright (Web) + Detox (Android) E2E tests
├── docs/                 # Architecture diagrams and additional docs
└── README.md
```

---

## Prerequisites

Before you start, make sure the following tools are installed:

| Tool | Version | Install |
| :--- | :--- | :--- |
| Node.js | 20 LTS | https://nodejs.org |
| npm | 10+ | bundled with Node.js |
| Docker Desktop | latest | https://www.docker.com/products/docker-desktop |
| Supabase CLI | latest | `npm install -g supabase` |
| Expo CLI | latest | `npm install -g expo-cli` |

Docker must be **running** before you start the local Supabase stack.

---

## Local Development Setup

### 1. Install dependencies

From the repository root, install all workspace packages at once:

```bash
npm install
```

This installs dependencies for `server/`, `apps/client/`, and `packages/types/` via npm workspaces.

---

### 2. Start the local Supabase stack

```bash
supabase start
```

On first run, Docker will pull the required Supabase images (this takes a few minutes). Subsequent starts are fast.

When the stack is ready you will see output similar to:

```
Started supabase local development setup.

         API URL: http://127.0.0.1:54321
     GraphQL URL: http://127.0.0.1:54321/graphql/v1
  S3 Storage URL: http://127.0.0.1:54321/storage/v1/s3
          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
    Inbucket URL: http://127.0.0.1:54324
        anon key: <anon-key>
service_role key: <service-role-key>
```

#### Local URLs at a glance

| Service | URL |
| :--- | :--- |
| REST API | http://127.0.0.1:54321 |
| PostgreSQL | postgresql://postgres:postgres@127.0.0.1:54322/postgres |
| Supabase Studio | http://127.0.0.1:54323 |
| Inbucket (email) | http://127.0.0.1:54324 |

#### Useful Supabase CLI commands

```bash
# Stop the stack
supabase stop

# Reset the database (re-runs all migrations then seed.sql)
supabase db reset

# Create a new migration file
supabase migration new <migration_name>

# Check stack status
supabase status
```

---

### 3. Configure environment variables

Copy the example env file and fill in the values printed by `supabase start`:

```bash
cp server/.env.example server/.env
```

Key variables in `server/.env`:

```
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=<anon-key from supabase start output>
JWT_SECRET=change-me-local
JWT_REFRESH_SECRET=change-me-local-refresh
```

---

### 4. Start the NestJS backend

```bash
cd server && npm run start:dev
```

The API will be available at **http://localhost:3000** with hot-reload enabled.

---

### 5. Start the Expo client

```bash
cd apps/client && npx expo start
```

- Press **w** to open the Web version in your browser.
- Press **a** to open on a connected Android device or emulator.
- Scan the QR code with the **Expo Go** app on your phone.

---

## Running Tests

```bash
# Backend unit + property-based tests
cd server && npx jest --runInBand

# Frontend unit + component tests
cd apps/client && npx jest --runInBand

# Integration tests (requires local Supabase running)
cd server && npx jest --config jest.integration.config.ts --runInBand

# Web E2E tests (Playwright)
cd e2e && npx playwright test

# Android E2E tests (Detox)
cd e2e && npx detox test --configuration android.release
```

---

## Architecture

```
+-------------------------------------------------------------+
|                         CLIENT LAYER                        |
|                                                             |
|   +-------------------+       +------------------------+   |
|   |    Android App    |       |        Web App         |   |
|   |  (Expo Go / APK)  |       | (Expo Web / Browser)   |   |
|   +---------+---------+       +-----------+------------+   |
|             |           React Native       |               |
|             +-------------+---------------+               |
+---------------------------+---------------------------------+
                            | HTTPS / REST (JWT)
                            v
+-------------------------------------------------------------+
|                          API LAYER                          |
|               Node.js — NestJS (TypeScript)                 |
|                                                             |
|   Auth | Expenses | Vehicles | Loans | Budgets | Metrics    |
+---------------------------+---------------------------------+
                            | Supabase SDK / pg driver
                            v
+-------------------------------------------------------------+
|                         DATA LAYER                          |
|              PostgreSQL via Supabase (Cloud/Local)          |
|                                                             |
|  users | categories | user_expenses | expense_records       |
|  vehicles | shared_budgets | budget_members | loans         |
|  notifications | budget_invitations | budget_incomes        |
+-------------------------------------------------------------+
```
