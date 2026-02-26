# Code Review: 28 Security, Architecture & Code Quality Issues

> **GitHub Issue:** Copy this content to create a GitHub issue at https://github.com/vabhishikth/onlyou/issues/new

---

## Code Review Summary

Full code review of the Onlyou monorepo identified **28 issues** across security, architecture, data integrity, and code quality. This issue tracks all findings and their remediation status.

---

## CRITICAL: Security Vulnerabilities (P0)

### 1. Payment signature bypass is always active
**File:** `backend/src/payment/payment.service.ts:145-147`
The `stub_pay_` prefix bypass is **not gated by NODE_ENV**. An attacker can bypass Razorpay signature verification in production.
**Fix:** Wrap in `NODE_ENV !== 'production'` check.
**Status:** Fix in progress

### 2. OTP generated with Math.random()
**Files:** `backend/src/auth/otp.service.ts:45`, `backend/src/order/order.service.ts:127`
`Math.random()` is not cryptographically secure. Should use `crypto.randomInt()`.
**Status:** Fix in progress

### 5. JWT strategy doesn't check user active/verified status
**File:** `backend/src/auth/strategies/jwt.strategy.ts:30-39`
A deactivated user's existing JWT remains valid until expiry.
**Status:** Fix in progress

---

## Security Vulnerabilities (P1)

### 3. Refresh tokens stored as plaintext
**File:** `backend/src/auth/auth.service.ts:99-109`
If DB is compromised, all refresh tokens are immediately usable. Should hash with SHA-256.
**Status:** Fix in progress

### 6. No rate limiting on refresh token endpoint
**File:** `backend/src/auth/auth.resolver.ts:51`
Allows unlimited refresh attempts, enabling brute-force.
**Status:** Fix in progress

### 11. No DB transactions for multi-step operations
Multiple critical flows (user creation, payment handling, AI assessment) make separate DB writes without `$transaction`.
**Status:** Fix in progress

### 13. OTP store is in-memory
**File:** `backend/src/auth/otp.service.ts:22`
Won't work with multiple server instances. Should use Redis.
**Status:** Fix in progress

---

## Architecture & Security (P2)

### 4. Web auth tokens in localStorage — XSS risk
**File:** `web/src/hooks/use-auth.ts:102`
**Status:** Tracked for future fix

### 7. Missing CSRF protection for cookie-based web auth
**File:** `web/src/hooks/use-auth.ts:111`
**Status:** Tracked for future fix

### 8. Razorpay secret uses process.env directly with 'test_secret' fallback
**File:** `backend/src/payment/payment.service.ts:73`
**Status:** Fix in progress

### 9. Pervasive `any` types defeat TypeScript safety
Multiple files: `payment.service.ts`, `order.service.ts`, `messaging.service.ts`
**Status:** Tracked for future fix

### 10. Duplicate OrderStatus enum
**File:** `backend/src/order/order.service.ts:11-24`
**Status:** Fix in progress

### 12. No pagination on list queries
Unbounded results from: `getOrdersByPatient`, `getDoctorQueue`, `getPatientConsultations`, etc.
**Status:** Tracked for future fix

### 14. Unread count fetches all messages into memory
**File:** `backend/src/messaging/messaging.service.ts:296-308`
**Status:** Fix in progress

### 15. Missing environment variable validation
**File:** `backend/src/config/env.validation.ts`
**Status:** Fix in progress

### 25. No audit logging
CLAUDE.md requires audit logging but none exists.
**Status:** Tracked for future fix

### 26. No Apollo token refresh on mobile
**File:** `mobile/src/lib/apollo.ts:68-83`
**Status:** Fix in progress

### 27. Web middleware doesn't validate JWT
**File:** `web/src/middleware.ts:67-79`
**Status:** Fix in progress

### 28. Missing input validation at GraphQL layer
**Status:** Tracked for future fix

---

## Code Quality (P3)

### 16. Redis KEYS command used in production — should use SCAN
**Status:** Fix in progress

### 17. Windows-only port killer in main.ts
**Status:** Fix in progress

### 18. Inconsistent error handling patterns
**Status:** Tracked for future fix

### 19. console.log in production code (mobile)
**Status:** Fix in progress

### 20. Hardcoded IP address in mobile Apollo client
**Status:** Fix in progress

### 21. Shiprocket in .env.example contradicts spec
**Status:** Fix in progress

### 22. S3 URLs expose bucket name
**Status:** Tracked for future fix

### 23. Test S3 method logs partial AWS credentials
**Status:** Fix in progress

### 24. No timezone handling for IST
**Status:** Tracked for future fix

---

## Priority Fix Order

| Priority | Issue | Effort | Status |
|----------|-------|--------|--------|
| P0 | #1 Payment bypass | 5 min | In Progress |
| P0 | #2 Crypto-secure OTP | 15 min | In Progress |
| P0 | #5 JWT strategy check | 15 min | In Progress |
| P1 | #3 Hash refresh tokens | 1 hr | In Progress |
| P1 | #6 Rate limit refresh | 5 min | In Progress |
| P1 | #11 DB transactions | 2 hrs | In Progress |
| P1 | #13 OTP to Redis | 1 hr | In Progress |
| P2 | #4 HttpOnly cookies | 3 hrs | Future |
| P2 | #7 CSRF protection | 2 hrs | Future |
| P2 | #8 Razorpay ConfigService | 15 min | In Progress |
| P2 | #9 Replace `any` types | 4 hrs | Future |
| P2 | #10 Dedupe OrderStatus | 15 min | In Progress |
| P2 | #12 Add pagination | 3 hrs | Future |
| P2 | #14 Use count() | 15 min | In Progress |
| P2 | #15 Env validation | 30 min | In Progress |
| P2 | #25 Audit logging | 4 hrs | Future |
| P2 | #26 Apollo refresh | 2 hrs | In Progress |
| P2 | #27 Middleware JWT | 1 hr | In Progress |
| P2 | #28 GraphQL validation | 2 hrs | Future |
| P3 | #16 Redis SCAN | 15 min | In Progress |
| P3 | #17 Port killer | 15 min | In Progress |
| P3 | #18 Error patterns | 2 hrs | Future |
| P3 | #19 console.log | 5 min | In Progress |
| P3 | #20 Hardcoded IP | 5 min | In Progress |
| P3 | #21 .env.example | 5 min | In Progress |
| P3 | #22 S3 URLs | 1 hr | Future |
| P3 | #23 S3 credential log | 5 min | In Progress |
| P3 | #24 IST timezone | 2 hrs | Future |

## Remediation

Fix PR on branch `claude/code-review-i8YQv` — 4 parallel agents working on non-overlapping file sets:
- Agent 1: Auth security (otp.service.ts, jwt.strategy.ts, auth.resolver.ts, auth.service.ts)
- Agent 2: Payment & Order (payment.service.ts, order.service.ts)
- Agent 3: Infrastructure (consultation.service.ts, messaging.service.ts, env.validation.ts, redis.service.ts, main.ts, upload.service.ts)
- Agent 4: Frontend (mobile/apollo.ts, web/middleware.ts)

https://claude.ai/code/session_01ANQXhonzJDbZFcqsY8Bite
