# Local Deployment Guide — Dayflow HRMS

This guide outlines step-by-step instructions for deploying and running Dayflow HRMS locally using Node.js or Docker Compose.

---

## 📋 Prerequisites

- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **PostgreSQL**: v14.x or higher (or Docker)
- **Git**: v2.x or higher

---

## 🚀 Quickstart via Docker Compose (Recommended)

The fastest way to launch the complete system (PostgreSQL database, Express backend API, and Vite web frontend):

```bash
# 1. Clone repository
git clone https://github.com/PrasadBant/Dayflow-Smart-HR.git
cd Dayflow-Smart-HR

# 2. Build and launch containers
docker compose up --build -d

# 3. Verify container health
docker compose ps
```

- **Frontend Application**: `http://localhost:3000`
- **Backend API Server**: `http://localhost:5000/api`
- **PostgreSQL Database**: `localhost:5432` (`dayflow_db`)

---

## 🛠️ Manual Local Setup (Step-by-Step)

### Step 1: Initialize Database

1. Create PostgreSQL database `dayflow_db`:
   ```bash
   createdb -U postgres dayflow_db
   ```
2. Execute schema, seed, and RLS scripts:
   ```bash
   psql -U postgres -d dayflow_db -f dayflow-hrms/database/schema.sql
   psql -U postgres -d dayflow_db -f dayflow-hrms/database/seed.sql
   psql -U postgres -d dayflow_db -f dayflow-hrms/database/a7_rls.sql
   ```
   The third script creates the `dayflow_app` role `DATABASE_URL` below connects as — don't skip it, the backend won't be able to connect without that role existing.

### Step 2: Configure Environment Variables

Create `.env` file inside `dayflow-hrms/backend/.env`:
```env
PORT=5000
DATABASE_URL=postgres://dayflow_app:dayflow_app_password@localhost:5432/dayflow_db
JWT_SECRET=generate-your-own-with-openssl-rand-hex-32
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:5173
```
`FRONTEND_ORIGIN` is required — `backend/src/config/env.ts` refuses to start without it. Match it to wherever Vite's dev server actually serves the frontend (see Step 4 — it may be `5173`, not `3000`, outside Docker).

Create `.env` file inside `dayflow-hrms/frontend/.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

### Step 3: Launch Backend Service

```bash
cd dayflow-hrms/backend
npm install
npm run dev
```
Backend will start on `http://localhost:5000`.

### Step 4: Launch Frontend Application

```bash
cd dayflow-hrms/frontend
npm install
npm run dev
```
Frontend will start on `http://localhost:3000` or `http://localhost:5173`.

---

## 🔑 Seeded Test Credentials

| Role | Email | Password |
| :--- | :--- | :--- |
| **Employee** | `john.doe@dayflow.com` | `Password123!` |
| **Employee** | `jane.smith@dayflow.com` | `Password123!` |
| **HR Admin** | `hr.admin@dayflow.com` | `Password123!` |

---

## 🧪 Running Integration & E2E Tests

Ensure backend service is running on `http://localhost:5000`, then execute:

```bash
# From dayflow-hrms/ — runs all seven suites in one pass (see scripts/run-all-e2e-tests.ts)
npm run e2e
```
This includes `rls-security.test.ts` and `master-regression.test.ts` in addition to the five suites listed above in earlier versions of this guide. `rls-security.test.ts` connects to Postgres directly as `dayflow_app`, so `DATABASE_URL` needs to actually reach your database (adjust it if you're not running against `localhost:5432`).
