# ONLYOU PLATFORM — MASTER SPECIFICATION (v3 — Fully Audited)
## Shared Infrastructure, Architecture & Build Instructions for Claude Code

> **Document structure:** This is the MASTER spec. Read this first, then the relevant condition file(s):
> - `onlyou-spec-hair-loss.md` | `onlyou-spec-erectile-dysfunction.md`
> - `onlyou-spec-weight-management.md` | `onlyou-spec-pcos.md`
>
> **v3 audit fixes:** Restored all collapsed sections. Added patient tracking screens. Added pharmacy portal. Added delivery OTP. Added cancel/reschedule flows. Added reorder flow. Added SLA escalation. Fixed 14 identified gaps.

---

# TABLE OF CONTENTS

1. Platform Overview
2. Tech Stack & Project Structure
3. Shared User Journey
4. Patient App — Tracking & Status Screens
5. Doctor Dashboard
6. AI Pre-Assessment Framework
7. Blood Work & Diagnostics (Portal-Based)
8. Medication Fulfillment & Local Delivery
9. Referral & Retention System
10. Refund & Wallet System
11. Notification System
12. Payment & Subscription System
13. Database Schema
14. Security & Compliance
15. Build Order

---

# 1. PLATFORM OVERVIEW

**Onlyou** — Indian telehealth for stigmatized conditions. 4 verticals:

| Vertical | Target | Doctor | Priority |
|---|---|---|---|
| Hair Loss | Men 18-45, Women AGA | Dermatologist / Trichologist | 🥇 |
| ED | Men 25-60 | Urologist / Andrologist | 🥈 |
| Weight Management | M&F 18-55, BMI ≥25 | Endocrinologist / IM | 🥉 |
| PCOS | Women 18-40 | Gynecologist / Endocrinologist | 4th |

**Subscription includes:** Async consultation + medication (local delivery) + check-ins + AI pre-assessment + first blood panel (if needed)

**MVP approach:**
- NO Thyrocare/SRL API → Partner local diagnostic centres, portal-tracked
- NO Shiprocket/Delhivery → Local delivery (Rapido/Dunzo/own), dashboard-tracked
- NO WhatsApp coordination → Everything through portals/dashboards
- Scale to APIs at 100+ orders/month or multi-city

---

# 2. TECH STACK & PROJECT STRUCTURE

```
onlyou/
├── backend/            → NestJS + GraphQL + Prisma + PostgreSQL + Redis
│   ├── src/
│   │   ├── auth/             → OTP + JWT (roles: patient/doctor/admin/lab/phlebotomist/pharmacy/delivery)
│   │   ├── users/
│   │   ├── questionnaire/
│   │   ├── photos/           → S3 management
│   │   ├── ai/               → Claude API (per-condition prompts)
│   │   ├── consultations/
│   │   ├── prescriptions/
│   │   ├── referrals/
│   │   ├── payments/         → Razorpay
│   │   ├── orders/           → Medication orders + delivery tracking
│   │   ├── lab-orders/       → Blood work lifecycle + sample tracking
│   │   ├── notifications/    → FCM + MSG91 (WhatsApp/SMS) + Email
│   │   ├── messaging/        → Doctor-patient chat
│   │   ├── wallet/
│   │   └── admin/
│   ├── prisma/schema.prisma
│   └── test/
├── mobile/             → React Native Expo (patient app)
│   ├── src/screens/
│   │   ├── onboarding/
│   │   ├── home/
│   │   ├── questionnaire/
│   │   ├── photo-upload/
│   │   ├── treatment/
│   │   ├── tracking/          → ⭐ UNIFIED tracking screen (labs + deliveries)
│   │   ├── lab-booking/
│   │   ├── lab-results/
│   │   ├── messages/
│   │   └── profile/
├── web/                → Next.js 14 + Tailwind + shadcn/ui
│   ├── src/app/
│   │   ├── (landing)/
│   │   ├── (auth)/
│   │   ├── doctor/            → Doctor dashboard
│   │   ├── admin/             → Coordinator dashboard
│   │   ├── lab/               → Diagnostic centre portal
│   │   ├── phlebotomist/      → Phlebotomist portal
│   │   └── pharmacy/          → ⭐ Pharmacy partner portal (NEW)
├── shared/types/ + constants/ + validators/
└── CLAUDE.md
```

---

# 3. SHARED USER JOURNEY

## 3.1 Auth: Phone OTP → JWT
- +91 phone → 6-digit OTP (MSG91) → JWT (15min access + 30day refresh)
- OTP expiry 5min, max 5 attempts/15min, WhatsApp fallback if SMS fails

## 3.2 Profile Setup
- First name, Last name, DOB (≥18), Email (optional), Pincode → auto-fill city/state, Full address, Government ID (Aadhaar/PAN/DL)
- Under 18 = blocked. Invalid pincode = rejected.

## 3.3 Home Screen
- Condition cards: Hair Loss | ED | Weight | PCOS. Each with illustration, tagline, "Start Assessment" CTA.
- **Active Tracking Banner:** If patient has active orders (lab or delivery), show banner at top: "🔬 Blood test: Sample being processed" or "📦 Medication: Out for delivery" — tapping opens tracking screen.

## 3.4 Questionnaire
- Shared engine, condition-specific data files. One question per screen. Skip logic. Save progress.

## 3.5 Photo Upload (condition-specific)
- Hair Loss: 4 photos. ED: none. Weight: 2 photos. PCOS: optional.

## 3.6 Review & Consent → Plan Selection → Payment
- Summary, consent, plan selection, Razorpay.

## 3.7 Waiting → Doctor Review → Results
- Status visible in app: Submitted → Under Review → Treatment Plan Ready / Blood Work Needed / Referred

## 3.8 Ongoing Care
- Monthly check-ins, subscription auto-renews, medication auto-reorders (see Section 8.5)

---

# 4. PATIENT APP — TRACKING & STATUS SCREENS

> **The patient MUST see the same live status for both blood work and medication delivery.** This is a unified tracking experience.

## 4.1 "My Activity" Tab (Bottom Navigation)

The patient app has a bottom nav tab called **"Activity"** or **"My Care"** that shows:

### Active Items (top section — cards with live status)
Each active item is a card showing:
- Icon (🔬 lab / 📦 medication)
- Title ("Blood Test" or "Treatment Kit — February")
- Current status with progress stepper
- Last updated time
- Tap to expand full tracking detail

### Completed Items (below — collapsed list)
- Historical orders and lab results, most recent first
- Tap to view details/PDFs

## 4.2 Blood Work Tracking — Patient View

Patient sees a **vertical progress stepper** with these steps. Each step shows ✅ (done + timestamp), 🔵 (current/active), or ⚪ (upcoming):

```
✅ Doctor Ordered Tests                    Feb 12, 2:30 PM
   "TSH, CBC, Ferritin, Vitamin D"
   
✅ Collection Scheduled                    Feb 13, 8-10 AM
   "123 Green Valley Apts, Banjara Hills"
   [Reschedule] [Cancel]                   ← only visible when status is here
   
✅ Phlebotomist Assigned                   Feb 13
   "Priya R. will collect your sample"
   
🔵 Sample Collection                       Scheduled: Feb 13, 8-10 AM
   "Phlebotomist will call 30 min before"
   
⚪ Sample at Lab
   "Being processed at the diagnostic centre"
   
⚪ Results Ready
   "You'll be notified via app, WhatsApp & email"
   
⚪ Doctor Review
   "Your doctor will review and update your treatment"
```

**After results ready, an additional section appears:**
```
📄 View Results
   [View PDF]  [Download]
   
   Doctor's Note: "Your thyroid levels are slightly elevated. 
   I'm adjusting your treatment plan accordingly."
```

### Status-to-Patient-Friendly-Label Mapping:

| Internal Status | Patient Sees | Icon |
|---|---|---|
| `ORDERED` | "Doctor ordered blood tests" | 🔬 |
| `SLOT_BOOKED` | "Collection scheduled — [date], [time]" | 📅 |
| `PHLEBOTOMIST_ASSIGNED` | "Phlebotomist assigned — [name]" | 👤 |
| `SAMPLE_COLLECTED` | "Sample collected ✅" | ✅ |
| `COLLECTION_FAILED` | "Collection missed — please reschedule" | ⚠️ |
| `DELIVERED_TO_LAB` | "Sample delivered to lab" | 🏥 |
| `SAMPLE_RECEIVED` | "Lab received your sample" | 🏥 |
| `SAMPLE_ISSUE` | "Sample issue — free recollection scheduled" | ⚠️ |
| `PROCESSING` | "Tests being processed — results in 24-48hrs" | ⏳ |
| `RESULTS_READY` | "Results ready! Tap to view" | 📄 |
| `DOCTOR_REVIEWED` | "Doctor reviewed your results" | 👨‍⚕️ |
| `RESULTS_UPLOADED` | "Your uploaded results are being reviewed" | 📤 |

## 4.3 Medication Delivery Tracking — Patient View

Same vertical stepper pattern:

```
✅ Treatment Plan Ready                    Feb 14, 11:00 AM
   "Your doctor prescribed: Finasteride 1mg, Minoxidil 5%"
   [View Prescription PDF]
   
✅ Medication Being Prepared               Feb 14, 11:30 AM
   "Your kit is being packed at the pharmacy"
   
🔵 Out for Delivery                        Feb 14, 3:00 PM
   "Delivery by: Ravi K. — 📞 +91 XXXXX XXXXX"
   "Estimated arrival: 3:30 - 4:00 PM"
   
⚪ Delivered
   "Enter delivery OTP to confirm receipt"
```

### Status Mapping:

| Internal Status | Patient Sees | Icon |
|---|---|---|
| `PRESCRIPTION_CREATED` | "Treatment plan ready" | 📋 |
| `SENT_TO_PHARMACY` | "Prescription sent to pharmacy" | 💊 |
| `PHARMACY_PREPARING` | "Medication being prepared" | ⏳ |
| `PHARMACY_READY` | "Medication ready — arranging delivery" | ✅ |
| `PICKUP_ARRANGED` | "Delivery person picking up your kit" | 🏃 |
| `OUT_FOR_DELIVERY` | "On the way! [Name] — [Phone] — ETA [time]" | 🚗 |
| `DELIVERED` | "Delivered ✅ — [date, time]" | 📦 |
| `DELIVERY_FAILED` | "Delivery unsuccessful — rescheduling" | ⚠️ |
| `RESCHEDULED` | "Rescheduled for [new date]" | 📅 |

## 4.4 Patient Actions Available Per Status

### Blood Work:
| Status | Patient Can... |
|---|---|
| `ORDERED` | Book a slot OR upload own results |
| `SLOT_BOOKED` | Reschedule or Cancel |
| `PHLEBOTOMIST_ASSIGNED` | Reschedule (with 4hr+ notice) or Cancel |
| `SAMPLE_COLLECTED` onwards | View-only tracking |
| `RESULTS_READY` | View PDF, download, share |
| `COLLECTION_FAILED` | Rebook slot |
| `SAMPLE_ISSUE` | No action needed — auto-rebooked |

### Medication Delivery:
| Status | Patient Can... |
|---|---|
| `PRESCRIPTION_CREATED` → `PHARMACY_READY` | View prescription, contact support |
| `OUT_FOR_DELIVERY` | See delivery person name + phone, call them |
| `DELIVERED` | Enter OTP to confirm. Rate delivery (optional). |
| `DELIVERY_FAILED` | Contact support, system auto-reschedules |

## 4.5 Lab Results Presentation to Patient

**Don't just show raw PDF.** Add a simplified summary above the PDF:

```
📊 Your Results Summary
━━━━━━━━━━━━━━━━━━━━━
TSH (Thyroid)      8.5 μIU/mL    ⚠️ High (normal: 0.4-4.0)
CBC (Blood Count)  Normal         ✅
Ferritin (Iron)    45 ng/mL       ✅ Normal
Vitamin D          18 ng/mL       ⚠️ Low (normal: 30-100)

💬 Your doctor will review these results and update 
   your treatment plan. You'll be notified when ready.

📄 [View Full Lab Report PDF]
```

This summary is generated from the `abnormalFlags` JSON the lab fills in when uploading results. If no flags provided, show only the PDF.

---

# 5. DOCTOR DASHBOARD

## 5.1 Case Queue
- Filterable: All | Hair Loss | ED | Weight | PCOS
- Cards: patient name, age, sex, condition, time, AI attention level
- Status badges: 🟢 New | 🟡 In Review | 🟠 Awaiting Response | 🟣 Lab Results Ready | 🔵 Follow-Up | ⚪ Completed | 🔴 Referred

## 5.2 Case Review — Condition-Aware
Center panel adapts per condition (see condition specs). Common elements:
- Patient info header (name, age, sex, city)
- Questionnaire responses (collapsible sections)
- AI assessment tab (classification, red flags, contraindications)
- Lab Results tab (if any — PDF inline + abnormal flags)
- Photos tab (if applicable — with side-by-side for follow-ups)
- Message history tab

## 5.3 Right Panel Actions (all conditions)
- **Prescribe** → opens prescription builder (condition-specific templates)
- **Request More Info** → sends message to patient, case goes to 🟠
- **Order Blood Work** → triggers Section 7 flow
- **Refer** → opens referral modal (Section 9)
- **Refund** → initiates refund (Section 10)

## 5.4 Prescription Builder
- Templates per condition (see condition files)
- Custom option always available
- Regulatory fields auto-populated: doctor name, NMC number, patient details
- Digital signature
- PDF generated and stored

## 5.5 Messaging
- Threaded chat per consultation
- Canned responses (condition-specific)
- Attachments (photos, PDFs)
- Read receipts

---

# 6. AI PRE-ASSESSMENT FRAMEWORK

## Pipeline
```
Patient submits → Backend packages questionnaire + photo URLs →
  Call Claude API with condition-specific prompt →
  Parse JSON response → Store in consultation.aiAssessment →
  Determine aiAttentionLevel → Assign to specialist
```

## Shared Output Schema
```typescript
interface AIAssessment {
  classification: {
    likely_condition: string;
    confidence: 'high' | 'medium' | 'low';
    alternative_considerations: string[];
  };
  red_flags: string[];
  contraindications: { [med: string]: { safe: boolean; concerns: string[] } };
  risk_factors: string[];
  recommended_protocol: { primary: string; medications: Medication[]; additional: string[] };
  doctor_attention_level: 'low' | 'medium' | 'high';
  summary: string;
}
```

## Routing
```
HAIR_LOSS → ["DERMATOLOGY", "TRICHOLOGY"]
ERECTILE_DYSFUNCTION → ["UROLOGY", "ANDROLOGY", "SEXUAL_MEDICINE"]
WEIGHT_MANAGEMENT → ["ENDOCRINOLOGY", "INTERNAL_MEDICINE", "BARIATRIC"]
PCOS → ["GYNECOLOGY", "ENDOCRINOLOGY", "REPRODUCTIVE_MEDICINE"]
```

---

# 7. BLOOD WORK & DIAGNOSTICS (PORTAL-BASED)

> **RULE: Everything through portals. No WhatsApp. Every status change timestamped.**

## 7.1 Portals

| Stakeholder | Portal | Actions |
|---|---|---|
| Doctor | Doctor Dashboard | Order tests |
| Coordinator | Admin → Lab Orders | Assign phlebotomist, manage slots, escalate issues, full oversight |
| Phlebotomist | collect.onlyou.life | View assignments, navigate, call patient, mark collected/delivered/failed |
| Diagnostic Centre | lab.onlyou.life | View pending, mark received, mark processing, upload results, flag abnormals, report issues |
| Patient | Mobile App → Tracking | Book slot, reschedule, cancel, upload own results, view results PDF |

## 7.2 Complete Flow

### Step 1: Doctor Orders
- Selects test panel + optional notes → status `ORDERED`
- Notifies: Patient + Coordinator

### Step 2: Patient Books Slot
- App → available slots → picks date + time window → confirms address
- Status → `SLOT_BOOKED`
- **Alt:** "Already have results?" → uploads PDF → `RESULTS_UPLOADED` → doctor notified

### Step 2b: Patient Cancels/Reschedules
- **Cancel:** Available until `PHLEBOTOMIST_ASSIGNED` (with ≥4 hours before slot). Status → `CANCELLED`. Coordinator notified. Phlebotomist assignment removed.
- **Reschedule:** Available until 4 hours before slot time. Patient picks new slot. Old slot freed. Status stays `SLOT_BOOKED` with new date. Coordinator + phlebotomist notified.
- **After 4-hour cutoff:** Patient sees "Too late to reschedule online. Contact support." (because phlebotomist is already en route)

### Step 3: Coordinator Assigns Phlebotomist
- Admin dashboard → assigns from dropdown → status `PHLEBOTOMIST_ASSIGNED`
- Patient notified with phlebotomist name
- Phlebotomist sees assignment

### Step 4: Phlebotomist Collects
- Portal: today's assignments (name, address + map, phone + tap-to-call, tests, notes)
- Calls patient 30 min before
- Collects sample → clicks **"Mark Collected"** → enters tube count → status `SAMPLE_COLLECTED`
- Patient push: "Sample collected ✅"

**Edge: Patient not home**
- Clicks **"Patient Unavailable"** → reason (not home / no answer / reschedule requested / wrong address)
- Status → `COLLECTION_FAILED` (reason + timestamp logged)
- Coordinator gets URGENT alert
- Patient: "We missed you. Tap to rebook." — patient rebooks, flow restarts from Step 2

**Edge: Phlebotomist running late**
- Phlebotomist clicks **"Running Late"** → enters new ETA
- Patient gets push: "Your phlebotomist is running a bit late. New ETA: [time]"
- Coordinator sees delay flag on dashboard

### Step 5: Delivered to Lab
- Phlebotomist clicks **"Delivered to Lab"** → selects diagnostic centre → status `DELIVERED_TO_LAB`
- Lab portal notified

### Step 6: Lab Processes
- Lab portal → **"Mark Received"** → confirms tubes → status `SAMPLE_RECEIVED`
- Patient: "Sample received. Results in 24-48 hours."

**Edge: Sample issue**
- Lab clicks **"Report Issue"** → reason → status `SAMPLE_ISSUE`
- Coordinator: URGENT alert. System auto-creates new lab order for recollection at no charge.
- Patient: "Sample issue — free recollection being scheduled."

- Lab clicks **"Processing Started"** → status `PROCESSING`

### Step 7: Results Uploaded
- Lab uploads PDF → flags abnormals (Normal/Abnormal/Critical per test) → clicks **"Submit"**
- Status → `RESULTS_READY`
- Notifies: Doctor (🟣 badge) + Patient (push + WhatsApp + email with PDF) + Coordinator

**Edge: Critical values detected**
- If lab checks "Critical" for any test → system sends URGENT notification to doctor + coordinator immediately
- Doctor's queue shows 🔴 CRITICAL badge
- Patient gets: "Important results detected. Your doctor is being notified to review urgently."

### Step 8: Doctor Reviews → Step 9: Patient Views
- Doctor: PDF inline + flags + history
- Patient: Simplified summary (from abnormalFlags) + full PDF + WhatsApp/email copy

## 7.3 Lab Order Status Enum

```
ORDERED → SLOT_BOOKED → PHLEBOTOMIST_ASSIGNED → SAMPLE_COLLECTED → DELIVERED_TO_LAB → SAMPLE_RECEIVED → PROCESSING → RESULTS_READY → DOCTOR_REVIEWED → CLOSED

Branches:
COLLECTION_FAILED → patient rebooks → SLOT_BOOKED
SAMPLE_ISSUE → auto-new-order → ORDERED
RESULTS_UPLOADED → DOCTOR_REVIEWED → CLOSED
CANCELLED (patient cancelled)
EXPIRED (no booking within 14 days)
```

## 7.4 SLA Escalation

| SLA | Threshold | Action |
|---|---|---|
| Patient doesn't book slot | 3 days after ORDERED | Reminder push. 7 days: second reminder. 14 days: EXPIRED + coordinator alert. |
| Coordinator doesn't assign phlebotomist | 2 hours after SLOT_BOOKED | Admin dashboard highlights in red. Auto-escalation notification. |
| Lab doesn't mark received | 4 hours after DELIVERED_TO_LAB | Coordinator gets alert: "Lab hasn't confirmed receipt." |
| Lab doesn't upload results | 48 hours after SAMPLE_RECEIVED | Coordinator gets alert: "Results overdue." Patient: "Your results are taking longer than expected. We're following up." |
| Lab results overdue 72+ hours | 72 hours | Coordinator escalation: call lab. Patient: "We apologize for the delay. We're actively following up." |
| Doctor doesn't review results | 24 hours after RESULTS_READY | Doctor reminder. 48 hours: coordinator alert to reassign. |

## 7.5 Data Models

### PartnerDiagnosticCentre
```
id, name, address, city, state, pincode, lat, lng, phone, email, contactPerson,
portalLoginPhone, testsOffered[], testPricing: Json, panelPricing: Json,
avgTurnaroundHours, rating, isActive, createdAt, updatedAt
```

### Phlebotomist
```
id, name, phone, email?, certification, certificationDocUrl,
availableDays[], availableTimeStart, availableTimeEnd, maxDailyCollections,
currentCity, serviceableAreas[] (pincodes),
completedCollections, failedCollections, rating, isActive
```

### LabOrder
```
id, patientId, consultationId, doctorId,
testPanel[], panelName?, doctorNotes?,
bookedDate?, bookedTimeSlot?, collectionAddress, collectionCity, collectionPincode,
phlebotomistId?, diagnosticCentreId?,
status: LabOrderStatus,
// Timestamps (ALL):
orderedAt, slotBookedAt?, phlebotomistAssignedAt?, sampleCollectedAt?,
collectionFailedAt?, collectionFailedReason?,
deliveredToLabAt?, sampleReceivedAt?, sampleIssueAt?, sampleIssueReason?,
processingStartedAt?, resultsUploadedAt?, doctorReviewedAt?, closedAt?,
// Results:
resultFileUrl?, abnormalFlags: Json?, criticalValues: boolean,
patientUploadedResults: boolean, patientUploadedFileUrl?,
// Financials:
labCost, patientCharge, coveredBySubscription: boolean
```

### LabSlot
```
id, date, startTime, endTime, phlebotomistId?,
maxBookings, currentBookings, city, serviceableAreas[],
isAvailable: boolean (computed)
```

---

# 8. MEDICATION FULFILLMENT & LOCAL DELIVERY

## 8.1 Portals

| Stakeholder | Portal | Actions |
|---|---|---|
| Coordinator | Admin → Deliveries | See all orders, send to pharmacy, assign delivery, track status, mark delivered |
| Pharmacy | pharmacy.onlyou.life | See pending prescriptions, mark "Preparing", mark "Ready for Pickup" |
| Delivery Person | Simple link (SMS/WhatsApp) | See pickup address, delivery address, patient phone. Confirm pickup. Confirm delivery via OTP. |
| Patient | App → Tracking | See live status, delivery person details, enter OTP on delivery |

## 8.2 Complete Flow

### Step 1: Prescription Created
- Doctor prescribes → PDF generated → status `PRESCRIPTION_CREATED`
- Coordinator sees new order in Admin → Deliveries

### Step 2: Sent to Pharmacy
- Coordinator clicks "Send to Pharmacy" → selects partner pharmacy → prescription appears in Pharmacy Portal
- Status → `SENT_TO_PHARMACY`
- Patient: "Your medication is being prepared."

### Step 3: Pharmacy Prepares
- Pharmacy portal: sees pending prescriptions (patient anonymous ID, medication list, quantities)
- Clicks **"Start Preparing"** → status `PHARMACY_PREPARING`
- Clicks **"Ready for Pickup"** when done → status `PHARMACY_READY`
- Coordinator notified: "Order ready at [pharmacy name]"

**Edge: Medication out of stock**
- Pharmacy clicks **"Issue: Stock Unavailable"** → specifies which medication → status `PHARMACY_ISSUE`
- Coordinator gets alert → either finds alternative pharmacy OR contacts doctor for substitute
- Patient: "There's a slight delay preparing your medication. We're sorting it out."

### Step 4: Delivery Arranged
- Coordinator arranges delivery:
  - Enters: delivery person name, phone, method (Rapido/Dunzo/Own/Porter/Other), estimated delivery time
  - System generates **Delivery OTP** (4-digit code) → stored in order record
- Status → `PICKUP_ARRANGED`

### Step 5: Pickup
- Delivery person gets pickup details (pharmacy address, patient delivery address) via SMS link
- Picks up from pharmacy → coordinator updates (or delivery person confirms via link)
- Status → `OUT_FOR_DELIVERY`
- **Patient gets:** "Your treatment kit is on its way! Delivery by: [name] — 📞 [phone]. ETA: [time]. Your delivery code: **[OTP]**"

### Step 6: Delivery + OTP Confirmation
- Delivery person arrives at patient's door
- **Patient gives OTP code to delivery person** → delivery person enters it in their link → system validates
- Status → `DELIVERED` (timestamp)
- Patient: "Delivered ✅ Open the app for usage instructions."
- Coordinator dashboard updated

**Why OTP:** Proves the right person received it. Prevents "delivered but nobody home" disputes. Standard in India (Swiggy, Zepto, Blinkit all do this).

**Edge: Patient not home**
- Delivery person can't reach patient → clicks "Delivery Failed" → reason (not home / wrong address / phone unreachable)
- Status → `DELIVERY_FAILED`
- Coordinator notified → reschedules
- Patient: "We tried delivering but couldn't reach you. We'll reschedule."
- Package returns to pharmacy. New delivery attempted next day.

**Edge: Wrong medication / damaged package**
- Patient contacts support (in-app or WhatsApp) → coordinator creates return + replacement order
- Status of original: `RETURNED`
- New order auto-created

### Step 7: Post-Delivery
- Patient optionally rates delivery (1-5 stars)
- Usage instructions appear in app (condition-specific — "Apply minoxidil twice daily...")

## 8.3 Order Status Enum

```
PRESCRIPTION_CREATED → SENT_TO_PHARMACY → PHARMACY_PREPARING → PHARMACY_READY →
PICKUP_ARRANGED → OUT_FOR_DELIVERY → DELIVERED

Branches:
PHARMACY_ISSUE → coordinator resolves → PHARMACY_PREPARING (restart)
DELIVERY_FAILED → reschedule → PICKUP_ARRANGED (restart)
RETURNED → new order created
CANCELLED
```

## 8.4 Delivery Data Model

```
Order {
  id, patientId, prescriptionId,
  status: OrderStatus,
  
  // Pharmacy
  pharmacyPartnerId?, pharmacyPartnerName, pharmacyAddress,
  
  // Delivery
  deliveryMethod: enum (RAPIDO, DUNZO, OWN_DELIVERY, PORTER, OTHER),
  deliveryPersonName?, deliveryPersonPhone?,
  deliveryOTP: string?,           // 4-digit code for delivery confirmation
  deliveryOTPVerified: boolean,
  estimatedDeliveryTime?,
  
  // Addresses
  deliveryAddress, deliveryCity, deliveryPincode,
  
  // Financials
  medicationCost, deliveryCost, totalAmount,
  
  // Timestamps
  orderedAt, sentToPharmacyAt?, pharmacyPreparingAt?, pharmacyReadyAt?,
  pickupArrangedAt?, outForDeliveryAt?, deliveredAt?,
  deliveryFailedAt?, deliveryFailedReason?,
  pharmacyIssueAt?, pharmacyIssueReason?,
  
  // Rating
  deliveryRating: number?,
  
  createdAt, updatedAt
}

enum OrderStatus {
  PRESCRIPTION_CREATED, SENT_TO_PHARMACY, PHARMACY_PREPARING,
  PHARMACY_READY, PHARMACY_ISSUE,
  PICKUP_ARRANGED, OUT_FOR_DELIVERY,
  DELIVERED, DELIVERY_FAILED, RESCHEDULED, RETURNED, CANCELLED
}
```

## 8.5 Monthly Reorder Flow (Subscription)

When subscription renews monthly:
1. System checks: is there an active prescription for this patient+condition?
2. If YES → auto-creates new Order with status `PRESCRIPTION_CREATED` using the same prescription
3. Coordinator sees it in deliveries dashboard → standard flow continues
4. Patient gets: "Your next month's treatment kit is being prepared."
5. If prescription was modified by doctor in latest check-in → uses the updated prescription

If doctor paused treatment or patient hasn't completed a check-in → system flags for coordinator review instead of auto-ordering.

## 8.6 Packaging
- Discreet: "Onlyou" only. No condition/medication names visible.
- Sealed tamper-proof
- Inside: medications, usage instruction card, personalized doctor note

---

# 9. REFERRAL & RETENTION SYSTEM

## Decision Tree
```
Doctor clicks "Refer Out"
│
├── Partner clinic near patient?
│   ├── YES → ranked by distance + specialty → patient books → credit applies
│   └── NO → Blood work needed? → Section 7 flow
│         → Video consult sufficient? → book video
│         → In-person needed? → check 50/100/200km radius
│         → Nothing works → full refund + PDF + comeback code
│
└── Patient can ALWAYS choose refund → honored immediately
```

## Partner Clinic Model
```
PartnerClinic {
  id, name, address, city, state, pincode, lat, lng, phone, email,
  specializations[], capabilities[],
  onlyouNegotiatedRate, rating, ratingCount, maxDailyCapacity,
  isActive, lastVerifiedAt
}
```

## Edge Case Matrix

| Scenario | Behavior |
|---|---|
| Partner nearby + available | Book, credit applies |
| Partner booked 2+ weeks | Show delay + video alternative |
| No partner 50km | Auto-suggest video |
| No partner 200km + video unsuitable | Full refund |
| Patient no-shows clinic | Credit held 90 days |
| Bad clinic review (<3 stars) | Admin alerted, auto-disable at 3 bad reviews |
| Patient traveling | Ask current location first |
| Patient wants refund | Honor immediately |
| Abnormal blood results | Case returns to doctor queue |
| Patient refuses blood work | Cannot prescribe, explain, offer refund |
| Blood sample issue | Free recollection |
| Lab delays 72+ hours | Coordinator escalation |

---

# 10. REFUND & WALLET

| Trigger | Amount | Process |
|---|---|---|
| Doctor: not suitable | Full | Auto |
| Patient declines referral | Full | Patient-initiated |
| Cancel <24hrs (before review) | Full | Patient-initiated |
| Cancel after review | 50% | Partial |
| Technical error | Full | Auto via webhook |
| Delivery issue (wrong/damaged) | Full replacement or refund | Support-initiated |

**Wallet:** Balance in paise. Credits: refund, promo, comeback. Debits: payment, expiry. Promo expires 90 days. Refund credits never expire. Patient chooses: wallet credit (instant) or original payment (5-7 days).

---

# 11. NOTIFICATION SYSTEM

## Channels
1. Push (FCM) — primary
2. WhatsApp (MSG91) — secondary
3. SMS (MSG91) — fallback
4. Email — documents (prescriptions, lab results, receipts)
5. In-App — notification bell + tracking screen updates

## Patient Notification Preferences
- Patient can toggle in Settings: Push ON/OFF, WhatsApp ON/OFF, SMS ON/OFF, Email ON/OFF
- Push cannot be fully disabled for critical alerts (lab results with critical values, medication safety warnings)
- Default: all channels ON
- Sensitive mode: patient can enable "Discreet Notifications" — notifications show "Onlyou: You have an update" instead of condition-specific text

## Blood Work Notifications

| Event | Patient | Coordinator | Phlebotomist | Lab | Doctor |
|---|---|---|---|---|---|
| Tests ordered | Push + in-app | Dashboard | — | — | — |
| Slot booked | Confirmation | Dashboard | — | — | — |
| Phlebotomist assigned | "Confirmed, [name]" | ✅ | Assignment | — | — |
| 30 min before collection | Reminder | — | Reminder | — | — |
| Running late | "New ETA: [time]" | ✅ | — | — | — |
| Collected | "Collected ✅" | ✅ | — | "Incoming" | — |
| Collection failed | "Reschedule" | URGENT | — | — | — |
| Received by lab | "Being processed" | ✅ | — | — | — |
| Sample issue | "Recollection" | URGENT | — | — | — |
| Results ready | Push + WhatsApp + Email (PDF) | ✅ | — | — | "Results ready" 🟣 |
| Critical values | "Urgent — doctor notified" | URGENT | — | — | URGENT 🔴 |
| Doctor reviewed | "Doctor reviewed" | — | — | — | — |
| Patient doesn't book (3d) | Reminder | — | — | — | — |
| Patient doesn't book (14d) | Final reminder | Alert: expired | — | — | — |
| Lab overdue (48h) | "Taking longer" | Alert | — | — | — |
| Lab overdue (72h) | "Following up" | Escalation | — | — | — |

## Delivery Notifications

| Event | Patient | Coordinator | Pharmacy |
|---|---|---|---|
| Prescription created | "Being prepared" | New order | Prescription received |
| Pharmacy preparing | — | ✅ | — |
| Pharmacy ready | — | "Ready for pickup" | — |
| Pharmacy issue | "Slight delay" | URGENT | — |
| Out for delivery | "[Name], [Phone], ETA, OTP" | ✅ | — |
| Delivered | "Delivered ✅" | ✅ | — |
| Delivery failed | "Rescheduling" | Alert | — |
| Monthly reorder | "Next kit being prepared" | New order | — |

---

# 12. PAYMENT & SUBSCRIPTION

## Razorpay
- Create order → checkout (UPI, card, net banking, wallets) → webhook → create consultation
- Subscriptions API for auto-renewal
- Failed payment: 3-day grace, retries day 1, 3, 7
- Wallet applied first, remainder via Razorpay

## Pricing

| Condition | Monthly | Quarterly | Annual |
|---|---|---|---|
| Hair Loss | ₹999 | ₹2,499 | ₹8,999 |
| ED | ₹1,299 | ₹3,299 | ₹11,999 |
| Weight Mgmt | ₹2,999 | ₹7,999 | ₹27,999 |
| PCOS | ₹1,499 | ₹3,799 | ₹13,999 |

## Blood Work Pricing
- First panel: INCLUDED in subscription
- Follow-up panels: ₹999-2,500 (charged separately)
- Patient self-upload: free

---

# 13. DATABASE SCHEMA SUMMARY

**Core:** User, PatientProfile, DoctorProfile, Consultation, QuestionnaireResponse, PatientPhoto, Prescription, Message, Notification

**Partners:** PartnerClinic, PartnerDiagnosticCentre, Phlebotomist, PartnerPharmacy (NEW)

**Blood Work:** LabOrder (full timestamps), LabSlot

**Fulfillment:** Order (delivery OTP, pharmacy tracking, all timestamps)

**Financial:** Payment, Refund, Wallet, WalletTransaction, Subscription

**Referral:** Referral

### PartnerPharmacy (NEW)
```
id, name, address, city, state, pincode, phone, email, contactPerson,
portalLoginPhone,
medicationsStocked: string[],     // what they typically carry
operatingHours: string,
deliveryRadius: number?,          // km
isActive, rating,
createdAt, updatedAt
```

`TreatmentCategory` enum: `HAIR_LOSS | ERECTILE_DYSFUNCTION | WEIGHT_MANAGEMENT | PCOS`

---

# 14. SECURITY & COMPLIANCE

## Indian Telemedicine Guidelines 2020
- NMC registration for all doctors, patient ID verification, informed consent
- Prescription: doctor name, designation, NMC#, patient details, diagnosis, digital signature
- Drug scheduling: List O/A/B/Prohibited. Record retention: 3 years.

## DPDPA 2023
- Data in India (ap-south-1). Encrypted at rest + transit. Right to erasure. Consent.

## Application Security
- JWT (15min access + 30day refresh), rate limiting, input sanitization
- Presigned S3 URLs (1hr), RBAC, CORS, Helmet.js, audit logging

## Portal Security
- All portals: OTP-authenticated, role-based, mobile-responsive
- Lab portal: anonymized patient IDs (lab doesn't see patient name)
- Phlebotomist: sees only today's assignments
- Pharmacy: sees only prescriptions assigned to them
- Delivery links: single-use, expire after delivery
- Admin: full access, all actions audit-logged
- Result PDFs: encrypted S3, downloads logged

---

# 15. BUILD ORDER

### Phase 1: Foundation (Week 1-3)
1. Auth (OTP + JWT + 7 roles)
2. User profiles (all types)
3. S3 file upload

### Phase 2: Core — Hair Loss (Week 3-8)
4. Questionnaire engine + hair loss data
5. AI module + hair loss prompt
6. Consultation lifecycle
7. Photo module

### Phase 3: Doctor Dashboard (Week 8-11)
8. Queue + Review + Prescribe
9. Prescription builder
10. Messaging

### Phase 4: Blood Work & Referral (Week 11-14)
11. Partner management (clinics, labs, phlebotomists, pharmacies)
12. Referral system
13. **Blood work portal:** orders, slots, phlebotomist portal, lab portal, tracking, results
14. Wallet/Refunds

### Phase 5: Delivery & Payment (Week 14-16)
15. Razorpay (payments + subscriptions)
16. **Delivery system:** pharmacy portal, order tracking, OTP delivery, auto-reorder
17. Admin dashboard (unified lab + delivery views)

### Phase 6: Patient Tracking (Week 16-17)
18. **Patient app tracking screens:** unified Activity tab, blood work stepper, delivery stepper, results viewer, cancel/reschedule flows

### Phase 7-9: Additional Conditions (Week 17-23)
19-21. ED, 22-24. Weight, 25-27. PCOS

### Phase 10: Polish (Week 23-25)
28. Notification system (all events, all channels, preferences)
29. SLA escalation engine
30. Landing page
31. Discreet notification mode

**TDD: Tests first, always. 80% coverage minimum.**

---

# DOMAIN STRATEGY

## Primary: `onlyou.life` (patient-facing brand)
## Secondary: `onlyou.co.in` (redirects to onlyou.life — reserved for Indian regulatory/legal use)

| Portal | URL / Platform | Users |
|---|---|---|
| Landing Page / Main Site | `onlyou.life` | Public |
| Patient App (Native) | App Store + Play Store (React Native Expo) | Patients |
| Doctor Dashboard | `doctor.onlyou.life` | Doctors |
| Admin Dashboard | `admin.onlyou.life` | Coordinator (you) |
| Lab Portal | `lab.onlyou.life` | Diagnostic centre staff |
| Collection Portal | `collect.onlyou.life` | Phlebotomists |
| Pharmacy Portal | `pharmacy.onlyou.life` | Pharmacy partners |

**Patient app is a native mobile app** (React Native Expo) — NOT a web portal. This is critical because:
- Push notifications are more reliable via native
- Camera access for photo uploads is smoother
- HealthKit/Google Fit integration possible for weight management
- App Store presence builds trust for a health platform
- Deep links from WhatsApp/SMS notifications open the app directly

`app.onlyou.life` can exist as a lightweight web fallback (e.g., for viewing lab result PDFs from email links) but the primary patient experience is always the native app.

**`onlyou.co.in`** → 301 redirects to `onlyou.life`. Also usable for:
- Legal/regulatory documents (CDSCO registration, NMC compliance)
- Email domain for official communications: `doctor@onlyou.co.in`, `support@onlyou.co.in`
- Builds trust with Indian doctors and pharmacy partners who prefer `.co.in`

**DNS Setup:** All subdomains point to the same Next.js app. Routing is handled by middleware that checks the subdomain and renders the appropriate portal. One deployment, one codebase.

---

# MOBILE-FIRST DASHBOARD REQUIREMENTS

> **ALL dashboards are mobile-first.** In India, coordinators work from phones, phlebotomists are on the road, pharmacy staff use phones at the counter, lab technicians use tablets. Desktop is a bonus, not the default.

## Design Principles

### 1. Mobile-First, Not Mobile-Friendly
- Design for 375px width FIRST, then scale UP to desktop
- Every action must be completable on a phone with one thumb
- No hover-dependent interactions — everything tap/press
- Minimum touch target: 44x44px (Apple HIG)
- No tiny dropdowns — use bottom sheets and full-screen selectors on mobile

### 2. PWA (Progressive Web App) — Installable
- All portals must be PWA-installable: `collect.onlyou.life` shows "Add to Home Screen" prompt
- Service worker for offline status viewing (phlebotomist can see today's assignments even with spotty connection)
- Push notifications via service worker (no need for native app for portal users)
- Splash screen with Onlyou branding on launch

### 3. Bottom Navigation on Mobile
- All portals use bottom navigation bar on mobile (not hamburger menus)
- Max 4-5 tabs in bottom nav
- Active tab highlighted

### 4. Responsive Breakpoints
```
Mobile:  < 640px   → Single column, bottom nav, full-screen modals
Tablet:  640-1024px → Two columns where useful, bottom nav
Desktop: > 1024px   → Full dashboard layout, sidebar nav, multi-panel views
```

## Portal-Specific Mobile Layouts

### Doctor Dashboard (`doctor.onlyou.life`)
**Mobile bottom nav:** Queue | Review | Messages | Profile

- **Queue tab:** Scrollable list of case cards. Swipe left to quick-assign. Pull to refresh. Filter chips at top (condition, status). Badge counts on each filter.
- **Review tab:** Opens when tapping a case. Single-column scroll: patient info → questionnaire (collapsible) → AI assessment → photos (swipeable gallery) → lab results → action buttons (sticky bottom bar: Prescribe | Message | Refer | More).
- **Prescription builder:** Full-screen bottom sheet. Template selector → medication list → dosage → notes → sign & send. Large buttons.
- **Messages:** Standard chat interface. Canned response picker as bottom sheet.

**Desktop additions:** Multi-panel layout (queue left, review center, actions right). Photo comparison side-by-side. Inline prescription builder.

### Admin Dashboard (`admin.onlyou.life`)
**Mobile bottom nav:** Lab Orders | Deliveries | Partners | Settings

- **Lab Orders tab:** Filterable list by status. Each card shows: patient name, tests, status badge (color-coded), assigned phlebotomist, time since last update. Tap to expand → full timeline + action buttons (assign phlebotomist, escalate, etc.)
- **Deliveries tab:** Same pattern. Cards with: patient, medication, status, pharmacy, delivery person. Tap to expand → assign delivery, enter details.
- **Partners tab:** Manage clinics, labs, pharmacies, phlebotomists. Simple CRUD.
- **SLA alerts:** Red badge on relevant tab when SLA breached. Tapping shows overdue items sorted by urgency.

**Desktop additions:** Split view (list + detail). Dashboard overview with stats (orders today, SLA breaches, pending assignments).

### Collection Portal (`collect.onlyou.life`)
**This is the most critical mobile portal — phlebotomists ONLY use phones.**

**Mobile layout:** Single-screen focused design. NO tabs needed.

- **Main screen:** Today's Assignments list
  ```
  ┌─────────────────────────────────────┐
  │  Today's Collections (3)            │
  │                                     │
  │  ┌─────────────────────────────┐    │
  │  │ 🔵 8:00-10:00 AM            │    │
  │  │ Rahul M. — Banjara Hills    │    │
  │  │ TSH, CBC, Ferritin, Vit D   │    │
  │  │ [Navigate 📍] [Call 📞]      │    │
  │  │ [Mark Collected ✅]          │    │
  │  └─────────────────────────────┘    │
  │                                     │
  │  ┌─────────────────────────────┐    │
  │  │ ⚪ 10:00-12:00 PM           │    │
  │  │ Priya S. — Jubilee Hills    │    │
  │  │ Testosterone, LH, FSH       │    │
  │  │ [Navigate 📍] [Call 📞]      │    │
  │  └─────────────────────────────┘    │
  │                                     │
  │  ┌─────────────────────────────┐    │
  │  │ ✅ COMPLETED 9:15 AM        │    │
  │  │ Amit K. — Madhapur          │    │
  │  │ 3 tubes collected            │    │
  │  │ [Deliver to Lab 🏥]         │    │
  │  └─────────────────────────────┘    │
  └─────────────────────────────────────┘
  ```
- **Navigate:** Opens Google Maps with patient address
- **Call:** Direct phone dial
- **Mark Collected:** Full-screen confirmation — tube count input → confirm → done
- **Running Late:** Button at top → enters new ETA → patient auto-notified
- **Patient Unavailable:** Reason selector → confirm → coordinator notified
- **Deliver to Lab:** Select which lab from list → confirm → status updates

**Offline mode:** If network drops, show cached assignments. Queue status updates to sync when back online.

### Lab Portal (`lab.onlyou.life`)
**Mobile bottom nav:** Pending | In Progress | Upload Results

- **Pending tab:** Incoming samples to acknowledge. Card: Sample ID, tests ordered, delivered by, time. Big **"Mark Received"** button.
- **In Progress tab:** Samples being processed. **"Mark Processing Started"** if not yet clicked.
- **Upload Results tab:** Select sample → camera/file picker for PDF → flag each test Normal/Abnormal/Critical → **"Submit Results"** button.
- **Report Issue:** Available on any sample card. Reason selector → auto-escalates.

### Pharmacy Portal (`pharmacy.onlyou.life`)
**Mobile bottom nav:** New Orders | Preparing | Ready

- **New Orders tab:** Incoming prescriptions. Card: Patient anonymous ID, medication list, quantities. **"Start Preparing"** button.
- **Preparing tab:** Orders in progress. **"Ready for Pickup"** button.
- **Ready tab:** Completed, waiting for delivery person. Shows pickup status.
- **Stock Issue:** On any order card → select which medication unavailable → coordinator notified.

## Technical Implementation

### Framework
- All portals built as routes within the same Next.js 14 app
- Middleware detects subdomain → routes to correct portal layout
- Tailwind CSS responsive utilities: `sm:`, `md:`, `lg:` breakpoints
- shadcn/ui components (already mobile-friendly)

### PWA Setup
```json
// manifest.json (per portal, different names/icons)
{
  "name": "Onlyou Collect",
  "short_name": "Collect",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#[brand_color]",
  "background_color": "#ffffff",
  "icons": [{ "src": "/icon-192.png", "sizes": "192x192" }]
}
```
- Service worker: cache static assets + last-fetched data for offline viewing
- `beforeinstallprompt` event → show "Add to Home Screen" banner on first visit

### Performance Targets (mobile on 4G)
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Lighthouse mobile score: > 90
- Bundle size per portal: < 200KB gzipped

### Authentication (mobile-optimized)
- OTP input: auto-focus, auto-advance between digits, paste from SMS
- "Remember this device" option (30-day session)
- Biometric unlock for returning users (if PWA supports via WebAuthn)

---

*For condition-specific questionnaires, AI prompts, treatment protocols, and edge cases — see the individual condition spec files.*
