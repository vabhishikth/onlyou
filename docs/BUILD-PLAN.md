# ONLYOU BUILD PLAN
## Comprehensive Analysis & Implementation Roadmap

**Created:** 2026-02-12
**Last Updated:** 2026-02-12
**Based on:** New specs (v3) vs. existing codebase analysis

---

# A. WHAT'S ALREADY BUILT

## 1. Authentication System - WORKING ✅
| Component | Status | Notes |
|-----------|--------|-------|
| Phone OTP auth | Working | MSG91 integration, 6-digit OTP |
| JWT tokens | Working | 1hr access, 30-day refresh, stored in DB |
| Token refresh | Working | Automatic refresh flow |
| Logout (single/all) | Working | Clears refresh tokens |
| Auto-create PatientProfile | Working | Created on first login |

**Files:** `backend/src/auth/*`, `mobile/app/(auth)/*`
**Tests:** ❌ NONE — needs TDD coverage

## 2. User Profile Management - WORKING ✅
| Component | Status | Notes |
|-----------|--------|-------|
| Get profile | Working | Returns User + PatientProfile |
| Update profile | Working | Name, email, DOB, gender, height, weight, address |
| Profile completion check | Working | Requires name, gender, address |

**Files:** `backend/src/user/*`, `mobile/app/(auth)/create-profile.tsx`
**Tests:** ❌ NONE — needs TDD coverage

## 3. Questionnaire/Intake System - WORKING ✅
| Component | Status | Notes |
|-----------|--------|-------|
| Get available verticals | Working | Returns 4 treatment cards with pricing |
| Get questionnaire template | Working | Returns schema with sections/questions |
| Save draft | Working | Resumable intake progress |
| Submit intake | Working | Creates Consultation with PENDING_ASSESSMENT |
| Get my intakes | Working | Lists all user intakes |

**Seeded Questionnaires (OUTDATED per new specs):**
| Vertical | Current | Spec Requires | Gap |
|----------|---------|---------------|-----|
| Hair Loss | 14 questions | 25 questions | +11 |
| Sexual Health | 8 questions | 28 questions (as ED) | +20 |
| PCOS | 8 questions | 32 questions | +24 |
| Weight Management | 15 questions | 30 questions | +15 |

**Files:** `backend/src/intake/*`, `backend/prisma/seed.ts`
**Tests:** ❌ NONE — needs TDD coverage

## 4. Photo Upload System - WORKING ✅
| Component | Status | Notes |
|-----------|--------|-------|
| Presigned S3 URLs | Working | 15-min expiry, direct upload to S3 |
| S3 configuration | Working | ap-south-1, bucket=onlyou-uploads |
| PatientPhoto model | Working | Stores type, url, thumbnailUrl |

**Files:** `backend/src/upload/*`
**Tests:** ❌ NONE — needs TDD coverage

## 5. Mobile App - PARTIALLY WORKING
| Screen | Status | Notes |
|--------|--------|-------|
| Welcome | Working | Hero screen |
| Phone input | Working | +91 validation |
| OTP verification | Working | 6-digit, auto-submit |
| Create profile | Working | Name, email, gender collection |
| Home tab | Working | 4 treatment cards |
| Consult tab | Stub | Placeholder only |
| Orders tab | Stub | Placeholder only |
| Profile tab | Stub | Placeholder only |
| Intake flow | Working | Intro → Questions → Photos → Review → Complete |

**Files:** `mobile/app/**/*`

## 6. Web App - STUB ONLY
| Component | Status | Notes |
|-----------|--------|-------|
| Landing page | Stub | Just "Welcome to Onlyou" placeholder |
| Doctor dashboard | Not started | - |
| Admin dashboard | Not started | - |
| All other portals | Not started | - |

**Files:** `web/src/app/*`

## 7. Database Schema - PARTIAL
| Model | Status | Implementation |
|-------|--------|----------------|
| User | Working | Core auth model |
| PatientProfile | Working | Patient data |
| DoctorProfile | Schema only | No service/resolver |
| StaffProfile | Schema only | No service/resolver |
| RefreshToken | Working | Session management |
| QuestionnaireTemplate | Working | Seeded with 4 verticals |
| IntakeResponse | Working | Draft + submission |
| PatientPhoto | Working | S3 URL references |
| Consultation | Partial | Created on submit, no doctor review |
| AIPreAssessment | Schema only | No Claude integration |
| Prescription | Schema only | No implementation |
| Order | Schema only | No implementation |
| Subscription | Schema only | No implementation |
| Payment | Schema only | No implementation |
| Message | Schema only | No implementation |
| AuditLog | Schema only | No implementation |
| FollowUp | Schema only | No implementation |

**Missing models (per new spec):**
- PartnerDiagnosticCentre
- Phlebotomist
- PartnerPharmacy
- PartnerClinic
- LabOrder
- LabSlot
- Wallet
- WalletTransaction
- Referral

---

# B. WHAT NEEDS TO CHANGE

## 1. Database Schema Changes Required

### UserRole Enum (Current: 5, Needed: 7)
```diff
enum UserRole {
  PATIENT
  DOCTOR
- NURSE
- PHARMACIST
+ ADMIN        // Coordinator role
+ LAB          // Diagnostic centre staff
+ PHLEBOTOMIST // Sample collectors
+ PHARMACY     // Pharmacy partners
+ DELIVERY     // Delivery personnel
  ADMIN
}
```

### HealthVertical Enum
```diff
enum HealthVertical {
  HAIR_LOSS
- SEXUAL_HEALTH
+ ERECTILE_DYSFUNCTION
  PCOS
  WEIGHT_MANAGEMENT
}
```

### ConsultationStatus Enum
```diff
enum ConsultationStatus {
  PENDING_ASSESSMENT
- AI_REVIEWED
- DOCTOR_REVIEWING
+ PENDING_AI_REVIEW
+ PENDING_DOCTOR_REVIEW
+ IN_REVIEW
+ AWAITING_RESPONSE
+ LAB_RESULTS_READY
+ FOLLOW_UP
  APPROVED
  NEEDS_INFO
- REJECTED
+ REFERRED
  COMPLETED
}
```

### New Enums Required
```prisma
enum LabOrderStatus {
  ORDERED
  SLOT_BOOKED
  PHLEBOTOMIST_ASSIGNED
  SAMPLE_COLLECTED
  COLLECTION_FAILED
  DELIVERED_TO_LAB
  SAMPLE_RECEIVED
  SAMPLE_ISSUE
  PROCESSING
  RESULTS_READY
  DOCTOR_REVIEWED
  RESULTS_UPLOADED
  CLOSED
  CANCELLED
  EXPIRED
}

enum OrderStatus {
  PRESCRIPTION_CREATED
  SENT_TO_PHARMACY
  PHARMACY_PREPARING
  PHARMACY_READY
  PHARMACY_ISSUE
  PICKUP_ARRANGED
  OUT_FOR_DELIVERY
  DELIVERED
  DELIVERY_FAILED
  RESCHEDULED
  RETURNED
  CANCELLED
}

enum DeliveryMethod {
  RAPIDO
  DUNZO
  OWN_DELIVERY
  PORTER
  OTHER
}
```

### New Models Required
Per master spec Section 13:
- `PartnerDiagnosticCentre` - Lab partners
- `Phlebotomist` - Sample collectors
- `PartnerPharmacy` - Pharmacy partners
- `PartnerClinic` - Referral partners
- `LabOrder` - Blood work lifecycle (12+ statuses, all timestamps)
- `LabSlot` - Booking slots for sample collection
- `Wallet` - Patient wallet balance
- `WalletTransaction` - Wallet history
- `Referral` - Referral tracking

### Order Model Changes
Add: pharmacy tracking, delivery OTP, local delivery fields, all timestamps

## 2. Legacy Code to Remove
- `shiprocketOrderId` field in Order model → replace with local delivery
- `SEXUAL_HEALTH` enum → `ERECTILE_DYSFUNCTION`
- `NURSE` role → `ADMIN`
- `PHARMACIST` role → split into `PHARMACY` and `DELIVERY`

## 3. Questionnaire Updates Required
- Hair Loss: 14 → 25 questions (add lifestyle, planning children, etc.)
- Sexual Health → ED: 8 → 28 questions (COMPLETE REWRITE with IIEF-5)
- PCOS: 8 → 32 questions (Rotterdam criteria, fertility intent)
- Weight Management: 15 → 30 questions (body measurements, metabolic screening)

---

# C. WHAT'S MISSING

## Phase 1: Foundation (Weeks 1-3) - PARTIALLY COMPLETE
| Item | Status | Work Remaining |
|------|--------|----------------|
| Auth (OTP + JWT) | Done | Add 7 roles, add tests |
| Role-based guards | Partial | Full 7-role RBAC with tests |
| User profiles (all types) | Partial | Doctor, Staff, Phlebotomist, Lab, Pharmacy profiles |
| S3 file upload | Done | Add tests |

## Phase 2: Core - Hair Loss (Weeks 3-8) - PARTIALLY COMPLETE
| Item | Status | Work Remaining |
|------|--------|----------------|
| Questionnaire engine | Done | Update Hair Loss to 25 questions |
| AI module | Not started | Claude API, per-condition prompts |
| Consultation lifecycle | Partial | Full status machine, assignment |
| Photo module | Done | Add tests |

## Phase 3: Doctor Dashboard (Weeks 8-11) - NOT STARTED
- Case queue (filterable list with status badges)
- Case review panel (condition-aware center panel)
- Prescription builder (templates per condition, PDF generation)
- Messaging (threaded chat per consultation)

## Phase 4: Blood Work & Referral (Weeks 11-14) - NOT STARTED
- Partner management (CRUD for clinics, labs, phlebotomists, pharmacies)
- Referral system (decision tree, partner clinic booking)
- Blood work portal (orders, slots, phlebotomist portal, lab portal)
- Wallet/Refunds (balance tracking, refund processing)

## Phase 5: Delivery & Payment (Weeks 14-16) - NOT STARTED
- Razorpay integration (payments + subscriptions)
- Delivery system (pharmacy portal, OTP delivery, tracking)
- Admin dashboard (unified lab + delivery views)

## Phase 6: Patient Tracking (Weeks 16-17) - NOT STARTED
- Activity tab (unified tracking screen)
- Blood work stepper (patient-facing status view)
- Delivery stepper (patient-facing status view)
- Results viewer (simplified summary + PDF)
- Cancel/reschedule flows (patient actions)

## Phase 7-9: Additional Conditions (Weeks 17-23) - NOT STARTED
- ED: Complete questionnaire rewrite (28 questions), no photos
- Weight Management: Questionnaire expansion (30 questions), 2 photos
- PCOS: Questionnaire expansion (32 questions), optional photos

## Phase 10: Polish (Weeks 23-25) - NOT STARTED
- Notification system (FCM, MSG91 WhatsApp/SMS, Email)
- SLA escalation engine (automatic alerts for overdue items)
- Landing page (marketing site)
- Discreet notification mode (privacy option)

---

# D. AGENT TEAM ASSIGNMENTS

> **TDD RULE:** Every agent writes tests FIRST, then implementation.
> **NEVER MODIFY A TEST TO MAKE IT PASS** — fix the code instead.
> Each agent must read CLAUDE.md + relevant spec sections before starting.

## Phase 1: Foundation — 3 Agents in Parallel

### Agent 1: Auth Module
**Scope:** Complete auth system with TDD
**Tasks:**
1. Write tests for OTP generation + verification (MSG91)
2. Write tests for JWT access + refresh tokens
3. Write tests for role-based guards (7 roles)
4. Write tests for rate limiting (5 OTP attempts per 15 min)
5. Update schema to 7 roles
6. Implement to pass all tests

**Files to create/modify:**
- `backend/src/auth/auth.service.spec.ts`
- `backend/src/auth/auth.resolver.spec.ts`
- `backend/src/auth/guards/roles.guard.spec.ts`
- `backend/prisma/schema.prisma` (UserRole enum)

**Spec references:**
- Master spec Section 3.1, Section 14

**Exit criteria:**
- All tests passing
- 7 roles working (patient, doctor, admin, lab, phlebotomist, pharmacy, delivery)
- Rate limiting enforced

---

### Agent 2: User Module
**Scope:** All profile types with TDD
**Tasks:**
1. Write tests for PatientProfile CRUD
2. Write tests for DoctorProfile CRUD + NMC validation
3. Write tests for partner profiles (Lab, Phlebotomist, Pharmacy)
4. Write tests for age validation (≥18)
5. Write tests for pincode → city/state auto-fill
6. Add new profile models to schema
7. Implement to pass all tests

**Files to create/modify:**
- `backend/src/user/user.service.spec.ts`
- `backend/src/user/patient-profile.spec.ts`
- `backend/src/user/doctor-profile.spec.ts`
- `backend/src/user/partner-profiles.spec.ts`
- `backend/prisma/schema.prisma` (new profile models)

**Spec references:**
- Master spec Section 3.2, Section 13

**Exit criteria:**
- All tests passing
- All profile types working
- Age validation enforced

---

### Agent 3: File Upload Module
**Scope:** S3 uploads with TDD
**Tasks:**
1. Write tests for presigned URL generation
2. Write tests for photo quality validation (resolution, blur, brightness)
3. Write tests for file type restrictions
4. Write tests for presigned URL expiry (1 hour)
5. Implement to pass all tests

**Files to create/modify:**
- `backend/src/upload/upload.service.spec.ts`
- `backend/src/upload/s3.spec.ts`
- `backend/src/upload/validation.spec.ts`

**Spec references:**
- Master spec Section 14 (Security — presigned URLs)

**Exit criteria:**
- All tests passing
- Photo quality validation working
- Presigned URLs expiring correctly

---

## Phase 2: Core Flow (Hair Loss) — 3 Agents in Parallel

### Agent 4: Questionnaire Engine
**Scope:** Shared engine + Hair Loss data
**Tasks:**
1. Write tests for questionnaire engine (skip logic, save/resume)
2. Write tests for Hair Loss specific validation (25 questions)
3. Update Hair Loss questionnaire data to match spec
4. Implement to pass all tests

**Files to create/modify:**
- `backend/src/questionnaire/questionnaire.engine.spec.ts`
- `backend/src/questionnaire/skip-logic.spec.ts`
- `backend/src/questionnaire/hair-loss.data.ts`
- `backend/prisma/seed.ts` (update Hair Loss questionnaire)

**Spec references:**
- Hair-loss spec Section 3 (25 questions)

**Exit criteria:**
- All tests passing
- Skip logic working per spec
- 25 questions matching spec exactly

---

### Agent 5: AI Pre-Assessment
**Scope:** Claude API integration
**Tasks:**
1. Write tests for Claude API integration
2. Write tests for Hair Loss prompt + response parsing
3. Write tests for classification categories (9 types per spec)
4. Write tests for red flag detection
5. Write tests for contraindication matrix
6. Implement to pass all tests

**Files to create/modify:**
- `backend/src/ai/ai.service.spec.ts`
- `backend/src/ai/hair-loss-prompt.spec.ts`
- `backend/src/ai/classification.spec.ts`
- `backend/src/ai/contraindications.spec.ts`

**Spec references:**
- Master spec Section 6
- Hair-loss spec Section 5

**Exit criteria:**
- All tests passing
- Claude API integration working
- All 9 classification categories implemented
- Red flags detected correctly

---

### Agent 6: Consultation Lifecycle
**Scope:** Status machine + assignment
**Tasks:**
1. Write tests for consultation status machine (valid transitions only)
2. Write tests for case assignment by specialization
3. Write tests for photo association
4. Write tests for status change timestamp logging
5. Update ConsultationStatus enum in schema
6. Implement to pass all tests

**Files to create/modify:**
- `backend/src/consultation/consultation.service.spec.ts`
- `backend/src/consultation/status-machine.spec.ts`
- `backend/src/consultation/assignment.spec.ts`
- `backend/prisma/schema.prisma` (ConsultationStatus enum)

**Spec references:**
- Master spec Section 3.7

**Exit criteria:**
- All tests passing
- Invalid status transitions rejected
- All timestamps logged

---

## Phase 3: Doctor Dashboard — 3 Agents in Parallel

### Agent 7: Dashboard Backend APIs
**Scope:** Case queue + case detail + doctor routing
**Tasks:**
1. Write tests for case queue (filterable by condition, status)
2. Write tests for case detail (full patient + intake + photos)
3. Write tests for doctor routing by specialization
4. Write tests for status updates from doctor
5. Implement to pass all tests

**Files to create/modify:**
- `backend/src/doctor/doctor.service.spec.ts`
- `backend/src/doctor/case-queue.spec.ts`
- `backend/src/doctor/case-detail.spec.ts`

**Spec references:**
- Master spec Section 5

**Exit criteria:**
- All tests passing
- Filterable case queue working
- Doctor can update case status

---

### Agent 8: Prescription System
**Scope:** Model + PDF + templates + contraindication checks
**Tasks:**
1. Write tests for prescription model
2. Write tests for PDF generation
3. Write tests for Hair Loss templates (6 templates per spec)
4. Write tests for contraindication checks (finasteride matrix)
5. Implement to pass all tests

**Files to create/modify:**
- `backend/src/prescription/prescription.service.spec.ts`
- `backend/src/prescription/pdf.spec.ts`
- `backend/src/prescription/templates.spec.ts`
- `backend/src/prescription/contraindications.spec.ts`

**Spec references:**
- Master spec Section 5.4
- Hair-loss spec Section 6

**Exit criteria:**
- All tests passing
- PDF generation working
- Contraindications blocking correctly

---

### Agent 9: Messaging System
**Scope:** Chat per consultation
**Tasks:**
1. Write tests for message sending/receiving
2. Write tests for canned responses (Hair Loss specific)
3. Write tests for attachments (photos, PDFs)
4. Write tests for read receipts
5. Implement to pass all tests

**Files to create/modify:**
- `backend/src/messaging/messaging.service.spec.ts`
- `backend/src/messaging/canned-responses.spec.ts`
- `backend/src/messaging/attachments.spec.ts`

**Spec references:**
- Master spec Section 5.5

**Exit criteria:**
- All tests passing
- Threaded chat working
- Attachments uploading correctly

---

## Phase 4: Blood Work & Delivery — 3 Agents in Parallel

### Agent 10: Lab Order System
**Scope:** LabOrder model (15 statuses, all timestamps)
**Tasks:**
1. Write tests for LabOrder status transitions
2. Write tests for slot booking (LabSlot model)
3. Write tests for phlebotomist assignment
4. Write tests for result upload + abnormal flags
5. Write tests for SLA escalation timers
6. Add LabOrder, LabSlot models to schema
7. Implement to pass all tests

**Files to create/modify:**
- `backend/src/lab-orders/lab-order.service.spec.ts`
- `backend/src/lab-orders/status-machine.spec.ts`
- `backend/src/lab-orders/slot-booking.spec.ts`
- `backend/src/lab-orders/sla.spec.ts`
- `backend/prisma/schema.prisma` (LabOrder, LabSlot, LabOrderStatus)

**Spec references:**
- Master spec Section 7

**Exit criteria:**
- All tests passing
- All 15 statuses working
- SLA timers triggering correctly

---

### Agent 11: Partner Management
**Scope:** PartnerDiagnosticCentre, Phlebotomist, PartnerPharmacy models + CRUD
**Tasks:**
1. Write tests for PartnerDiagnosticCentre CRUD
2. Write tests for Phlebotomist CRUD + assignment logic
3. Write tests for PartnerPharmacy CRUD
4. Write tests for OTP auth for portal users
5. Add partner models to schema
6. Implement to pass all tests

**Files to create/modify:**
- `backend/src/partners/partner.service.spec.ts`
- `backend/src/partners/diagnostic-centre.spec.ts`
- `backend/src/partners/phlebotomist.spec.ts`
- `backend/src/partners/pharmacy.spec.ts`
- `backend/prisma/schema.prisma` (partner models)

**Spec references:**
- Master spec Section 7.5, Section 13

**Exit criteria:**
- All tests passing
- All partner types working
- Portal auth working

---

### Agent 12: Order & Delivery System
**Scope:** Order model (12 statuses, all timestamps)
**Tasks:**
1. Write tests for Order status transitions
2. Write tests for delivery OTP generation + validation
3. Write tests for pharmacy coordination flow
4. Write tests for monthly auto-reorder logic
5. Update Order model in schema
6. Implement to pass all tests

**Files to create/modify:**
- `backend/src/orders/order.service.spec.ts`
- `backend/src/orders/status-machine.spec.ts`
- `backend/src/orders/delivery-otp.spec.ts`
- `backend/src/orders/reorder.spec.ts`
- `backend/prisma/schema.prisma` (Order model, OrderStatus, DeliveryMethod)

**Spec references:**
- Master spec Section 8

**Exit criteria:**
- All tests passing
- Delivery OTP working
- Auto-reorder triggering correctly

---

# E. QUESTIONS FOR USER

## Critical Decisions Needed

### 1. Vertical Priority Confirmation
The spec says "Hair Loss first, then ED, Weight, PCOS." Should I:
- a) Focus 100% on Hair Loss until fully complete? **(Recommended)**
- b) Build shared infrastructure that supports all verticals in parallel?

### 2. Testing Approach
CLAUDE.md says TDD mandatory. Confirming:
- a) Write tests first for all new code? **(Required per CLAUDE.md)**
- b) Build first, add tests later?
- c) Tests only for critical paths?

### 3. Doctor Onboarding
How will doctors be added to the system?
- a) Admin creates doctor accounts manually? **(Recommended for MVP)**
- b) Doctors self-register with NMC verification?
- c) Both options?

### 4. Current Questionnaire Data
There are likely existing IntakeResponses in the database with the old questionnaire format. Should I:
- a) Create a new questionnaire version (version 2) and keep old data?
- b) Migrate existing data to new format?
- c) Clear existing test data and start fresh? **(Recommended for dev)**

### 5. Partner Data
Do you have existing partner information (diagnostic centres, pharmacies, phlebotomists) to seed, or should I create placeholder/demo data? **(Recommend demo data)**

### 6. Deployment Strategy
The specs mention subdomains (doctor.onlyou.life, admin.onlyou.life, etc.)
Do you have these set up, or should I first build with localhost routing? **(Recommend localhost first)**

### 7. AI Integration Timeline
Should Claude AI pre-assessment be:
- a) Built in Phase 2 (with Hair Loss)?
- b) Deferred until doctor dashboard is working manually? **(Recommended)**

### 8. Payment Integration Timeline
Should Razorpay be:
- a) Integrated early (before doctor dashboard)?
- b) After core clinical flow is complete? **(Recommended)**

---

# F. SUMMARY

## What's Working Well ✅
- Authentication is solid and production-ready
- Intake flow is complete for basic use case
- Photo upload to S3 works end-to-end
- Mobile app navigation is smooth

## Critical Gaps ⚠️
1. **NO TESTS** — Zero test files exist, violates TDD requirement
2. **Doctor Dashboard** — No way for doctors to review consultations
3. **Blood Work System** — Entire portal-based flow missing
4. **Delivery System** — No pharmacy portal, no OTP delivery
5. **Questionnaires** — Need significant expansion per new specs
6. **Database Schema** — Missing many models (5 roles → 7, LabOrder, partners, etc.)

## Recommended First Actions (Upon Approval)
1. Deploy 3 agents in parallel for Phase 1 (Auth, User, Upload)
2. Each agent writes tests FIRST, then implements
3. Schema updates happen across agents (coordinate on shared schema.prisma)
4. After Phase 1 complete (~1 week), proceed to Phase 2 (Questionnaire, AI, Consultation)

---

*This plan follows TDD principles from CLAUDE.md. Ready to begin upon user approval and answers to questions above.*
