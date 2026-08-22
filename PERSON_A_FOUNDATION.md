# PERSON A — Foundation (Database · Auth · Shared Types · Config)

**Tool:** Claude Code
**You own:** `database/`, `backend/src/config/`, `backend/src/auth/`, `shared/`, `CONTRACT.md`
**You touch nothing else.** You are the foundation everyone builds on — your Hour 1 output unblocks B, C, and D, so speed here matters most.

---

## The PREPEND (paste at the top of EVERY prompt you give the AI)

```
Shared hackathon repo; 4 AI tools work in parallel and cannot talk — the repo is our only shared
memory. BEFORE building: read CONTRACT.md and shared/types; inspect the repo and the code you'll
touch. Edit ONLY files in my owned folders (database/, backend/src/config/, backend/src/auth/,
shared/, CONTRACT.md). HARD RULES: use ONLY field names/types from shared/types (never invent or
rename); do not change the agreed schema/API/architecture; do not touch other members' folders;
no new deps without justifying; no deleting tests; no secrets in code. WHEN DONE: run tests+build,
list changed files, paste any failures verbatim, never claim success unrun. If something conflicts
with CONTRACT.md, STOP and report — don't silently change it. MY TASK:
```

---

## Golden rules for you specifically
- **`shared/types.ts` is sacred.** Once committed, you are the *only* person who edits it, and only via a Change Request. A field rename by you at 2pm breaks 3 people silently.
- **Commit hourly even if small.** Judges inspect history hourly — a steady A commit stream is the backbone of the repo story.
- **Ship the schema + types FIRST, before anything clever.** B/C/D are literally waiting on them.
- Your push loop every commit:
  ```bash
  git add database/ backend/src/config/ backend/src/auth/ shared/ CONTRACT.md
  git commit -m "type(scope): summary"
  git pull --rebase origin main && git push
  ```

---

## PHASE A0 — 9:00–9:30 · Contract freeze (with the whole team, no code)
- Sit with B, C, D. Agree the schema, the API endpoint list, and the field names.
- You commit `CONTRACT.md` + the first `shared/types.ts` skeleton.
- **Commit:** `docs(contract): freeze v1`
- ✅ Done when: all 4 have pulled and agree. **This is the unblock gate — do it fast.**

## PHASE A1 — 9:30–10:00 · Database schema + seed
**Prompt:**
```
[PREPEND]
Create database/schema.sql implementing the Backend Schema in the spec exactly: users, employees,
departments, attendance, leave_requests, payroll, documents, audit_log. Include ALL constraints:
the no_overlapping_active_leave EXCLUDE constraint (btree_gist), chk_decision_consistency,
chk_checkout_after_checkin, UNIQUE(employee_id, att_date), non-negative payroll checks, the
set_updated_at trigger, and the check_leave_attendance_consistency trigger (VALIDATION ONLY - it
rejects an invalid 'Leave' status, it does NOT auto-create rows). Do NOT enable RLS yet (that is a
later P1 hardening step). Then create database/seed.sql with: 2 departments, 1 HR user
(email_verified=true), 2 employee users (email_verified=true), bcrypt-hashed passwords, payroll
rows, a couple attendance rows, and 1 pending leave request to demo approval on.
```
- **Commit:** `feat(db): add schema, constraints, and seed data`
- ✅ Done when: `psql -f database/schema.sql && psql -f database/seed.sql` runs clean.

## PHASE A2 — 10:00–10:30 · Shared types (the glue)
**Prompt:**
```
[PREPEND]
Create shared/types.ts exactly matching the "Shared Types" section of the spec: Role, LeaveType,
LeaveStatus, AttendanceStatus, Department, User (employeeCode NOT role-less signup), Employee
(departmentId + departmentName), Attendance, LeaveRequest (decisionComments), Payroll, Document,
ActivityItem, EmployeeContext, Paginated<T>, AuthResponse, all request DTOs (SignupRequest has NO
role field), and the ErrorCode union + ApiError. camelCase everywhere. Add the naming comment
distinguishing id vs employeeCode vs employeeId.
```
- **Commit:** `feat(shared): add shared type definitions`
- ✅ Done when: `tsc --noEmit` passes on `shared/types.ts`. **Tell the team it's live — B, C, D unblock now.**

## PHASE A3 — 10:30–11:00 · Config + app bootstrap
**Prompt:**
```
[PREPEND]
Create backend/src/config/env.ts (typed loader, throws if DATABASE_URL/JWT_SECRET/PORT/
FRONTEND_ORIGIN missing) and backend/src/config/db.ts (single shared pg Pool, max:10). Create
backend/src/index.ts + app.ts: express app with helmet, cors restricted to FRONTEND_ORIGIN,
express.json, a /health route returning 200, and the central error middleware that formats every
AppError into { error: { code, message, details } }. Mount /api/auth as a stub for now.
```
- **Commit:** `feat(config): add env/db config and app bootstrap`
- ✅ Done when: `GET /health` → 200. **B can now boot the server.**

## PHASE A4 — 11:00–12:00 · Auth core (hash · JWT · middleware)
**Prompt:**
```
[PREPEND]
Implement backend/src/auth/: hash.ts (bcrypt hash/verify, 10 rounds); jwt.ts (sign/verify, payload
{userId, employeeId, role}, 8h expiry); middleware.ts (requireAuth attaching req.user;
requireRole('HR'); requireOwnership(param) where HR bypasses and an employee's employeeId must
match). errors/AppError.ts (code, message, status, details). Add unit tests for hash round-trip and
requireRole allow/deny. These are utilities B will import - export them cleanly.
```
- **Commit:** `feat(auth): add hashing, JWT, and role/ownership middleware`
- ✅ Done when: auth unit tests pass. **B now has everything to wire signup/login.**

## PHASE A5 — 12:00–12:30 · Verify the business rule at the DB (integration checkpoint)
**Prompt:**
```
[PREPEND]
Add a script scripts/verify-constraints.sql (or a test) that: inserts a pending leave, then
attempts an overlapping insert and asserts the DB raises exclusion_violation (23P01); attempts an
attendance row with status='Leave' and no approved leave and asserts rejection. Document the
expected Postgres error codes so B can catch them in the service layer.
```
- **Commit:** `test(db): verify overlap and leave-attendance constraints`
- ✅ Done when: both violations are rejected by the DB directly.
- 🔗 **SYNC:** confirm with B that the service catches `23P01` → `409 LEAVE_OVERLAP`.

## PHASE A6 — 13:00–14:00 · Signup role-lock + auth security pass
**Prompt:**
```
[PREPEND]
Review the signup path with B: ensure the server FORCES role=EMPLOYEE on public signup (SignupRequest
has no role field) - HR can never be self-registered. Confirm password policy (8+ chars, letter +
number) is enforced. Confirm no secrets are logged, .env is gitignored, .env.example has names only,
CORS is locked to FRONTEND_ORIGIN. Fix any gap in my owned folders only.
```
- **Commit:** `chore(security): lock signup to EMPLOYEE role and finalize env/CORS`
- ✅ Done when: a signup with `role:"HR"` in the body still creates an EMPLOYEE.

## PHASE A7 — 14:00–15:00 · (P1, only if P0 green everywhere) RLS hardening
> ⚠️ Do this ONLY after the full app works end-to-end. A bad RLS policy silently returns zero rows. If it fights you, skip it — app-layer ownership checks already satisfy the security requirement.
**Prompt:**
```
[PREPEND]
Add Row-Level Security to attendance, leave_requests, payroll as an additive hardening layer:
FOR ALL policies with USING + WITH CHECK for employee-own rows, SELECT-only for employee payroll,
FOR ALL for HR. App sets SET LOCAL app.current_employee_id and app.current_role per request in a
transaction; app connects as a non-superuser role. Coordinate with B on the per-request SET LOCAL
wiring. Verify existing E2E tests still pass afterward - if any now return zero rows, revert RLS.
```
- **Commit:** `feat(db): add RLS hardening layer (additive)`
- ✅ Done when: all E2E tests still green with RLS on. **If not green, revert immediately.**

## PHASE A8 — 15:00–16:30 · Freeze support
- Help D with any final schema/seed tweaks for demo data.
- No new features. Blocker fixes only.
- **Commit (if needed):** `fix(db): adjust seed data for demo`

---

## Your hourly commit cadence (what a judge sees)
| Hour | Commit |
|---|---|
| 9:30 | `docs(contract): freeze v1` |
| 10:00 | `feat(db): add schema, constraints, and seed data` |
| 10:30 | `feat(shared): add shared type definitions` |
| 11:00 | `feat(config): add env/db config and app bootstrap` |
| 12:00 | `feat(auth): add hashing, JWT, and role/ownership middleware` |
| 12:30 | `test(db): verify overlap and leave-attendance constraints` |
| 14:00 | `chore(security): lock signup to EMPLOYEE role and finalize env/CORS` |
| 15:00 | `feat(db): add RLS hardening layer (additive)` *(P1)* |

## Who depends on you
- **B** needs your schema (A1), types (A2), config (A3), auth utils (A4) — front-load these.
- **C & D** need `shared/types.ts` (A2) — that's their unblock too.
- **You depend on:** nobody. You go first. Don't wait.
