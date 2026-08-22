# PERSON B — Backend (Routes · Services · Business Logic)

**Tool:** Codex
**You own:** `backend/src/routes/`, `backend/src/services/`, `backend/src/repositories/`, `backend/tests/`
**You touch nothing else.** You turn A's foundation into a working API. The leave slice (apply → approve) is your P0 crown jewel — protect it.

---

## The PREPEND (paste at the top of EVERY prompt)

```
Shared hackathon repo; 4 AI tools work in parallel and cannot talk — the repo is our only shared
memory. BEFORE building: read CONTRACT.md and shared/types; inspect the repo and the code you'll
touch. Edit ONLY files in my owned folders (backend/src/routes/, backend/src/services/,
backend/src/repositories/, backend/tests/). HARD RULES: use ONLY field names/types from
shared/types (never invent or rename); do not change schema/API/architecture; do not touch other
members' folders; import A's auth utils and config, don't reimplement them; no new deps without
justifying; no deleting tests; no secrets. WHEN DONE: run tests+build, list changed files, paste
failures verbatim, never claim success unrun. Conflict with CONTRACT.md -> STOP and report. MY TASK:
```

---

## Golden rules for you specifically
- **Layer discipline:** Route parses/validates → Service holds logic → Repository does parameterized SQL. Never skip a layer. Routes never write SQL; repositories never know about roles.
- **Never edit `shared/types.ts`.** If a field is wrong, tell A — it's a Change Request.
- **Build the slice before breadth.** One working endpoint (leave apply) beats ten stubs.
- Your push loop:
  ```bash
  git add backend/src/routes/ backend/src/services/ backend/src/repositories/ backend/tests/
  git commit -m "type(scope): summary"
  git pull --rebase origin main && git push
  ```
- Work on branch `feat/backend`; merge to `main` only when green.

---

## PHASE B0 — 9:00–9:30 · Contract freeze (with team)
- Review the API contract with A/C/D. Confirm every endpoint's method/path/request/response.
- ✅ Done when: contract approved. **Then wait for A's schema + types (~10:00) before real work — use this gap to plan your route files.**

## PHASE B1 — 10:00–11:00 · Boot + route skeletons
> Needs A3 (config/bootstrap) done. If A isn't ready, build route files that return 501 and don't import config yet.
**Prompt:**
```
[PREPEND]
Create backend/src/routes/ with one router file per resource (auth, employees, leave-requests,
attendance, payroll, documents, departments) covering EVERY endpoint in the spec's API Specification.
Each handler returns 501 Not Implemented for now, but with the correct method + path wired and
mounted in app.ts. This lets the frontend and E2E harness see the real routes immediately.
```
- **Commit:** `feat(api): scaffold route skeletons for all endpoints`
- ✅ Done when: server boots, every route is reachable (501). **D can now point the client at real paths.**

## PHASE B2 — 11:00–12:00 · The vertical slice (P0 core)
**Prompt:**
```
[PREPEND]
Implement the leave vertical slice fully: POST /api/leave-requests and GET /api/leave-requests/me.
LeaveService.create(employeeId, dto) + LeaveRepository (parameterized INSERT ... RETURNING, mapping
snake_case DB rows to camelCase shared types). Use requireAuth. Status defaults to Pending. Return
201 with the LeaveRequest. GET returns the employee's own requests (paginated {items,total}).
```
- **Commit:** `feat(leave): implement create and list-own leave requests`
- ✅ Done when: you can curl a leave request and get it back. 🔗 **SYNC: tell D the slice is live so they can wire E2E.**

## PHASE B3 — 12:00–13:00 · The business rule (BR-1) + tests (never cut)
**Prompt:**
```
[PREPEND]
Enforce the overlap rule in LeaveService.create(): catch Postgres error code 23P01
(exclusion_violation) from the no_overlapping_active_leave constraint and translate to AppError
'LEAVE_OVERLAP' (409). Do a belt-and-suspenders pre-check query too. Add backend/tests/leave.overlap.test.ts
covering the pass path (non-overlapping succeeds) and the violation path (overlapping -> 409).
```
- **Commit:** `feat(leave): enforce overlap business rule with tests`
- ✅ Done when: overlap test suite green. 🔗 **SYNC with A** that DB constraint + your service agree.

## PHASE B4 — 13:00–14:30 · Remaining endpoints
**Prompt:**
```
[PREPEND]
Implement the remaining API Specification endpoints, importing A's auth utils:
- auth: signup (FORCE role=EMPLOYEE server-side, no role from body; password policy; return {user}
  no token), verify-email, login (block unverified -> 403 EMAIL_NOT_VERIFIED, verified -> {user,token}),
  resend-verification.
- employees: GET/PATCH /me (server whitelists address/phone/profilePictureUrl only), GET / (HR,
  paginated), PATCH /:id (HR full), recent-activity, switch-context/:id (HR, attendance last 7 +
  leave last 20).
- departments: GET / .
- leave: PATCH /:id approve/reject (HR only, records decidedBy/decidedAt/comments, only if status
  was Pending), GET / (HR, paginated).
- attendance: check-in (status='Present', 409 ALREADY_CHECKED_IN on dup), check-out (400 NOT_CHECKED_IN),
  GET /me + GET / (HR), paginated.
- payroll: GET /me, GET /:employeeId (HR), PATCH /:employeeId (HR, reject negatives).
- documents: GET /me, GET /:employeeId (HR), POST (employee forced to self, HR any; METADATA only,
  no file upload).
Every route: requireAuth, correct role/ownership guard, zod validation, standard error shape.
```
- **Commit:** `feat(api): implement auth, employees, leave-decide, attendance, payroll, documents`
- ✅ Done when: no 501s remain; every endpoint returns real data.

## PHASE B5 — 14:30–15:30 · Validation + edge cases + authz tests
**Prompt:**
```
[PREPEND]
Harden every route: zod schemas for all bodies (reject bad email, weak password, bad date ranges,
negative salary). Add backend/tests/ for: duplicate-email signup -> 409 EMAIL_TAKEN; employee hitting
an HR route -> 403 FORBIDDEN; employee reading another employee's leave/attendance/payroll -> 403
(IDOR); signup with role:'HR' in body still creates EMPLOYEE. Confirm the standard error shape
everywhere.
```
- **Commit:** `test(api): add validation and authorization/IDOR edge-case tests`
- ✅ Done when: full backend suite green. 🔗 **SYNC: hand off to D for full integration.**

## PHASE B6 — 15:30–16:30 · Freeze + integration fixes
- No new endpoints. Fix only what D's integration audit flags.
- When D reports a failing link, fix it on your branch, push, tell D.
- **Commit (as needed):** `fix(api): <the specific integration fix>`

---

## Your hourly commit cadence
| Hour | Commit |
|---|---|
| 11:00 | `feat(api): scaffold route skeletons for all endpoints` |
| 12:00 | `feat(leave): implement create and list-own leave requests` |
| 13:00 | `feat(leave): enforce overlap business rule with tests` |
| 14:30 | `feat(api): implement auth, employees, leave-decide, attendance, payroll, documents` |
| 15:30 | `test(api): add validation and authorization/IDOR edge-case tests` |
| 16:00 | `fix(api): integration fixes from D's audit` |

## Sync map
- **You depend on A:** schema (A1), types (A2), config (A3), auth utils (A4). Front-load B1 planning while waiting.
- **D depends on you:** the live slice (B2) so E2E can run; all endpoints (B4) so C can swap mocks → real.
- **Contract mismatch?** Never patch `shared/types` yourself — raise it with A.
