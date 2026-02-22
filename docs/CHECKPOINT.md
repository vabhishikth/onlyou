# CHECKPOINT — Last Updated: 2026-02-22

## Current Phase: Phase 14 — Mobile Video Consultation Screens (COMPLETE)
## Current Task: All 8 Chunks Complete
## Status: COMPLETE

## Completed Work:

### Phases 1-13 — ALL COMPLETE (see git log and BUILD-PLAN.md)

### Phase 14 — Mobile Video Consultation Screens (8 chunks):
- [x] Chunk 0: Backend GraphQL DTOs + resolver decorators
  - dto/video.input.ts: BookVideoSlotInput, RescheduleVideoBookingInput, SetAvailabilitySlotInput, etc.
  - dto/video.output.ts: All ObjectType classes + Prisma enum registrations
  - video.resolver.ts: Added @Query/@Mutation/@Args/@UseGuards decorators to all 13 methods
  - Fixed onVideoCompleted call signature (videoSessionId, session)
- [x] Chunk 1: Mobile GraphQL operations + types — 14 tests (TDD)
  - mobile/src/graphql/video.ts: 7 operations (2 queries, 5 mutations)
  - TypeScript types: VideoSession, BookedSlot, AvailableSlotsResponse, etc.
  - Status labels: VIDEO_SESSION_STATUS_LABELS, BOOKED_SLOT_STATUS_LABELS
- [x] Chunk 2: 100ms SDK mock + useHMS hook — 10 tests (TDD)
  - src/__mocks__/hms-sdk.js: Manual mock via moduleNameMapper
  - src/hooks/useHMS.ts: join, leave, toggleAudio, toggleVideo, connectionState
  - jest.config.js: Added @100mslive/react-native-hms mapping
- [x] Chunk 3: Video route layout + upcoming sessions — 10 tests (TDD)
  - app/video/_layout.tsx: Slot wrapper
  - app/video/upcoming.tsx: Session list with status badges, Join/Cancel/Reschedule
  - Pull-to-refresh, loading skeleton, empty state, staggered animations
- [x] Chunk 4: Video slot picker — 10 tests (TDD)
  - app/video/slots/[consultationId].tsx: Date tabs, time chips, confirm booking
  - Connectivity warning banner, grouped slots by date
- [x] Chunk 5: Recording consent modal — 9 tests (TDD)
  - src/components/video/RecordingConsentModal.tsx: TPG 2020 consent text, checkbox
  - Triggers giveRecordingConsent mutation
- [x] Chunk 6+7: Video session screen — 11 tests (TDD)
  - app/video/session/[videoSessionId].tsx: Multi-state screen
  - State machine: PRE_CALL → CONSENT → WAITING → IN_CALL → POST_CALL
  - Pre-call: camera preview, audio/video toggles, Join Call
  - In-call: doctor feed, self-view PiP, duration timer, end call
  - Post-call: summary, return home
- [x] Chunk 8: Integration polish — 6 tests (TDD)
  - src/components/video/UpcomingSessionBanner.tsx: Home screen banner
  - docs/BUILD-PLAN.md: Updated with Phases 12-14 completion + Phase 15+ roadmap
  - docs/CHECKPOINT.md: Updated

## Test Counts:
- Backend: 2,327 tests (66 test suites)
- Mobile: 571+ tests (46+ test suites)
- Web: 196 tests (28 test suites)
- **Total: 3,094+ tests**

## Phase 14 New Files:
```
backend/src/video/dto/
  video.input.ts                     (Chunk 0)
  video.output.ts                    (Chunk 0)

mobile/src/graphql/
  video.ts                           (Chunk 1)
  __tests__/video.test.ts            (Chunk 1)

mobile/src/__mocks__/
  hms-sdk.js                         (Chunk 2)

mobile/src/hooks/
  useHMS.ts                          (Chunk 2)
  __tests__/useHMS.test.ts           (Chunk 2)

mobile/app/video/
  _layout.tsx                        (Chunk 3)
  upcoming.tsx                       (Chunk 3)
  __tests__/upcoming.test.tsx        (Chunk 3)
  slots/_layout.tsx                  (Chunk 4)
  slots/[consultationId].tsx         (Chunk 4)
  slots/__tests__/consultationId.test.tsx (Chunk 4)
  session/_layout.tsx                (Chunk 6)
  session/[videoSessionId].tsx       (Chunk 6+7)
  session/__tests__/videoSessionId.test.tsx (Chunk 6+7)

mobile/src/components/video/
  RecordingConsentModal.tsx          (Chunk 5)
  UpcomingSessionBanner.tsx          (Chunk 8)
  index.ts                           (Chunk 5+8)
  __tests__/RecordingConsentModal.test.tsx (Chunk 5)
  __tests__/UpcomingSessionBanner.test.tsx (Chunk 8)
```

## Modified Files:
- `backend/src/video/video.resolver.ts` — Added all GraphQL decorators + fixed onVideoCompleted call
- `backend/src/video/edge-cases.spec.ts` — Updated assertion for corrected call signature
- `mobile/jest.config.js` — Added @100mslive/react-native-hms moduleNameMapper
- `mobile/jest.setup.js` — (Minor cleanup during HMS mock exploration)
- `mobile/src/components/video/index.ts` — Barrel exports
- `docs/BUILD-PLAN.md` — Full update with Phases 1-14 completion + Phase 15+ roadmap

## Key Architecture Decisions:
- **Single session screen with state machine** — PRE_CALL → CONSENT → WAITING → IN_CALL → POST_CALL avoids losing HMS connection on navigation
- **useHMS custom hook** — Wraps @100mslive/react-native-hms SDK so tests mock the hook, not the SDK
- **Manual mock via moduleNameMapper** — Real SDK not installed yet (requires native build), mock used for tests
- **Polling for waiting room** — Apollo pollInterval (3s) on session status; subscriptions deferred
- **Consent before join** — Modal appears on "Join Call" tap; skipped if consent already given

---

## Next Up:
- Phase 15: Production readiness (see BUILD-PLAN.md)
- Install actual @100mslive/react-native-hms package (requires native build setup)
- Set HMS_ACCESS_KEY, HMS_APP_SECRET, HMS_TEMPLATE_ID env vars for real video
- CI/CD pipeline setup
- Sentry error monitoring

## Known Issues:
- Apollo Client 3.14 deprecates `addTypename` prop on MockedProvider (console warnings, non-breaking)
- Redis connection warning logged once on startup if Redis not available (by design)
- schema.gql has uncommitted changes from Phase 13 schema additions
- @100mslive/react-native-hms not actually installed — mock only for tests

*Checkpoint updated per CLAUDE.md context protection rules.*
