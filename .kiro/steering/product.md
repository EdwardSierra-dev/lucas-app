# Product

**Lucas** is a cross-platform (Web + Android) home finance control app that helps households collaboratively manage income, expenses, budgets, loans, and savings goals.

## Core Domains

- **Auth** — user registration/login with JWT (15 min access / 7 day refresh).
- **Expenses** — mandatory and optional expenses, categories, and expense records.
- **Vehicles** — vehicle registration and related costs.
- **Loans** — loan tracking and schedules.
- **Shared Budgets** — collaborative budgets with members, invitations, incomes, and limits.
- **Metrics** — spending breakdowns and financial insights (charts).
- **Notifications** — push and realtime notifications.

## Product Conventions

- Money is a first-class concept; use the dedicated money input/formatting rather than raw numbers in the UI.
- Features are collaborative — many flows involve multiple members of a shared budget, so account for membership, invitations, and permissions.
- Onboarding guides a new user through registering a vehicle and declaring mandatory/optional expenses before reaching the main tabs.

## UI Color Palette

| Role | Name | Hex |
| :--- | :--- | :--- |
| Primary / CTA | Soft Lavender | `#B8A9E3` |
| Secondary / Panels | Mint Green | `#A8D8C2` |
| Accent / Alerts | Peach | `#F2B8A0` |
| Neutral Background | Cloud White | `#F7F5FF` |
| Text & Borders | Slate Gray | `#6B7280` |

Prefer the shared theme constants over hardcoded hex values.
