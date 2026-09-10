<div align="center">

# Dayflow HRMS

**A full-stack Human Resource Management System** — employee profiles, attendance, leave workflows, payroll, and document records, built on a single frozen API contract shared end-to-end between backend and frontend.

[![CI Pipeline](https://github.com/PrasadBant/Dayflow-Smart-HR/actions/workflows/ci.yml/badge.svg)](https://github.com/PrasadBant/Dayflow-Smart-HR/actions/workflows/ci.yml)
![Node](https://img.shields.io/badge/node-20.x-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)

[Getting Started](#-getting-started) · [API Overview](#-api-overview) · [Testing](#-testing) · [Contributing](#-contributing)

</div>

---

## Contents

- [Overview](#overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Tech stack](#-tech-stack)
- [Repository structure](#-repository-structure)
- [Getting started](#-getting-started)
- [Environment variables](#-environment-variables)
- [API overview](#-api-overview)
- [Authentication & authorization](#-authentication--authorization)
- [Core business rules](#-core-business-rules)
- [Testing](#-testing)
- [Seeded accounts](#-seeded-accounts)
- [Known limitations](#-known-limitations)
- [Contributing](#-contributing)
- [License](#-license)

## Overview

Dayflow HRMS is built against a single frozen contract (`dayflow-hrms/CONTRACT.md`) and a shared TypeScript type definition file (`dayflow-hrms/shared/types.ts`) that both the backend and frontend import directly, so request/response shapes stay in sync **by construction**, not by convention. Every endpoint, DTO, and error code traces back to that one file.

## ✨ Features

- **Employee self-service** — profile management, daily check-in/check-out, leave requests, payslip and document viewing.
- **HR administration** — company-wide employee directory with search/filtering, leave approval queue, payroll editing, department management.
- **Role-based access control** — every route is guarded by JWT-derived role/identity, backed by a second, independent enforcement layer at the database (Postgres Row-Level Security), not just middleware.
- **Real business-rule enforcement** — overlapping leave, double check-ins, and negative payroll are rejected at both the application and database layers, not just validated client-side.
- **Self-service auth lifecycle** — signup, email verification, and password reset, each backed by real single-use, time-boxed tokens.
- **Command-center UX** — a "needs your attention" system surfaces real, actionable items (pending approvals, incomplete profiles, unassigned departments) instead of a static widget wall, plus a keyboard-driven command palette (`Ctrl/Cmd+K`).
- **Fully typed, contract-first API** — one shared `types.ts` file is the single source of truth for every request/response shape on both sides of the wire.
- **Containerized, one-command startup** — `docker compose up --build` brings up the database (schema + seed + RLS), backend, and frontend, each gated on its dependency's healthcheck.

## 🏗️ Architecture

```
                        CONTRACT.md  +  shared/types.ts
                     (single source of truth for every DTO)
                                    │
                ┌───────────────────┴───────────────────┐
                ▼                                        ▼
    React + Vite frontend                      Express + TypeScript backend
    (dayflow-hrms/frontend)                     (dayflow-hrms/backend)
    ┌─────────────────────────┐   HTTP/JSON     ┌─────────────────────────┐
    │ typed API client        │   Bearer JWT    │ routes → services →     │
    │ (src/api-client/)       ├────────────────►│ repositories            │
    └─────────────────────────┘                 └────────────┬────────────┘
                                                               │ parameterized SQL
                                                               ▼
                                                  PostgreSQL 16
                                                  (dayflow-hrms/database)
```

Each layer is intentionally thin and single-purpose:

- **Routes** (`backend/src/routes/`) handle HTTP concerns only — auth/role middleware, request parsing, status codes.
- **Services** (`backend/src/services/`) hold business logic and validation (password strength, leave overlap, payroll non-negativity, etc.).
- **Repositories** (`backend/src/repositories/`) are the only layer that talks to Postgres, exclusively via parameterized queries.

## 🧰 Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, TypeScript, React Router |
| Backend | Node.js 20, Express, TypeScript |
| Database | PostgreSQL 16 (with Row-Level Security) |
| Auth | JWT (HS256, 8-hour expiry), bcrypt |
| Email | nodemailer (falls back to console-logged links when unconfigured) |
| Containerization | Docker, Docker Compose |
| CI | GitHub Actions (typecheck, build, unit tests, full E2E against a live stack) |

## 📁 Repository structure

```
Dayflow-Smart-HR/
├── docker-compose.yml           # db + backend + frontend orchestration
├── Dockerfile                   # multi-stage build (backend target, frontend target)
├── deployment/
│   ├── LOCAL_DEPLOYMENT.md
│   ├── PRODUCTION_DEPLOYMENT.md
│   └── env.template
└── dayflow-hrms/
    ├── CONTRACT.md              # frozen API/DB contract — the source of truth
    ├── shared/types.ts          # DTOs and enums imported by both backend and frontend
    ├── backend/
    │   ├── src/
    │   │   ├── auth/            # JWT, bcrypt, requireAuth/requireRole/requireOwnership
    │   │   ├── config/          # env validation, pg Pool
    │   │   ├── routes/          # one file per resource, 25 endpoints total
    │   │   ├── services/        # business logic and validation
    │   │   └── repositories/    # parameterized SQL
    │   └── tests/               # backend unit/integration test scripts
    ├── frontend/
    │   └── src/
    │       ├── api-client/      # typed wrappers for all 25 endpoints
    │       ├── pages/           # route-level screens
    │       ├── components/      # guards, layout, design-system primitives
    │       └── context/         # auth context (token/user/employee state)
    ├── database/
    │   ├── schema.sql           # tables, constraints, triggers
    │   ├── seed.sql             # demo departments/users/employees/records
    │   ├── a7_rls.sql           # RLS policies + dayflow_app role (template — see init-rls.sh)
    │   └── init-rls.sh          # substitutes APP_DB_PASSWORD into a7_rls.sql at container init
    ├── tests/e2e/                # cross-service integration test scripts
    └── scripts/                  # unified E2E runner, DB constraint verification
```

## 🚀 Getting started

### Option A — Docker Compose (recommended)

Requires Docker Desktop running.

```bash
git clone https://github.com/PrasadBant/Dayflow-Smart-HR.git
cd Dayflow-Smart-HR
docker compose up --build -d
docker compose ps
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000/api |
| Postgres | `localhost:5432` (`dayflow_db`) |

The `db` service initializes from `schema.sql`, `seed.sql`, and `a7_rls.sql` on first boot (a named volume persists data across restarts — remove it with `docker compose down -v` to force a clean re-seed). `backend` and `frontend` both wait on their upstream dependency's healthcheck before starting.

### Option B — Local development

<details>
<summary><strong>Database setup</strong></summary>

```bash
createdb -U postgres dayflow_db
psql -U postgres -d dayflow_db -f dayflow-hrms/database/schema.sql
psql -U postgres -d dayflow_db -f dayflow-hrms/database/seed.sql

# a7_rls.sql is a template — it contains the literal placeholder token
# __APP_DB_PASSWORD__, not a real password, so it can't be piped to psql
# directly. The value below matches env.template's DATABASE_URL further
# down — change both consistently if you use a different one.
sed "s/__APP_DB_PASSWORD__/dayflow_app_password/g" dayflow-hrms/database/a7_rls.sql | psql -U postgres -d dayflow_db
```

The third step creates the `dayflow_app` role and RLS policies that `DATABASE_URL` below connects as — running only the first two (schema + seed) leaves that role nonexistent, so don't skip it even for local/throwaway use. This mirrors what `database/init-rls.sh` automates for the Docker Compose path.

</details>

<details>
<summary><strong>Backend</strong> (<code>dayflow-hrms/backend</code>)</summary>

```bash
cd dayflow-hrms/backend
npm install
cp ../../deployment/env.template .env   # or export the vars listed below directly
npm run dev
```

</details>

<details>
<summary><strong>Frontend</strong> (<code>dayflow-hrms/frontend</code>)</summary>

```bash
cd dayflow-hrms/frontend
npm install
npm run dev
```

</details>

## 🔐 Environment variables

| Variable | Used by | Description |
|---|---|---|
| `PORT` | backend | HTTP listen port (default `5000`) |
| `DATABASE_URL` | backend | Postgres connection string |
| `JWT_SECRET` | backend | Signing secret for session JWTs. `backend/src/config/env.ts` rejects a small set of known-insecure placeholder values at startup — always generate your own (`openssl rand -hex 32`) before any real deployment |
| `FRONTEND_ORIGIN` | backend | Exact origin allowed by CORS |
| `NODE_ENV` | backend | `development` \| `production` |
| `VITE_API_URL` | frontend | Base API URL the browser calls (e.g. `http://localhost:5000/api`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | backend | Optional. Without them, verification/password-reset emails are logged to the backend console instead of sent — see [Authentication & authorization](#-authentication--authorization) |

A working set of local defaults is in `deployment/env.template`. The Docker Compose stack (`docker-compose.yml`) additionally reads `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB` (the database's own superuser, used only for schema initialization) and `APP_DB_USER`/`APP_DB_PASSWORD` (the non-superuser role the backend actually connects as — see [Authentication & authorization](#-authentication--authorization) for why that distinction matters) from an optional root-level `.env` file; see `.env.example`.

> **Production configuration fails closed.** `docker-compose.yml` hardcodes `NODE_ENV=production`, and `backend/src/config/env.ts` refuses to start under that mode if it's still using the compose file's own default JWT secret, the default DB password, or has no `SMTP_HOST`/`SMTP_FROM` configured — copy `.env.example` to a root `.env` and fill in real values first. A real deployment shouldn't be able to silently go live with committed placeholder secrets or no way to actually deliver account email. The `APP_DB_PASSWORD` you set is also what `database/init-rls.sh` uses to create the `dayflow_app` role at DB init time (substituted into `database/a7_rls.sql`, which is otherwise a template, not run directly) — set it once and both sides pick it up consistently.

## 📡 API overview

All 25 endpoints in `CONTRACT.md` are implemented, mounted under `/api`:

| Resource | Endpoints |
|---|---|
| Auth | `POST /auth/signup`, `POST /auth/login`, `POST /auth/verify-email`, `POST /auth/resend-verification`, `POST /auth/forgot-password`, `POST /auth/reset-password` |
| Employees | `GET/PATCH /employees/me`, `GET /employees` (HR), `PATCH /employees/:id` (HR), `GET /employees/recent-activity`, `GET /employees/switch-context/:id` (HR) |
| Departments | `GET /departments` |
| Leave | `POST /leave-requests`, `GET /leave-requests/me`, `GET /leave-requests` (HR), `PATCH /leave-requests/:id` (HR) |
| Attendance | `POST /attendance/check-in`, `POST /attendance/check-out`, `GET /attendance/me`, `GET /attendance` (HR) |
| Payroll | `GET /payroll/me`, `GET /payroll/:employeeId` (HR), `PATCH /payroll/:employeeId` (HR) |
| Documents | `GET /documents/me`, `GET /documents/:employeeId` (HR), `POST /documents` |

Every response follows `shared/types.ts`'s shapes exactly. Errors use a single envelope:

```json
{
  "error": {
    "code": "LEAVE_OVERLAP",
    "message": "Those dates overlap an existing request - pick different dates",
    "details": [{ "field": "startDate", "message": "..." }]
  }
}
```

`code` is always one of the `ErrorCode` values defined in `shared/types.ts` (`UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `VALIDATION_ERROR`, `LEAVE_OVERLAP`, `EMAIL_TAKEN`, `EMAIL_NOT_VERIFIED`, `ALREADY_CHECKED_IN`, `NOT_CHECKED_IN`, `INTERNAL_ERROR`).

## 🔑 Authentication & authorization

- JWTs are signed with HS256, carry `{ userId, employeeId, role }`, and expire after 8 hours. Pass as `Authorization: Bearer <token>`.
- Passwords are hashed with bcrypt (10 rounds) and must be 8+ characters with at least one letter and one digit.
- `POST /auth/signup` always creates an `EMPLOYEE` — any `role` field in the request body is ignored, not just rejected; there is no code path that reads it. New employees default to the `Unassigned` department and `Employee` position, correctable later via `PATCH /employees/:id`.
- Unverified accounts (`emailVerified = false`) get `403 EMAIL_NOT_VERIFIED` on login. Signup and `resend-verification` send a real email via `nodemailer` when `SMTP_*` is configured; without it, the link is logged to the backend console instead, and the API response says so explicitly rather than claiming an email was sent.
- **Password reset** (`forgot-password` / `reset-password`): a random 32-byte token is hashed (SHA-256) before being stored, expires after 1 hour, and is single-use — a successful reset clears the stored hash so the same token can't be replayed. Both endpoints are enumeration-safe (the response never reveals whether an account exists) and share the same rate limiter as login/signup.
- `/api/auth/*` is rate-limited (20 requests / 15 minutes / IP, in-memory — sufficient for a single backend instance; a multi-instance deployment behind a load balancer would need a shared store such as Redis instead).
- Every route that takes an `:id`/`:employeeId` path parameter is gated `HR Only`; there is no "employee accessing their own ID via a shared route" case in this contract, so role-checking middleware doubles as the IDOR boundary. `/me` routes derive the acting employee from the JWT, never from client input.
- **Row-level security** (`database/a7_rls.sql`) is a real, enforced second boundary, not just documentation: the backend connects to Postgres as the dedicated non-superuser `dayflow_app` role (never the superuser Docker Compose provisions the database with), and every query automatically carries the request's role/employee id as Postgres session context (`backend/src/config/requestContext.ts`, applied transparently in `db.ts`). `tests/e2e/rls-security.test.ts` verifies this directly against the database, independent of the application-level `requireAuth`/`requireRole` middleware.

## 📐 Core business rules

| Rule | Enforcement |
|---|---|
| BR-1 — No overlapping active leave | Application-level pre-check **and** a Postgres `EXCLUDE` constraint (`no_overlapping_active_leave`); either path returns `409 LEAVE_OVERLAP` |
| BR-2 — Signup role lock | `role` is hardcoded in the `INSERT` statement, never read from the request |
| BR-4 — Attendance state machine | `UNIQUE(employee_id, att_date)` blocks a second check-in same day (`409 ALREADY_CHECKED_IN`); checking out without checking in returns `400 NOT_CHECKED_IN`; a `CHECK` constraint enforces checkout-after-checkin |
| BR-6 — Non-negative payroll | Enforced in the service layer and via `CHECK` constraints on the table |
| BR-7 — Password strength | 8+ characters, at least one letter and one digit |

## 🧪 Testing

**Backend** (`dayflow-hrms/backend`):
```bash
npm run type-check
npm run build
npx ts-node tests/auth.test.ts
npx ts-node tests/leave.overlap.test.ts
npx ts-node tests/authz-idor.test.ts
npx ts-node tests/signup.test.ts
```
There is no `npm test` script — the four files above are self-contained scripts (no external test runner), each printing a pass/fail summary.

**Frontend** (`dayflow-hrms/frontend`):
```bash
npm run lint
npm run build   # runs tsc, then vite build
```

**Cross-service E2E** (`dayflow-hrms/tests/e2e/`): these scripts drive the real backend and a real Postgres instance through the frontend's own API client (`auth-flow`, `leave-slice`, `attendance-slice`, `idor`, `25-endpoint-audit`, `master-regression`, `rls-security`). Run them all with `npm run e2e` from `dayflow-hrms/`, against a running `docker compose` stack — `DATABASE_URL` and `VITE_API_URL` need to actually reach that stack (e.g. `localhost` if ports are published to the host, or the compose service names `db`/`backend` from a container on the same Docker network). See `.github/workflows/ci.yml`'s `e2e` job for a copy-pasteable example of the latter.

**CI** (`.github/workflows/ci.yml`): three jobs — `backend` (typecheck, build, the four unit-test scripts, `npm audit`), `frontend` (lint, typecheck, build, `npm audit`), and `e2e` (builds and starts the real Docker Compose stack with no `.env` overrides, then runs the full E2E suite against it — the only gate that exercises the real database/RLS/container wiring end-to-end).

## 👤 Seeded accounts

Available once `seed.sql` has run (password is the same for all three). **Demo/development credentials only** — never reuse them in a real deployment.

| Role | Email | Password |
|---|---|---|
| HR | `hr.admin@dayflow.com` | `Password123!` |
| Employee | `john.doe@dayflow.com` | `Password123!` |
| Employee | `jane.smith@dayflow.com` | `Password123!` |

## 🗺️ Known limitations

- **E2E test runner / Node version coupling.** The `tests/e2e/` scripts import directly from `frontend/src/api-client/`. On very new Node releases with native TypeScript handling, this can conflict with the pinned `ts-node@10.9.2`. If you hit this, either run the individual backend test scripts above (which are unaffected — they stay entirely within `backend/`), or upgrade `ts-node`/switch to `tsx` at the `dayflow-hrms/` root.
- **No admin-initiated password reset.** HR can correct an employee's profile fields via `PATCH /employees/:id`, but there's no "force password reset" flow; a locked-out user must use `forgot-password` themselves.
- **Email delivery is optional infrastructure, not application logic.** Without `SMTP_*` configured, verification and password-reset links work correctly but only reach the backend's console log — fine for local/demo use, not for onboarding real users. The application never pretends an email was sent when it wasn't; the API response is explicit about which mode it's running in.
- **The in-memory auth rate limiter is single-instance.** Correct for the one-container-per-service deployment this repo ships; a horizontally-scaled deployment behind a load balancer would need a shared store (e.g. Redis) for the limit to apply across instances rather than per-instance.
- **No backup/restore strategy is implemented or documented beyond Postgres's own named Docker volume.** Treat this as an external operational responsibility for any real deployment.

## 🤝 Contributing

Contributions are welcome. Before opening a PR:

1. Fork the repo and create a feature branch off `main`.
2. Make your change, keeping it consistent with the layering in [Architecture](#-architecture) — routes stay HTTP-only, business logic lives in services, and only repositories touch SQL.
3. If you touch a request/response shape, update `dayflow-hrms/shared/types.ts` and `dayflow-hrms/CONTRACT.md` together — they're meant to never drift.
4. Run the relevant checks from [Testing](#-testing) locally; CI runs the same ones on every push and PR.
5. Open a PR describing the change and why it's needed.

## 📄 License

No license file is currently included in this repository. All rights are reserved by the author unless a license is added.

---

<div align="center">

Built by [Prasad Bant](https://github.com/PrasadBant)

</div>
