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
| `DATABASE_URL` | String | Yes | PostgreSQL connection string | `postgres://db_user:secret_pass@prod-db.internal:5432/dayflow_prod?sslmode=require` |
| `JWT_SECRET` | String | Yes | Secret string for signing JWT tokens | Cryptographically secure random 64-character hex string |
| `NODE_ENV` | String | Yes | Execution mode | `production` |
| `CORS_ORIGIN` | String | Yes | Allowed frontend origin for CORS headers | `https://hrms.yourcompany.com` |

### Frontend Build Environment Variables (`frontend`)

| Variable | Type | Required | Description | Example / Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| `VITE_API_URL` | String | Yes | Public backend API URL accessible by user browsers | `https://api-hrms.yourcompany.com/api` |

---

## 🛡️ Hardening & Security Checklist

1. **JWT Secret Strength**: Generate `JWT_SECRET` using `openssl rand -hex 32`.
2. **Database SSL**: Enforce `sslmode=require` in `DATABASE_URL`.
3. **Database Connection Pool**: Set max connection pool limits appropriate for application traffic (`max: 20` in `pg.Pool`).
4. **Helmet & Security Headers**: Express includes `helmet` middleware enforcing CSP, HSTS, X-Content-Type-Options, and Frameguard.
5. **CORS Restrictions**: Whitelist only authorized production domains in `cors()`.
6. **Non-Root Docker Execution**: Ensure containers run as non-root system users (`USER node`).

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
