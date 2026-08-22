# Dayflow HRMS

A full-stack Human Resource Management System covering employee profiles, department structure, attendance tracking, leave request workflows, payroll records, and document metadata.

The system is built against a single frozen contract (`dayflow-hrms/CONTRACT.md`) and a shared TypeScript type definition file (`dayflow-hrms/shared/types.ts`) that both the backend and frontend import directly, so request/response shapes stay in sync by construction rather than by convention.

## Contents

- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Repository structure](#repository-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [API overview](#api-overview)
- [Authentication & authorization](#authentication--authorization)
- [Core business rules](#core-business-rules)
- [Testing](#testing)
- [Seeded accounts](#seeded-accounts)
- [Known limitations](#known-limitations)

## Architecture

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

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, TypeScript, React Router |
| Backend | Node.js 20, Express, TypeScript |
| Database | PostgreSQL 16 |
| Auth | JWT (HS256, 8-hour expiry), bcrypt |
| Containerization | Docker, Docker Compose |

## Repository structure

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
    │   └── a7_rls.sql           # optional row-level-security hardening (see Known limitations)
    ├── tests/e2e/                # cross-service integration test scripts
    └── scripts/                  # unified E2E runner, DB constraint verification
```

## Getting started

### Option A — Docker Compose (recommended)

Requires Docker Desktop running.

```bash
git clone https://github.com/PrasadBant/Dayflow-Smart-HR.git
cd Dayflow-Smart-HR
docker compose up --build -d
docker compose ps
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api
- Postgres: localhost:5432 (`dayflow_db`)

The `db` service initializes from `schema.sql`, `seed.sql`, and `a7_rls.sql` on first boot (a named volume persists data across restarts — remove it with `docker compose down -v` to force a clean re-seed). `backend` and `frontend` both wait on their upstream dependency's healthcheck before starting.

### Option B — Local development

**Database:**
```bash
createdb -U postgres dayflow_db
psql -U postgres -d dayflow_db -f dayflow-hrms/database/schema.sql
psql -U postgres -d dayflow_db -f dayflow-hrms/database/seed.sql
```

**Backend** (`dayflow-hrms/backend`):
```bash
cd dayflow-hrms/backend
npm install
cp ../../deployment/env.template .env   # or export the vars listed below directly
npm run dev
```

**Frontend** (`dayflow-hrms/frontend`):
```bash
cd dayflow-hrms/frontend
npm install
npm run dev
```

## Environment variables

| Variable | Used by | Description |
|---|---|---|
| `PORT` | backend | HTTP listen port (default `5000`) |
| `DATABASE_URL` | backend | Postgres connection string |
| `JWT_SECRET` | backend | Signing secret for session JWTs. `backend/src/config/env.ts` rejects a small set of known-insecure placeholder values at startup — always generate your own (`openssl rand -hex 32`) before any real deployment |
| `FRONTEND_ORIGIN` | backend | Exact origin allowed by CORS |
| `NODE_ENV` | backend | `development` \| `production` |
| `VITE_API_URL` | frontend | Base API URL the browser calls (e.g. `http://localhost:5000/api`) |

A working set of local defaults is in `deployment/env.template`.

## API overview

All 25 endpoints in `CONTRACT.md` are implemented, mounted under `/api`:

| Resource | Endpoints |
|---|---|
| Auth | `POST /auth/signup`, `POST /auth/login`, `POST /auth/verify-email`, `POST /auth/resend-verification` |
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

## Authentication & authorization

- JWTs are signed with HS256, carry `{ userId, employeeId, role }`, and expire after 8 hours. Pass as `Authorization: Bearer <token>`.
- Passwords are hashed with bcrypt (10 rounds) and must be 8+ characters with at least one letter and one digit.
- `POST /auth/signup` always creates an `EMPLOYEE` — any `role` field in the request body is ignored, not just rejected; there is no code path that reads it. New employees default to the `Unassigned` department and `Employee` position, correctable later via `PATCH /employees/:id`.
- Unverified accounts (`emailVerified = false`) get `403 EMAIL_NOT_VERIFIED` on login. In this environment, no mail service is wired up — the verification token is printed to the backend's console log on signup for local/demo use.
- Every route that takes an `:id`/`:employeeId` path parameter is gated `HR Only`; there is no "employee accessing their own ID via a shared route" case in this contract, so role-checking middleware doubles as the IDOR boundary. `/me` routes derive the acting employee from the JWT, never from client input.

## Core business rules

| Rule | Enforcement |
|---|---|
| BR-1 — No overlapping active leave | Application-level pre-check **and** a Postgres `EXCLUDE` constraint (`no_overlapping_active_leave`); either path returns `409 LEAVE_OVERLAP` |
| BR-2 — Signup role lock | `role` is hardcoded in the `INSERT` statement, never read from the request |
| BR-4 — Attendance state machine | `UNIQUE(employee_id, att_date)` blocks a second check-in same day (`409 ALREADY_CHECKED_IN`); checking out without checking in returns `400 NOT_CHECKED_IN`; a `CHECK` constraint enforces checkout-after-checkin |
| BR-6 — Non-negative payroll | Enforced in the service layer and via `CHECK` constraints on the table |
| BR-7 — Password strength | 8+ characters, at least one letter and one digit |

## Testing

**Backend** (`dayflow-hrms/backend`):
```bash
npm run type-check
npm run build
npx ts-node tests/auth.test.ts
npx ts-node tests/leave.overlap.test.ts
npx ts-node tests/authz-idor.test.ts
npx ts-node tests/signup.test.ts
```
There is no `npm test` script — the four files above are self-contained scripts (no external test runner), each printing a pass/fail summary. All four are green as of this commit.

**Cross-service E2E** (`dayflow-hrms/tests/e2e/`): these scripts drive the real backend and a real Postgres instance through the frontend's own API client (`auth-flow`, `leave-slice`, `attendance-slice`, `idor`, `25-endpoint-audit`, `master-regression`). A root-level `package.json`/`tsconfig.json` at `dayflow-hrms/` makes them resolvable, but running them end-to-end currently requires a `ts-node` version compatible with your Node runtime — see [Known limitations](#known-limitations).

## Seeded accounts

Available once `seed.sql` has run (password is the same for all three):

| Role | Email | Password |
|---|---|---|
| HR | `hr.admin@dayflow.com` | `Password123!` |
| Employee | `john.doe@dayflow.com` | `Password123!` |
| Employee | `jane.smith@dayflow.com` | `Password123!` |

## Known limitations

- **E2E test runner / Node version coupling.** The `tests/e2e/` scripts import directly from `frontend/src/api-client/`. On very new Node releases with native TypeScript handling, this can conflict with the pinned `ts-node@10.9.2`. If you hit this, either run the individual backend test scripts above (which are unaffected — they stay entirely within `backend/`), or upgrade `ts-node`/switch to `tsx` at the `dayflow-hrms/` root.
- **`a7_rls.sql` is defense-in-depth, not the primary access control.** The application connects to Postgres as a role with `BYPASSRLS`, so these policies apply to the dedicated `dayflow_app` role (exercised by `tests/e2e/rls-security.test.ts`) rather than the app's own connection. The real authorization boundary is the `requireAuth`/`requireRole` middleware in `backend/src/auth/middleware.ts`.
- **No outbound email.** Signup and resend-verification mint a real, time-limited token but only log it server-side. Wiring an actual mail provider is a deliberate follow-up, not an oversight.
- **Attendance, payroll, documents, and employee-directory UI screens are intentionally static placeholders** pending further frontend work; their backend endpoints and typed API client functions are complete and independently testable.
