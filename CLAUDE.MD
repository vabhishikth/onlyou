# CLAUDE.md — Onlyou Project Instructions

> **CONTEXT RECOVERY:** If you've lost context or are starting fresh, STOP and do this:
> 1. Read this entire CLAUDE.md file
> 2. Read `docs/BUILD-PLAN.md` (if it exists) — it shows what's done and what's next
> 3. Read `docs/CHECKPOINT.md` (if it exists) — it shows the LAST completed task
> 4. Read the relevant spec file for whatever you're working on
> 5. Check git log (`git log --oneline -20`) to see recent work
> 6. Run tests (`pnpm test`) to see what's passing and what's failing
> Then continue from where the checkpoint left off. DO NOT restart from scratch.

---

## ⚠️ CRITICAL RULES (NEVER VIOLATE)

### TDD — Test Driven Development (MANDATORY)

1. **WRITE TESTS FIRST.** Before writing ANY implementation code, write the test that defines what the code should do.
2. **RUN THE TEST.** It MUST fail (red). If it passes before you write implementation, your test is wrong.
3. **WRITE THE MINIMUM CODE** to make the test pass (green).
4. **REFACTOR** if needed, keeping tests green.
5. **Repeat** for every feature, function, endpoint, and edge case.

### 🚫 NEVER MODIFY A TEST TO MAKE IT PASS

**This is the single most important rule in this project.**

- If a test fails, the TEST IS CORRECT. The implementation code is wrong.
- FIX THE IMPLEMENTATION CODE, not the test.
- NEVER change test expectations, assertions, or mock data to match broken code.
- NEVER weaken a test (e.g., removing an assertion, loosening a check, changing expected values).
- NEVER delete a failing test.
- The ONLY time you may modify a test is if I explicitly tell you the test logic itself is wrong.
- If you are stuck and think the test might be wrong, ASK ME. Do not change it silently.

**If I catch you modifying a test to make it pass instead of fixing the code, I will consider the entire task failed.**

### Test Coverage

- Minimum 80% code coverage across the project
- 100% coverage on: auth, payment, prescription, contraindication checks, AI assessment parsing
- Every API endpoint must have tests for: happy path, validation errors, auth failures, edge cases
- Every database model must have tests for: create, read, update, constraints, relationships
- Every status transition must be tested (e.g., ORDERED → SLOT_BOOKED is valid, ORDERED → DELIVERED is not)

---

## 🧠 CONTEXT WINDOW PROTECTION

### Problem
Claude Code agents have limited context windows. Long tasks cause agents to forget specs, rules, and progress. This section prevents that.

### Rule 1: Checkpoint After Every Completed Task

After completing each task (module, feature, or sub-feature), you MUST update `docs/CHECKPOINT.md`:

```markdown
# CHECKPOINT — Last Updated: [date/time]

## Current Phase: [e.g., Phase 1 - Foundation]
## Current Task: [e.g., Auth Module - OTP verification]
## Status: COMPLETE / IN PROGRESS / BLOCKED

## What's Done (checked = complete, unchecked = not started):
- [x] Auth module — OTP generation + verification
- [x] Auth module — JWT access + refresh tokens
- [ ] Auth module — Role-based guards (7 roles)
- [ ] Auth module — Rate limiting
- [ ] User module — not started
- [ ] File upload module — not started

## Last Completed:
- Feature: OTP verification via MSG91
- Files modified: backend/src/auth/auth.service.ts, auth.controller.ts
- Tests: backend/src/auth/auth.service.spec.ts (14 tests, all passing)
- Commit: "feat(auth): add OTP verification with MSG91"

## Next Up:
- Build role-based guards for 7 roles (patient, doctor, admin, lab, phlebotomist, pharmacy, delivery)
- Spec reference: master spec Section 14 (Security), CLAUDE.md Auth Roles

## Known Issues:
- None currently

## Test Status:
- Total tests: 14
- Passing: 14
- Failing: 0
```

### Rule 2: Commit After Every Feature

Do NOT build 10 things and commit once. Commit after EVERY feature:

```
git add -A
git commit -m "feat(auth): add OTP rate limiting — 5 attempts per 15 min"
```

This way, if context is lost, `git log` shows exactly what was done.

### Rule 3: Keep Tasks Small

Each agent task should be completable in ONE context window. Rules:
- One module or sub-feature per agent task
- If a module is too big, split it into sub-tasks
- Maximum: ~500 lines of code + tests per task
- Each task must end with: tests passing + checkpoint updated + committed

**GOOD task size:**
- "Build OTP generation and verification service with tests"
- "Build JWT token creation, validation, and refresh with tests"
- "Build role-based auth guards for 7 roles with tests"

**BAD task size (too big, will lose context):**
- "Build the entire auth module"
- "Build the blood work system"
- "Build the doctor dashboard"

### Rule 4: Agent Handoff Protocol

When one agent finishes and another takes over (or the same agent restarts):

1. Finishing agent updates `docs/CHECKPOINT.md`
2. Finishing agent commits all work with descriptive message
3. Finishing agent runs ALL tests and confirms passing
4. New agent reads: CLAUDE.md → CHECKPOINT.md → relevant spec → git log
5. New agent runs ALL tests to confirm state
6. New agent continues from checkpoint

### Rule 5: Spec References in Code Comments

When implementing a feature from the spec, add a comment pointing back to the spec:

```typescript
// Spec: master spec Section 7.2, Step 4 — Phlebotomist Collects
// Status transitions: PHLEBOTOMIST_ASSIGNED → SAMPLE_COLLECTED or COLLECTION_FAILED
async markSampleCollected(labOrderId: string, tubeCount: number): Promise<LabOrder> {
  // ...
}
```

This way, if context is lost, any agent can read the code comment and find the relevant spec section.

### Rule 6: Recovery Checklist

If you notice you've lost context (you're confused about what to do, you're about to repeat work, or you're unsure about a decision), STOP and follow this checklist:

```
□ Read CLAUDE.md (this file)
□ Read docs/CHECKPOINT.md
□ Read docs/BUILD-PLAN.md
□ Run: git log --oneline -20
□ Run: pnpm test
□ Read the spec section mentioned in CHECKPOINT.md → "Next Up"
□ Continue from where the checkpoint left off
```

NEVER START OVER. Always resume from the checkpoint.

---

## Agent Team Development

When using agent teams to develop features in parallel, follow these rules:

### How to Split Work

Split work by **module/domain**, not by layer. Each agent should own a complete vertical slice:

```
CORRECT (vertical slice per agent):
  Agent 1: Auth module (backend auth + tests + types)
  Agent 2: Questionnaire module (backend + shared types + tests)
  Agent 3: Lab orders module (backend + tests + types)

WRONG (horizontal slice — causes merge conflicts):
  Agent 1: All backend controllers
  Agent 2: All backend services  
  Agent 3: All tests
```

### Agent Rules

1. **Each agent reads CLAUDE.md and the relevant spec section BEFORE starting**
2. **Each agent writes tests FIRST, then implementation**
3. **Agents must not modify files owned by another agent** without coordination
4. **Shared files** (Prisma schema, shared types, GraphQL schema) — only ONE agent modifies at a time
5. **Every agent runs their own tests** before considering work complete
6. **If an agent's code breaks another agent's tests, the agent who broke it fixes their code** (not the test)
7. **Every agent updates CHECKPOINT.md and commits** when done

### Recommended Agent Split for Phase 1 (Foundation)

```
Agent 1: Auth Module
  - OTP generation + verification (MSG91)
  - JWT access + refresh tokens
  - Role-based guards (7 roles)
  - Rate limiting (5 OTP attempts per 15 min)
  - Tests: auth.service.spec.ts, auth.controller.spec.ts, auth.guard.spec.ts
  - Spec: master spec Section 3.1, Section 14

Agent 2: User Module  
  - User model + PatientProfile + DoctorProfile
  - Profile CRUD operations
  - Government ID upload
  - Age validation (≥18)
  - Pincode → city/state auto-fill
  - Tests: user.service.spec.ts, patient-profile.spec.ts, doctor-profile.spec.ts
  - Spec: master spec Section 3.2, Section 13

Agent 3: File Upload Module
  - S3 presigned URL generation
  - Photo quality validation (resolution, blur, brightness)
  - File type restrictions
  - Presigned URL expiry (1 hour)
  - Tests: upload.service.spec.ts, s3.spec.ts
  - Spec: master spec Section 14 (Security — presigned URLs)
```

### Recommended Agent Split for Phase 2 (Core Flow — Hair Loss)

```
Agent 1: Questionnaire Engine
  - Shared engine, skip logic, save/resume
  - Hair loss data file (25 questions)
  - Tests: questionnaire.engine.spec.ts, skip-logic.spec.ts
  - Spec: hair-loss spec Section 3

Agent 2: AI Pre-Assessment
  - Claude API integration, shared pipeline
  - Hair loss prompt, response parser
  - Tests: ai.service.spec.ts, hair-loss-prompt.spec.ts
  - Spec: master spec Section 6, hair-loss spec Section 5

Agent 3: Consultation Lifecycle
  - Consultation model + status machine
  - Case assignment by specialization
  - Photo association
  - Tests: consultation.service.spec.ts, status-machine.spec.ts
  - Spec: master spec Section 3.7
```

### Recommended Agent Split for Phase 3 (Doctor Dashboard)

```
Agent 1: Dashboard Backend APIs
  - Case queue (filterable), case detail, doctor routing
  - Spec: master spec Section 5

Agent 2: Prescription System
  - Model + PDF + templates + contraindication checks
  - Spec: master spec Section 5.4, hair-loss spec Section 6

Agent 3: Messaging
  - Chat per consultation, canned responses, attachments, read receipts
  - Spec: master spec Section 5.5
```

### Recommended Agent Split for Phase 4 (Blood Work & Delivery)

```
Agent 1: Lab Order System
  - LabOrder model (12 statuses, all timestamps)
  - Status transition validation
  - Slot booking (LabSlot model)
  - Phlebotomist assignment
  - Result upload + abnormal flags
  - SLA escalation timers
  - Spec: master spec Section 7

Agent 2: Partner Management
  - PartnerDiagnosticCentre, Phlebotomist, PartnerPharmacy models + CRUD
  - Portal-specific APIs
  - OTP auth for portal users
  - Spec: master spec Section 7.5, Section 13

Agent 3: Order & Delivery System
  - Order model (10 statuses, all timestamps)
  - Delivery OTP generation + validation
  - Pharmacy coordination flow
  - Monthly auto-reorder logic
  - Spec: master spec Section 8
```

---

## Documentation Hierarchy

Read docs in this order before writing any code:

1. **`docs/onlyou-spec-master.md`** — READ FIRST. The single source of truth.
2. **Condition specs** (read the one relevant to current task):
   - `docs/onlyou-spec-hair-loss.md`
   - `docs/onlyou-spec-erectile-dysfunction.md`
   - `docs/onlyou-spec-weight-management.md`
   - `docs/onlyou-spec-pcos.md`
3. **`docs/BUILD-PLAN.md`** — Overall plan and progress tracker
4. **`docs/CHECKPOINT.md`** — Last completed task and what's next
5. **Legacy docs** — Older docs in docs/ folder (specs take priority if conflicts)

## Key Decisions (override any conflicting old docs)

- NO Thyrocare/SRL API — use partner diagnostic centre with portal (lab.onlyou.life)
- NO Shiprocket/Delhivery — local delivery with OTP verification
- NO WhatsApp-based coordination — everything through portals/dashboards
- ALL dashboards are mobile-first (design for 375px width first, then scale up)
- Patient app is React Native Expo (native), NOT a web app
- All portals are PWA-installable Next.js routes with subdomain routing
- One Next.js codebase serves all portals via middleware subdomain detection

## Tech Stack

- Backend: NestJS + TypeScript + GraphQL + Prisma + PostgreSQL + Redis
- Mobile: React Native Expo (patient app — App Store + Play Store)
- Web: Next.js 14 + Tailwind + shadcn/ui (all portals via subdomain)
- Payments: Razorpay
- Storage: AWS S3 ap-south-1 (Mumbai)
- AI: Claude API (pre-assessment per condition)
- Notifications: Firebase FCM + MSG91 (WhatsApp/SMS) + Email
- Testing: Jest + Supertest (backend), React Testing Library (web)

## Domains

- `onlyou.life` — primary brand / landing page
- `doctor.onlyou.life` — doctor dashboard
- `admin.onlyou.life` — coordinator dashboard
- `lab.onlyou.life` — diagnostic centre portal
- `collect.onlyou.life` — phlebotomist portal
- `pharmacy.onlyou.life` — pharmacy partner portal
- `onlyou.co.in` — redirects to onlyou.life (used for regulatory/email)

## Auth Roles (7 total)

patient, doctor, admin, lab, phlebotomist, pharmacy, delivery

## Build Order

Follow Phase 1-10 in master spec Section 15. Hair Loss vertical ALWAYS first.

## Code Standards

- TypeScript strict mode everywhere
- All business logic lives in backend (mobile/web are thin clients)
- Every status change MUST log a timestamp
- Every portal action MUST be audit-logged
- GraphQL for all API communication
- Prisma for all database access
- Follow the exact data models defined in the spec files
- Meaningful commit messages: "feat(auth): add OTP rate limiting"
- No console.log in production code — use proper NestJS Logger
- All financial amounts stored in paise (integer), never rupees (float)

## Important Patterns

- Questionnaire engine is SHARED — condition-specific data files feed into it
- AI prompts are condition-specific but the pipeline is shared
- Prescription templates are condition-specific but the builder UI is shared
- Doctor dashboard adapts its center panel based on condition type
- Patient app tracking screen shows SAME statuses as internal systems
- Status transitions must be validated (not every status can move to every other status)
- Add spec reference comments in code: `// Spec: master spec Section 7.2, Step 4`