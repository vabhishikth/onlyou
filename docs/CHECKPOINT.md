# CHECKPOINT — Last Updated: 2026-02-23

## Current Phase: E2E Testing — Doctor Dashboard Fixes
## Current Task: Fix Hair Loss Q-mapping + Add Schedule Video Call button
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

### Home Screen Consultation Banner (TDD) — COMPLETE
- [x] `ActiveConsultationBanner.test.tsx`: 17 tests written FIRST (RED)
- [x] `ActiveConsultationBanner.tsx`: Component shows most recent active consultation status
- [x] Sorts by createdAt desc, filters APPROVED/REJECTED terminal statuses
- [x] Patient-facing labels (e.g., "A doctor is reviewing your case")
- [x] Navigates to /(tabs)/activity on tap, uses info-blue color scheme
- [x] Wired into home screen below ActiveOrderBanner
- [x] Home screen queries myConsultations, pull-to-refresh includes consultations
- [x] `index.test.tsx`: +3 home screen integration tests (renders, filters terminal, empty)

### Subscriptions Schema Alignment — COMPLETE
- [x] Updated Subscription interface to match backend Prisma schema (nested plan object)
- [x] Split TOGGLE_SUBSCRIPTION into PAUSE_SUBSCRIPTION + RESUME_SUBSCRIPTION
- [x] Updated CANCEL_SUBSCRIPTION to use CancelSubscriptionInput
- [x] Mock test data aligned — 7 tests passing

### Admin Portal E2E Fixes — COMPLETE

#### Root Cause: Doctor Creation Failing (ValidationPipe whitelist)
- [x] **ROOT CAUSE FOUND**: `ValidationPipe({ whitelist: true })` in `main.ts` strips all input properties that lack `class-validator` decorators. Doctor DTOs only had `@Field()` (GraphQL) decorators but no `class-validator` decorators, so ALL fields (including `phone`) were stripped to `undefined`.
- [x] Added `class-validator` decorators to `CreateDoctorInput` DTO (`@IsString`, `@IsNotEmpty`, `@IsOptional`, `@IsArray`, `@IsInt`, `@Min`, `@Max`, `@ArrayMinSize`, `@IsBoolean`)
- [x] Added `class-validator` decorators to `UpdateDoctorInput` DTO (same pattern with `@IsOptional` on all fields)

#### Backend Fixes
- [x] Made `email` field nullable in `CreateDoctorInput` DTO — was `@Field()` (String!), now `@Field({ nullable: true })` with `@IsOptional()`
- [x] Added phone normalization in `doctor.service.ts` — extracts last 10 digits, prepends +91 (tolerant of various input formats)
- [x] Added phone normalization in `pharmacy-onboarding.service.ts` (contactPhone + staff phone)
- [x] Added phone normalization in `lab-onboarding.service.ts` (contactPhone)
- [x] Fixed patient list showing admin users — added `role: 'PATIENT'` filter to `admin.service.ts` `getPatients()` query
- [x] Added `name`, `phone`, `email` fields to `DoctorProfileType` GraphQL output type via `@ResolveField` — resolves from related User model
- [x] Changed resolver to `@Resolver(() => DoctorProfileType)` with `@ResolveField` for user fields

#### Web Frontend Fixes
- [x] Login page: Dynamic portal name detection from returnUrl (Admin/Doctor/Lab/Pharmacy/Phlebotomist Portal)
- [x] Login page: Default returnUrl changed from `/doctor` to `/`
- [x] Admin layout: Added working logout handler (clears tokens, redirects to `/login?returnUrl=/admin`)
- [x] Add Doctor form: Phone input with +91 prefix label + 10-digit numeric-only input
- [x] Add Doctor form: Optional fields (email, bio) use spread operator instead of `undefined` values
- [x] Partners modal: Phone input with +91 prefix label + consistent formatting
- [x] Doctor list page: Shows doctor name (not just registration number), search includes name
- [x] Doctor detail page: Shows name as heading, registration number in subtitle, phone/email in details
- [x] Doctor detail page: Fixed `avgResponseTimeHours.toFixed(1)` crash when value is null (added `?? 0` fallback)
- [x] GraphQL queries updated to request `name`, `phone`, `email` fields
- [x] `DoctorProfile` TypeScript interface updated with `name`, `phone`, `email` fields

## Test Counts:
- Backend: 2,785 tests (87 test suites)
- Mobile: 635 tests (55 test suites)
- Web: 285 tests (38 test suites)
- **Total: 3,705 tests**

## Recent Commits:
```
<pending> fix(doctor): fix Hair Loss Q-mapping + add Schedule Video Call button
a5c875a fix(admin): doctor onboarding + admin portal E2E fixes
e257942 fix(mobile): move useAnimatedStyle before conditional return (Rules of Hooks)
badc751 feat(mobile): add ActiveConsultationBanner to home screen (TDD)
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

### Doctor Dashboard E2E Fixes — COMPLETE

#### Fix 1: Dashboard Stats Out of Sync
- [x] Remapped `DOCTOR_REVIEWING` → `NEW` (was `IN_REVIEW`) in `mapToDashboardStatus`, `buildStatusFilter`, `getQueueStats`
- [x] `VIDEO_SCHEDULED`/`VIDEO_COMPLETED`/`AWAITING_LABS` → `IN_REVIEW`
- [x] Updated dashboard UI labels: "In Review" → "In Consultation"
- [x] Updated 63 dashboard service tests — all pass

#### Fix 2: Hair Loss Q-Mapping Bug
- [x] Fixed `condition-panels.tsx`: `Q3→Q7` for Norwood pattern, `Q5→Q8` for family history
- [x] Source of truth: `backend/prisma/questionnaires/hair-loss.ts`

#### Fix 3: Request Video Call Button + Patient Slot Booking Flow
- [x] Added `videoRequested Boolean @default(false)` to Consultation schema + migrated
- [x] Added `requestVideoConsultation` mutation: sets `videoRequested: true` (no status change)
- [x] Added `requestVideo()` in consultation.service.ts — validates doctor, status, sets flag
- [x] Doctor's "Request Video Call" button calls new mutation (not updateConsultationStatus)
- [x] Button on desktop header + mobile action bar + QuickActions component
- [x] `VIDEO_SCHEDULED` status only happens when patient books via `bookVideoSlot` mutation
- [x] Patient Activity screen: "Book Video Slot" button shown when `videoRequested && DOCTOR_REVIEWING`
- [x] Tapping navigates to existing `/video/slots/[consultationId]` (Phase 13)
- [x] `videoRequested` field added to `ConsultationType` GraphQL type + mobile `Consultation` interface
- [x] `GET_MY_CONSULTATIONS` query includes `videoRequested` field

#### Fix 4: Assignment Workflow — Doctor Must Start Review
- [x] Assignment service no longer transitions to `DOCTOR_REVIEWING` — only sets `doctorId`
- [x] Status stays `AI_REVIEWED` after auto-assignment; doctor clicks "Start Review" to begin
- [x] `AI_REVIEWED` added to ACTIVE_STATUSES for doctor load counting
- [x] Dashboard mapping: `AI_REVIEWED` → NEW, `DOCTOR_REVIEWING` → IN_REVIEW
- [x] Updated `buildStatusFilter` + `getQueueStats` to match new buckets

#### Tests (22 new/updated)
- [x] `condition-panels.spec.tsx`: 18 tests (Q-mapping, routing, QuickActions)
- [x] `consultation.service.spec.ts`: 4 new tests for `requestVideo` (happy path, forbidden, bad status, not found)
- [x] `assignment.service.spec.ts`: Updated 3 tests for new assignment behavior
- [x] `dashboard.service.spec.ts`: Updated 4 tests for new status mapping

## Next Up:
- Continue E2E testing: doctor requests video → patient books slot → video call
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
