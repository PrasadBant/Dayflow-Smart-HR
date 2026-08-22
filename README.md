# Dayflow HRMS — Smart Human Resource Management System

Dayflow HRMS is a modern, full-stack Human Resource Management System designed for managing employee profiles, department hierarchies, attendance check-ins/check-outs, leave request workflows, payroll tracking, and document metadata.

The system is built on a typed contract architecture specified in `CONTRACT.md` and shared TypeScript definitions in `shared/types.ts`.

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
├── Dockerfile                        # Multi-stage Docker container build
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
    │   │   ├── api-client/           # Typed API Client Layer (D1-D4 Real Integration)
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
            └── leave-slice.test.ts
```

---

## ⚡ Quickstart via Docker Compose

Run the entire system in containerized mode with PostgreSQL, Backend, and Frontend:

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
| `JWT_SECRET` | Backend | Cryptographic secret for signing JWT tokens | `super-secret-jwt-key-change-in-production-12345` |
| `NODE_ENV` | Backend | Runtime execution environment | `development` / `production` |
| `VITE_API_URL` | Frontend | Public backend API URL accessible by browser | `http://localhost:5000/api` |

---

## 🔌 API Client & Integration Architecture

The API client (`dayflow-hrms/frontend/src/api-client/`) provides typed wrapper functions matching all 25 `CONTRACT.md` endpoints.

- **Real Network Mode**: `USE_MOCKS = false` (configured in `client.ts`).
- **Authorization**: Attaches Bearer JWT headers automatically (`Authorization: Bearer <token>`).
- **Error Standard**: Standardized `ApiClientError` parsing `{ error: { code, message, details } }`.

### Implemented Real API Modules:
- `auth`: `login()`, `verifyEmail()`, `resendVerification()`, `signup()`
- `employees`: `getProfile()`, `updateMyProfile()`, `getEmployees()`, `updateEmployee()`, `getRecentActivity()`, `switchEmployeeContext()`
- `departments`: `getDepartments()`
- `leave`: `createLeaveRequest()`, `getMyLeaveRequests()`, `getAllLeaveRequests()`, `decideLeaveRequest()`
- `attendance`: `checkIn()`, `checkOut()`, `getMyAttendance()`, `getAllAttendance()`
- `payroll`: `getMyPayroll()`, `getEmployeePayroll()`, `updatePayroll()`
- `documents`: `getMyDocuments()`, `getEmployeeDocuments()`, `createDocumentMetadata()`

---

## 🧪 E2E Test Suite Execution

Canonical E2E integration tests are located in `dayflow-hrms/tests/e2e/`:

```bash
# 1. Full 25-Endpoint Integration Audit
npx ts-node dayflow-hrms/tests/e2e/25-endpoint-audit.test.ts

# 2. Real Leave Slice & Business Rule BR-1 Overlap Test
npx ts-node dayflow-hrms/tests/e2e/leave-slice.test.ts

# 3. Real Attendance Slice & Business Rule BR-4 Check-in/out Test
npx ts-node dayflow-hrms/tests/e2e/attendance-slice.test.ts

# 4. Authentication Flow Test
npx ts-node dayflow-hrms/tests/e2e/auth-flow.test.ts

# 5. IDOR Security Verification Test
npx ts-node dayflow-hrms/tests/e2e/idor.test.ts
```

---

## 🔑 Seeded Test Credentials

| Role | Email | Password |
| :--- | :--- | :--- |
| **Employee** | `john.doe@dayflow.com` | `Password123!` |
| **Employee** | `jane.smith@dayflow.com` | `Password123!` |
| **HR Admin** | `hr.admin@dayflow.com` | `Password123!` |

---

## ⚠️ Known Limitations

- **`POST /api/auth/signup` (HTTP 501)**: The signup endpoint currently returns HTTP 501 (`NOT_IMPLEMENTED`) due to a database schema constraint (`department_id` and `position` NOT NULL in PostgreSQL `employees` table vs `SignupRequest` DTO in `shared/types.ts`). All authentication login, verification, and resource endpoints are 100% operational.
