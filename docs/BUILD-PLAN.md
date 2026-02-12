# ONLYOU BUILD PLAN
## Comprehensive Analysis & Implementation Roadmap

**Created:** 2026-02-12
**Based on:** New specs (v3) vs. existing codebase analysis

---

# A. WHAT'S ALREADY BUILT

## 1. Authentication System - WORKING
| Component | Status | Notes |
|-----------|--------|-------|
| Phone OTP auth | Working | MSG91 integration, 6-digit OTP, rate limiting |
| JWT tokens | Working | 1hr access, 30-day refresh, stored in DB |
| Token refresh | Working | Automatic refresh flow |
| Logout (single/all) | Working | Clears refresh tokens |
| Auto-create PatientProfile | Working | Created on first login |

**Files:** `backend/src/auth/*`, `mobile/app/(auth)/*`

## 2. User Profile Management - WORKING
| Component | Status | Notes |
|-----------|--------|-------|
| Get profile | Working | Returns User + PatientProfile |
| Update profile | Working | Name, email, DOB, gender, height, weight, address |
| Profile completion check | Working | Requires name, gender, address |

**Files:** `backend/src/user/*`, `mobile/app/(auth)/create-profile.tsx`

## 3. Questionnaire/Intake System - WORKING
| Component | Status | Notes |
|-----------|--------|-------|
| Get available verticals | Working | Returns 4 treatment cards with pricing |
| Get questionnaire template | Working | Returns schema with sections/questions |
| Save draft | Working | Resumable intake progress |
| Submit intake | Working | Creates Consultation with PENDING_ASSESSMENT |
| Get my intakes | Working | Lists all user intakes |

**Seeded Questionnaires:**
- Hair Loss: 4 sections, 14 questions, 4 photo requirements
- Sexual Health: 3 sections, 8 questions, no photos
- PCOS: 3 sections, 8 questions, no photos
- Weight Management: 3 sections, 15 questions, no photos

**Files:** `backend/src/intake/*`, `backend/prisma/seed.ts`

## 4. Photo Upload System - WORKING
| Component | Status | Notes |
|-----------|--------|-------|
| Presigned S3 URLs | Working | 15-min expiry, direct upload to S3 |
| S3 configuration | Working | ap-south-1, bucket=onlyou-uploads |
| PatientPhoto model | Working | Stores type, url, thumbnailUrl |

**Files:** `backend/src/upload/*`

## 5. Mobile App - PARTIALLY WORKING
| Screen | Status | Notes |
|--------|--------|-------|
| Welcome | Working | Hero screen |
| Phone input | Working | +91 validation |
| OTP verification | Working | 6-digit, auto-submit, dev hint |
| Create profile | Working | Name, email, gender collection |
| Home tab | Working | 4 treatment cards, quick actions |
| Consult tab | Stub | Placeholder only |
| Orders tab | Stub | Placeholder only |
| Profile tab | Stub | Placeholder only |
| Intake intro | Working | Per-vertical intro screen |
| Intake questions | Working | One question per screen, auto-save |
| Intake photos | Working | Camera/library, S3 upload |
| Intake review | Working | Summary + submit |
| Intake complete | Working | Success screen |

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
| Model | Status | Notes |
|-------|--------|-------|
| User | Working | Core auth model |
| PatientProfile | Working | Patient data |
| DoctorProfile | Schema only | No implementation |
| StaffProfile | Schema only | No implementation |
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

---

# B. WHAT NEEDS TO CHANGE

## Critical Conflicts with New Specs

### 1. Database Schema Changes Required

**New roles needed (current: 5 roles, needed: 7):**
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

**New models needed (per master spec Section 13):**
- `PartnerDiagnosticCentre` - Lab partners
- `Phlebotomist` - Sample collectors
- `PartnerPharmacy` - Pharmacy partners (NEW in v3)
- `LabOrder` - Blood work lifecycle with full timestamp tracking
- `LabSlot` - Booking slots for sample collection
- `PartnerClinic` - Referral partners
- `Referral` - Referral tracking
- `Wallet` - Patient wallet balance
- `WalletTransaction` - Wallet history

**LabOrder model (critical - per Section 7.5):**
```prisma
model LabOrder {
  id                String   @id @default(cuid())
  patientId         String
  consultationId    String
  doctorId          String
  testPanel         String[]
  panelName         String?
  doctorNotes       String?
  bookedDate        DateTime?
  bookedTimeSlot    String?
  collectionAddress String
  collectionCity    String
  collectionPincode String
  phlebotomistId    String?
  diagnosticCentreId String?
  status            LabOrderStatus

  // ALL timestamps required
  orderedAt         DateTime
  slotBookedAt      DateTime?
  phlebotomistAssignedAt DateTime?
  sampleCollectedAt DateTime?
  collectionFailedAt DateTime?
  collectionFailedReason String?
  deliveredToLabAt  DateTime?
  sampleReceivedAt  DateTime?
  sampleIssueAt     DateTime?
  sampleIssueReason String?
  processingStartedAt DateTime?
  resultsUploadedAt DateTime?
  doctorReviewedAt  DateTime?
  closedAt          DateTime?

  // Results
  resultFileUrl     String?
  abnormalFlags     Json?
  criticalValues    Boolean @default(false)
  patientUploadedResults Boolean @default(false)
  patientUploadedFileUrl String?

  // Financials
  labCost           Int
  patientCharge     Int
  coveredBySubscription Boolean @default(false)
}
```

**Order model changes (per Section 8.4):**
```diff
model Order {
  // ... existing fields ...

+ // Pharmacy tracking
+ pharmacyPartnerId  String?
+ pharmacyPartnerName String?
+ pharmacyAddress    String?

+ // Delivery tracking with OTP
+ deliveryMethod     DeliveryMethod // RAPIDO, DUNZO, OWN_DELIVERY, PORTER, OTHER
+ deliveryPersonName String?
+ deliveryPersonPhone String?
+ deliveryOTP        String?        // 4-digit code for delivery confirmation
+ deliveryOTPVerified Boolean @default(false)
+ estimatedDeliveryTime DateTime?

+ // Additional timestamps
+ sentToPharmacyAt   DateTime?
+ pharmacyPreparingAt DateTime?
+ pharmacyReadyAt    DateTime?
+ pickupArrangedAt   DateTime?
+ outForDeliveryAt   DateTime?
+ deliveryFailedAt   DateTime?
+ deliveryFailedReason String?
+ pharmacyIssueAt    DateTime?
+ pharmacyIssueReason String?
+ deliveryRating     Int?
}
```

### 2. Treatment Categories Enum Update
```diff
enum HealthVertical {
  HAIR_LOSS
- SEXUAL_HEALTH
+ ERECTILE_DYSFUNCTION  // More specific per new specs
  PCOS
  WEIGHT_MANAGEMENT
}
```

### 3. Consultation Status Enum Update
```diff
enum ConsultationStatus {
  PENDING_ASSESSMENT
- AI_REVIEWED
- DOCTOR_REVIEWING
+ PENDING_AI_REVIEW      // Waiting for Claude analysis
+ PENDING_DOCTOR_REVIEW  // AI done, doctor to review
+ IN_REVIEW              // Doctor actively reviewing
+ AWAITING_RESPONSE      // Doctor requested more info
+ LAB_RESULTS_READY      // Blood work results in
+ FOLLOW_UP              // Follow-up consultation
  APPROVED
  NEEDS_INFO
- REJECTED
+ REFERRED               // Referred to specialist
  COMPLETED
}
```

### 4. Questionnaire Updates Required

**Hair Loss:** Current has 14 questions, spec has 25 questions
- Missing: Q9 (confidence impact), Q14 (sexual symptoms), Q15 (planning children), Q16 (blood work history), Q19 (treatment side effects), Q21-25 (lifestyle)

**Sexual Health → Erectile Dysfunction:** Current has 8 questions, spec has 28 questions
- Major overhaul needed: IIEF-5 assessment (5 questions), cardiovascular screening (7 questions), lifestyle (5 questions)
- This is a COMPLETE REWRITE of the questionnaire

**PCOS:** Current has 8 questions, spec has 32 questions
- Missing: Menstrual cycle details (6 questions), hyperandrogenism symptoms (5 questions), fertility intent (3 questions)

**Weight Management:** Current has 15 questions, spec has 30 questions
- Missing: Body measurements (4 questions), weight history (4 questions), treatment history (4 questions), motivation (3 questions)

### 5. Legacy Code to REMOVE

**References to remove:**
- Any Shiprocket/Delhivery API code (none exists yet - good)
- Any Thyrocare/SRL API code (none exists yet - good)
- `shiprocketOrderId` field in Order model - replace with local delivery tracking

**Terminology updates:**
- `SEXUAL_HEALTH` → `ERECTILE_DYSFUNCTION`
- `NURSE` role → `ADMIN` (coordinator)
- `PHARMACIST` role → split into `PHARMACY` and `DELIVERY`

### 6. Domain Strategy Implementation

**Current:** No subdomain routing
**Required:** Middleware to route based on subdomain:
- `doctor.onlyou.life` → Doctor dashboard
- `admin.onlyou.life` → Coordinator dashboard
- `lab.onlyou.life` → Diagnostic centre portal
- `collect.onlyou.life` → Phlebotomist portal
- `pharmacy.onlyou.life` → Pharmacy portal

---

# C. WHAT'S MISSING

## Phase 1: Foundation (Weeks 1-3) - PARTIALLY COMPLETE

| Item | Status | Work Remaining |
|------|--------|----------------|
| Auth (OTP + JWT) | Done | Add 7 roles (currently 5) |
| User profiles (all types) | Partial | Add Doctor, Staff, Phlebotomist, Lab, Pharmacy profiles |
| S3 file upload | Done | - |

## Phase 2: Core - Hair Loss (Weeks 3-8) - PARTIALLY COMPLETE

| Item | Status | Work Remaining |
|------|--------|----------------|
| Questionnaire engine | Done | Update Hair Loss to 25 questions per spec |
| AI module | Not started | Claude API integration, per-condition prompts |
| Consultation lifecycle | Partial | Full status flow, assignment logic |
| Photo module | Done | - |

## Phase 3: Doctor Dashboard (Weeks 8-11) - NOT STARTED

| Item | Status | Work Remaining |
|------|--------|----------------|
| Case queue | Not started | Filterable list with status badges |
| Case review panel | Not started | Condition-aware center panel |
| Prescription builder | Not started | Templates per condition, PDF generation |
| Messaging | Not started | Threaded chat per consultation |

## Phase 4: Blood Work & Referral (Weeks 11-14) - NOT STARTED

| Item | Status | Work Remaining |
|------|--------|----------------|
| Partner management | Not started | CRUD for clinics, labs, phlebotomists, pharmacies |
| Referral system | Not started | Decision tree, partner clinic booking |
| Blood work portal | Not started | Orders, slots, phlebotomist portal, lab portal |
| Wallet/Refunds | Not started | Balance tracking, refund processing |

## Phase 5: Delivery & Payment (Weeks 14-16) - NOT STARTED

| Item | Status | Work Remaining |
|------|--------|----------------|
| Razorpay integration | Not started | Payments + subscriptions |
| Delivery system | Not started | Pharmacy portal, OTP delivery, tracking |
| Admin dashboard | Not started | Unified lab + delivery views |

## Phase 6: Patient Tracking (Weeks 16-17) - NOT STARTED

| Item | Status | Work Remaining |
|------|--------|----------------|
| Activity tab | Not started | Unified tracking screen |
| Blood work stepper | Not started | Patient-facing status view |
| Delivery stepper | Not started | Patient-facing status view |
| Results viewer | Not started | Simplified summary + PDF |
| Cancel/reschedule flows | Not started | Patient actions |

## Phase 7-9: Additional Conditions (Weeks 17-23) - NOT STARTED

| Condition | Status | Work Remaining |
|-----------|--------|----------------|
| ED | Not started | Complete questionnaire rewrite (28 questions), no photos |
| Weight Management | Not started | Questionnaire expansion (30 questions), 2 photos |
| PCOS | Not started | Questionnaire expansion (32 questions), optional photos |

## Phase 10: Polish (Weeks 23-25) - NOT STARTED

| Item | Status | Work Remaining |
|------|--------|----------------|
| Notification system | Not started | FCM, MSG91 WhatsApp/SMS, Email |
| SLA escalation engine | Not started | Automatic alerts for overdue items |
| Landing page | Not started | Marketing site |
| Discreet notification mode | Not started | Privacy option for sensitive notifications |

---

# D. RECOMMENDED BUILD ORDER

## Immediate Priorities (This Week)

### 1. Database Schema Update
- Add new enums (LabOrderStatus, OrderStatus, DeliveryMethod)
- Add new models (LabOrder, LabSlot, PartnerDiagnosticCentre, Phlebotomist, PartnerPharmacy, PartnerClinic, Wallet, WalletTransaction)
- Update existing models (Order, Consultation)
- Update UserRole enum to 7 roles
- Run migration

### 2. Questionnaire Updates
- Update Hair Loss questionnaire to match spec (25 questions)
- Keep other verticals as-is for now (focus on Hair Loss first per spec)

### 3. Doctor Dashboard MVP (Web)
- Set up subdomain routing middleware
- Create `/doctor` route structure
- Build case queue (list consultations)
- Build case review panel (view patient intake + photos)
- Add basic doctor notes functionality

## Short-term (Next 2 Weeks)

### 4. AI Pre-Assessment
- Claude API integration in backend
- Per-condition prompt templates
- Store assessment in AIPreAssessment model
- Display in doctor dashboard

### 5. Prescription Builder
- Template-based prescription creation
- PDF generation
- Digital signature support
- Store in S3

### 6. Admin/Coordinator Dashboard
- Basic order visibility
- Manual status updates
- Partner management CRUD

## Medium-term (Weeks 3-6)

### 7. Blood Work System
- Lab portal (`lab.onlyou.life`)
- Phlebotomist portal (`collect.onlyou.life`)
- Patient slot booking in mobile app
- Full status tracking with timestamps

### 8. Payment Integration
- Razorpay setup
- Subscription flow
- Payment webhooks

### 9. Delivery System
- Pharmacy portal (`pharmacy.onlyou.life`)
- Local delivery tracking (no Shiprocket)
- OTP verification on delivery

## Long-term (Weeks 7+)

### 10. Patient Tracking Screens
- Activity tab in mobile app
- Blood work stepper
- Delivery stepper
- Results viewer

### 11. Remaining Verticals
- ED questionnaire (complete rewrite)
- Weight Management expansion
- PCOS expansion

### 12. Notification System
- Push notifications (FCM)
- WhatsApp notifications (MSG91)
- SMS fallback
- Email for documents

---

# E. QUESTIONS FOR USER

## Critical Decisions Needed

### 1. Vertical Priority Confirmation
The spec says "Hair Loss first, then ED, Weight, PCOS." Should I:
- a) Focus 100% on Hair Loss until fully complete?
- b) Build shared infrastructure that supports all verticals in parallel?

### 2. Testing Approach
The spec requires "TDD: Tests first, 80% coverage minimum." Should I:
- a) Write tests first for all new code?
- b) Build first, add tests later?
- c) Tests only for critical paths (auth, payments)?

### 3. Doctor Onboarding
How will doctors be added to the system?
- a) Admin creates doctor accounts manually?
- b) Doctors self-register with NMC verification?
- c) Both options?

### 4. Current Questionnaire Data
There are likely existing IntakeResponses in the database with the old questionnaire format. Should I:
- a) Create a new questionnaire version (version 2) and keep old data?
- b) Migrate existing data to new format?
- c) Clear existing test data and start fresh?

### 5. Partner Data
Do you have existing partner information (diagnostic centres, pharmacies, phlebotomists) to seed, or should I create placeholder/demo data?

### 6. Deployment Strategy
The specs mention:
- `doctor.onlyou.life`
- `admin.onlyou.life`
- `lab.onlyou.life`
- etc.

Do you have these domains/subdomains set up, or should I first build with localhost routing?

### 7. AI Integration Timeline
Should Claude AI pre-assessment be:
- a) Built now (Phase 2)?
- b) Deferred until doctor dashboard is working manually?

### 8. Payment Integration Timeline
Should Razorpay be:
- a) Integrated early (before doctor dashboard)?
- b) After core clinical flow is complete?

---

# SUMMARY

## What's Working Well
- Authentication is solid and production-ready
- Intake flow is complete for basic use case
- Photo upload to S3 works end-to-end
- Mobile app navigation is smooth

## Biggest Gaps
1. **Doctor Dashboard** - No way for doctors to review and act on consultations
2. **Blood Work System** - Entire portal-based flow missing
3. **Delivery System** - No pharmacy portal, no OTP delivery
4. **Questionnaires** - Need significant expansion per new specs
5. **Database Schema** - Missing many models from new spec

## Recommended First Steps
1. Update Prisma schema with new models
2. Build Doctor Dashboard MVP
3. Update Hair Loss questionnaire to spec
4. Then proceed with blood work and delivery systems

---

*This plan is based on the specs in `docs/onlyou-spec-*.md` and current codebase analysis. Ready to begin implementation upon approval.*
