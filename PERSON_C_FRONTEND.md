# PERSON C — Frontend (Screens · Forms · UX)

**Tool:** Antigravity
**You own:** `frontend/src/` — everything EXCEPT `frontend/src/api-client/` (that's D's).
**You touch nothing else.** The UI is the face of the project — Odoo judges it directly. Clean and consistent beats flashy and broken.

---

## The PREPEND (paste at the top of EVERY prompt)

```
Shared hackathon repo; 4 AI tools work in parallel and cannot talk — the repo is our only shared
memory. BEFORE building: read CONTRACT.md and shared/types; inspect the repo and the code you'll
touch. Edit ONLY files in frontend/src/ EXCEPT frontend/src/api-client/ (that folder is D's — I
only CALL its functions, never edit them). HARD RULES: use ONLY field names/types from shared/types
(never invent or rename); do not change schema/API/architecture; do not touch other members'
folders; no new deps without justifying; no deleting tests; no secrets. WHEN DONE: run build, list
changed files, paste failures verbatim, never claim success unrun. Conflict with CONTRACT.md ->
STOP and report. MY TASK:
```

---

## Golden rules for you specifically
- **Build against D's api-client, never call `fetch` yourself.** You import `leaveApi.create(...)`; D owns what's inside. Until B's endpoints are live, D's client returns mocks — you won't even notice the switch.
- **Every screen has 4 states:** loading, empty, error, success. Never ship a screen that can only show success.
- **Consistency = points.** One token set (colors/spacing/type), applied everywhere. Sidebar layout, one primary button per screen, status = color + text (never color alone).
- Your push loop:
  ```bash
  git add frontend/src/    # (api-client/ is D's; you won't have changes there)
  git commit -m "type(scope): summary"
  git pull --rebase origin main && git push
  ```
- Work on branch `feat/frontend`.

---

## PHASE C0 — 9:00–9:30 · Contract freeze (with team)
- Confirm the screen list and which role sees what. Agree with D on the api-client function names you'll call.
- ✅ Done when: contract approved. **Then wait for A's `shared/types.ts` (~10:00) — use the gap to sketch the layout + pick the design tokens.**

## PHASE C1 — 10:00–11:00 · App shell + design system + auth screens
> Needs A2 (shared/types). D's api-client (D1) lands ~same time with mocks.
**Prompt:**
```
[PREPEND]
Build the app shell + design system. Create frontend/src/design/tokens.css (colors, spacing, radii,
type scale from the UI/UX spec) and shared primitives (Button, Card, Badge, FormField). Build the
fixed-sidebar + topbar layout (AppShell). Set up React Router: /login, /signup, /verify-email,
/dashboard, /leave, /attendance, /profile, /payroll, /employees (HR only). Build LoginPage and
SignupPage forms (signup has NO role field - employee only). Add AuthContext (user, token, login,
logout) and a RequireRole guard. Use shared/types for all props.
```
- **Commit:** `feat(ui): scaffold app shell, design tokens, and auth screens`
- ✅ Done when: app renders, navigation + login form work (against D's mock).

## PHASE C2 — 11:00–12:30 · The slice screen (P0 core)
> Uses D's api-client `leaveApi` — mocked until B2 is live, then real automatically.
**Prompt:**
```
[PREPEND]
Build the Leave screen. LeaveForm (leaveType select Paid/Sick/Unpaid, date range, remarks) calling
leaveApi.create; LeaveList showing the employee's requests with a LeaveStatusBadge (Pending=amber,
Approved=green, Rejected=red, using tokens). On a LEAVE_OVERLAP error, show a FORM-LEVEL banner
("Those dates overlap an existing request - pick different dates"), not a field error. Use
CreateLeaveRequest + LeaveRequest types. Employee sees form+own list; HR sees the approvals queue
with Approve/Reject buttons + comment field calling leaveApi.decide.
```
- **Commit:** `feat(leave): build leave form, list, and HR approvals UI`
- ✅ Done when: form submits, list renders, overlap banner shows (on mock or real).

## PHASE C3 — 12:30–13:30 · All UX states + role-aware dashboards
**Prompt:**
```
[PREPEND]
Add loading (skeleton/spinner), empty ("no records yet" + primary action), and error (banner with
retry) states to EVERY list/detail screen - none may show only success. Build the role-aware
Dashboard: Employee sees quick-access cards (Profile, Attendance, Leave, Logout); HR sees employee
list + pending-approvals count + employee switcher entry point. Branch once on auth.user.role at the
top, not scattered role checks in children.
```
- **Commit:** `feat(ui): add loading/error/empty states and role-based dashboards`
- ✅ Done when: manual click-through hits every state cleanly.

## PHASE C4 — 13:30–14:30 · Mocks → real (the seamless switch)
> Needs B4 done (endpoints live). This should be almost a no-op for you if you built against the api-client correctly.
**Prompt:**
```
[PREPEND]
B's endpoints are now live and D has flipped the api-client from mock to real. Verify every screen
I built now shows real DB data. Fix any place where I accidentally depended on mock-only shape.
Do NOT edit api-client/ (D's) - if a real response differs from the mock, report it to D, don't
patch it in my components.
```
- **Commit:** `refactor(ui): verify screens against live api`
- ✅ Done when: login → apply leave → (HR) approve → status updates, all on real data. 🔗 **SYNC with D.**

## PHASE C5 — 14:30–15:30 · P1/P2 screens (only if P0 is green)
> Do NOT start these while the leave slice isn't fully working. Order: profile edit → attendance → employee switch → payroll → documents.
**Prompt:**
```
[PREPEND]
Build the remaining screens in priority order, stopping if any P0 issue appears:
P1: ProfilePage (view all sections; employee edit form limited to address/phone/picture; HR edits
all), AttendancePage (CheckInOutButton + daily/weekly grid), Admin employee list + EmployeeSwitcher
(calls switch-context). P2: PayrollPage (read-only employee / editable HR), DocumentList (metadata +
URL, no file upload), RecentActivityFeed. All using shared/types + the api-client + existing tokens.
```
- **Commit:** `feat(ui): add profile, attendance, employees, payroll, documents screens`
- ✅ Done when: P1 screens functional on real data.

## PHASE C6 — 15:30–16:30 · Polish + freeze
- Consistent spacing pass, no console errors during a full click-through, empty/error states verified.
- No new features after 16:00. Visual polish + bug fixes only.
- **Commit:** `style(ui): spacing/consistency polish for demo`

---

## Your hourly commit cadence
| Hour | Commit |
|---|---|
| 11:00 | `feat(ui): scaffold app shell, design tokens, and auth screens` |
| 12:30 | `feat(leave): build leave form, list, and HR approvals UI` |
| 13:30 | `feat(ui): add loading/error/empty states and role-based dashboards` |
| 14:30 | `refactor(ui): verify screens against live api` |
| 15:30 | `feat(ui): add profile, attendance, employees, payroll, documents screens` |
| 16:00 | `style(ui): spacing/consistency polish for demo` |

## Sync map
- **You depend on A** for `shared/types.ts` (C1) and **D** for the api-client (all screens call it).
- **The mock→real switch is seamless** *only* because you never call `fetch` directly — you always go through D's `api-client`. Hold that line and C4 is trivial.
- **Response shape wrong?** Tell D (owns api-client) or A (owns types) — never patch it inside a component.
