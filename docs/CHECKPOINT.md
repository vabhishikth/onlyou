# CHECKPOINT — Last Updated: 2026-02-21

## Current Phase: Phase 8 — Questionnaire Expansion
## Current Task: PR 17 - Questionnaire Expansion (27/28/32/31 questions)
## Status: COMPLETE

## Completed Work:

### Mobile Redesign (PRs 1-7) — ALL COMPLETE
- [x] PR 1: Design System Foundation — 5 tests
- [x] PR 2: Splash + Welcome Restyle — 8 tests
- [x] PR 3: Onboarding Flow (4 screens) — 47 tests
- [x] PR 4: Home Dashboard Restyle — 54 tests
- [x] PR 5: Treatment + Questionnaire + Photo Restyle — 77 tests
- [x] PR 6: Remaining Screens (Activity, Messages, Orders, Profile) — 91 tests
- [x] PR 7: Phone screen restyle + complete theme migration — 21 tests
- [x] Cleanup: Explicit GraphQL field types, Expo Router layouts, Prisma type fixes

### Backend Phases 1-11 — ALL COMPLETE

### Doctor Dashboard (Phase 3):
- [x] PR 8: Consultation + Messaging Resolvers — 18 tests (TDD)
- [x] PR 9: Web fixes + seed data
- [x] PR 10: Doctor Dashboard Polish (4 commits)

### Phase 4 — Blood Work & Delivery:
- [x] PR 11: Order + Wallet GraphQL Resolvers (2 commits)
- [x] PR 12: Portal Test Coverage (4 commits)
- [x] PR 13: Patient Tracking Screens (4 commits)

### Phase 5 — Payment Integration:
- [x] PR 14: Payment Integration (Razorpay) — 4 tasks, all complete

### Phase 6 — AI Pre-Assessment:
- [x] PR 15, Task 1: Claude API integration in AIService (TDD)
- [x] PR 15, Task 2: AI Resolver + DTOs + intake trigger (TDD)

### Phase 7 — Prescription PDF Generation:
- [x] PR 16, Task 1: PDF generation + S3 upload (TDD)
- [x] PR 16, Task 2: PDF regeneration endpoint (TDD)

### Phase 8 — Questionnaire Expansion:
- [x] PR 17: Full spec-compliant questionnaires for all 4 verticals (TDD)

## Test Counts:
- Backend: 1,996 tests (43 test suites)
- Mobile: 431 tests (29 test suites)
- **Total: 2,427 tests**

---

## Current PR: PR 17 — Questionnaire Expansion

### What was done:
- Extracted questionnaire data from seed.ts into separate testable files in `backend/prisma/questionnaires/`
- **CRITICAL FIX**: Changed all question IDs from descriptive format (`duration`, `pattern`, `family_history`) to Q-number format (`Q1`, `Q2`, `Q3`) matching AI service and Prescription service expectations
- Expanded all 4 verticals to full spec-compliant question sets with skip logic
- Updated seed patient responses (Rahul Sharma, Amit Patel) to use Q-number IDs
- Updated jest.config.js to include `prisma/questionnaires/` in test roots

### Question counts (including sub-questions):
| Vertical | Old | New | Sub-Qs | Sections |
|----------|-----|-----|--------|----------|
| Hair Loss | 14 (descriptive IDs) | 27 (Q1-Q25+Q2b+Q10b) | 2 | 5 |
| Sexual Health | 9 (descriptive IDs) | 28 (Q1-Q28) | 0 | 6 (includes IIEF-5) |
| PCOS | 8 (descriptive IDs) | 32 (Q1-Q32) | 0 | 8 |
| Weight Mgmt | 8 (descriptive IDs) | 31 (Q1-Q30+Q8b) | 1 | 7 |

### Files created:
- `backend/prisma/questionnaires/hair-loss.ts` — 27 questions, 5 sections, 4 photo requirements
- `backend/prisma/questionnaires/sexual-health.ts` — 28 questions, 6 sections, IIEF-5 assessment
- `backend/prisma/questionnaires/pcos.ts` — 32 questions, 8 sections, Rotterdam criteria aligned
- `backend/prisma/questionnaires/weight-management.ts` — 31 questions, 7 sections, 3 photo requirements
- `backend/prisma/questionnaires/index.ts` — re-exports all questionnaires
- `backend/prisma/questionnaires/questionnaires.spec.ts` — 37 validation tests

### Files modified:
- `backend/prisma/seed.ts` — imports from questionnaires/, updated seed responses to Q-number IDs
- `backend/jest.config.js` — added prisma/questionnaires to test roots

### 37 new tests:
- Question count validation per vertical
- Structure validation (id, type, question, required)
- Q-number ID format validation
- No duplicate IDs
- Choice questions have options
- Skip logic references valid question IDs
- Section counts per vertical
- Photo requirement counts
- Backend-referenced IDs exist (critical for AI/Prescription services)

---

## PR 17 — COMPLETE

**Spec references:** hair-loss spec Section 3, ED spec Section 3, PCOS spec Section 3, weight-management spec Section 3

---

## Next Up:
1. Notification resolver + triggers (master spec Section 11)
2. Web test coverage
3. Mobile integration with expanded questionnaires (should work automatically — data-driven)

## Known Issues:
- None currently

*Checkpoint updated per CLAUDE.md context protection rules.*
