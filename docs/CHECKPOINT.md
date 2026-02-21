# CHECKPOINT — Last Updated: 2026-02-21

## Current Phase: Phase 11 — Mobile Missing Screens + Web Portal Test Coverage (COMPLETE)
## Current Task: All PRs 26-29 Complete
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

## Test Counts:
- Backend: 2,108 tests (53 test suites)
- Mobile: 501 tests (39 test suites)
- Web: 181 tests (26 test suites)
- **Total: 2,790 tests**

---

## Phase 11 PR 26 Summary — Mobile Missing Sub-Screens (30 new tests, 4 new screens)

**Task 1: /profile/prescriptions screen (10 tests)**
- `mobile/app/profile/prescriptions.tsx` — SafeAreaView, vertical badge, medication count, download PDF
- `mobile/app/profile/__tests__/prescriptions.test.tsx` — 8 tests
- `mobile/src/graphql/profile.ts` — GET_MY_PRESCRIPTIONS query
- `backend/src/prescription/prescription.service.ts` — getPatientPrescriptions method
- `backend/src/prescription/prescription.resolver.ts` — myPrescriptions query
- `backend/src/prescription/dto/prescription.dto.ts` — PatientPrescriptionItem type
- `backend/src/prescription/prescription.service.spec.ts` — 2 tests

**Task 2: /profile/lab-results screen (7 tests)**
- `mobile/app/profile/lab-results.tsx` — status badges (10 states), panel name, test count
- `mobile/app/profile/__tests__/lab-results.test.tsx` — 7 tests
- `mobile/src/graphql/profile.ts` — GET_MY_LAB_ORDERS query
- `backend/src/lab-order/lab-order.resolver.ts` — myLabOrders query

**Task 3: /profile/health screen (6 tests)**
- `mobile/app/profile/health.tsx` — read-only health info, missing-profile CTA
- `mobile/app/profile/__tests__/health.test.tsx` — 6 tests

**Task 4: /order/[id] detail screen (9 tests)**
- `mobile/app/order/[id].tsx` — delivery stepper, OTP display, cost breakdown
- `mobile/app/order/__tests__/[id].test.tsx` — 9 tests
- `mobile/app/order/_layout.tsx` — Slot layout
- `mobile/src/graphql/orders.ts` — GET_ORDER_DETAIL query, OrderDetail type

---

## Phase 10 Summary

### PR 23 — Redis Module + Health Checks + Env Validation (23 new tests)

**Task 1: Redis Service Module (8 tests)**
- `backend/src/redis/redis.service.ts` — ioredis wrapper with fail-open pattern, lazyConnect
- `backend/src/redis/redis.module.ts` — @Global() module
- `backend/src/redis/redis.service.spec.ts` — 8 tests
- Methods: get, set (with optional TTL), del, incr, expire, keys, ping

**Task 2: Environment Validation (5 tests)**
- `backend/src/config/env.validation.ts` — Validates DATABASE_URL, JWT secrets (required), REDIS_URL/NODE_ENV/PORT/SENTRY_DSN (optional with defaults)
- `backend/src/config/env.validation.spec.ts` — 5 tests
- Wired into ConfigModule.forRoot({ validate })

**Task 3: Health Check Endpoints (10 tests)**
- `backend/src/health/health.controller.ts` — REST: /health, /health/live, /health/ready
- `backend/src/health/indicators/prisma.health.ts` — DB health via SELECT 1
- `backend/src/health/indicators/redis.health.ts` — Redis health via ping
- `backend/src/health/health.controller.spec.ts` — 10 tests
- Dependency: @nestjs/terminus

### PR 24 — Rate Limiting + Security Hardening (11 new tests)

**Task 1: Redis-based Rate Limit Guard (8 tests)**
- `backend/src/common/guards/rate-limit.guard.ts` — Sliding window counter per IP
- `backend/src/common/decorators/rate-limit.decorator.ts` — @RateLimit(limit, windowSeconds)
- `backend/src/common/guards/rate-limit.guard.spec.ts` — 8 tests
- Default 100 req/min, fail-open when Redis down

**Task 2: Security Hardening (3 tests)**
- `backend/src/main.ts` — Helmet middleware, production CORS (6 onlyou.life subdomains), SentryInterceptor
- `backend/src/app.module.ts` — GraphQL depth limit (max 7), formatGraphQLError
- `backend/src/auth/auth.resolver.ts` — @RateLimit(5, 60) on requestOtp, @RateLimit(10, 60) on verifyOtp
- `backend/src/common/plugins/depth-limit.spec.ts` — 3 tests
- Dependencies: helmet, graphql-depth-limit

### PR 25 — Error Tracking + Caching (18 new tests)

**Task 1: Cache Service (7 tests)**
- `backend/src/common/cache/cache.service.ts` — Cache-aside: getOrSet, invalidate, invalidatePattern
- `backend/src/common/cache/cache.module.ts` — @Global() module
- `backend/src/common/cache/cache.service.spec.ts` — 7 tests

**Task 2: Sentry Error Tracking (11 tests)**
- `backend/src/common/sentry/sentry.interceptor.ts` — Captures exceptions, strips sensitive fields
- `backend/src/common/sentry/graphql-error-formatter.ts` — Strips stack traces in prod, generic messages for internal errors
- `backend/src/common/sentry/sentry.module.ts` — Initializes from SENTRY_DSN, no-ops when not set
- `backend/src/common/sentry/sentry.interceptor.spec.ts` — 6 tests
- `backend/src/common/sentry/graphql-error-formatter.spec.ts` — 5 tests
- Dependency: @sentry/nestjs

**Task 3: Cache Questionnaire Templates**
- `backend/src/intake/intake.service.ts` — Wrapped getQuestionnaireTemplate with CacheService.getOrSet (key: questionnaire:{vertical}, TTL: 3600s)
- Prescription templates are in-memory constants — no caching needed

### New Dependencies Added:
- @nestjs/terminus
- helmet + @types/helmet
- graphql-depth-limit
- @sentry/nestjs

### Key Architectural Decisions:
- **OTP migration deferred** — existing tests access (service as any).otpStore internals; separate PR needed
- **Redis fail-open** — all Redis ops wrapped in try/catch, app works without Redis
- **lazyConnect** — prevents connection spam when Redis unavailable in dev
- **Cache-aside pattern** — CacheService wraps Redis with JSON serialization

---

## Phase 11 Complete Summary — PRs 26-29 (155 new tests)

**PR 27: Web Admin Dashboard Tests (44 tests)**
- 6 admin pages: dashboard, escalations, lab-orders, deliveries, partners, patients
- Pattern: MockedProvider + addTypename={false} + framer-motion mock

**PR 28: Web Partner Portal Tests (41 tests)**
- Lab portal (19): incoming samples, processing, upload, profile
- Pharmacy portal (16): new orders, preparing, ready, profile
- Collect portal (6): summary, assignments, empty state
- Fixed status config label clashes (badge vs header)

**PR 29: Mobile Sub-Screen Tests (40 tests)**
- Chat detail, edit profile, wallet, notifications, subscriptions, lab booking
- Pattern: useQuery/useMutation mocks

## Next Up:
- Phase 12+ planning (see BUILD-PLAN.md)

## Known Issues:
- Apollo Client 3.14 deprecates `addTypename` prop on MockedProvider (console warnings, non-breaking)
- Redis connection warning logged once on startup if Redis not available (by design)

*Checkpoint updated per CLAUDE.md context protection rules.*
