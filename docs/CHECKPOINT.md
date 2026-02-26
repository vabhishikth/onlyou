# CHECKPOINT — Last Updated: 2026-02-26

## Current Phase: OTP/Redis Architecture Improvement
## Current Task: OTP migrated to Prisma + Redis in-memory fallback
## Status: COMPLETE

## Architecture Decision: OTP Storage & Redis Fallback

### WHY we made these changes

**Problem:** Login was completely broken when Redis was unavailable. On Windows without Docker/WSL, there's no easy way to run Redis locally. The OTP service stored tokens in Redis — when Redis was down, `redis.set()` silently failed, so OTPs were never stored, and every `verifyOtp()` returned "OTP expired or not requested". This made login impossible in local dev.

**Root causes identified:**
1. OTP (critical auth path) depended on Redis (optional infrastructure)
2. `redis.set()` returned void — callers couldn't detect failures
3. NODE_ENV condition mismatch: `sendOtp` checked `!== 'production'` but `verifyOtp` checked `=== 'development'`

### What we did (3-part fix)

**(A) Migrated OTP storage from Redis to Prisma `OtpToken` table:**
- New `OtpToken` model in Prisma schema (phone, otp, attempts, expiresAt)
- `otp.service.ts` rewritten to use `prisma.otpToken.upsert()` / `findUnique()` / `delete()`
- Login now works regardless of Redis availability
- Rate limiting still uses Redis (non-critical — if Redis is down, rate limiting is skipped)

**(B) Added in-memory fallback to `RedisService`:**
- When Redis is disconnected, all operations (get/set/del/incr/expire/keys) fall back to a Map-based in-memory store with TTL support
- Rate limiting, caching, and other Redis features still work without Redis
- Memory store is cleared when Redis reconnects
- Periodic cleanup of expired entries every 30 seconds

**(C) Upstash Redis (user guidance):**
- User should set up free Upstash Redis and update `REDIS_URL` in `.env` for cloud-grade Redis
- This gives proper Redis in production without self-hosting

### Files changed
- `backend/prisma/schema.prisma` — Added `OtpToken` model
- `backend/src/auth/otp.service.ts` — Rewritten: Prisma for OTP, Redis for rate limiting only
- `backend/src/auth/otp.service.spec.ts` — 15 tests (all passing), including Redis-down scenario
- `backend/src/redis/redis.service.ts` — Added in-memory fallback with TTL
- `backend/src/redis/redis.service.spec.ts` — 18 tests (12 original + 6 fallback tests)

---

## Video Consultation Workflow Rewrite — ALL COMPLETE

### Phase 1: Backend Hardening
- [x] Task 1.1: Webhook REST endpoint (`video-webhook.controller.ts`) — 10 tests
- [x] Task 1.2: Status transition state machine (`video-state-machine.ts`) — 35 tests
- [x] Task 1.3: Session timeout + idempotent crons — 8 tests
- [x] Task 1.4: Recording lifecycle (start/stop/S3) — tests in hms.service.spec.ts
- [x] Task 1.5: Reconnection flow (handleDisconnect wired up)

### Phase 2: Mobile Video
- [x] Task 2.1: useHMS hook rewrite with event listeners + peer tracking
- [x] Task 2.2: Real video rendering with HmsView + auto-transition
- [x] Task 2.3: Patient reconnection UI (auto + manual rejoin)

### Phase 3: Doctor Web
- [x] Task 3.1: Room edge cases — disconnect banner, 40-min warning, beforeunload — 5 tests
- [x] Task 3.2: Session list — 5s polling, pulse badge, Today/All filter — 5 tests

### Phase 4: Post-Call
- [x] Task 4.1: Post-call summary (doctor name, duration, recording flag) — 5 backend + 5 mobile tests
- [x] Task 4.2: SOAP structured notes (Chief Complaint, Observations, Assessment, Plan) — 1 test

### Phase 5: Integration
- [x] Task 5.1: Full lifecycle integration tests — 6 scenarios

## Previous Work (Phases 1-12) — ALL COMPLETE
See git log for full history.

## Test Counts (as of last full run):
- Backend: 2,913 passing (14 pre-existing failures in 6 suites)
- Mobile: 659 passing (perfect — 0 failures)
- Web: 285 passing (10 pre-existing failures in 3 suites)
- **Total: 3,857 passing**

## Known Issues:
- 14 pre-existing backend test failures (Prisma schema drift — video/wallet models not generated in CI)
- 10 pre-existing web test failures (Apollo MockedProvider `addTypename` deprecation in admin/doctors tests)

## Next Up:
- Set up Upstash Redis (free tier) for production-grade Redis
- No remaining tasks in the video rewrite plan

*Checkpoint updated per CLAUDE.md context protection rules.*
