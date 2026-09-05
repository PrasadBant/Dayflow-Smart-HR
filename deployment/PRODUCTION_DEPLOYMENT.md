# Production Deployment Guide — Dayflow HRMS

This document outlines architecture recommendations, environment variable security, SSL/TLS termination, database maintenance, and deployment workflows for hosting Dayflow HRMS in production.

---

## 🏗️ Recommended Production Architecture

```
                       ┌─────────────────────────┐
                       │  TLS / HTTPS Nginx      │
                       │  Reverse Proxy (Port 443)│
                       └────────────┬────────────┘
                                    │
           ┌────────────────────────┴────────────────────────┐
           ▼                                                 ▼
┌──────────────────────┐                          ┌──────────────────────┐
│  Static Web Hosting  │                          │  Backend Service     │
│  Vite Web Build      │                          │  Node/Express        │
│  (Nginx / S3 / CDN)  │                          │  (Port 5000)         │
└──────────────────────┘                          └──────────┬───────────┘
                                                             │
                                                             ▼
                                                  ┌──────────────────────┐
                                                  │ PostgreSQL Database  │
                                                  │ Managed RDS / HA     │
                                                  └──────────────────────┘
```

---

## 🔒 Production Environment Variables

Never commit production environment variables to source repositories. Supply them via secret managers (AWS Secrets Manager, GCP Secret Manager, Vault) or environment variables.

### Backend Environment Variables (`backend`)

| Variable | Type | Required | Description | Example / Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| `PORT` | Number | Yes | Express HTTP server port | `5000` |
| `DATABASE_URL` | String | Yes | PostgreSQL connection string — must be the non-superuser `dayflow_app` role (see `database/a7_rls.sql`), not a superuser, or row-level security is silently bypassed | `postgres://dayflow_app:secret_pass@prod-db.internal:5432/dayflow_prod?sslmode=require` |
| `JWT_SECRET` | String | Yes | Secret string for signing JWT tokens | Cryptographically secure random 64-character hex string — never reuse any value that has ever appeared in a committed file, including this repo's own `docker-compose.yml`/`.env.example` defaults |
| `NODE_ENV` | String | Yes | Execution mode | `production` — the app logs a loud startup warning (not a hard failure) if it detects it's still running with a known default JWT secret, default DB password, or no SMTP configured under this mode |
| `FRONTEND_ORIGIN` | String | Yes | Allowed frontend origin for CORS headers (note: the actual variable name is `FRONTEND_ORIGIN`, not `CORS_ORIGIN`) | `https://hrms.yourcompany.com` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | String | Recommended | Real email delivery for signup verification and password reset. Without these, both flows still function correctly but only log their links to the console — acceptable for a demo, not for real users | `SMTP_HOST=smtp.sendgrid.net`, etc. |

### Frontend Build Environment Variables (`frontend`)

| Variable | Type | Required | Description | Example / Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| `VITE_API_URL` | String | Yes | Public backend API URL accessible by user browsers | `https://api-hrms.yourcompany.com/api` |

---

## 🛡️ Hardening & Security Checklist

1. **JWT Secret Strength**: Generate `JWT_SECRET` using `openssl rand -hex 32`.
2. **Database SSL**: Enforce `sslmode=require` in `DATABASE_URL`.
3. **Database Connection Pool**: `backend/src/config/db.ts` currently caps the pool at `max: 10` — raise it if your instance's connection limit and traffic justify it.
4. **Helmet & Security Headers**: Express includes `helmet` middleware; the static frontend (served via `deployment/nginx.conf`) separately sets `X-Content-Type-Options`, `X-Frame-Options`, and `Referrer-Policy`, since nginx doesn't inherit helmet's headers.
5. **CORS Restrictions**: `FRONTEND_ORIGIN` is a single exact origin, not a list — deploying multiple frontend origins against one backend isn't supported today.
6. **Non-Root Docker Execution**: the backend image already runs as the non-root `node` user (see `Dockerfile`). nginx's own worker processes (which handle all real traffic) already run as its unprivileged `nginx` user by default; only its non-traffic-handling master process is root.
7. **Auth rate limiting**: `/api/auth/*` is limited to 20 requests/15min per IP, in-memory — fine for one backend instance; a horizontally-scaled deployment needs a shared store (e.g. Redis) instead.
8. **Row-level security**: confirm your production database actually runs `database/a7_rls.sql` and that `DATABASE_URL` connects as `dayflow_app`, not a superuser — a managed database service (RDS, Cloud SQL, etc.) may provision its own superuser differently than this repo's Docker Compose setup does.

---

## 🔄 Health Checks & Monitoring

- **Backend Health Check**: `GET /api/employees/me` (requires 401 unauthenticated check or health endpoint `/health`).
- **Database Readiness**: Run `pg_isready -h prod-db.internal -U db_user`.

---

## 🚨 Rollback Plan

In the event of a deployment failure:
1. Re-route Nginx reverse proxy traffic to the previous healthy container image tag.
2. If database migration/schema changes were made, execute corresponding down migration scripts.
3. Verify database restoration point-in-time state.
