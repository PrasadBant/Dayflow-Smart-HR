# Dayflow HRMS — Smart Human Resource Management System

Dayflow HRMS is a modern, full-stack Human Resource Management System designed for managing employee profiles, department hierarchies, attendance check-ins/check-outs, leave request workflows, payroll tracking, and document metadata.

The system is built on a typed contract architecture specified in `CONTRACT.md` and shared TypeScript definitions in `shared/types.ts`. All 25/25 API endpoints specified in the contract are **100% LIVE and verified** against real backend services.

---

## 🚀 System Integration Status (D0–D6)

| Phase | Milestone | Status | Details |
| :--- | :--- | :--- | :--- |
| **D0** | Integration Infrastructure | **COMPLETE** | `.gitignore`, `.env.example`, `.github/workflows/ci.yml` |
| **D1** | Typed API Client Layer | **COMPLETE** | 25 contract wrappers in `frontend/src/api-client/` |
| **D2** | Real Leave Slice + E2E | **COMPLETE** | Real leave request submission, retrieval & BR-1 overlap checks |
| **D3** | Real Attendance Slice + E2E | **COMPLETE** | Real check-in/out, attendance logs & BR-4 state rules |
| **D4** | Real API + Security E2E | **COMPLETE** | `USE_MOCKS = false` network transport & IDOR security |
| **D5** | Containerization & Deployment | **COMPLETE** | Root `docker-compose.yml`, multi-stage `Dockerfile`, deployment docs |
| **D6** | Master Regression & Signup | **COMPLETE** | Real `POST /api/auth/signup` (201) & Master E2E Integration Suite |

**Overall Status**: **25 / 25 Contract Endpoints LIVE (100% GREEN)**

---

## 🏛️ System Architecture

```
                                ┌──────────────────────────────────────────────┐
                                │                 CONTRACT.md                  │
                                │        Single Source of Truth Specification  │
                                └──────────────────────┬───────────────────────┘
                                                       │
                                                       ▼
                                ┌──────────────────────────────────────────────┐
                                │               shared/types.ts                │
                                │          Shared TypeScript DTO Types          │
                                └──────────────┬────────────────┬──────────────┘
                                               │                │
                       ┌───────────────────────┘                └───────────────────────┐
                       ▼                                                                ▼
┌──────────────────────────────────────────────┐              ┌──────────────────────────────────────────────┐
│           Vite React Web Frontend            │              │          Node.js Express Backend             │
│        (dayflow-hrms/frontend)               │              │          (dayflow-hrms/backend)             │
│                                              │              │                                              │
│  ┌────────────────────────────────────────┐  │              │  ┌────────────────────────────────────────┐  │
│  │           Typed API Client             │  │  HTTP / REST │  │          Express Controllers           │  │
│  │    (frontend/src/api-client/)          ├──────────────┼─►│        (backend/src/routes/)          │  │
│  │    REAL Network Mode: USE_MOCKS=false  │  │   Bearer JWT │  │       requireAuth / requireRole        │  │
│  └────────────────────────────────────────┘  │              │  └───────────────────┬────────────────────┘  │
└──────────────────────────────────────────────┘              └──────────────────────┼───────────────────────┘
                                                                                     │
                                                                                     ▼
                                                              ┌──────────────────────────────────────────────┐
                                                              │             PostgreSQL Database              │
                                                              │          (dayflow-hrms/database)             │
                                                              │          schema.sql & seed.sql               │
                                                              └──────────────────────────────────────────────┘
```

---

## 📁 Repository Structure

```
Dayflow-Smart-HR-1/
├── Dockerfile                        # Multi-stage Docker container build (Node 20 / Nginx)
├── docker-compose.yml                # Container orchestration (Postgres, Backend, Frontend)
├── README.md                         # Project documentation & execution guide
├── deployment/                       # Deployment guides & environment templates
│   ├── LOCAL_DEPLOYMENT.md
│   ├── PRODUCTION_DEPLOYMENT.md
│   └── env.template
└── dayflow-hrms/                     # Primary application root
    ├── CONTRACT.md                   # Single source of truth API contract
    ├── shared/                       # Shared TypeScript DTOs & types
    │   └── types.ts
    ├── backend/                      # Express backend service
    │   ├── src/
    │   │   ├── auth/                 # JWT & bcrypt authentication middleware
    │   │   ├── config/               # Environment & Database pool configuration
    │   │   ├── repositories/         # Postgres SQL query repositories
    │   │   ├── routes/               # Express REST route handlers (25 endpoints)
    │   │   └── services/             # Core business logic services
    │   └── package.json
    ├── frontend/                     # Vite React Web Application
    │   ├── src/
    │   │   ├── api-client/           # Typed API Client Layer (25/25 Endpoints Live)
    │   │   ├── components/           # UI Primitives & Layout Shells
    │   │   ├── context/              # React Auth Context
    │   │   └── pages/                # Application Page Components
    │   └── package.json
    ├── database/                     # Database DDL & Seed SQL scripts
    │   ├── schema.sql                # PostgreSQL table DDL & trigger constraints
    │   └── seed.sql                  # Initial seed users and employees
    └── tests/                        # Integration & E2E Test Suite
        └── e2e/                      # Canonical E2E Integration Tests
            ├── 25-endpoint-audit.test.ts
            ├── attendance-slice.test.ts
            ├── auth-flow.test.ts
            ├── idor.test.ts
            ├── leave-slice.test.ts
            └── master-regression.test.ts
```

---

## ⚡ Quickstart via Docker Compose

Run the entire system in containerized mode with PostgreSQL, Backend, and Frontend (*Note: Requires active Docker Desktop daemon*):

```bash
# 1. Clone repository
git clone https://github.com/PrasadBant/Dayflow-Smart-HR.git
cd Dayflow-Smart-HR

# 2. Launch services using Docker Compose
docker compose up --build -d

# 3. Check service status
docker compose ps
```

- **Frontend Application**: `http://localhost:3000`
- **Backend REST API**: `http://localhost:5000/api`
- **PostgreSQL Database**: `localhost:5432` (`dayflow_db`)

---

## 🛠️ Local Development Setup

### 1. Database Initialization
```bash
createdb -U postgres dayflow_db
psql -U postgres -d dayflow_db -f dayflow-hrms/database/schema.sql
psql -U postgres -d dayflow_db -f dayflow-hrms/database/seed.sql
```

### 2. Backend Startup (`dayflow-hrms/backend`)
```bash
cd dayflow-hrms/backend
npm install
npm run dev
```

### 3. Frontend Startup (`dayflow-hrms/frontend`)
```bash
cd dayflow-hrms/frontend
npm install
npm run dev
```

---

## ⚙️ Environment Variables Reference

| Variable | Target | Description | Default Value |
| :--- | :--- | :--- | :--- |
| `PORT` | Backend | Express HTTP Server listening port | `5000` |
| `DATABASE_URL` | Backend | PostgreSQL connection URI | `postgres://dayflow_user:dayflow_password@localhost:5432/dayflow_db` |
| `JWT_SECRET` | Backend | Cryptographic secret for signing JWT tokens | see `docker-compose.yml` / `deployment/env.template` — rotate before any real deployment |
| `NODE_ENV` | Backend | Runtime execution environment | `development` / `production` |
| `VITE_API_URL` | Frontend | Public backend API URL accessible by browser | `http://localhost:5000/api` |

---

## 🔌 API Client & Integration Architecture

The API client (`dayflow-hrms/frontend/src/api-client/`) provides typed wrapper functions matching all 25 `CONTRACT.md` endpoints.

- **Real Network Mode**: `USE_MOCKS = false` (configured in `client.ts`).
- **Authorization**: Attaches Bearer JWT headers automatically (`Authorization: Bearer <token>`).
- **Error Standard**: Standardized `ApiClientError` parsing `{ error: { code, message, details } }`.

### 25 Live API Endpoints:
- `auth` (4): `signup()`, `login()`, `verifyEmail()`, `resendVerification()`
- `employees` (6): `getProfile()`, `updateMyProfile()`, `getEmployees()`, `updateEmployee()`, `getRecentActivity()`, `switchEmployeeContext()`
- `departments` (1): `getDepartments()`
- `leave` (4): `createLeaveRequest()`, `getMyLeaveRequests()`, `getAllLeaveRequests()`, `decideLeaveRequest()`
- `attendance` (4): `checkIn()`, `checkOut()`, `getMyAttendance()`, `getAllAttendance()`
- `payroll` (3): `getMyPayroll()`, `getEmployeePayroll()`, `updatePayroll()`
- `documents` (3): `getMyDocuments()`, `getEmployeeDocuments()`, `createDocumentMetadata()`

---

## 🔒 Security & Authorization Controls

- **Authentication**: JWT Bearer tokens with 8-hour expiration.
- **Password Security**: Bcrypt password hashing & BR-7 strength enforcement (8+ chars, 1 letter, 1 number).
- **Public Signup Lock (BR-2)**: `POST /api/auth/signup` forces role to `EMPLOYEE`; client payloads cannot self-select `HR`.
- **IDOR Protection (BR-5)**: Strict ownership checks prevent regular employees from viewing or modifying cross-employee leave, payroll, or document resources (returns HTTP 403 `FORBIDDEN`).
- **Business Rules Enforced**: BR-1 (Leave date overlap rejection), BR-4 (Check-in before check-out), BR-6 (Non-negative payroll figures).

---

## 🧪 E2E Integration Test Suites

Canonical E2E integration tests are located in `dayflow-hrms/tests/e2e/`:

```bash
# 1. Master End-to-End Integration Suite (10/10 Journey Steps)
npx ts-node dayflow-hrms/tests/e2e/master-regression.test.ts

# 2. Full 25-Endpoint Integration Audit (100% PASS)
npx ts-node dayflow-hrms/tests/e2e/25-endpoint-audit.test.ts

# 3. Real Signup & Auth Flow Integration Test
npx ts-node dayflow-hrms/tests/e2e/auth-flow.test.ts

# 4. Real Leave Slice & BR-1 Overlap Enforcement Test
npx ts-node dayflow-hrms/tests/e2e/leave-slice.test.ts

# 5. Real Attendance Slice & BR-4 State Test
npx ts-node dayflow-hrms/tests/e2e/attendance-slice.test.ts

# 6. IDOR Security Enforcement Test
npx ts-node dayflow-hrms/tests/e2e/idor.test.ts
```

---

## 🔑 Seeded Test Credentials

| Role | Email | Password |
| :--- | :--- | :--- |
| **Employee** | `john.doe@dayflow.com` | `Password123!` |
| **Employee** | `jane.smith@dayflow.com` | `Password123!` |
| **HR Admin** | `hr.admin@dayflow.com` | `Password123!` |
