# CHECKPOINT — Last Updated: 2026-02-23

## Current Phase: E2E Readiness — Post-Payment Intake + Consultation Tracking
## Current Task: All tasks complete
## Status: COMPLETE

## Completed Work:

### Phases 1-17 — ALL COMPLETE (see git log and BUILD-PLAN.md)

### Notification Audit Fix (5 chunks) — COMPLETE
See git log for details. All 5 chunks committed.

### Codebase Mapping — COMPLETE
- [x] Generated 7 codebase analysis documents in `.planning/codebase/`

### E2E Readiness — Batch 1 (Audit Fixes + Push Delivery) — COMPLETE
- [x] Installed `expo-server-sdk`, `expo-device`, `razorpay`
- [x] PushDeliveryService (TDD, 6 tests) using Expo Push Service
- [x] Fixed hardcoded pincode + admin name bugs
- [x] Corrected CONCERNS.md (6 false claims removed)

### E2E Readiness — Batch 2 (Push Registration + Real 100ms) — COMPLETE

#### Mobile Push Token Registration (TDD)
- [x] Created `useNotifications.test.ts` — 5 tests written FIRST (RED)
- [x] Created `useNotifications.ts` hook — request permission, get Expo token, call `registerDeviceToken` mutation
- [x] GraphQL mutations: `REGISTER_DEVICE_TOKEN`, `REMOVE_DEVICE_TOKEN` (inline in hook)
- [x] Wired into `_layout.tsx` via `PushNotificationRegistrar` component — auto-registers when authenticated
- [x] Handles: permission denied, already granted, error graceful handling, unregister on logout

#### 100ms Real API Integration
- [x] Installed `jsonwebtoken` + `@types/jsonwebtoken` on backend
- [x] Configured 100ms keys in `.env`: `HMS_ACCESS_KEY`, `HMS_APP_SECRET`, `HMS_TEMPLATE_ID`
- [x] `createRoom()` — real mode calls `POST https://api.100ms.live/v2/rooms` with management token
- [x] `generateToken()` — real mode signs JWT auth token (HS256) with room_id, user_id, role claims
- [x] Added `generateManagementToken()` private method (JWT type=management, version=2)
- [x] Added `generateAuthToken()` private method (JWT type=app, room_id, user_id, role)
- [x] Mock mode preserved for dev/test (when HMS_ACCESS_KEY is empty)
- [x] All 18 existing HmsService tests still pass

### E2E Readiness — Batch 3 (Post-Payment Intake + Consultation Tracking) — COMPLETE

#### Backend: planId Subscription Creation
- [x] Added `planId` optional field to `SubmitIntakeInput` DTO (`backend/src/intake/dto/intake.dto.ts`)
- [x] `submitIntake()` creates `Subscription` record when `planId` provided — looks up `SubscriptionPlan`, calculates period end using `durationMonths`, sets status `ACTIVE` (`backend/src/intake/intake.service.ts:292-313`)
- [x] Subscription creation runs inside existing `$transaction` — atomic with intake + consultation
- [x] Graceful handling: if `planId` doesn't match any plan, skips subscription (no error)
- [x] GraphQL schema updated (`backend/src/schema.gql`) — `planId: String` added to `SubmitIntakeInput`

#### Backend: myConsultations Query
- [x] Added `myConsultations` query to `IntakeResolver` (`backend/src/intake/intake.resolver.ts:103-112`)
- [x] Returns all consultations for the authenticated patient, ordered by `createdAt` desc
- [x] Protected by `JwtAuthGuard`, uses `@CurrentUser()` decorator
- [x] Returns `ConsultationType[]` (id, vertical, status, createdAt)

#### Backend Tests (5 new, TDD)
- [x] `intake.service.spec.ts`: "should create subscription when planId is provided" — mocks `tx.subscriptionPlan.findUnique` + `tx.subscription.create`, verifies correct data shape
- [x] `intake.service.spec.ts`: "should not create subscription when planId is not provided" — verifies `subscriptionPlan.findUnique` NOT called
- [x] `intake.service.spec.ts`: "should skip subscription creation when planId does not match any plan" — verifies graceful fallthrough
- [x] `intake.resolver.spec.ts`: "should return consultations for the current user" — verifies `findMany` call + result
- [x] `intake.resolver.spec.ts`: "should return empty array when user has no consultations"

#### Mobile: Pass planId to submitIntake
- [x] Updated `SubmitIntakeInput` type to include `planId?: string` (`mobile/src/graphql/intake.ts:72`)
- [x] Payment screen now passes `planId: planId || undefined` in submitIntake mutation variables (`mobile/app/intake/[vertical]/payment.tsx:142`)
- [x] Flow: Plan Selection → Payment → Razorpay → Verify → submitIntake(with planId) → Complete

#### Mobile: Consultation Tracking in Activity Tab
- [x] Added `GET_MY_CONSULTATIONS` GraphQL query (`mobile/src/graphql/intake.ts:200-209`)
- [x] Activity tab now queries `myConsultations` alongside tracking data (`mobile/app/(tabs)/activity.tsx:90-92`)
- [x] Pull-to-refresh refetches both tracking + consultations (`activity.tsx:97`)
- [x] Added 6-step consultation status stepper: Submitted → AI Reviewed → Doctor Reviewing → Video Scheduled → Video Complete → Approved
- [x] Added patient-facing status labels (e.g., "Your assessment is being reviewed", "A doctor is reviewing your case")
- [x] `ConsultationCard` component with treatment badge (vertical-colored), Stethoscope icon, status stepper (`activity.tsx:430-515`)
- [x] Active consultations filter: excludes APPROVED and REJECTED statuses (`activity.tsx:91-93`)
- [x] Consultations render above lab/delivery orders in Active section (`activity.tsx:193-200`)
- [x] Empty state now considers consultations (not just lab/delivery orders) (`activity.tsx:125`)

#### Mobile: Fix Track Progress Navigation
- [x] Complete screen's "Track Progress" button now navigates to `/(tabs)/activity` instead of `/activity` (`mobile/app/intake/[vertical]/complete.tsx:36`)
- [x] Ensures proper tab navigator context is maintained

#### Mobile Tests (9 new)
- [x] `payment.test.tsx`: "passes planId to submitIntake after payment" — verifies planId='plan-hl-1' in mutation variables
- [x] `activity.test.tsx`: "renders consultation cards when consultations exist" — mocks two useQuery calls
- [x] `activity.test.tsx`: "shows consultation stepper with correct status" — verifies PENDING_ASSESSMENT label
- [x] `activity.test.tsx`: "does not show approved consultations in active section" — verifies APPROVED filtered out + empty state shown
- [x] `complete.test.tsx`: 5 tests (new file) — renders success message, shows vertical name, shows timeline, Track Progress → /(tabs)/activity, Go Home → /(tabs)

## Test Counts:
- Backend: 2,785 tests (87 test suites) — +5 new intake tests
- Mobile: 620 tests (54 test suites) — +14 new tests (1 payment + 3 activity + 5 complete + 5 from batch 2)
- Web: 267 tests (37 test suites)
- **Total: 3,672 tests**

## Files Modified/Created (Batch 3):
```
# New files
mobile/app/intake/[vertical]/__tests__/complete.test.tsx — 5 complete screen tests

# Modified — backend
backend/src/intake/dto/intake.dto.ts — +planId field on SubmitIntakeInput
backend/src/intake/intake.resolver.ts — +myConsultations query
backend/src/intake/intake.resolver.spec.ts — +2 myConsultations tests
backend/src/intake/intake.service.ts — +subscription creation in submitIntake
backend/src/intake/intake.service.spec.ts — +3 planId/subscription tests
backend/src/schema.gql — +myConsultations query, +planId on SubmitIntakeInput

# Modified — mobile
mobile/app/intake/[vertical]/payment.tsx — passes planId to submitIntake
mobile/app/intake/[vertical]/payment.test.tsx — +1 planId assertion test
mobile/app/intake/[vertical]/complete.tsx — fixed Track Progress route
mobile/app/(tabs)/activity.tsx — +consultations query, +ConsultationCard, +stepper
mobile/app/(tabs)/__tests__/activity.test.tsx — +3 consultation tests
mobile/src/graphql/intake.ts — +planId on SubmitIntakeInput, +GET_MY_CONSULTATIONS query
```

## Commit:
```
d0003a0 feat(intake): wire planId subscription creation + consultation tracking
```

---

## All External Services — Status:
| Service | Status | Notes |
|---|---|---|
| PostgreSQL (Neon) | Ready | DATABASE_URL configured |
| JWT Auth | Ready | Access + refresh secrets |
| MSG91 (SMS) | Ready | Dev mode (123456) |
| AWS S3 | Ready | ap-south-1, onlyou-uploads |
| Claude AI | Ready | Anthropic API key |
| Razorpay | Ready | Test mode keys |
| Expo Push | Ready | No key needed, backend + mobile wired |
| Redis | Ready | Local, no key |
| 100ms Video | Ready | Real API keys + JWT token generation |
| Sentry | Skipped | Optional for now |
| Email | Skipped | Not blocking E2E |

## E2E Flow Status (Post-Payment → Tracking):
```
Patient selects plan → plan-selection.tsx passes planId to payment.tsx
  → Payment creates Razorpay order (with planId + vertical)
  → Razorpay checkout opens → payment verified
  → submitIntake called WITH planId
    → Backend creates intakeResponse + consultation + subscription (atomic)
    → AI assessment fires async (non-blocking)
    → Auto-assignment fires after AI completes
  → Navigate to complete.tsx → "Track Progress" → /(tabs)/activity
  → Activity tab shows ConsultationCard with status stepper
    → Stepper: Submitted → AI Reviewed → Doctor Reviewing → Video → Approved
```

## Next Up:
- E2E testing of full flow on device (signup → intake → payment → tracking)
- Home screen: add consultation banner (like ActiveOrderBanner but for consultations)
- CI/CD pipeline setup
- Phase 18: Production readiness (Sentry, Redis caching, security audit)

## Known Issues:
- SMS/WhatsApp/Email channels still DB-record-only (no MSG91/email provider integration yet)
- @100mslive/react-native-hms not installed on mobile — video hook uses mocks
- Redis connection warning on startup if Redis not available (by design)
- RateLimitGuard exists but never applied to any endpoint
- HMS_WEBHOOK_SECRET empty — set when configuring webhooks in 100ms dashboard
- Subscription model used but no renewal/cancellation flow yet (future phase)

*Checkpoint updated per CLAUDE.md context protection rules.*
