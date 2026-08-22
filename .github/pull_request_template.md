# Pull Request Checklist

## 1. Feature Branch & Ownership
- [ ] Working on dedicated feature branch (e.g. `feat/foundation`, `feat/backend`, `feat/frontend`, `feat/integration`).
- [ ] No direct commits to `main`.
- [ ] Respect folder ownership boundaries (Person A, B, C, D).
- [ ] No files outside owned directories modified.

## 2. Contract & Types Compliance
- [ ] Strictly adhere to `CONTRACT.md` single source of truth.
- [ ] No modifications to `CONTRACT.md` without full team agreement.
- [ ] No modifications to `shared/types.ts` unless Person A handles an approved contract change.
- [ ] Used exact field names, enums, error codes, and HTTP statuses specified in `CONTRACT.md`.

## 3. Security & Quality
- [ ] No secrets, passwords, tokens, or credentials committed.
- [ ] All local tests and build checks pass before opening PR.
- [ ] Integration mismatches reported to the correct module owner.

---

### Description of Changes
*Provide a concise summary of what was added, modified, or fixed.*

### Verification Results
*Paste test and build verification command results.*
