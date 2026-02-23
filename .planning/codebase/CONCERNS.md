# Codebase Concerns

**Analysis Date:** 2026-02-23

## Tech Debt

**Notification Delivery Pipeline Not Implemented:**
- Issue: `sendNotification()` in `backend/src/notification/notification.service.ts` (line 66-115) only creates database records; no actual push/SMS/email delivery
- Files: `backend/src/notification/notification.service.ts` (1,253 LOC)
- Impact: Users receive no FCM push notifications, MSG91 SMS/WhatsApp, or email despite preference settings stored
- Fix approach: Implement actual provider integrations:
  - FCM integration using Firebase Admin SDK for push to mobile
  - MSG91 integration for SMS/WhatsApp (OTP already uses MSG91, can reuse pattern from `backend/src/auth/otp.service.ts`)
  - Email provider (SendGrid/AWS SES) for transactional emails
  - Create separate workers or queue (Bull/RabbitMQ) to handle async delivery retry logic
- Spec reference: master spec Section 11 (Notification System)

**Monolithic Service Files:**
- Issue: Single large services handling multiple concerns; e.g., `backend/src/prescription/prescription.service.ts` (2,577 LOC), `backend/src/admin/admin.service.ts` (2,410 LOC), `backend/src/ai/ai.service.ts` (2,041 LOC)
- Files:
  - `backend/src/prescription/prescription.service.ts`
  - `backend/src/admin/admin.service.ts`
  - `backend/src/ai/ai.service.ts`
  - `backend/src/notification/notification.service.ts` (1,253 LOC)
- Impact: Difficult to test isolated features, high cognitive load for maintenance, increased chance of unintended side effects when modifying one feature
- Fix approach: Break into smaller services with single responsibilities (e.g., PrescriptionBuilder, PrescriptionValidator, PrescriptionPDFGenerator; AdminDashboard, AdminPartnerManagement, AdminSLAMonitoring)

**No Database Transaction Wrapping:**
- Issue: Multi-step operations lack Prisma transaction boundaries (no `prisma.$transaction()` usage found in codebase)
- Files: 18 files use transaction-like patterns but none actually wrap in `$transaction()`:
  - `backend/src/doctor/doctor.service.ts`
  - `backend/src/video/slot-booking.service.ts`
  - `backend/src/pharmacy/pharmacy-onboarding.service.ts`
  - `backend/src/intake/intake.service.ts`
  - `backend/src/wallet/wallet.service.ts`
- Impact: Race conditions on concurrent operations (e.g., slot booking, wallet deductions, lab order status updates); partial state on failures
- Fix approach: Wrap multi-step operations in `prisma.$transaction()` for atomicity; example pattern:
  ```typescript
  await this.prisma.$transaction(async (tx) => {
    await tx.labOrder.update(...);
    await tx.notification.create(...);
    await tx.slaTimer.create(...);
  });
  ```

**Hardcoded Magic Strings Instead of Enums:**
- Issue: Order numbers, status checks, and IDs generated with hardcoded format strings
- Files:
  - `backend/src/prescription/prescription.service.ts` (line 651): "ORD-XXXXXX" format comment but no constant
  - `backend/src/pharmacy/pharmacy-assignment.service.ts` (line 152): "PO-XXXXXX" format comment but no constant
  - Various status checks use string literals instead of Prisma enums
- Impact: Inconsistent data formats if generation logic changes; harder to enforce format validation
- Fix approach: Create constants module `backend/src/common/constants/order-formats.ts` with:
  ```typescript
  export const ORDER_FORMATS = {
    PRESCRIPTION: 'ORD-XXXXXX',
    PHARMACY_ORDER: 'PO-XXXXXX',
  } as const;
  ```

---

## Known Bugs

**Lab Order Slot Booking Missing User Pincode:**
- Symptoms: Mobile app uses hardcoded pincode '400001' (Mumbai) instead of user's actual pincode
- Files: `mobile/app/lab/[labOrderId]/index.tsx` (line 92): `pincode: '400001', // TODO: Get from user profile`
- Trigger: Open any lab order booking screen on mobile
- Workaround: None; must manually book from correct location or filter slots manually
- Impact: Users from other cities cannot book accurate collection slots; wrong slot options displayed

**Admin Name Hardcoded in Layout:**
- Symptoms: Admin portal displays hardcoded name "Abhishikth" instead of logged-in admin
- Files: `web/src/app/admin/layout.tsx` (line 70-71): `// TODO: Replace with actual auth context` and `const adminName = 'Abhishikth';`
- Trigger: Open admin portal
- Workaround: None; purely cosmetic, doesn't affect functionality
- Impact: Wrong name displayed; breaks audit trails if multiple admins using same portal

---

## Security Considerations

**Redis Connection Graceful Degradation Without Health Check:**
- Risk: `backend/src/redis/redis.service.ts` (line 16-40) uses `lazyConnect: true` with non-blocking connection retry; if Redis fails, app silently degrades to non-cached mode
- Files: `backend/src/redis/redis.service.ts`, `backend/src/common/cache/cache.service.ts`
- Current mitigation: Cache failures are caught and logged as warnings, app continues without cache
- Recommendations:
  - Add Readiness probe that checks Redis availability (`backend/src/health/indicators/redis.health.ts` exists but unused)
  - Make Redis required in production (fail startup if unavailable) vs optional in dev
  - Monitor cache hit/miss ratios to detect degradation in production

**Sentry Initialization Without DSN Check:**
- Risk: If `SENTRY_DSN` env var not set, Sentry gracefully degrades but no warning logged
- Files: `backend/src/common/sentry/sentry.interceptor.ts` (line 16-17): checks `Sentry.isInitialized()`
- Current mitigation: Sentry errors skipped if not initialized, app continues
- Recommendations: Log warning at startup if DSN not configured in production

**No Rate Limiting on Critical Endpoints:**
- Risk: OTP, payment, prescription endpoints lack per-user rate limiting
- Files: `backend/src/common/guards/rate-limit.guard.ts` exists but not applied to all endpoints
- Current mitigation: MSG91 has built-in 5 OTP/15min limit, but not enforced in app code
- Recommendations: Apply `@UseGuards(RateLimitGuard)` to all mutation resolvers; implement sliding window on Redis

**Enum Type Casts Without Validation:**
- Risk: `NotificationService.sendNotification()` casts user-provided strings to Prisma enums without validation
- Files: `backend/src/notification/notification.service.ts` (line 92-93): `as UserRole`, `as NotificationChannel`, `as NotificationEventType`
- Current mitigation: Service expects correct enum values from callers
- Recommendations: Add input validation DTO with `@IsEnum()` decorators; cast only after validation

---

## Performance Bottlenecks

**Unindexed Queries on Lab Order Timeline:**
- Problem: Lab order status queries (e.g., `GET_AVAILABLE_SLOTS`, slot discovery) may scan millions of records if no index on `status` + `bookedDate`
- Files: `backend/src/lab-order/slot-booking.service.ts` (561 LOC) performs numerous `findMany()` with filters
- Cause: Prisma schema has no indexes defined; PostgreSQL defaults to sequential scan on large tables
- Improvement path: Add indexes to `backend/prisma/schema.prisma`:
  ```prisma
  model LabOrder {
    @@index([status])
    @@index([bookedDate])
    @@index([phlebotomistId, status])
  }
  ```

**N+1 Query Risk on Nested Relations:**
- Problem: GraphQL resolvers may load relations one at a time (e.g., consultant.labOrders.forEach(order => order.phlebotomist))
- Files: `backend/src/lab-order/lab-processing.service.ts`, multiple resolver implementations
- Cause: GraphQL resolvers not using `include` strategy for nested relations
- Improvement path: Audit all `.findMany()` calls in services and add explicit `include:` for commonly-accessed relations; use DataLoader for deep nesting

**Cache TTL Too Short for Expensive Queries:**
- Problem: Some cached queries use 5min TTL when data is stable for hours (e.g., phlebotomist availability)
- Files: `backend/src/common/cache/cache.service.ts` relies on caller-provided TTL; no default guidance
- Cause: No standard TTL constants; each service guesses duration
- Improvement path: Create `backend/src/common/constants/cache-ttl.ts`:
  ```typescript
  export const CACHE_TTL = {
    SLOT_AVAILABILITY: 15 * 60, // 15min — changes frequently
    PHLEBOTOMIST_ROSTER: 60 * 60, // 1hr — relatively stable
    PARTNER_LOCATIONS: 24 * 60 * 60, // 1 day — stable
  } as const;
  ```

---

## Fragile Areas

**Questionnaire Skip Logic Not Fully Tested:**
- Files: `backend/src/questionnaire/data/hair-loss.ts` (536 LOC), weight-management.ts (654 LOC), pcos.ts (750 LOC)
- Why fragile: Complex nested skip logic (e.g., "show Q5 only if Q3 === 'moderate' AND Q4 < 5") in data files not extracted to engine; manual updates risk breaking logic
- Safe modification: Do NOT modify skip logic directly in data files; instead:
  1. Add test case to `questionnaire.engine.spec.ts` for the specific skip condition
  2. Run tests and confirm they fail
  3. Only then modify the data file
  4. Rerun tests to confirm pass
- Test coverage: Core engine tested but data files lack edge case coverage (partial integration tests exist in `backend/src/integration/critical-flows.spec.ts`)

**Lab Order Status Transitions Without Validation:**
- Files: `backend/src/lab-order/lab-order.service.ts` (546 LOC)
- Why fragile: Status updates scattered across 5+ services (LabOrderCreationService, CollectionTrackingService, LabProcessingService, SlotAssignmentService, SlotBookingService); transitions not centralized or validated
- Safe modification: Add state machine validator before any status update:
  ```typescript
  private validateTransition(current: LabOrderStatus, next: LabOrderStatus): void {
    const valid = VALID_STATUS_TRANSITIONS[current];
    if (!valid?.includes(next)) throw new BadRequestException(...);
  }
  ```
- Test coverage: Individual service tests pass but integration tests for invalid transitions lacking (e.g., DELIVERED → PENDING should error but may not be tested)

**Prescription Contraindication Matrix Hard to Maintain:**
- Files: `backend/src/prescription/prescription.service.ts` (lines 200-400, hardcoded contraindication logic)
- Why fragile: Finasteride contraindication checks embedded in service code; adding new drugs requires code changes and service restart
- Safe modification: Extract to data structure:
  ```typescript
  export const CONTRAINDICATION_MATRIX: Record<string, string[]> = {
    'Finasteride': ['pregnancy', 'liver_disease', 'prostate_cancer'],
    // ... more drugs
  };
  ```
- Then load from database and cache with TTL
- Test coverage: Prescription service tests exist but contraindication permutations not exhaustively tested

---

## Scaling Limits

**Single VideoSchedulerService Cron Job:**
- Current capacity: Runs on single backend instance; if 10k video bookings pending, cron may miss reminders on high-load days
- Limit: Vertical scaling only (bigger server); cron jobs don't distribute across cluster
- Scaling path: Move to distributed scheduler (Bull/Agenda):
  1. Replace NestJS `@Cron` in `backend/src/video/video-scheduler.service.ts` with Bull queue jobs
  2. Each job processes one video reminder, idempotent (can retry safely)
  3. Queue scales horizontally across multiple backend instances
  - Spec reference: master spec Section 13 (Video Consultation Backend)

**SMS/WhatsApp Rate Limit Dependency on MSG91:**
- Current capacity: MSG91 allows ~100 SMS/sec per account; if platform scales to 100k patients × 2 verticals, SMS delivery may queue
- Limit: Notification bursts (lab results to 5k patients) could exhaust quota
- Scaling path: Implement notification batching and priority queue:
  1. Queue notifications with priority (CRITICAL > HIGH > NORMAL)
  2. Batch SMS delivery to MSG91 API (10 per request instead of 1)
  3. Distribute across multiple MSG91 accounts if needed

**Single Redis Instance for Rate Limiting + Cache:**
- Current capacity: Single Redis instance (default localhost:6379) used for OTP rate limiting, session cache, and cooling periods
- Limit: Memory exhaustion if millions of cached queries; write throughput (ops/sec) if many concurrent rate-limit checks
- Scaling path:
  1. Separate Redis instances for rate-limiting (hot, small, high-eviction) vs caching (cold, large, LRU)
  2. Consider Redis Cluster for HA in production
  3. Monitor memory usage and eviction rates

---

## Dependencies at Risk

**@100mslive/react-native-hms Not Actually Installed:**
- Risk: Mobile video tests mock the entire 100ms SDK; actual native library installation incomplete
- Impact: Video feature untested on real devices; will fail at runtime when user joins actual 100ms room
- Current state: `backend/src/video/hms.service.ts` and mobile tests use mock mode (no HMS_ACCESS_KEY required)
- Migration plan:
  1. Install real package: `npm install @100mslive/react-native-hms`
  2. Obtain HMS test account credentials
  3. Update `mobile/src/hooks/useHMS.ts` to use real SDK when credentials present
  4. Add integration test with real 100ms sandbox room
  5. Document native setup (linking, permissions) in CLAUDE.md
  - Spec reference: master spec Section 13 (Video Consultation Backend)

**Prisma Version Pinning:**
- Risk: Prisma schema changes in future versions may break migrations or introduce breaking generator changes
- Current state: `backend/package.json` uses `^5.x` (allows minor updates)
- Recommendation: Pin to exact version after validating upcoming releases: `"@prisma/client": "5.21.0"` not `^5.21.0`

**Claude API Rate Limits Not Configured:**
- Risk: AI pre-assessment calls in `backend/src/ai/ai.service.ts` (2,041 LOC) lack retry logic or backoff; if Anthropic rate-limits, feature fails
- Current state: Service makes direct API calls without circuit breaker
- Improvement path: Wrap AI calls with retry logic (exponential backoff, max 3 retries) and circuit breaker (fail fast after 5 consecutive failures)

---

## Missing Critical Features

**No Delivery Partner Portal (Delivery Role Incomplete):**
- Problem: Delivery drivers cannot view assigned deliveries, confirm OTP, mark delivered without custom web access
- Blocks: Full delivery automation for pharmacy orders (Phase 4 incomplete)
- Status: `backend/src/pharmacy/delivery.service.ts` (242 LOC) exists but no corresponding portal at `delivery.onlyou.life`
- Plan: Build delivery portal in `web/src/app/delivery/`:
  - Login with driver phone + OTP
  - Assigned deliveries list
  - Navigation to delivery location (Google Maps integration)
  - OTP entry and verification
  - Photo proof of delivery
  - Damage/return initiation

**No Prescription Template Management UI:**
- Problem: Doctors use hardcoded templates; cannot customize for specific patient cases
- Blocks: Custom prescriptions beyond 7 predefined templates
- Current state: `HAIR_LOSS_TEMPLATES` hardcoded in `backend/src/prescription/prescription.service.ts` (lines 41-150)
- Plan: Create doctor dashboard feature (`web/src/app/doctor/templates/`) to:
  - Create/edit custom templates
  - Preview before saving
  - Apply defaults per specialization

**Phlebotomist Mobile App:**
- Problem: Phlebotomists use web portal only; cannot check daily roster or confirm collection on-the-fly
- Blocks: Smooth field operations (phlebotomist has to return to desk to mark collected)
- Current state: Only web portal at `collect.onlyou.life` exists
- Plan: Create React Native Expo app for phlebotomists:
  - Daily roster with patient queue
  - Collection checklist (fasting verified, tube count)
  - GPS checkin at patient location
  - Real-time sync with backend

---

## Test Coverage Gaps

**Untested: Concurrent Lab Order Status Updates:**
- What's not tested: Race condition where two different services try to update same lab order status simultaneously (e.g., phlebotomist marks COLLECTED while lab marks RECEIVED)
- Files: `backend/src/lab-order/lab-order.service.ts` (546 LOC), `backend/src/lab-order/collection-tracking.service.ts`, `backend/src/lab-order/lab-processing.service.ts`
- Risk: Last-write-wins behavior may silently lose status updates; audit logs may show inconsistent timeline
- Priority: HIGH — affects core lab workflow accuracy
- Coverage needed: Add integration test that:
  1. Creates lab order
  2. Spawns two async requests (one for COLLECTED, one for RECEIVED)
  3. Verify final status is deterministic
  4. Verify all audit logs present

**Untested: Payment Refund With Active Subscription:**
- What's not tested: Refund flow when patient has monthly subscription auto-renewal pending
- Files: `backend/src/payment/payment.service.ts` (coverage unknown), `backend/src/subscription/subscription.service.ts`
- Risk: Refund may process while subscription renews, creating negative balance or duplicate charges
- Priority: HIGH — affects payments
- Coverage needed: Add test scenario: (1) Activate subscription, (2) Refund order, (3) Verify renewal cancelled or deducted from refund

**Untested: Prescription PDF Generation With Non-Latin Characters:**
- What's not tested: Prescription templates with patient instructions in Hindi/regional languages
- Files: `backend/src/prescription/prescription.service.ts` (generates PDF using pdfkit)
- Risk: PDF may render blank or corrupted text for non-Latin scripts; unreadable for patients
- Priority: MEDIUM — affects usability
- Coverage needed: Add test with Marathi/Tamil patient names and instructions

**Untested: Critical Value Notification Race Condition:**
- What's not tested: Lab processes result with critical value while doctor is reviewing same result
- Files: `backend/src/lab-automation/lab-processing.service.ts` (579 LOC)
- Risk: Patient notified twice, or notification skipped if timing overlaps
- Priority: MEDIUM — affects patient safety notifications
- Coverage needed: Add concurrent request test scenario

---

## Architectural Concerns

**GraphQL N+1 Risk on Nested Resolvers:**
- Issue: Mobile app may trigger multiple GraphQL requests for related entities instead of fetching with `include`
- Impact: App slow, backend load high, cache ineffective
- Example: Fetching "LabOrders with Phlebotomist details" might resolve each phlebotomist separately
- Recommendation: Implement GraphQL DataLoader for lazy-loaded relations

**No Request/Response Logging:**
- Issue: Critical mutations (refunds, prescription changes) lack detailed request/response audit trails
- Current state: Sentry logs errors only; not success paths
- Recommendation: Add structured logging (JSON) for all mutations with: user ID, operation, input, output, IP, timestamp

**Hardcoded Portal Subdomain Routing:**
- Issue: Next.js middleware handles subdomain routing for 5 portals; mapping hardcoded in `web/src/middleware.ts`
- Risk: Adding new portal requires code change + redeploy
- Recommendation: Load portal routing config from database or .env with fallback to hardcoded

---

*Concerns audit: 2026-02-23*
