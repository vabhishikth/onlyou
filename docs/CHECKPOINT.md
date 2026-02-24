# CHECKPOINT — Last Updated: 2026-02-24

## Current Phase: E2E Testing — Real-time Updates + Missing Resolvers + iOS Dev Build
## Current Task: Backend video resolvers + polling + doctor UX
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

### E2E Fixes — Session 2 (2026-02-24) — COMPLETE

#### Fix 5: AI Assessment JSON Parsing — Markdown Fence Stripping
- [x] Claude API sometimes wraps JSON response in markdown code fences (```json ... ```)
- [x] `parseAIResponse()` in `ai.service.ts` now strips ```` ```json ``` ```` before `JSON.parse()`
- [x] Prevents "Invalid JSON response from AI" errors that leave consultations stuck at PENDING_ASSESSMENT
- [x] File: `backend/src/ai/ai.service.ts:523-530`

#### Fix 6: Auto-Assignment on AI Retry
- [x] `runAssessment` and `retryAssessment` mutations now trigger `assignmentService.assignDoctor()` after storing AI assessment
- [x] Previously, if original AI assessment failed in intake chain, retry would store assessment but never assign a doctor
- [x] Added `AssignmentModule` import to `AIModule` (`backend/src/ai/ai.module.ts`)
- [x] Injected `AssignmentService` into `AIResolver` (`backend/src/ai/ai.resolver.ts`)
- [x] Auto-assignment fires async (non-blocking) with error logging on failure

#### Fix 7: Doctor Dashboard — Video Slot Date/Time Display
- [x] Added `CaseBookedSlotType` GraphQL type (id, videoSessionId, slotDate, startTime, endTime, status)
- [x] Added `videoRequested: Boolean` and `bookedSlot: CaseBookedSlotType` to `CaseConsultationType`
- [x] `getCaseDetail()` now includes `bookedSlots` (filtered by BOOKED, first upcoming) in Prisma query
- [x] `CASE_DETAIL` GraphQL query updated to request `videoRequested` + `bookedSlot { videoSessionId slotDate startTime endTime }`
- [x] Doctor case page: VIDEO_SCHEDULED header now shows "Video Scheduled — Feb 24 at 10:30 AM" with date-fns format
- [x] Works on both desktop header and mobile action bar

#### Fix 8: Mobile — Video Session Navigation from Activity Tab
- [x] Added "View Video Session" button on consultation card when status is `VIDEO_SCHEDULED`
- [x] Styled as outlined accent button (border + accent text) — distinct from solid "Book Video Slot" CTA
- [x] Navigates to `/video/upcoming` — existing screen with Join/Reschedule/Cancel actions
- [x] Patient can now always get back to their video session from the Activity tab

#### Fix 9: Mobile API URL Updated
- [x] Changed dev IP from `192.168.0.105` to `192.168.0.104` in `mobile/src/lib/apollo.ts`

#### Fix 10: Mobile Video Session — Apollo InvariantError
- [x] `GET_VIDEO_SESSION_QUERY` in `mobile/app/video/session/[videoSessionId].tsx` was a plain template string, not wrapped in `gql` tag
- [x] Apollo `useQuery` requires a `DocumentNode` — plain string caused Invariant Violation error #95
- [x] Fixed by wrapping in `gql` from `@apollo/client` and removing `as any` cast
- [x] Video session screen now loads properly when patient clicks "Join"

#### Fix 11: Doctor Video Session — Join Call Flow
- [x] Added `videoSessionId` field to `CaseBookedSlotType` DTO, service, and GraphQL query
- [x] Doctor case detail page: Added "Join Video Call" button when status is `VIDEO_SCHEDULED` (desktop + mobile)
- [x] Button navigates to `/doctor/video/sessions` where doctor can manage the call
- [x] Video sessions page (`/doctor/video/sessions`): Added "Join Call" button for SCHEDULED sessions
- [x] Join button calls `joinVideoSession` mutation with auto recording consent handling
- [x] Added `JOIN_VIDEO_SESSION` and `GIVE_RECORDING_CONSENT` mutations to `web/src/graphql/doctor-video.ts`

#### Fix 12: Status Stepper — Video Statuses
- [x] Added VIDEO_SCHEDULED, VIDEO_COMPLETED, AWAITING_LABS to all status arrays in the stepper
- [x] Third step label changes dynamically: "Video Scheduled" / "Video Complete" / "In Consultation"

### EAS Build Setup — COMPLETE (config ready, user runs interactively)

#### Native Dependencies Installed
- [x] `@100mslive/react-native-hms` v1.12.0 — real 100ms video calling SDK
- [x] `expo-build-properties` — configure native build settings (minSdk, compileSdk, etc.)
- [x] `expo-dev-client` v6.0.20 — enables development builds (replaces Expo Go)

#### Build Configuration
- [x] Created `mobile/eas.json` with 4 profiles:
  - `development` — dev client, internal distribution, local API URL (192.168.0.104:4000)
  - `development-simulator` — iOS simulator build, localhost API
  - `preview` — internal distribution, production API URL
  - `production` — auto-increment version, production API URL
- [x] EAS project initialized on Expo servers (`@abhiven/onlyou`, ID: 6f121d82-b079-4496-b09c-6f7ee3a3c0de)

#### app.json Updated
- [x] iOS: Added `NSMicrophoneUsageDescription` for video consultations
- [x] Android: Added `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`, `BLUETOOTH`, `BLUETOOTH_CONNECT` permissions
- [x] Added `expo-build-properties` plugin: minSdkVersion 24, compileSdkVersion 34, iOS deploymentTarget 15.1
- [x] EAS project ID linked in `extra.eas.projectId`

#### Metro Config Updated
- [x] Native module stubs (`@100mslive/react-native-hms`, `react-native-razorpay`) now ONLY activate when `EXPO_GO=1` env var is set
- [x] In EAS development builds, the real native SDKs are used
- [x] Usage: `EXPO_GO=1 npx expo start` for Expo Go testing (stubs), `npx expo start --dev-client` for dev builds (real SDKs)

#### Package Scripts Updated
- [x] `start` → `expo start --dev-client` (default to dev build)
- [x] `start:expo-go` → `EXPO_GO=1 expo start` (Expo Go with stubs)
- [x] Added `build:dev:android`, `build:dev:ios`, `build:preview`, `build:prod` convenience scripts

#### Build Commands (user runs in terminal):
```bash
# Android development build (first time will prompt for keystore — press Y)
cd mobile && npx eas-cli build --platform android --profile development

# iOS development build (requires Apple Developer account)
cd mobile && npx eas-cli build --platform ios --profile development

# After build completes, download APK/IPA and install on device
# Then connect to dev server:
cd mobile && npx expo start --dev-client
```

### E2E Fixes — Session 3 (2026-02-24) — COMPLETE

#### Fix 13: Metro Config — Stub Native Modules in Local Dev
- [x] Changed `metro.config.js` to stub native modules when `!process.env.EAS_BUILD` (was `EXPO_GO === '1'`)
- [x] During EAS cloud builds, `EAS_BUILD=true` is set — real native SDKs compiled in
- [x] During local dev, stubs prevent crash when native binary doesn't include HMS/Razorpay
- [x] iOS dev build succeeded: Expo SDK 54, build time 5m 19s, fingerprint be67733

#### Fix 14: Real-Time Status Updates — Polling
- [x] Mobile activity screen: Added `pollInterval: 10000` (10s) to both `GET_ACTIVE_TRACKING` and `GET_MY_CONSULTATIONS` queries
- [x] Mobile home screen: Added `pollInterval: 15000` (15s) to `GET_MY_CONSULTATIONS` query
- [x] Doctor case detail page: Added `pollInterval: 10000` (10s) to `CASE_DETAIL` query
- [x] Status changes now appear automatically without manual pull-to-refresh

#### Fix 15: Doctor Dashboard — "Waiting for Patient" State
- [x] Split `DOCTOR_REVIEWING` action buttons into two states based on `videoRequested`:
  - **Before request**: Shows "Request Video Call", "Request Info", "Reject", "Prescribe"
  - **After request** (`videoRequested = true`): Shows amber "Waiting for patient to book video slot..." banner with pulsing icon
- [x] Updated both desktop header and mobile action bar
- [x] `videoRequested` field already in GraphQL query and TypeScript interface

#### Fix 16: Missing `videoSession` Query Resolver (Backend)
- [x] Added `@Query videoSession(videoSessionId: String!)` to `VideoResolver`
- [x] Returns `VideoSessionType` — patient's mobile session screen needs this to load session data
- [x] Access control: only the patient or doctor on the session can access it
- [x] Throws `NotFoundException` / `ForbiddenException` as appropriate
- [x] **Root cause of mobile "Join Call does nothing" bug**: session was null → `handleJoinCall` silently returned

#### Fix 17: Missing `doctorVideoSessions` Query Resolver (Backend)
- [x] Added `@Query doctorVideoSessions` to `VideoResolver` — returns `DoctorVideoSessionType[]`
- [x] Added `DoctorVideoSessionType` DTO (id, consultationId, patientName, patientId, status, scheduledStartTime, scheduledEndTime, recordingConsentGiven)
- [x] Queries `VideoSession` with status `IN ['SCHEDULED', 'IN_PROGRESS']`, includes patient profile for name
- [x] Falls back to "Patient" when `patientProfile.fullName` is null
- [x] Role-restricted: only `DOCTOR` role can call
- [x] **Root cause of doctor "video sessions page empty" bug**: the query had no backend resolver

#### Tests (8 new, TDD)
- [x] `video.resolver.spec.ts`: "getVideoSession — should return session for the patient" — verifies access + correct data
- [x] `video.resolver.spec.ts`: "getVideoSession — should return session for the doctor" — verifies doctor access
- [x] `video.resolver.spec.ts`: "getVideoSession — should throw NotFoundException if session does not exist"
- [x] `video.resolver.spec.ts`: "getVideoSession — should throw ForbiddenException if user is not patient or doctor"
- [x] `video.resolver.spec.ts`: "getDoctorVideoSessions — should return sessions with patient names" — verifies Prisma query + name mapping
- [x] `video.resolver.spec.ts`: "getDoctorVideoSessions — should default patient name when profile is missing"
- [x] `video.resolver.spec.ts`: "getDoctorVideoSessions — should reject non-doctor role"
- [x] `video.resolver.spec.ts`: "getDoctorVideoSessions — should return empty array when no sessions exist"
- [x] All 27 video resolver tests pass (8 new + 19 existing)

## Test Counts:
- Backend: 2,793 tests (87 test suites)
- Mobile: 635 tests (55 test suites)
- Web: 285 tests (38 test suites)
- **Total: 3,705 tests**

## Recent Commits:
```
<pending> fix(e2e): real-time polling + missing video resolvers + doctor UX
8bfb02e feat(e2e): doctor video join flow + Apollo fix + EAS build setup
38855df feat(doctor): video request flow + Q-mapping fix + dashboard workflow improvements
a5c875a fix(admin): doctor onboarding + admin portal E2E fixes
e257942 fix(mobile): move useAnimatedStyle before conditional return (Rules of Hooks)
badc751 feat(mobile): add ActiveConsultationBanner to home screen (TDD)
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
| EAS Build | Ready | Project linked, profiles configured |
| Sentry | Skipped | Optional for now |
| Email | Skipped | Not blocking E2E |

## E2E Flow Status (Full Pipeline):
```
Patient selects plan → plan-selection.tsx passes planId to payment.tsx
  → Payment creates Razorpay order (with planId + vertical)
  → Razorpay checkout opens → payment verified
  → submitIntake called WITH planId
    → Backend creates intakeResponse + consultation + subscription (atomic)
    → AI assessment fires async (non-blocking)
      → JSON fence stripping handles ```json wrapped responses
    → Auto-assignment fires after AI completes (also fires on retry)
      → Sets doctorId only — status stays AI_REVIEWED
  → Navigate to complete.tsx → "Track Progress" → /(tabs)/activity
  → Activity tab shows ConsultationCard with status stepper
    → Stepper: Submitted → AI Reviewed → Doctor Reviewing → Video → Approved
  → Doctor logs into portal → sees case in "New" queue
    → Clicks "Start Review" → status moves to DOCTOR_REVIEWING
    → Clicks "Request Video Call" → sets videoRequested flag (no status change)
  → Patient sees "Book Video Slot" button → picks time → VIDEO_SCHEDULED
    → Doctor dashboard shows slot date/time + "Join Video Call" button
    → Doctor's Video Sessions page has "Join Call" button with consent handling
    → Patient Activity tab shows "View Video Session" → /video/upcoming
    → Video session screen: Join Call (with recording consent) / Reschedule / Cancel
  → Doctor completes session → VIDEO_COMPLETED → prescribes → APPROVED
```

## Next Up:
- Run `eas build` interactively in terminal (one-time keystore setup)
- Install dev build on device, test full video call flow with 100ms
- CI/CD pipeline setup
- Phase 18: Production readiness (Sentry, Redis caching, security audit)

## Known Issues:
- EAS Build has intermittent outages — check https://status.expo.dev/
- SMS/WhatsApp/Email channels still DB-record-only (no MSG91/email provider integration yet)
- Redis connection warning on startup if Redis not available (by design)
- RateLimitGuard exists but never applied to any endpoint
- HMS_WEBHOOK_SECRET empty — set when configuring webhooks in 100ms dashboard
- Subscription model used but no renewal/cancellation flow yet (future phase)

*Checkpoint updated per CLAUDE.md context protection rules.*
