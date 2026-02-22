# ONLYOU BUILD PLAN
## Comprehensive Analysis & Implementation Roadmap

**Created:** 2026-02-12
**Last Updated:** 2026-02-22
**Based on:** New specs (v3) vs. existing codebase analysis

---

# A. COMPLETED PHASES

## Phase 1: Foundation — COMPLETE
- Auth Module: Phone OTP (MSG91), JWT access/refresh tokens, 7 role-based guards, rate limiting
- User Module: PatientProfile, DoctorProfile, StaffProfile CRUD, age validation, pincode auto-fill
- File Upload Module: S3 presigned URLs, photo quality validation, file type restrictions
- **Tests:** Full TDD coverage

## Phase 2: Core Flow (Hair Loss) — COMPLETE
- Questionnaire Engine: Shared engine with skip logic, save/resume, 25-question Hair Loss data
- AI Pre-Assessment: Claude API integration, per-condition prompts, 9 classification categories
- Consultation Lifecycle: Full status machine, case assignment by specialization, photo association
- **Tests:** Full TDD coverage

## Phase 3: Doctor Dashboard — COMPLETE
- Dashboard Backend: Case queue (filterable), case detail, doctor routing by specialization
- Prescription System: Model, PDF generation, 6 Hair Loss templates, contraindication checks
- Messaging System: Threaded chat per consultation, canned responses, attachments, read receipts
- **Tests:** Full TDD coverage

## Phase 4: Blood Work & Delivery — COMPLETE
- Lab Order System: LabOrder model (15 statuses, all timestamps), slot booking, phlebotomist assignment, result upload, SLA escalation
- Partner Management: PartnerDiagnosticCentre, Phlebotomist, PartnerPharmacy CRUD, portal OTP auth
- Order & Delivery System: Order model (12 statuses), delivery OTP, pharmacy coordination, auto-reorder
- **Tests:** Full TDD coverage

## Phase 5: Payment Integration — COMPLETE
- Razorpay integration: payment orders, signature verification, webhooks
- Subscription plans: per-vertical pricing (monthly, quarterly, annual)
- Payment status tracking, refund processing
- **Tests:** Full TDD coverage

## Phase 6: Patient Tracking — COMPLETE
- Activity tab: unified tracking screen for lab orders + delivery orders
- Blood work stepper: patient-facing status view with timeline
- Delivery stepper: patient-facing status view with OTP modal
- Results viewer: simplified summary + PDF download
- Cancel/reschedule flows
- **Tests:** Full TDD coverage

## Phases 7-9: Additional Conditions — COMPLETE
- Erectile Dysfunction: 28-question questionnaire, IIEF-5, no photos
- Weight Management: 30-question questionnaire, 2 photos, body measurements
- PCOS: 32-question questionnaire, Rotterdam criteria, fertility intent
- Each vertical: AI prompt, prescription templates, condition-specific flows
- **Tests:** Full TDD coverage

## Phase 10: Notifications & SLA — COMPLETE
- NotificationService: FCM push, MSG91 SMS/WhatsApp, email
- NotificationSchedulerService: automated reminders, escalations
- SLA escalation engine: automatic alerts for overdue lab orders + deliveries
- Discreet notification mode (privacy option)
- **Tests:** Full TDD coverage

## Phase 11: Web Portals — COMPLETE
- Admin dashboard (admin.onlyou.life): case overview, partner management, SLA monitoring
- Doctor dashboard (doctor.onlyou.life): case queue, prescription builder, chat
- Lab portal (lab.onlyou.life): sample management, result upload
- Pharmacy portal (pharmacy.onlyou.life): order fulfillment, dispatch
- Phlebotomist portal (collect.onlyou.life): collection schedule, sample tracking
- Subdomain routing via Next.js middleware
- **Tests:** Full TDD coverage (Backend 2,108 | Mobile 501 | Web 181)

## Phase 12: Doctor Onboarding + Auto-Assignment — COMPLETE
- DoctorService: CRUD, specialization validation, onboarding flow
- AssignmentService: auto-assignment by vertical→specialization mapping, load balancing
- 10 valid specializations: Dermatology, Trichology, Urology, Andrology, Sexology, Endocrinology, Bariatrics, Gynecology, Reproductive Medicine, Internal Medicine
- **Tests:** Full TDD coverage

## Phase 13: Video Consultation Backend — COMPLETE
- AvailabilityService: setRecurringAvailability, 15-min window generation, booked-slot exclusion
- SlotBookingService: bookSlot, cancelBooking, rescheduleBooking, handleNoShow (race prevention)
- HmsService: 100ms integration (createRoom, generateToken, webhook verification), mock mode
- VideoSchedulerService: 24hr/1hr reminders, room creation, doctor no-show detection
- VideoNotificationService: 10 notification methods covering all video events
- Prescription gating: canPrescribe() blocks first-time prescriptions without completed video (TPG 2020)
- VideoResolver: 13 GraphQL endpoints with proper decorators
- Edge cases: auto-reconnect, audio/phone fallback, 5-min grace period enforcement
- **Tests:** Full TDD coverage (2,327 backend tests, 66 suites)

## Phase 14: Mobile Video Consultation Screens — COMPLETE
- **Chunk 0:** Backend GraphQL DTOs (InputType, ObjectType, enum registration) + resolver decorators + onVideoCompleted fix
- **Chunk 1:** Mobile GraphQL operations (7 operations: 2 queries, 5 mutations) + TypeScript types + status labels
- **Chunk 2:** 100ms SDK mock + useHMS hook (join, leave, toggleAudio, toggleVideo, connectionState)
- **Chunk 3:** Upcoming video sessions screen (session list, status badges, Join/Cancel/Reschedule actions)
- **Chunk 4:** Video slot picker screen (date tabs, time chips, connectivity warning, confirm booking)
- **Chunk 5:** Recording consent modal (TPG 2020 consent text, checkbox, mutation)
- **Chunk 6+7:** Video session screen with state machine (PRE_CALL → CONSENT → WAITING → IN_CALL → POST_CALL)
- **Chunk 8:** UpcomingSessionBanner for home screen + BUILD-PLAN.md + CHECKPOINT.md update
- **Tests:** Full TDD coverage

## Phase 15: Pharmacy Auto-Assignment + Fulfillment — COMPLETE
- **Chunk 1:** Pharmacy + PharmacyStaff models + PharmacyOnboardingService (12 methods, 32 tests)
- **Chunk 2:** PharmacyOrder + DeliveryTracking + PharmacyInventory models + constants (26 tests)
- **Chunk 3:** Pharmacy assignment engine — city match, cold chain, queue ranking, auto-assignment (22 tests)
- **Chunk 4:** Pharmacy fulfillment flows — accept/reject, stock issue, substitution, discreet packaging gate (26 tests)
- **Chunk 5:** Delivery tracking + OTP confirmation — dispatch, cold chain no-reattempt, max 2 attempts (17 tests)
- **Chunk 6:** SLA timers + breach monitoring — 4h acceptance, 4h prep, 6h delivery, 2h cold chain (13 tests)
- **Chunk 7:** Auto-refill subscriptions — 5-day lookahead cron, prescription validity check (11 tests)
- **Chunk 8:** GraphQL resolver — 40+ endpoints across 5 roles (Admin, Pharmacy, Doctor, Patient, Delivery) (17 tests)
- **Chunk 9:** Returns + damage reports + payment validation — 48h sealed return gate, cold chain auto-replacement (18 tests)
- **Tests:** Full TDD coverage (2,509 backend tests, 75 suites)

## Phase 16: Lab/Phlebotomist Auto-Assignment + Automation — COMPLETE
- **Chunk 1:** PartnerLab + LabPhlebotomist + LabTechnician models + onboarding services (59 tests)
  - Prisma models: PartnerLab (~60 fields), LabTechnician, LabPhlebotomist (new alongside old PartnerDiagnosticCentre/Phlebotomist)
  - LabOnboardingService: register, review, suspend/reactivate/deactivate, credential expiry cron (NABL=alert only, license=auto-suspend)
  - PhlebotomistOnboardingService: 5-gate activation (training, equipment, background, lab, areas)
- **Chunk 2:** Enhanced LabOrder + LabResult + PhlebotomistDailyRoster + constants (36 tests)
  - Extended LabOrderStatus with 5 new values, LabResult model (25 fields, trend tracking), PhlebotomistDailyRoster
  - Constants: 20-status transition map, fasting tests, GLP-1/PCOS protocols, SLA hours, critical value thresholds (9 tests)
- **Chunk 3:** Lab order creation + fasting detection + protocol auto-triggering (18 tests)
  - LabOrderCreationService: auto fasting, test availability check, payment status, GLP-1/PCOS auto-order, follow-up >3mo, patient upload, doctor review
- **Chunk 4:** Phlebotomist slot booking + auto-assignment (22 tests)
  - SlotAssignmentService: auto-assign by lowest daily load, fasting=morning-only slots, roster management
- **Chunk 5:** Collection day logistics + sample tracking (20 tests)
  - CollectionTrackingService: en route → fasting verify → collected → transit → delivered → received, tube mismatch detection
- **Chunk 6:** Lab processing + result upload + critical value alerts (21 tests)
  - LabProcessingService: auto status determination (NORMAL/LOW/HIGH/CRITICAL), trend calculation, immediate critical alerts, sample issue reporting
- **Chunk 7:** Biomarker dashboard data layer (10 tests)
  - BiomarkerDashboardService: history grouped by test code, trend charts, latest results, critical values summary
- **Chunk 8:** GraphQL resolver — 35+ endpoints across 5 roles (Admin, Doctor, Patient, Phlebotomist, Lab) (31 tests)
- **Chunk 9:** Edge cases hardening — transitions, fasting, critical values, protocols, SLA, integration (42 tests)
- **Tests:** Full TDD coverage (2,769 backend tests, 85 suites)

---

# B. TEST COUNT SUMMARY

| Area | Test Suites | Tests |
|------|-------------|-------|
| Backend | 85 | 2,769 |
| Mobile | 46+ | 571+ |
| Web | 28 | 196 |
| **Total** | **159+** | **3,536+** |

---

# C. NEXT PHASES (PLANNED)

## Phase 17: Production Readiness
- Error monitoring: Sentry integration (frontend + backend)
- Performance: Redis caching for hot paths, query optimization
- Security audit: OWASP top 10 review, rate limiting on all endpoints
- Install actual `@100mslive/react-native-hms` package + native setup
- Real 100ms room testing with HMS credentials
- CI/CD pipeline: GitHub Actions for test + build + deploy

## Phase 18: Launch Preparation
- Landing page (onlyou.life): marketing site with conversion flow
- App Store / Play Store submission preparation
- Legal compliance: TPG 2020 documentation, privacy policy, terms of service
- Analytics: event tracking, funnel analysis
- Load testing: simulate concurrent video sessions + API traffic

## Phase 19: Post-Launch
- GraphQL subscriptions for real-time updates (replace polling in waiting room)
- Video recording storage + playback
- Follow-up consultation scheduling
- Monthly health reports
- Referral program

---

# D. KEY ARCHITECTURE DECISIONS

1. **Video mock mode**: All HMS methods return deterministic mocks when `HMS_ACCESS_KEY` is empty
2. **Race prevention**: DB unique constraint + P2002 catch → user-friendly error for double-booking
3. **Prescription gating**: First-time prescription requires completed video per TPG 2020; follow-ups allowed async
4. **Multi-vertical video**: Each vertical's video requirement is independent
5. **5-min grace period**: Server-enforced for markNoShow
6. **Auto-reconnect**: <5min elapsed → new room; >=5min → notify doctor to decide
7. **Single session screen with state machine**: Avoids losing HMS connection on navigation
8. **useHMS custom hook**: Wraps SDK so tests mock the hook, not the SDK
9. **New lab models alongside old**: PartnerLab/LabPhlebotomist coexist with PartnerDiagnosticCentre/Phlebotomist — zero breaking changes
10. **Critical value alerts**: Patient safety — immediate doctor + admin notification for values outside critical thresholds
11. **Phlebotomist 5-gate activation**: Training + equipment + background + active lab + service areas — all must pass
12. **Protocol auto-triggering**: GLP-1 and PCOS verticals get auto-ordered blood panels

---

# E. FILE STRUCTURE

```
backend/src/
  auth/           - Phone OTP + JWT + role guards
  user/           - User profiles (patient, doctor, staff)
  intake/         - Questionnaires + consultations
  questionnaire/  - Shared questionnaire engine + data files
  ai/             - Claude AI pre-assessment
  prescription/   - Prescription builder + PDF + gating
  messaging/      - Threaded chat per consultation
  lab-order/      - Blood work lifecycle (15 statuses)
  order/          - Delivery lifecycle (12 statuses)
  payment/        - Razorpay integration + subscriptions
  notification/   - Push, SMS, WhatsApp, email
  doctor/         - Doctor onboarding + management
  assignment/     - Auto-assignment engine
  video/          - Video consultation (availability, booking, HMS, scheduler)
  pharmacy/       - Pharmacy assignment, fulfillment, delivery, SLA, returns
  lab-automation/ - Lab/phlebotomist onboarding, order creation, slot booking, collection, processing, biomarker dashboard
  upload/         - S3 presigned URLs + photo validation
  prisma/         - Database service
  config/         - Env validation + config module
  common/         - Cache, Sentry, GraphQL plugins

mobile/app/
  (auth)/         - Login flow screens
  (tabs)/         - Main app tabs (home, consult, orders, profile)
  intake/         - Intake flow screens
  lab/            - Lab order screens
  delivery/       - Delivery tracking screens
  profile/        - Profile management screens
  video/          - Video consultation screens
    upcoming.tsx  - Session list
    slots/        - Slot picker
    session/      - Pre-call → in-call → post-call

mobile/src/
  graphql/        - GraphQL operations + types
  hooks/          - Custom hooks (useHMS)
  components/     - Shared components (video/, ui/)
  lib/            - Auth, Apollo client
  theme/          - Design system tokens

web/src/app/
  admin/          - Admin dashboard
  doctor/         - Doctor dashboard
  lab/            - Lab portal
  pharmacy/       - Pharmacy portal
  collect/        - Phlebotomist portal
```

---

*This plan follows TDD principles from CLAUDE.md. All phases through 16 are complete.*
