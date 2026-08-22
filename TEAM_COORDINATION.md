# Dayflow HRMS — Team Coordination (read this first, together)

Four people, four files, one seamless product. Each person has their own file:

| Person | File | Tool | Owns |
|---|---|---|---|
| **A** | `PERSON_A_FOUNDATION.md` | Claude Code | database, auth, config, shared/types, CONTRACT.md |
| **B** | `PERSON_B_BACKEND.md` | Codex | routes, services, repositories, backend tests |
| **C** | `PERSON_C_FRONTEND.md` | Antigravity | frontend screens, forms, UX (not api-client) |
| **D** | `PERSON_D_INTEGRATION.md` | Claude Code | api-client, E2E tests, deploy, README, integration |

---

## Why this integrates seamlessly (the 3 mechanisms)

1. **`shared/types.ts` is the single vocabulary.** A owns it; nobody else edits it. Every field name
   in the DB, API, and UI comes from here. A field mismatch becomes a TypeScript error, not a
   silent 4pm bug.
2. **The api-client is the seam between frontend and backend.** D gives C typed functions that
   return **mocks** first, then flips them to **real** in one place when B is ready. C's components
   never change — so B and C truly build in parallel and meet automatically.
3. **Hourly integration by D.** From ~1pm, D pulls all branches, runs E2E, and reports the single
   failing link to its owner. Problems surface every hour, not at the end.

---

## The dependency chain (who unblocks whom)

```
A (schema + shared/types)  ──unblocks──►  B, C, D   [front-load this, ~10:00]
A (config + auth utils)    ──unblocks──►  B          [~11:00]
B (live leave slice)       ──unblocks──►  D's E2E    [~12:00]
D (api-client mocks)       ──unblocks──►  C          [~10:00, so C never waits on B]
B (all endpoints)          ──unblocks──►  C's real data + D's full integration [~14:00]
```

**Key insight:** C never waits for B, because C builds against D's mocked api-client. When B goes
live, D flips one flag and C's screens light up with real data — no rework.

---

## Shared rules (everyone, every commit)

- **Commit hourly, honestly.** `type(scope): summary` — `feat`/`fix`/`test`/`docs`/`chore`/`refactor`.
  Good: `feat(leave): enforce overlap rule`. Bad: `update`, `final`, `wip123`.
- **Branches:** `main` = always green. `feat/<yours>` = your work. Broken-but-sharing → `wip(scope):`
  on your own branch, never on `main`.
- **Push loop:**
  ```bash
  git add <your owned folders only>
  git commit -m "type(scope): summary"
  git pull --rebase origin main && git push
  ```
- **Stay in your folders.** If you need a change in someone else's, ask them — don't reach in.
- **Contract/type change** → only A edits `shared/types.ts`/`CONTRACT.md`, via a Change Request,
  then everyone pulls.
- **Field mismatch** → fix the CODE to match `shared/types`, never the types.

---

## Build priority (all four follow this)

**P0 (must ship):** schema · auth (employee signup role-forced) · role authz · employee dashboard ·
employee profile view · leave apply · HR approve/reject · overlap rule · IDOR protection · error
handling · end-to-end integration.
**P1 (after P0 green):** attendance · profile editing · employee switching · RLS hardening.
**P2 (if time):** payroll · documents (metadata only) · activity feed · resend verification.
**P3 (optional):** AI · notifications · analytics.

> **Nobody starts a P1/P2/P3 task while any P0 task is unfinished.** A small complete product beats
> a large broken one.

---

## Hour-by-hour, all four at a glance

| Time | A | B | C | D |
|---|---|---|---|---|
| 9:00–9:30 | contract freeze (all four together) | | | repo setup |
| 10:00 | schema + shared/types | plan routes | app shell + tokens | api-client (mocks) |
| 11:00 | config + auth utils | route skeletons | auth screens | wire slice E2E |
| 12:00 | verify constraints | **leave slice live** | leave screen (mock) | slice E2E green |
| 1:00 | (buffer) | overlap rule + tests | UX states + dashboards | overlap E2E |
| 2:00 | signup role-lock | all endpoints | (mock→real verify) | **full integration audit** |
| 3:00 | RLS (P1) | validation + IDOR tests | P1/P2 screens | deploy + README |
| 4:00 | freeze support | integration fixes | polish | AI (P3) + freeze |
| 4:30 | — | — | — | tag `v1.0-demo` |

---

## Integration checkpoints (D runs, everyone responds)

- **~12:00** — vertical slice green E2E. If not: all-hands on the slice, cut P2.
- **~14:00** — full integration audit. Each failing link goes to its owner; fix on your branch.
- **~16:00** — hard freeze. Only blocker/integration fixes, tests, README, demo prep after this.

If integration breaks and can't be fixed fast: `git revert` the bad `main` commit — never
force-push. `main` stays demoable at all times.
