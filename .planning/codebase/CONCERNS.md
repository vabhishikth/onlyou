# Codebase Concerns

**Analysis Date:** 2026-02-23
**Last Verified:** 2026-02-23

## Tech Debt

**Notification Delivery Pipeline — PUSH implemented, SMS/WhatsApp/Email still stubbed:**
- Issue: `sendNotification()` now delivers PUSH via Expo Push Service (`backend/src/notification/push-delivery.service.ts`) but SMS/WhatsApp/Email channels only create DB records
- Files: `backend/src/notification/notification.service.ts`, `backend/src/notification/push-delivery.service.ts`
- Remaining: Implement MSG91 integration for SMS/WhatsApp, email provider (SendGrid/AWS SES) for transactional emails
- Spec reference: master spec Section 11 (Notification System)

**Monolithic Service Files:**
- Issue: Single large services handling multiple concerns; e.g., `backend/src/prescription/prescription.service.ts` (2,577 LOC), `backend/src/admin/admin.service.ts` (2,410 LOC), `backend/src/ai/ai.service.ts` (2,041 LOC)
- Impact: Difficult to test isolated features, high cognitive load for maintenance
- Fix approach: Break into smaller services with single responsibilities

**Hardcoded Magic Strings Instead of Enums:**
- Issue: Order numbers and IDs generated with hardcoded format strings
- Files: `backend/src/prescription/prescription.service.ts`, `backend/src/pharmacy/pharmacy-assignment.service.ts`
- Fix approach: Create constants module for order format strings

---

## Known Bugs — FIXED

~~**Lab Order Slot Booking Missing User Pincode:**~~ **FIXED** — Now uses `labOrder.collectionCity` and `labOrder.collectionPincode` from the lab order record instead of hardcoded '400001'.

~~**Admin Name Hardcoded in Layout:**~~ **FIXED** — Now uses `useAuth()` hook to get logged-in admin's name.

---

## Security Considerations

**Redis Connection Graceful Degradation Without Health Check:**
- Risk: Redis failure silently degrades to non-cached mode
- Files: `backend/src/redis/redis.service.ts`, `backend/src/health/indicators/redis.health.ts`
- Note: Health indicator file EXISTS and can be wired into readiness probes
- Recommendations: Make Redis required in production, monitor cache hit/miss ratios

**Sentry Initialization Without DSN Check:**
- Risk: If `SENTRY_DSN` env var not set, Sentry gracefully degrades but no warning logged
- Files: `backend/src/common/sentry/sentry.interceptor.ts` — checks `Sentry.isInitialized()`
- Recommendations: Log warning at startup if DSN not configured in production

**Rate Limit Guard Exists But Never Applied:**
- Risk: OTP, payment, prescription endpoints lack per-user rate limiting
- Files: `backend/src/common/guards/rate-limit.guard.ts` exists but `@UseGuards(RateLimitGuard)` is used ZERO times in production code
- Current mitigation: MSG91 has built-in 5 OTP/15min limit
- Recommendations: Apply `@UseGuards(RateLimitGuard)` to critical mutation resolvers

**Enum Type Casts:**
- Status: Uses proper Prisma enum casts (`as UserRole`, `as NotificationChannel`, `as NotificationEventType`) — NOT `as any`
- Remaining risk: Callers could pass invalid strings; consider adding `@IsEnum()` validation DTOs at resolver boundaries

---

## Performance Bottlenecks

**N+1 Query Risk on Nested Relations:**
- Problem: GraphQL resolvers may load relations one at a time
- Improvement path: Audit `.findMany()` calls and add `include:` for commonly-accessed relations; implement DataLoader for deep nesting

**Cache TTL Inconsistency:**
- Problem: No standard TTL constants; each service guesses cache duration
- Improvement path: Create `backend/src/common/constants/cache-ttl.ts` with standard TTL values

**Note:** Prisma schema has 50+ `@@index` declarations — database indexing is NOT a concern.

---

## Fragile Areas

**Questionnaire Skip Logic Not Fully Tested:**
- Files: `backend/src/questionnaire/data/hair-loss.ts` (536 LOC), weight-management.ts (654 LOC), pcos.ts (750 LOC)
- Why fragile: Complex nested skip logic in data files; manual updates risk breaking logic
- Safe modification: Always add test cases FIRST before modifying data files

**Prescription Contraindication Matrix Hard to Maintain:**
- Files: `backend/src/prescription/prescription.service.ts` (hardcoded contraindication logic)
- Why fragile: Adding new drugs requires code changes
- Fix: Extract to data structure or database table

**Note:** Lab order status transitions ARE centralized in `backend/src/lab-automation/constants.ts` with `VALID_LAB_ORDER_TRANSITIONS` (19 transition rules) + `isValidLabOrderTransition()` helper.

---

## Scaling Limits

**Video Scheduler Not Actually Scheduled:**
- `backend/src/video/video-scheduler.service.ts` has `@Cron` in comments only — not imported or applied
- Service methods exist but are never triggered automatically
- Fix: Import `@nestjs/schedule` and apply actual `@Cron` decorators, or use Bull queue

**SMS/WhatsApp Rate Limit Dependency on MSG91:**
- Notification bursts could exhaust MSG91 quota
- Fix: Implement notification batching and priority queue

**Single Redis Instance:**
- Used for OTP rate limiting, session cache, and cooling periods
- Fix: Separate instances or Redis Cluster for production

---

## Dependencies at Risk

**@100mslive/react-native-hms Not Installed:**
- Mobile video tests mock the entire 100ms SDK
- Video feature will fail at runtime on real devices
- Fix: Install real package, obtain HMS test account credentials

**Razorpay SDK — NOW INSTALLED:**
- `razorpay` package installed, test keys configured
- Payment module uses mock factory; needs real Razorpay integration wiring

**Claude API Rate Limits Not Configured:**
- AI pre-assessment calls lack retry logic or backoff
- Fix: Add exponential backoff and circuit breaker

---

## Missing Critical Features

**No Delivery Partner Portal:**
- Backend `delivery.service.ts` (303 LOC) exists but no web portal at `delivery.onlyou.life`

**No Prescription Template Management UI:**
- Doctors use hardcoded templates; no UI to customize

**Phlebotomist Mobile App:**
- Only web portal exists at `collect.onlyou.life`; no native app for field operations

---

## Test Coverage Gaps

**Untested: Concurrent Lab Order Status Updates** (HIGH)
**Untested: Payment Refund With Active Subscription** (HIGH)
**Untested: Prescription PDF With Non-Latin Characters** (MEDIUM)
**Untested: Critical Value Notification Race Condition** (MEDIUM)

---

## Previously False Claims — Corrected

The following items from the original analysis were verified as FALSE and have been removed or corrected:

1. ~~"No `$transaction` usage"~~ — FALSE: Found in `doctor.service.ts`, `intake.service.ts`, `pharmacy-onboarding.service.ts`, `availability.service.ts`
2. ~~"Enum casts use `as any`"~~ — FALSE: Fixed to use proper Prisma enum types
3. ~~"No @@index in Prisma schema"~~ — FALSE: 50+ `@@index` declarations exist
4. ~~"Lab status transitions not centralized"~~ — FALSE: Centralized in `backend/src/lab-automation/constants.ts`
5. ~~"Video scheduler uses @Cron"~~ — FALSE: Only in comments, never applied (corrected description above)
6. ~~"Redis health indicator unused"~~ — MISLEADING: File exists at `backend/src/health/indicators/redis.health.ts`

---

*Concerns audit: 2026-02-23 | Verified & corrected: 2026-02-23*
