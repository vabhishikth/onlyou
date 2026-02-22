# CHECKPOINT — Last Updated: 2026-02-22

## Current Phase: Phase 12 — Doctor Onboarding + Auto-Assignment Engine (COMPLETE)
## Current Task: All 8 Commits Complete
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

### Phase 9 — Notification System + Dashboard Completion:
- [x] PR 18: Notification Resolver + DTOs (TDD) — 18 tests
- [x] PR 19: Web Test Infrastructure + Core Tests — 63 tests
- [x] PR 20: Notification Scheduler Service (TDD) — 16 tests
- [x] PR 21: Backend Doctor List Queries (TDD) — 24 tests
- [x] PR 22: Web Doctor List Pages (TDD) — 33 tests

### Phase 10 — Production Readiness (PRs 23-25):
- [x] PR 23, Task 1: Redis Service Module — 8 tests (TDD)
- [x] PR 23, Task 2: Environment Validation — 5 tests (TDD)
- [x] PR 23, Task 3: Health Check Endpoints — 10 tests (TDD)
- [x] PR 24, Task 1: Redis-based Rate Limit Guard — 8 tests (TDD)
- [x] PR 24, Task 2: Security Hardening (Helmet + CORS + Depth Limit) — 3 tests
- [x] PR 25, Task 1: Cache Service — 7 tests (TDD)
- [x] PR 25, Task 2: Sentry Error Tracking — 11 tests (TDD)
- [x] PR 25, Task 3: Cache questionnaire templates in Redis (1h TTL)

### Phase 11 — Mobile Missing Screens + Web Portal Tests:
- [x] PR 26, Task 1: /profile/prescriptions screen — 8 mobile tests + 2 backend tests (TDD)
- [x] PR 26, Task 2: /profile/lab-results screen — 7 mobile tests (TDD)
- [x] PR 26, Task 3: /profile/health screen — 6 mobile tests (TDD)
- [x] PR 26, Task 4: /order/[id] detail screen — 9 mobile tests (TDD)
- [x] PR 27: Web admin dashboard tests (6 pages) — 44 tests
- [x] PR 28: Web partner portal tests (lab + pharmacy + collect) — 41 tests
- [x] PR 29: Mobile sub-screen test coverage (6 screens) — 40 tests

### Phase 12 — Doctor Onboarding + Auto-Assignment Engine:
- [x] Commit 1: Schema changes — DoctorProfile (7 new fields), Consultation (3 new fields)
- [x] Commit 2: Doctor onboarding service — 25 tests (TDD)
- [x] Commit 3: Doctor onboarding resolver — 10 tests (TDD)
- [x] Commit 4: AI auto-trigger enhancement + assignment wiring — 5 tests (TDD)
- [x] Commit 5: Assignment service (load-balanced) — 21 tests (TDD)
- [x] Commit 6: SLA timer service — 8 tests (TDD)
- [x] Commit 7: Admin doctor web pages — 15 tests
- [x] Commit 8: Final wiring + AssignmentModule in AppModule + CHECKPOINT

## Test Counts:
- Backend: 2,177 tests (58 test suites)
- Mobile: 501 tests (39 test suites)
- Web: 196 tests (28 test suites)
- **Total: 2,874 tests**

---

## Phase 12 Summary — Doctor Onboarding + Auto-Assignment (84 new tests, 8 commits)

### Feature 1: Doctor Onboarding (Admin-Only)

**Commit 1: Schema changes**
- `backend/prisma/schema.prisma` — DoctorProfile: +specializations[], +verticals[], +dailyCaseLimit, +seniorDoctor, +isActive, +lastAssignedAt, +signatureUrl; Consultation: +assignedAt, +slaDeadline, +previousDoctorIds[]

**Commit 2: Doctor service (25 tests)**
- `backend/src/doctor/doctor.service.ts` — createDoctor (validates phone/email/NMC/specializations/verticals/limits), updateDoctor, toggleAvailability, deactivateDoctor, listDoctors, getDoctorStats, getDoctorById
- `backend/src/doctor/doctor.service.spec.ts` — 25 tests
- `backend/src/doctor/doctor.module.ts` — Imports PrismaModule, NotificationModule
- `backend/src/doctor/dto/create-doctor.input.ts` — InputType
- `backend/src/doctor/dto/update-doctor.input.ts` — InputType
- `backend/src/doctor/dto/doctor-list.dto.ts` — ObjectType
- `backend/src/doctor/dto/doctor-stats.dto.ts` — ObjectType
- Constants: VALID_SPECIALIZATIONS (10 specializations), VERTICAL_SPECIALIZATION_MAP (4 verticals)

**Commit 3: Doctor resolver (10 tests)**
- `backend/src/doctor/doctor.resolver.ts` — @Roles(ADMIN) GraphQL mutations (createDoctor, updateDoctor, toggleAvailability, deactivateDoctor) + queries (doctors, doctorStats, doctorById)
- `backend/src/doctor/doctor.resolver.spec.ts` — 10 tests
- `backend/src/app.module.ts` — Added DoctorModule

### Feature 2: AI Auto-Trigger Enhancement

**Commit 4: Intake resolver enhancement (5 tests)**
- `backend/src/intake/intake.resolver.ts` — Enhanced fire-and-forget: AI → storeAIAssessment → assignDoctor(); admin notification on AI failure
- `backend/src/intake/intake.resolver.spec.ts` — 5 tests
- `backend/src/intake/intake.module.ts` — Added AssignmentModule, NotificationModule imports

### Feature 3: Load-Balanced Doctor Auto-Assignment

**Commit 5: Assignment service (21 tests)**
- `backend/src/assignment/assignment.service.ts` — assignDoctor, reassignDoctor, calculateLoadScore, getEligibleDoctors (private), notifyAdmin (private)
- `backend/src/assignment/assignment.service.spec.ts` — 21 tests
- `backend/src/assignment/assignment.module.ts` — Imports PrismaModule, NotificationModule
- Algorithm: loadScore = activeCount / dailyCaseLimit, sort ASC, tie-break by lastAssignedAt
- SLA windows: LOW=4hr, MEDIUM=2hr, HIGH=1hr
- HIGH risk: prefer seniorDoctor=true, fallback to any + admin alert

**Commit 6: SLA timer service (8 tests)**
- `backend/src/assignment/sla-timer.service.ts` — @Cron('*/5 * * * *'), detects breached slaDeadline, triggers reassignDoctor, max 3 bounces
- `backend/src/assignment/sla-timer.service.spec.ts` — 8 tests
- Admin alerts: SLA_BREACH (each breach), SLA_MAX_BOUNCES (after 3 bounces)

### Feature 4: Admin Doctor Web Pages

**Commit 7: Web admin pages (15 tests)**
- `web/src/graphql/doctors.ts` — ADMIN_DOCTORS, DOCTOR_BY_ID, DOCTOR_STATS, CREATE_DOCTOR, UPDATE_DOCTOR, TOGGLE_DOCTOR_AVAILABILITY, DEACTIVATE_DOCTOR queries/mutations
- `web/src/app/admin/doctors/page.tsx` — Doctor list with search, vertical filters, availability toggle
- `web/src/app/admin/doctors/add/page.tsx` — Add doctor form with specialization/vertical multi-select + live validation
- `web/src/app/admin/doctors/[id]/page.tsx` — Doctor detail: stats cards, profile info, availability toggle, deactivate
- `web/src/app/admin/layout.tsx` — Added Doctors nav item with Stethoscope icon
- `web/src/app/admin/doctors/__tests__/page.spec.tsx` — 8 tests
- `web/src/app/admin/doctors/add/__tests__/page.spec.tsx` — 7 tests

**Commit 8: Final wiring**
- `backend/src/app.module.ts` — Added AssignmentModule
- `backend/src/doctor/dto/doctor-stats.dto.ts` — Fixed avgResponseTimeHours type
- `backend/src/doctor/doctor.resolver.ts` — Removed unused imports
- `backend/src/doctor/dto/create-doctor.input.ts` — Removed unused imports
- TypeScript: 0 errors (backend)
- All 2,874 tests pass

### New Modules:
- `backend/src/doctor/` — Doctor onboarding (admin-only CRUD)
- `backend/src/assignment/` — Auto-assignment engine + SLA timer

### Key Architecture Decisions:
- **Real-time load counting** — Active consultation count queried per-doctor (not cached)
- **Fire-and-forget chain** — intake.resolver: AI → storeAIAssessment → assignDoctor (non-blocking)
- **SLA cron every 5 min** — Breached consultations re-assigned with doctor exclusion list
- **Max 3 bounces** — After 3 SLA breaches, urgent admin alert, no more re-assignment
- **Vertical-specialization validation** — Each vertical requires at least one matching specialization

---

## Next Up:
- Phase 13+ planning (see BUILD-PLAN.md)

## Known Issues:
- Apollo Client 3.14 deprecates `addTypename` prop on MockedProvider (console warnings, non-breaking)
- Redis connection warning logged once on startup if Redis not available (by design)
- Web has pre-existing unused import TS warnings (non-blocking, from earlier phases)

*Checkpoint updated per CLAUDE.md context protection rules.*
