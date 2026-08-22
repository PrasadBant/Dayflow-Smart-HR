# PERSON D — Integration · API-Client · QA · Deploy · Docs

**Tool:** Claude Code
**You own:** `frontend/src/api-client/`, `tests/` (E2E), `scripts/`, `deployment/`, `README.md`
**You touch nothing else.** You are the glue and the safety net. You make C's frontend and B's backend meet in the middle, and you are the one who keeps `main` demoable.

---

## The PREPEND (paste at the top of EVERY prompt)

```
Shared hackathon repo; 4 AI tools work in parallel and cannot talk — the repo is our only shared
memory. BEFORE building: read CONTRACT.md and shared/types; inspect the repo and the code you'll
touch. Edit ONLY files in my owned folders (frontend/src/api-client/, tests/, scripts/,
deployment/, README.md). HARD RULES: use ONLY field names/types from shared/types (never invent or
rename); do not change schema/API/architecture; do not touch other members' folders; no new deps
without justifying; no deleting tests; no secrets. WHEN DONE: run tests+build, list changed files,
paste failures verbatim, never claim success unrun. Conflict with CONTRACT.md -> STOP and report.
MY TASK:
```

---

## Golden rules for you specifically
- **The api-client is the seam that makes C and B independent.** You give C typed functions that return **mocks** first, then flip them to **real** in one place when B is live. C's components never change — that's the whole trick.
- **You run the hourly integration.** Pull all branches → run E2E → report the ONE failing link (file, expected vs actual field/type) to its owner. You don't fix their code; you point precisely.
- **`main` is always green.** You merge good parts in; broken work stays on personal branches.
- Your push loop:
  ```bash
  git add frontend/src/api-client/ tests/ scripts/ deployment/ README.md
  git commit -m "type(scope): summary"
  git pull --rebase origin main && git push
  ```

---

## PHASE D0 — 9:00–9:30 · Contract freeze + repo setup
- With the team, lock the contract. Then set up the repo skeleton, `.gitignore`, `.env.example`, branch protection on `main` (require CI green), and a PR template listing owned folders.
- **Commit:** `chore(repo): initialize structure, gitignore, env example, CI`
- ✅ Done when: everyone can clone and branch.

## PHASE D1 — 10:00–11:00 · API-client with mocks (unblocks C)
> Needs A2 (shared/types). This is your most time-critical task — C is waiting.
**Prompt:**
```
[PREPEND]
Create frontend/src/api-client/: client.ts (fetch wrapper - base URL from VITE_API_URL, attaches
Bearer token, parses the standard error shape into an Error with .cause = error.code) and one typed
module per resource (auth, employees, leave, attendance, payroll, documents, departments) with one
function per endpoint in the spec, typed with shared/types. Add a USE_MOCKS flag: when true, each
function returns a realistic, contract-shaped mock (correct types, plausible data) instead of
calling the network. Default USE_MOCKS=true for now so C can build immediately.
```
- **Commit:** `feat(api-client): typed client with mock responses`
- ✅ Done when: C can import and call every function. **Tell C it's live.**

## PHASE D2 — 11:00–12:30 · Wire the slice + first E2E
> Needs B2 (live slice). Point the leave functions at the real API while everything else stays mocked.
**Prompt:**
```
[PREPEND]
B's leave slice is live. In api-client, switch the leave functions (create, listMine) from mock to
real network calls; leave the rest mocked. Add tests/e2e/leave-slice.test.ts: sign up/seeded login
as employee -> create a leave request -> GET /leave-requests/me -> assert the new row is Pending.
Run it against the real backend.
```
- **Commit:** `test(e2e): wire leave slice and add end-to-end test`
- ✅ Done when: slice E2E is green end to end. 🔗 **SYNC: C's leave screen now shows real data automatically.**

## PHASE D3 — 12:30–13:30 · Business-rule E2E (never cut)
**Prompt:**
```
[PREPEND]
Add tests/e2e/leave-overlap.test.ts: create a leave request, then create an overlapping one, assert
the response is 409 with error.code LEAVE_OVERLAP. This automates the money-shot demo moment. Keep
it independent of test ordering (fresh employee or cleanup).
```
- **Commit:** `test(e2e): add leave overlap end-to-end test`
- ✅ Done when: overlap E2E green.

## PHASE D4 — 13:30–14:30 · Full flip to real + integration audit
> Needs B4 (all endpoints). This is the big integration moment.
**Prompt:**
```
[PREPEND]
Flip USE_MOCKS=false so the entire api-client hits the real backend. Pull all branches into an
integration branch, run the full app + E2E suite. Produce an integration report: for each endpoint,
PASS/FAIL, and for each failure the exact mismatch (endpoint, expected field/type from shared/types
vs actual). Do NOT fix other folders - list the failing link and its owner (A/B/C) so they fix on
their branch. Add tests/e2e for the auth flow (signup->verify->login) and an IDOR check (employee
cannot read another's leave).
```
- **Commit:** `test(e2e): full integration audit and auth/IDOR tests`
- ✅ Done when: report produced. 🔗 **SYNC: hand each failing link to its owner; re-run until green, then merge good parts to `main` and tag `checkpoint-integration`.**

## PHASE D5 — 14:30–15:30 · Deploy + README
**Prompt:**
```
[PREPEND]
Write deployment/docker-compose.yml (postgres:16 running schema.sql+seed.sql on init, backend, web)
so `docker-compose up` gives a working seeded app. Write README.md: what it is, one-command setup,
how to run tests, seeded demo credentials (1 HR + 2 employees, pre-verified), and the 3-min demo
steps. Add scripts/ for any seed/reset helpers.
```
- **Commit:** `docs(readme): add setup, deploy, and demo instructions`
- ✅ Done when: a clean `git clone` + `docker-compose up` runs the app per the README.

## PHASE D6 — 15:30–16:00 · (P3, optional) AI feature
> Only if P0/P1 are green and there's genuine time. Core must work with AI disabled.
**Prompt:**
```
[PREPEND]
Add a small, disable-able AI feature: when HR opens a leave request, show a one-line AI summary of
the employee's remarks/history. Input: past remarks text. Output: 1 sentence. Fallback: if the AI
call fails or is off, show the raw remarks - the approval flow is unaffected. Gate behind an env
flag. Add it in api-client + a tests/e2e check that approvals still work with AI off.
```
- **Commit:** `feat(ai): add optional leave-summary feature (fallback-safe)`
- ✅ Done when: approvals work identically with the flag off.

## PHASE D7 — 16:00–16:30 · Final freeze + tag
- Confirm the app runs green on a clean checkout. Seed realistic demo data. Rehearse with the team.
- Merge final good parts to `main`, tag `v1.0-demo`.
- **Commit:** `chore(release): freeze and tag v1.0-demo`

---

## Your hourly commit cadence
| Hour | Commit |
|---|---|
| 9:30 | `chore(repo): initialize structure, gitignore, env example, CI` |
| 10:00 | `feat(api-client): typed client with mock responses` |
| 11:00 | `test(e2e): wire leave slice and add end-to-end test` |
| 12:30 | `test(e2e): add leave overlap end-to-end test` |
| 13:30 | `test(e2e): full integration audit and auth/IDOR tests` |
| 14:30 | `docs(readme): add setup, deploy, and demo instructions` |
| 15:30 | `feat(ai): add optional leave-summary feature` *(P3)* |
| 16:00 | `chore(release): freeze and tag v1.0-demo` |

## The integration loop (run every hour from ~13:00)
```
INTEGRATE NOW: pull all branches -> integration branch -> run E2E ->
for each failing link report {file, expected field/type vs actual, owner} ->
owner fixes on their branch -> when green, merge good parts to main, tag checkpoint.
No new features from anyone until the main workflow is green.
```

## Sync map
- **You depend on A** (types) and **B** (endpoints); you enable **C** (api-client).
- **The seamless integration is your job:** mocks first (D1) so C isn't blocked, one-place flip to real (D2/D4) so C's components never change, hourly audits so mismatches surface early not at 4pm.
- **Field mismatch = fix code to match `shared/types`**, never the types. Route the fix to A (types) or B (backend), don't patch it in the client to hide it.
