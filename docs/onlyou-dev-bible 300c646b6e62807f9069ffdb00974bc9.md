# onlyou-dev-bible

# Onlyou — Complete Development Bible

### India’s First Vertical-Integrated Clinical Telehealth Platform

### Version 1.0 | February 2026

---

# TABLE OF CONTENTS

1. [Product Overview & Vision](about:blank#1-product-overview)
2. [Tech Stack — Final Decisions](about:blank#2-tech-stack)
3. [System Architecture](about:blank#3-system-architecture)
4. [Database Schema](about:blank#4-database-schema)
5. [All Interfaces & Dashboards](about:blank#5-interfaces)
    - 5.1 Patient App (iOS)
    - 5.2 Doctor Dashboard (Web)
    - 5.3 Nurse/Care Coordinator Dashboard (Web)
    - 5.4 Pharmacy & Fulfillment Dashboard (Web)
    - 5.5 Admin/Ops Dashboard (Web)
    - 5.6 Marketing Landing Page (Web)
6. [AI System Design](about:blank#6-ai-system)
7. [Medical Intake Questionnaire Engine](about:blank#7-questionnaire-engine)
8. [Payment & Subscription System](about:blank#8-payments)
9. [Notification & Communication System](about:blank#9-notifications)
10. [Compliance & Security](about:blank#10-compliance)
11. [Step-by-Step Build Plan (16 Weeks)](about:blank#11-build-plan)
12. [Cursor/Antigravity IDE Implementation Guides](about:blank#12-ide-guides)
13. [API Specification](about:blank#13-api-spec)
14. [Deployment & Infrastructure](about:blank#14-deployment)
15. [Testing Strategy](about:blank#15-testing)

---

# 1. PRODUCT OVERVIEW

## What Is Onlyou?

Onlyou is a subscription-based clinical telehealth platform for India that treats stigmatized, chronic health conditions through a fully integrated stack: patient acquisition → AI-powered medical intake → doctor consultation → e-prescription → pharmacy fulfillment → medication delivery → ongoing monitoring.

## Launch Verticals

| Vertical | Conditions | Key Medications | Avg. Subscription |
| --- | --- | --- | --- |
| Hair Loss (Men & Women) | Androgenetic alopecia, telogen effluvium | Finasteride (Sch H), Minoxidil (OTC), Biotin | ₹999/mo |
| Sexual Health (Men) | Erectile dysfunction, premature ejaculation | Sildenafil (Sch H), Tadalafil (Sch H), Dapoxetine | ₹799/mo |
| PCOS & Hormonal Health (Women) | PCOS, irregular periods, hormonal acne | Metformin (Sch H), Spironolactone, Inositol, OCP | ₹1,199/mo |
| Weight Management | Obesity, metabolic syndrome | Generic Semaglutide (post Mar 2026), Metformin | ₹2,499/mo |

## Core Differentiators

- **Vertically integrated**: Own the doctor, the pharmacy, and the delivery. Not a marketplace.
- **Drug license moat**: Direct manufacturer procurement = 60-70% gross margins on medications.
- **AI-first clinical workflow**: Doctor reviews AI-generated summaries, not raw patient data. 10x throughput.
- **Subscription model on chronic conditions**: High LTV, low churn by nature.
- **Discreet by design**: Plain packaging, no branding on boxes, privacy-first UX.

---

# 2. TECH STACK — FINAL DECISIONS

## Overview

| Layer | Technology | Why |
| --- | --- | --- |
| **Patient App (iOS + Android)** | React Native (Expo) + TypeScript | Single codebase for both platforms. Same language as web dashboards (TypeScript). Expo handles HealthKit, camera, push, biometrics out of the box. Massive ecosystem. AI coding assistants (Cursor/Antigravity) have strongest TypeScript support. |
| **Web Dashboards** | Next.js 14 (App Router) + TypeScript + Tailwind CSS | SSR for SEO (landing page), RSC for dashboards, one framework for all web surfaces |
| **Backend API** | NestJS + TypeScript + GraphQL (Apollo) | Modular, typed, middleware-rich, perfect for healthcare microservices |
| **Database** | PostgreSQL 16 + Prisma ORM | Relational data (patients, prescriptions, orders), ACID compliance, row-level security, JSON columns for flexible questionnaire responses |
| **Cache** | Redis | Session management, rate limiting, real-time status, OTP storage |
| **File Storage** | AWS S3 (or Cloudflare R2 for cost) | Patient photos (hair, skin), prescriptions PDFs, ID documents |
| **AI/LLM** | Claude API (claude-sonnet-4-5-20250929) | Medical intake pre-assessment, treatment recommendations, patient communication |
| **Payments** | Razorpay (subscriptions + UPI + cards) | India’s best payment infra, subscription billing built-in, UPI mandatory for India |
| **SMS/WhatsApp** | MSG91 or Gupshup | OTP, order updates, prescription notifications, WhatsApp Business API |
| **Email** | Resend or AWS SES | Transactional emails (receipts, reports) |
| **Push Notifications** | Firebase Cloud Messaging (FCM) + APNs | iOS and Android push |
| **Video Calls** | Daily.co or 100ms | HIPAA-compliant video for live consultations (Phase 2) |
| **Hosting** | AWS (Mumbai region ap-south-1) | Data residency in India, DPDPA compliance |
| **CI/CD** | GitHub Actions | Automated testing, deployment |
| **Monitoring** | Sentry (errors) + Grafana/Prometheus (metrics) | Production observability |
| **CMS** | Sanity | Blog, educational content, condition pages for SEO |

## Why These Specific Choices

**Why React Native (Expo) over native Swift + Kotlin?** You’re a solo developer. Building and maintaining two separate native codebases doubles your work. React Native with Expo gives you one codebase that ships to both iOS and Android, written in TypeScript — the same language as your web dashboards. This means shared types, shared validation schemas (Zod), shared GraphQL queries, and one mental model across your entire product. Expo’s managed workflow handles native modules (camera, HealthKit, push notifications, biometrics, secure storage) without you touching Xcode or Android Studio directly. The New Architecture (Fabric + TurboModules) has eliminated the old performance gap. Apps like Coinbase, Discord, and Shopify use React Native in production.

**Why React Native over Flutter?** Flutter uses Dart, which means maintaining two languages across your stack (Dart for mobile, TypeScript for web). Cursor and Antigravity have significantly stronger TypeScript support than Dart. Flutter’s widget system also renders its own pixels rather than using native platform components, which can create an “uncanny valley” feel — less of an issue for most apps, but for a health app where trust matters, native platform conventions help. React Native uses actual native components under the hood.

**Why NestJS over Express/Fastify?** NestJS gives you dependency injection, guards (for role-based access — doctor vs patient vs admin), interceptors (for audit logging every PHI access), and a module system that maps perfectly to healthcare microservices. Raw Express would require you to build all of this from scratch.

**Why PostgreSQL over MongoDB?** Healthcare data is inherently relational: Patient → has Consultations → generates Prescriptions → creates Orders → triggers Shipments. Each entity references others. Postgres gives you foreign keys, transactions, and JSON columns (for flexible questionnaire responses). MongoDB would force you to denormalize everything and lose referential integrity.

**Why GraphQL over REST?** You have an iOS app, an Android app (later), and 4+ web dashboards all consuming the same API. Each needs different data shapes. GraphQL lets each client request exactly what it needs. The doctor dashboard needs patient history + prescription data. The pharmacy dashboard needs order + medication data. One API, multiple consumers.

**Why Razorpay over Stripe?** Stripe India has limited UPI support and higher fees. Razorpay is purpose-built for India — UPI autopay for subscriptions, net banking, cards, and wallets. 80%+ of your transactions will be UPI.

---

# 3. SYSTEM ARCHITECTURE

## High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│                                                                  │
│  ┌──────────────────────────────┐  ┌────────────────────────┐   │
│  │  Mobile App (iOS + Android)  │  │  Next.js Web App       │   │
│  │  React Native (Expo)         │  │  (Landing + Dashboards)│   │
│  │  TypeScript                  │  │  TypeScript             │   │
│  └──────────────┬───────────────┘  └───────────┬────────────┘   │
│                 │                               │                │
│                 └───────────────┬───────────────┘                │
│                                 │                                │
│                          GraphQL API (HTTPS)                     │
└─────────────────────────────────┼────────────────────────────────┘
                            │
┌───────────────────────────┼──────────────────────────────────────┐
│                      API GATEWAY                                  │
│                  (NestJS + Apollo GraphQL)                         │
│                                                                   │
│  ┌───────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────────┐  │
│  │ JWT Auth  │ │ Rate     │ │ Audit    │ │ Role-Based        │  │
│  │ Guard     │ │ Limiter  │ │ Logger   │ │ Access Control    │  │
│  └───────────┘ └──────────┘ └──────────┘ └───────────────────┘  │
└───────────────────────────┼──────────────────────────────────────┘
                            │
┌───────────────────────────┼──────────────────────────────────────┐
│                     SERVICE LAYER (NestJS Modules)                │
│                                                                   │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐  │
│  │ Auth Module     │  │ User Module    │  │ Intake Module      │  │
│  │ - JWT/Refresh   │  │ - Profiles     │  │ - Questionnaires   │  │
│  │ - OTP (SMS)     │  │ - KYC/Aadhaar  │  │ - Branching Logic  │  │
│  │ - Apple/Google  │  │ - Addresses    │  │ - Photo Uploads    │  │
│  └────────────────┘  └────────────────┘  └────────────────────┘  │
│                                                                   │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐  │
│  │ AI Module       │  │ Consultation   │  │ Prescription       │  │
│  │ - Claude API    │  │ Module         │  │ Module             │  │
│  │ - Pre-assess    │  │ - Async review │  │ - E-prescription   │  │
│  │ - Treatment rec │  │ - Video calls  │  │ - Drug interactions│  │
│  │ - Chat support  │  │ - Doctor notes │  │ - Refill logic     │  │
│  └────────────────┘  └────────────────┘  └────────────────────┘  │
│                                                                   │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐  │
│  │ Subscription    │  │ Pharmacy       │  │ Fulfillment        │  │
│  │ Module          │  │ Module         │  │ Module             │  │
│  │ - Razorpay sub  │  │ - Inventory    │  │ - Shiprocket/      │  │
│  │ - Plan mgmt     │  │ - Procurement  │  │   Delhivery API    │  │
│  │ - Invoicing     │  │ - Batch mgmt   │  │ - Tracking         │  │
│  │ - Dunning       │  │ - Expiry track │  │ - Returns          │  │
│  └────────────────┘  └────────────────┘  └────────────────────┘  │
│                                                                   │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐  │
│  │ Notification    │  │ Content Module │  │ Analytics Module   │  │
│  │ Module          │  │ - Sanity CMS   │  │ - Events tracking  │  │
│  │ - Push (FCM)    │  │ - Blog/SEO     │  │ - Funnel metrics   │  │
│  │ - SMS (MSG91)   │  │ - Condition    │  │ - Cohort analysis  │  │
│  │ - WhatsApp      │  │   education    │  │ - Revenue dashbd   │  │
│  │ - Email (SES)   │  │               │  │                    │  │
│  └────────────────┘  └────────────────┘  └────────────────────┘  │
└───────────────────────────┼──────────────────────────────────────┘
                            │
┌───────────────────────────┼──────────────────────────────────────┐
│                       DATA LAYER                                  │
│                                                                   │
│  ┌──────────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │
│  │ PostgreSQL   │  │ Redis    │  │ AWS S3   │  │ Sanity       │ │
│  │ (Primary DB) │  │ (Cache)  │  │ (Files)  │  │ (CMS)        │ │
│  │              │  │          │  │          │  │              │ │
│  │ - Users      │  │ - OTPs   │  │ - Photos │  │ - Blog       │ │
│  │ - Patients   │  │ - Session│  │ - Rx PDFs│  │ - Conditions │ │
│  │ - Consults   │  │ - Cache  │  │ - IDs    │  │ - FAQs       │ │
│  │ - Rx         │  │ - Queues │  │ - Labels │  │              │ │
│  │ - Orders     │  │          │  │          │  │              │ │
│  │ - Inventory  │  │          │  │          │  │              │ │
│  └──────────────┘  └──────────┘  └──────────┘  └──────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

## Service Communication

All services are NestJS modules within a single monolith (for MVP). This is intentional — microservices at this scale add operational complexity without benefit. When you hit 10K+ subscribers, you can extract services. For now, module boundaries give you the separation you need while keeping deployment simple.

Inter-module communication is via direct method calls through NestJS’s dependency injection. No message queues needed at MVP scale. Add BullMQ (Redis-backed) when you need async job processing (batch prescription generation, bulk SMS).

## Shared TypeScript Package

One of the biggest advantages of React Native + Next.js + NestJS all being TypeScript is code sharing. Create a `/shared` package in your monorepo:

```
/shared
├── types/
│   ├── user.ts           # User, PatientProfile, DoctorProfile types
│   ├── consultation.ts   # Consultation, AIPreAssessment types
│   ├── prescription.ts   # Prescription, PrescriptionItem types
│   ├── order.ts          # Order, OrderItem, Shipment types
│   ├── subscription.ts   # Subscription, Plan types
│   └── questionnaire.ts  # QuestionnaireTemplate, IntakeResponse types
├── validation/
│   ├── auth.ts           # Zod schemas: phone, OTP, profile
│   ├── intake.ts         # Zod schemas: questionnaire responses
│   ├── address.ts        # Zod schemas: shipping address
│   └── payment.ts        # Zod schemas: payment input
├── constants/
│   ├── verticals.ts      # HAIR_LOSS, SEXUAL_HEALTH, PCOS, WEIGHT
│   ├── statuses.ts       # Order, consultation, subscription statuses
│   └── medications.ts    # Medication schedules, categories
└── utils/
    ├── formatting.ts     # Currency (₹), dates, phone numbers
    ├── bmi.ts            # BMI calculator
    └── questionnaire.ts  # Branching logic evaluator
```

This means: validate a phone number once in `/shared/validation/auth.ts`, use it in the mobile app, the web dashboard, AND the backend. Zero duplication. When you change a validation rule, it updates everywhere.

---

# 4. DATABASE SCHEMA

## Entity Relationship Overview

```
User (1) ──── (1) PatientProfile
  │
  ├── (1:N) Consultation
  │            │
  │            ├── (1:1) AIPreAssessment
  │            ├── (1:1) DoctorReview
  │            └── (1:N) Prescription
  │                        │
  │                        └── (1:N) PrescriptionItem
  │
  ├── (1:N) Subscription
  │            │
  │            └── (1:N) Payment
  │
  ├── (1:N) Order
  │            │
  │            ├── (1:N) OrderItem
  │            └── (1:1) Shipment
  │
  ├── (1:N) IntakeResponse
  │
  ├── (1:N) ProgressPhoto
  │
  └── (1:N) Message (patient ↔ care team)

Doctor (1) ──── (N) Consultation
  │
  └── (1:N) DoctorReview

Medication (1) ──── (N) PrescriptionItem
  │
  └── (1:N) InventoryBatch

Staff (admin/nurse/pharmacist) ──── role-based access
```

## Core Tables (Prisma Schema)

```
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ──────────────────────────────────────────
// USERS & AUTH
// ──────────────────────────────────────────

enum UserRole {
  PATIENT
  DOCTOR
  NURSE
  PHARMACIST
  ADMIN
  SUPER_ADMIN
}

enum Gender {
  MALE
  FEMALE
  OTHER
  PREFER_NOT_TO_SAY
}

model User {
  id            String    @id @default(cuid())
  phone         String    @unique  // Primary auth (India = phone-first)
  email         String?   @unique
  passwordHash  String?            // Null for OTP-only auth
  role          UserRole  @default(PATIENT)
  isActive      Boolean   @default(true)
  isVerified    Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  lastLoginAt   DateTime?

  // Relations
  patientProfile  PatientProfile?
  doctorProfile   DoctorProfile?
  staffProfile    StaffProfile?
  sessions        Session[]
  auditLogs       AuditLog[]

  @@index([phone])
  @@index([email])
  @@index([role])
}

model Session {
  id           String   @id @default(cuid())
  userId       String
  token        String   @unique
  refreshToken String   @unique
  deviceInfo   Json?    // { platform, os, appVersion, deviceId }
  expiresAt    DateTime
  createdAt    DateTime @default(now())

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([token])
}

// ──────────────────────────────────────────
// PATIENT
// ──────────────────────────────────────────

model PatientProfile {
  id              String    @id @default(cuid())
  userId          String    @unique
  firstName       String
  lastName        String
  dateOfBirth     DateTime
  gender          Gender
  bloodGroup      String?
  heightCm        Float?
  weightKg        Float?

  // Address
  addressLine1    String?
  addressLine2    String?
  city            String?
  state           String?
  pincode         String?

  // Medical
  allergies       String[]  @default([])
  currentMeds     String[]  @default([])
  medicalHistory  Json?     // Structured: { conditions: [], surgeries: [], familyHistory: [] }

  // KYC
  aadhaarVerified Boolean   @default(false)
  photoUrl        String?

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Relations
  user            User      @relation(fields: [userId], references: [id])
  consultations   Consultation[]
  intakeResponses IntakeResponse[]
  subscriptions   Subscription[]
  orders          Order[]
  progressPhotos  ProgressPhoto[]
  messages        Message[]

  @@index([userId])
}

// ──────────────────────────────────────────
// DOCTOR
// ──────────────────────────────────────────

model DoctorProfile {
  id                  String   @id @default(cuid())
  userId              String   @unique
  firstName           String
  lastName            String
  registrationNumber  String   @unique  // MCI/State Medical Council reg
  council             String             // e.g., "Andhra Pradesh Medical Council"
  specialization      String[]           // ["Dermatology", "Endocrinology"]
  qualifications      String[]           // ["MBBS", "MD Dermatology"]
  experienceYears     Int
  signatureUrl        String?            // Digital signature for prescriptions
  isAvailable         Boolean  @default(true)
  maxDailyReviews     Int      @default(100)
  consultationFee     Int      @default(0) // In paise

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  user                User     @relation(fields: [userId], references: [id])
  consultations       Consultation[]
  doctorReviews       DoctorReview[]

  @@index([userId])
  @@index([isAvailable])
}

// ──────────────────────────────────────────
// STAFF (Nurse, Pharmacist, Admin)
// ──────────────────────────────────────────

model StaffProfile {
  id          String   @id @default(cuid())
  userId      String   @unique
  firstName   String
  lastName    String
  department  String   // "nursing", "pharmacy", "operations", "admin"
  permissions Json     // Granular permissions: { canReviewIntakes: true, canDispenseMeds: true, ... }

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User     @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([department])
}

// ──────────────────────────────────────────
// CLINICAL — INTAKE & QUESTIONNAIRE
// ──────────────────────────────────────────

enum VerticalType {
  HAIR_LOSS
  SEXUAL_HEALTH
  PCOS_HORMONAL
  WEIGHT_MANAGEMENT
}

model QuestionnaireTemplate {
  id          String       @id @default(cuid())
  vertical    VerticalType
  version     Int          @default(1)
  isActive    Boolean      @default(true)
  schema      Json         // JSON Schema defining questions, branching logic, validations
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  intakeResponses IntakeResponse[]

  @@unique([vertical, version])
  @@index([vertical, isActive])
}

model IntakeResponse {
  id                String   @id @default(cuid())
  patientId         String
  templateId        String
  vertical          VerticalType
  responses         Json     // { questionId: answer } — full questionnaire data
  photoUrls         String[] // Scalp photos, skin photos, etc.
  status            String   @default("in_progress") // in_progress, completed, expired
  completedAt       DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  patient           PatientProfile @relation(fields: [patientId], references: [id])
  template          QuestionnaireTemplate @relation(fields: [templateId], references: [id])
  consultation      Consultation?

  @@index([patientId])
  @@index([status])
  @@index([vertical])
}

// ──────────────────────────────────────────
// CLINICAL — CONSULTATION & REVIEW
// ──────────────────────────────────────────

enum ConsultationStatus {
  PENDING_AI_REVIEW
  PENDING_DOCTOR_REVIEW
  PENDING_NURSE_TRIAGE
  IN_REVIEW
  APPROVED
  NEEDS_INFO
  REFERRED_SPECIALIST
  REJECTED
  COMPLETED
}

model Consultation {
  id              String             @id @default(cuid())
  patientId       String
  doctorId        String?
  intakeId        String             @unique
  vertical        VerticalType
  status          ConsultationStatus @default(PENDING_AI_REVIEW)
  priority        Int                @default(0) // 0=normal, 1=high (flagged by AI)

  // AI Assessment
  aiAssessment    AIPreAssessment?

  // Doctor Review
  doctorReview    DoctorReview?

  // Outcome
  prescriptions   Prescription[]
  notes           String?            // Internal notes

  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt
  completedAt     DateTime?

  patient         PatientProfile     @relation(fields: [patientId], references: [id])
  doctor          DoctorProfile?     @relation(fields: [doctorId], references: [id])
  intake          IntakeResponse     @relation(fields: [intakeId], references: [id])

  @@index([status])
  @@index([doctorId])
  @@index([patientId])
  @@index([vertical, status])
}

model AIPreAssessment {
  id                  String   @id @default(cuid())
  consultationId      String   @unique
  summary             String   // Human-readable summary for doctor
  riskLevel           String   // "low", "medium", "high"
  contraindications   String[] // Flagged issues
  suggestedTreatment  Json     // { medications: [...], lifestyle: [...] }
  confidence          Float    // 0-1 score
  flags               String[] // ["drug_interaction", "pregnancy_risk", "age_concern"]
  rawResponse         Json     // Full Claude API response for audit
  modelVersion        String   // e.g., "claude-sonnet-4-5-20250929"
  processingTimeMs    Int
  createdAt           DateTime @default(now())

  consultation        Consultation @relation(fields: [consultationId], references: [id])

  @@index([consultationId])
  @@index([riskLevel])
}

model DoctorReview {
  id                  String   @id @default(cuid())
  consultationId      String   @unique
  doctorId            String
  decision            String   // "approved", "modified", "rejected", "needs_info"
  modifications       Json?    // What the doctor changed from AI suggestion
  clinicalNotes       String?  // Doctor's private notes
  patientMessage      String?  // Message to send to patient
  reviewDurationSec   Int?     // How long the doctor spent reviewing
  createdAt           DateTime @default(now())

  consultation        Consultation @relation(fields: [consultationId], references: [id])
  doctor              DoctorProfile @relation(fields: [doctorId], references: [id])

  @@index([consultationId])
  @@index([doctorId])
}

// ──────────────────────────────────────────
// PRESCRIPTION
// ──────────────────────────────────────────

model Prescription {
  id              String   @id @default(cuid())
  consultationId  String
  patientId       String
  doctorId        String
  prescriptionNo  String   @unique // "OY-RX-20260207-001"
  vertical        VerticalType

  // Telemedicine Practice Guidelines compliance
  doctorName      String
  doctorRegNo     String
  doctorQualification String
  patientName     String
  patientAge      Int
  patientGender   Gender
  diagnosis       String
  chiefComplaint  String

  items           PrescriptionItem[]
  instructions    String?  // General instructions
  followUpDate    DateTime?
  validUntil      DateTime // Prescription expiry

  pdfUrl          String?  // Generated PDF
  signedAt        DateTime?
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())

  consultation    Consultation @relation(fields: [consultationId], references: [id])

  @@index([patientId])
  @@index([doctorId])
  @@index([consultationId])
}

model PrescriptionItem {
  id              String   @id @default(cuid())
  prescriptionId  String
  medicationId    String
  medicationName  String   // Denormalized for prescription PDF
  dosage          String   // "1mg", "5mg"
  frequency       String   // "Once daily", "Twice daily", "As needed"
  duration        String   // "3 months", "6 months", "Ongoing"
  instructions    String?  // "Take with food", "Apply to affected area"
  quantity        Int      // Total quantity to dispense

  prescription    Prescription @relation(fields: [prescriptionId], references: [id])
  medication      Medication @relation(fields: [medicationId], references: [id])

  @@index([prescriptionId])
  @@index([medicationId])
}

// ──────────────────────────────────────────
// PHARMACY & INVENTORY
// ──────────────────────────────────────────

enum DrugSchedule {
  OTC
  SCHEDULE_H
  SCHEDULE_H1
  SCHEDULE_X
}

model Medication {
  id              String       @id @default(cuid())
  genericName     String       // "Finasteride"
  brandName       String?      // "Finpecia"
  manufacturer    String       // "Cipla"
  strength        String       // "1mg"
  form            String       // "tablet", "topical solution", "injection"
  schedule        DrugSchedule
  category        VerticalType[]
  requiresRx      Boolean      @default(true)
  storageTemp     String?      // "Below 25°C", "2-8°C (refrigerated)"
  shelfLifeMonths Int?
  hsnCode         String?      // For GST
  gstRate         Float?       // 5%, 12%, 18%
  isActive        Boolean      @default(true)
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  prescriptionItems PrescriptionItem[]
  inventoryBatches  InventoryBatch[]
  orderItems        OrderItem[]

  @@index([genericName])
  @@index([category])
  @@index([schedule])
}

model InventoryBatch {
  id              String   @id @default(cuid())
  medicationId    String
  batchNumber     String
  manufacturer    String
  purchasePrice   Int      // In paise (₹1 = 100 paise)
  mrp             Int      // Maximum Retail Price in paise
  quantity        Int      // Current stock
  initialQuantity Int      // Starting stock
  manufactureDate DateTime
  expiryDate      DateTime
  receivedDate    DateTime @default(now())
  invoiceNumber   String?
  isQuarantined   Boolean  @default(false) // Held for quality check
  createdAt       DateTime @default(now())

  medication      Medication @relation(fields: [medicationId], references: [id])

  @@index([medicationId])
  @@index([expiryDate])
  @@index([batchNumber])
}

// ──────────────────────────────────────────
// ORDERS & FULFILLMENT
// ──────────────────────────────────────────

enum OrderStatus {
  CREATED
  PAYMENT_PENDING
  PAYMENT_CONFIRMED
  PRESCRIPTION_VERIFIED
  PICKING
  PACKING
  QUALITY_CHECK
  DISPATCHED
  IN_TRANSIT
  OUT_FOR_DELIVERY
  DELIVERED
  RETURN_REQUESTED
  RETURNED
  CANCELLED
  REFUNDED
}

model Order {
  id              String      @id @default(cuid())
  orderNumber     String      @unique // "OY-ORD-20260207-001"
  patientId       String
  subscriptionId  String?
  prescriptionId  String?

  // Pricing
  subtotal        Int         // In paise
  discount        Int         @default(0)
  shippingFee     Int         @default(0)
  gstAmount       Int         @default(0)
  total           Int

  // Shipping
  shippingName    String
  shippingPhone   String
  shippingAddress Json        // { line1, line2, city, state, pincode }
  isDiscreet      Boolean     @default(true) // Plain packaging

  status          OrderStatus @default(CREATED)
  statusHistory   Json[]      // [{ status, timestamp, note }]

  // Fulfillment
  shipment        Shipment?
  items           OrderItem[]
  payments        Payment[]

  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  deliveredAt     DateTime?

  patient         PatientProfile @relation(fields: [patientId], references: [id])
  subscription    Subscription? @relation(fields: [subscriptionId], references: [id])

  @@index([patientId])
  @@index([status])
  @@index([orderNumber])
  @@index([subscriptionId])
}

model OrderItem {
  id              String   @id @default(cuid())
  orderId         String
  medicationId    String
  batchId         String?  // Assigned during picking
  quantity        Int
  unitPrice       Int      // In paise
  totalPrice      Int

  order           Order      @relation(fields: [orderId], references: [id])
  medication      Medication @relation(fields: [medicationId], references: [id])

  @@index([orderId])
}

model Shipment {
  id              String   @id @default(cuid())
  orderId         String   @unique
  courier         String   // "delhivery", "shiprocket", "bluedart"
  trackingNumber  String?
  trackingUrl     String?
  awbNumber       String?  // Air Waybill Number
  estimatedDelivery DateTime?
  actualDelivery  DateTime?
  weight          Float?   // grams
  dimensions      Json?    // { length, width, height } in cm
  shippingLabel   String?  // PDF URL
  status          String   @default("pending") // pending, manifested, picked_up, in_transit, delivered
  statusUpdates   Json[]   // [{ status, timestamp, location }]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  order           Order    @relation(fields: [orderId], references: [id])

  @@index([orderId])
  @@index([trackingNumber])
}

// ──────────────────────────────────────────
// SUBSCRIPTIONS & PAYMENTS
// ──────────────────────────────────────────

enum SubscriptionStatus {
  TRIAL
  ACTIVE
  PAUSED
  PAST_DUE
  CANCELLED
  EXPIRED
}

model SubscriptionPlan {
  id              String       @id @default(cuid())
  name            String       // "Hair Growth Plan - Monthly"
  vertical        VerticalType
  durationMonths  Int          // 1, 3, 6, 12
  price           Int          // In paise
  originalPrice   Int?         // Strike-through price
  medications     Json         // [{ medicationId, quantity, dosage }]
  includes        String[]     // ["Doctor consultation", "Monthly medication", "Progress tracking"]
  isActive        Boolean      @default(true)
  createdAt       DateTime     @default(now())

  subscriptions   Subscription[]

  @@index([vertical, isActive])
}

model Subscription {
  id              String             @id @default(cuid())
  patientId       String
  planId          String
  razorpaySubId   String?            @unique // Razorpay subscription ID
  status          SubscriptionStatus @default(TRIAL)
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime
  cancelledAt     DateTime?
  pausedAt        DateTime?
  trialEndsAt     DateTime?
  nextBillingDate DateTime?

  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt

  patient         PatientProfile     @relation(fields: [patientId], references: [id])
  plan            SubscriptionPlan   @relation(fields: [planId], references: [id])
  orders          Order[]
  payments        Payment[]

  @@index([patientId])
  @@index([status])
  @@index([razorpaySubId])
}

model Payment {
  id                String   @id @default(cuid())
  orderId           String?
  subscriptionId    String?
  razorpayPaymentId String?  @unique
  razorpayOrderId   String?
  amount            Int      // In paise
  currency          String   @default("INR")
  method            String?  // "upi", "card", "netbanking", "wallet"
  status            String   // "created", "authorized", "captured", "failed", "refunded"
  failureReason     String?
  receiptUrl        String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  order             Order?        @relation(fields: [orderId], references: [id])
  subscription      Subscription? @relation(fields: [subscriptionId], references: [id])

  @@index([razorpayPaymentId])
  @@index([orderId])
  @@index([subscriptionId])
}

// ──────────────────────────────────────────
// COMMUNICATION
// ──────────────────────────────────────────

model Message {
  id          String   @id @default(cuid())
  patientId   String
  senderId    String   // Could be patient, doctor, nurse, or system
  senderRole  UserRole
  content     String
  contentType String   @default("text") // "text", "image", "prescription", "system"
  attachments String[] // URLs
  isRead      Boolean  @default(false)
  createdAt   DateTime @default(now())

  patient     PatientProfile @relation(fields: [patientId], references: [id])

  @@index([patientId, createdAt])
  @@index([senderId])
}

// ──────────────────────────────────────────
// PROGRESS TRACKING
// ──────────────────────────────────────────

model ProgressPhoto {
  id          String       @id @default(cuid())
  patientId   String
  vertical    VerticalType
  photoUrl    String
  angle       String?      // "front", "top", "left", "right" (for hair)
  notes       String?
  weekNumber  Int?         // Week since treatment start
  createdAt   DateTime     @default(now())

  patient     PatientProfile @relation(fields: [patientId], references: [id])

  @@index([patientId, vertical, createdAt])
}

model HealthMetric {
  id          String       @id @default(cuid())
  patientId   String
  vertical    VerticalType
  metricType  String       // "weight", "waist_circumference", "hair_density_score", "cycle_regularity"
  value       Float
  unit        String       // "kg", "cm", "score", "days"
  recordedAt  DateTime     @default(now())

  @@index([patientId, metricType, recordedAt])
}

// ──────────────────────────────────────────
// AUDIT & COMPLIANCE
// ──────────────────────────────────────────

model AuditLog {
  id          String   @id @default(cuid())
  userId      String
  action      String   // "view_patient", "create_prescription", "access_photo", "modify_order"
  resource    String   // "patient:cuid123", "prescription:cuid456"
  details     Json?    // Additional context
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id])

  @@index([userId, createdAt])
  @@index([resource])
  @@index([action, createdAt])
}
```

---

# 5. ALL INTERFACES & DASHBOARDS

## 5.1 Patient App (iOS + Android — React Native Expo)

### Screen Map

```
App Launch
├── Splash Screen (logo animation)
├── Onboarding (3 slides: Privacy, Doctor, Delivery)
│
├── Auth Flow
│   ├── Phone Number Entry
│   ├── OTP Verification
│   └── Basic Profile (name, DOB, gender)
│
├── Home (Tab 1: "Today")
│   ├── Active Treatment Card (medication reminders, next delivery)
│   ├── Quick Actions (Chat with doctor, Reorder, Track shipment)
│   ├── Progress Widget (before/after thumbnail, week count)
│   └── Educational Content (condition-specific articles)
│
├── Explore (Tab 2: "Treatments")
│   ├── Vertical Selection (Hair, Sexual Health, PCOS, Weight)
│   ├── Treatment Detail Page
│   │   ├── How it works
│   │   ├── What you get (medication list, doctor access)
│   │   ├── Pricing (monthly, quarterly, annual with savings)
│   │   ├── Before/After gallery
│   │   └── "Start My Treatment" CTA → Intake Flow
│   │
│   └── Intake Flow (per vertical)
│       ├── Step 1: Medical History Questionnaire (branching)
│       ├── Step 2: Current Medications & Allergies
│       ├── Step 3: Photo Upload (guided camera with overlay)
│       ├── Step 4: Shipping Address
│       ├── Step 5: Plan Selection & Payment
│       └── Step 6: Confirmation + Expected Timeline
│
├── Messages (Tab 3)
│   ├── Conversation List (doctor, care team)
│   └── Chat View (text, images, prescription cards)
│
├── Progress (Tab 4)
│   ├── Photo Timeline (side-by-side comparison slider)
│   ├── Health Metrics Chart (weight, cycle, etc.)
│   ├── Medication Adherence Score
│   └── Add New Photo / Log Metric
│
├── Profile (Tab 5)
│   ├── Personal Info
│   ├── Medical Profile
│   ├── Subscription Management
│   │   ├── Current Plan
│   │   ├── Billing History
│   │   ├── Pause/Cancel
│   │   └── Change Plan
│   ├── Orders & Tracking
│   ├── Prescriptions (view/download PDFs)
│   ├── Addresses
│   ├── Notifications Settings
│   ├── Privacy & Data
│   └── Help & Support
│
└── Medication Reminder (Push notification → Quick log)
```

### Key UX Decisions

**Phone-first auth**: No email/password. OTP via SMS. India is phone-first. Add Apple Sign In (required by App Store) and Google Sign In (for Android).

**Guided photo capture**: Use expo-camera with overlay templates showing exactly where to position (e.g., top of head for hair, face front/side for PCOS acne). This ensures photos are medically useful and creates consistent before/after comparisons.

**Discreet app name/icon**: The app icon and name on the home screen should be neutral — just “Onlyou” with a minimal icon. No health/medical imagery. Think of how period tracking apps handle this.

**Medication reminders**: expo-notifications for local scheduled notifications at user-set times. “Did you take your finasteride today?” with Yes/Skip/Snooze. This drives adherence AND provides data for doctor reviews.

**Offline questionnaire**: Save questionnaire progress to AsyncStorage/MMKV. Patient might start on the train, finish at home. Sync when back online.

**Platform-native feel**: Use React Navigation with native stack navigators. iOS gets native swipe-back gestures and blur effects. Android gets Material transitions. Both feel native to their platform despite a single codebase.

---

## 5.2 Doctor Dashboard (Web — Next.js)

### Purpose

The doctor’s primary workspace. Designed for efficiency — the doctor should be able to review and approve a consultation in under 3 minutes.

### Screen Map

```
Doctor Dashboard
│
├── Login (phone OTP or email/password)
│
├── Queue View (Default landing)
│   ├── Filter: All | Hair Loss | Sexual Health | PCOS | Weight
│   ├── Filter: Pending | Flagged | Needs Info
│   ├── Sort: Newest | Priority | Waiting Time
│   │
│   └── Queue Cards (for each consultation):
│       ├── Patient Name (or ID for privacy), Age, Gender
│       ├── Vertical badge (Hair/ED/PCOS/Weight)
│       ├── AI Risk Level badge (Low/Medium/High)
│       ├── Wait time ("Waiting 2h 15m")
│       └── Click → Review View
│
├── Review View (Single consultation deep-dive)
│   ├── LEFT PANEL: Patient Summary
│   │   ├── Demographics (age, gender, BMI)
│   │   ├── Medical History (allergies, conditions, current meds)
│   │   ├── Previous Consultations (if returning patient)
│   │   └── Photos (zoomable, side-by-side with previous)
│   │
│   ├── CENTER PANEL: AI Assessment
│   │   ├── Summary (2-3 paragraph clinical summary)
│   │   ├── Risk Flags (contraindications, interactions)
│   │   ├── Suggested Treatment Protocol
│   │   │   ├── Medications (name, dosage, frequency, duration)
│   │   │   ├── Lifestyle recommendations
│   │   │   └── Follow-up schedule
│   │   └── Confidence Score
│   │
│   ├── RIGHT PANEL: Doctor Actions
│   │   ├── [APPROVE] — Accept AI recommendation as-is
│   │   ├── [MODIFY] — Edit medications/dosages/add notes
│   │   │   ├── Medication search (autocomplete from formulary)
│   │   │   ├── Dosage selector
│   │   │   ├── Duration selector
│   │   │   └── Custom instructions
│   │   ├── [REQUEST INFO] — Ask patient for more details
│   │   │   └── Message composer
│   │   ├── [REFER] — Refer to specialist (outside Onlyou)
│   │   │   └── Reason for referral
│   │   ├── [REJECT] — Cannot treat via telehealth
│   │   │   └── Rejection reason
│   │   └── Clinical notes (private, not shown to patient)
│   │
│   └── BOTTOM: Action bar
│       ├── "Approve & Generate Prescription" button
│       ├── Keyboard shortcuts (A=Approve, M=Modify, R=Request Info)
│       └── Timer showing review duration
│
├── Patient History View
│   ├── All consultations for a patient
│   ├── Prescription history
│   ├── Progress photos timeline
│   └── Health metrics
│
├── My Stats
│   ├── Reviews today / this week / this month
│   ├── Average review time
│   ├── Approval / modification / rejection rates
│   └── Earnings (if per-review compensation)
│
└── Settings
    ├── Availability toggle
    ├── Notification preferences
    ├── Max daily reviews
    └── Profile & credentials
```

### Key UX Decisions

**Keyboard-driven workflow**: Doctors are fast. A/M/R/Enter shortcuts let them fly through reviews without mouse clicks. The AI does 80% of the work; the doctor validates.

**AI assessment is the centerpiece**: Not buried in a sidebar. The doctor reads the AI summary FIRST, then checks patient data only if something seems off. This flips the traditional model where the doctor reads everything and forms their own assessment.

**One-click approve**: For straightforward cases (low risk, standard treatment), the doctor should be able to approve in literally one click. The prescription auto-generates from the approved treatment plan.

**Red/yellow/green coding**: High-risk consultations are immediately visible. Drug interactions, pregnancy flags, age concerns get prominent warning badges.

---

## 5.3 Nurse/Care Coordinator Dashboard (Web — Next.js)

### Purpose

The nurse handles patient communication, follow-ups, triage, and the human touch that keeps patients engaged and subscribed.

### Screen Map

```
Nurse Dashboard
│
├── Inbox (Default landing)
│   ├── Patient Messages (unread count, priority)
│   ├── Follow-up Due (patients needing check-in)
│   ├── Info Requests (doctor asked for more info, nurse follows up)
│   └── New Patient Welcome (first-time subscribers to onboard)
│
├── Patient Communication
│   ├── Chat interface (text + photo sharing)
│   ├── Quick Reply Templates
│   │   ├── "Your prescription is ready and will ship today"
│   │   ├── "Your doctor would like to know [X]"
│   │   ├── "Here's how to use your medication correctly"
│   │   └── Custom templates
│   ├── Escalate to Doctor button
│   └── Schedule Follow-up reminder
│
├── Follow-up Manager
│   ├── Calendar view of scheduled follow-ups
│   ├── Auto-generated check-in tasks
│   │   ├── Week 2: "How are you adjusting to the medication?"
│   │   ├── Month 1: "Any side effects? Upload progress photo"
│   │   ├── Month 3: "Schedule doctor review for treatment adjustment"
│   │   └── Custom milestones per vertical
│   └── Overdue follow-ups (highlighted)
│
├── Triage Queue
│   ├── New intakes that need preliminary review
│   ├── Flag incomplete submissions
│   ├── Verify photo quality (usable for clinical assessment?)
│   └── Route to appropriate doctor
│
├── Patient Directory
│   ├── Search by name, phone, subscription status
│   ├── Filter by vertical, active/inactive
│   └── Quick patient card (subscription status, last interaction, next follow-up)
│
└── Reports
    ├── Patients contacted today
    ├── Response time metrics
    ├── Retention flags (patients approaching cancellation risk)
    └── Side effect reports
```

---

## 5.4 Pharmacy & Fulfillment Dashboard (Web — Next.js)

### Purpose

Manages the complete medication dispensing workflow: from prescription verification through to shipment handoff.

### Screen Map

```
Pharmacy Dashboard
│
├── Order Queue (Default landing)
│   ├── Tabs: New | Verified | Picking | Packing | QC | Ready to Ship | Dispatched
│   │
│   ├── New Orders
│   │   ├── Order card: Order #, patient name, items, subscription/one-time
│   │   ├── Prescription link (view signed e-Rx PDF)
│   │   ├── [VERIFY] — Pharmacist confirms prescription validity
│   │   │   ├── Check: Prescription is signed and within validity
│   │   │   ├── Check: Medications match prescription
│   │   │   ├── Check: No drug interaction flags
│   │   │   └── Check: Patient identity confirmed
│   │   └── [FLAG] — Issue with prescription
│   │
│   ├── Picking
│   │   ├── Pick list (medication, quantity, batch to pick from)
│   │   ├── Batch selection (auto-suggests FEFO — First Expiry First Out)
│   │   ├── Barcode/QR scan to confirm correct medication
│   │   └── [PICKED] — Move to packing
│   │
│   ├── Packing
│   │   ├── Packing checklist (items, leaflet, instructions card)
│   │   ├── Discreet packaging confirmation
│   │   ├── Weight entry (for shipping label)
│   │   └── [PACKED] — Move to QC
│   │
│   ├── Quality Check
│   │   ├── Final verification: items, quantities, expiry dates
│   │   ├── Package integrity check
│   │   └── [QC PASS] → Generate shipping label
│   │
│   └── Ready to Ship
│       ├── Shipping label (auto-generated via Shiprocket/Delhivery API)
│       ├── AWB number
│       ├── Courier assignment
│       ├── Print label
│       └── [DISPATCHED] — Confirm courier pickup
│
├── Inventory Management
│   ├── Stock Levels
│   │   ├── All medications with current stock
│   │   ├── Low stock alerts (configurable threshold)
│   │   ├── Expiry alerts (medications expiring within 3 months)
│   │   └── Zero stock items
│   │
│   ├── Receive Stock
│   │   ├── Add new batch (medication, batch #, qty, mfg date, exp date, purchase price, MRP)
│   │   ├── Invoice upload
│   │   └── Quality quarantine toggle
│   │
│   ├── Stock Adjustments
│   │   ├── Damage/loss writeoff
│   │   ├── Expiry disposal
│   │   └── Transfer between batches
│   │
│   └── Purchase Orders
│       ├── Auto-generated POs based on subscription forecasting
│       ├── Manufacturer contacts
│       └── PO history
│
├── Shipment Tracking
│   ├── All active shipments with status
│   ├── Delivery exceptions (failed delivery, RTO)
│   ├── Return processing
│   └── Courier performance metrics
│
└── Reports
    ├── Daily dispatch summary
    ├── Inventory valuation
    ├── Expiry report
    ├── Batch-wise movement
    └── GST report (for filing)
```

### Key Workflow

The pharmacy flow is critical — it’s where your drug license actually gets used. The process must be:

1. **Order created** (automatically after subscription payment or doctor approval)
2. **Prescription verified** (pharmacist checks the e-Rx is valid, signed, and within date)
3. **Picking** (FEFO batch selection, barcode scan for accuracy)
4. **Packing** (discreet box, medication guide insert, cooling pack if needed)
5. **Quality check** (second person verifies everything)
6. **Label generation** (Shiprocket/Delhivery API generates AWB + label)
7. **Dispatch** (courier pickup, tracking number sent to patient)

---

## 5.5 Admin/Ops Dashboard (Web — Next.js)

### Purpose

The God view. Business metrics, user management, system health, content management.

### Screen Map

```
Admin Dashboard
│
├── Overview (Default landing)
│   ├── Key Metrics (Today / This Week / This Month)
│   │   ├── New subscribers
│   │   ├── Active subscribers (total)
│   │   ├── Revenue (MRR, ARR)
│   │   ├── Orders shipped
│   │   ├── Consultations completed
│   │   ├── Average review time
│   │   └── Churn rate
│   │
│   ├── Revenue Charts
│   │   ├── MRR over time
│   │   ├── Revenue by vertical
│   │   ├── ARPU (Average Revenue Per User)
│   │   └── LTV/CAC ratio
│   │
│   └── Alerts
│       ├── Low inventory items
│       ├── Pending consultations > 24h
│       ├── Payment failures
│       └── Patient complaints
│
├── User Management
│   ├── Patients
│   │   ├── Search, filter, sort
│   │   ├── Patient detail view (everything about a patient)
│   │   ├── Subscription management (pause, cancel, comp)
│   │   └── Communication history
│   │
│   ├── Doctors
│   │   ├── Doctor profiles, credentials
│   │   ├── Performance metrics
│   │   ├── Availability scheduling
│   │   └── Compensation tracking
│   │
│   └── Staff
│       ├── Nurse/pharmacist/admin accounts
│       ├── Role assignment
│       └── Permission management
│
├── Subscription Management
│   ├── All subscriptions (filterable)
│   ├── Dunning management (failed payments)
│   ├── Cancellation reasons analysis
│   ├── Win-back campaigns
│   └── Plan configuration (pricing, medications, duration)
│
├── Financial
│   ├── Revenue dashboard
│   ├── Payment history
│   ├── Refund management
│   ├── GST reports
│   ├── Procurement costs
│   └── Gross margin analysis (by product, by vertical)
│
├── Content Management
│   ├── Questionnaire builder (edit intake forms without code deploys)
│   ├── Treatment protocols (medication defaults per condition)
│   ├── Quick reply templates
│   ├── Push notification campaigns
│   └── Blog/article management (via Sanity CMS link)
│
├── Analytics
│   ├── Funnel analysis (visit → intake → subscribe → retain)
│   ├── Cohort analysis (retention by signup month)
│   ├── Vertical performance comparison
│   ├── Geographic heatmap (where are patients?)
│   ├── Marketing channel attribution
│   └── AI performance (approval rate, modification rate, flag accuracy)
│
├── System
│   ├── API health
│   ├── Error logs (Sentry integration)
│   ├── Audit trail viewer
│   ├── Feature flags
│   └── Environment config
│
└── Compliance
    ├── DPDPA data requests (view/delete patient data)
    ├── Prescription audit trail
    ├── Doctor credential verification status
    └── Drug license documentation
```

---

## 5.6 Marketing Landing Page (Web — Next.js)

### Page Structure

```
Landing Page (/)
├── Hero
│   ├── Headline: "Healthcare designed around you. Discreetly."
│   ├── Subhead: "Doctor-prescribed treatments for hair loss, sexual health, PCOS & weight — delivered to your door"
│   ├── CTA: "Start My Free Consultation"
│   └── Trust badges: Licensed doctors, Certified pharmacy, Discreet delivery
│
├── How It Works (3 steps)
│   ├── 1. "Answer a few questions" (intake icon)
│   ├── 2. "Doctor reviews your case" (doctor icon)
│   └── 3. "Treatment ships to you" (package icon)
│
├── Verticals Section
│   ├── Hair Loss card → /hair-loss
│   ├── Sexual Health card → /sexual-health
│   ├── PCOS & Hormonal card → /pcos
│   └── Weight Management card → /weight [Coming Soon]
│
├── Before/After Gallery (anonymized, with consent)
│
├── Pricing (transparent)
│   ├── Monthly / Quarterly / Annual toggle
│   └── "Starting from ₹799/month"
│
├── Trust Section
│   ├── Doctor credentials
│   ├── Licensed pharmacy badge
│   ├── Privacy commitment
│   └── "Your data never sold"
│
├── FAQ Accordion
│
├── Condition Pages (SEO)
│   ├── /hair-loss — Full page on androgenetic alopecia
│   ├── /sexual-health — ED/PE education
│   ├── /pcos — PCOS guide
│   └── /weight-management — GLP-1 education
│
└── Footer
    ├── About, Contact, Careers
    ├── Legal: Terms, Privacy Policy, Refund Policy
    ├── Medical Disclaimer
    └── Drug License Number display (required by law)
```

---

# 6. AI SYSTEM DESIGN

## Architecture

The AI system has three distinct roles:

### Role 1: Intake Pre-Assessment Engine

**Trigger**: Patient completes intake questionnaire
**Input**: Questionnaire responses (JSON) + photos (URLs) + medical history
**Output**: AIPreAssessment record

```tsx
// ai/prompts/pre-assessment.ts

export const buildPreAssessmentPrompt = (intake: IntakeData): string => `
You are a clinical decision support system for Onlyou, an Indian telehealth platform.
You are NOT providing medical advice. You are generating a structured pre-assessment
summary for a licensed Indian medical doctor (RMP) to review and make the final decision.

CRITICAL DISCLAIMERS:
- You are an AI assistant. You can make mistakes.
- All treatment decisions must be made by the reviewing physician.
- Flag ANY contraindications or concerns, even minor ones.
- When in doubt, recommend specialist referral.

PATIENT DATA:
- Age:${intake.age}
- Gender:${intake.gender}
- BMI:${intake.bmi}
- Vertical:${intake.vertical}
- Chief Complaint:${intake.chiefComplaint}
- Duration:${intake.duration}
- Severity (self-reported):${intake.severity}
- Medical History:${JSON.stringify(intake.medicalHistory)}
- Current Medications:${JSON.stringify(intake.currentMedications)}
- Allergies:${JSON.stringify(intake.allergies)}
- Family History:${JSON.stringify(intake.familyHistory)}
- Questionnaire Responses:${JSON.stringify(intake.responses)}

RESPOND IN THIS EXACT JSON STRUCTURE:
{
  "summary": "2-3 paragraph clinical summary written for the doctor",
  "riskLevel": "low|medium|high",
  "diagnosis_impression": "Likely diagnosis based on presented symptoms",
  "contraindications": ["List of any contraindications found"],
  "drug_interactions": ["List of potential drug interactions with current medications"],
  "suggested_treatment": {
    "medications": [
      {
        "name": "Generic name",
        "dosage": "Recommended dosage",
        "frequency": "Frequency",
        "duration": "Duration",
        "rationale": "Why this medication"
      }
    ],
    "lifestyle": ["Lifestyle recommendations"],
    "monitoring": ["What to monitor and when"],
    "follow_up": "Recommended follow-up schedule"
  },
  "flags": ["List of concerns requiring doctor attention"],
  "referral_needed": false,
  "referral_reason": null,
  "confidence": 0.0-1.0
}

GUIDELINES FOR INDIAN MARKET:
- Only suggest medications available in the Indian market
- Use Indian drug schedules (Schedule H, H1, OTC)
- Consider Indian dietary patterns and lifestyle factors
- Reference Indian clinical guidelines where applicable
- For Schedule H drugs, always note that prescription is mandatory
- Never suggest Schedule X drugs via telehealth
`;
```

### Role 2: Patient Chat Assistant

**Trigger**: Patient sends a message in the app
**Purpose**: Answer common questions, provide medication guidance, escalate to nurse/doctor when needed

```tsx
// ai/prompts/chat-assistant.ts

export const buildChatSystemPrompt = (patient: PatientContext): string => `
You are the Onlyou care assistant. You help patients with:
- Medication usage questions ("When should I take finasteride?")
- Side effect guidance ("Is initial shedding normal with minoxidil?")
- Lifestyle advice related to their treatment
- General health education about their condition
- Emotional support and encouragement

You MUST NOT:
- Diagnose conditions
- Change or suggest changes to prescribed medications
- Provide medical opinions that contradict the treating doctor
- Share other patients' information
- Make promises about treatment outcomes

You MUST escalate to the care team when:
- Patient reports serious side effects
- Patient expresses distress or mental health concerns
- Patient asks to change their medication
- Patient reports a new health condition
- Anything outside your scope

Patient Context:
- Name:${patient.firstName}
- Active Treatment:${patient.vertical}
- Current Medications:${JSON.stringify(patient.medications)}
- Treatment Start:${patient.treatmentStartDate}
- Week:${patient.weekNumber}

Respond in the same language the patient writes in (Hindi, English, or Hinglish).
Keep responses warm, empathetic, and concise.
Always remind them that you're an AI and they should consult their doctor for medical decisions.
`;
```

### Role 3: Analytics & Insights Engine (Phase 2)

For generating doctor-facing insights like “Patients on this treatment protocol show 73% improvement by week 12” based on aggregated, anonymized data.

---

# 7. MEDICAL INTAKE QUESTIONNAIRE ENGINE

## Design Philosophy

The questionnaire IS the product. This is where the patient converts from a visitor to a subscriber. It must be:
- **Fast** (under 5 minutes)
- **Intelligent** (branching logic — skip irrelevant questions)
- **Non-intimidating** (plain language, one question at a time on mobile)
- **Medically thorough** (collect everything the doctor needs)
- **Saveable** (resume from where you left off)

## Schema-Driven Architecture

Questionnaires are defined as JSON schemas stored in the database. This means you can update questions, add new verticals, or modify branching logic without deploying code.

---

# 8. PAYMENT & SUBSCRIPTION SYSTEM

## Razorpay Integration

### Subscription Flow

```
Patient selects plan → Create Razorpay Subscription → Patient authorizes (UPI/Card)
→ First payment captured → Order created → Recurring billing auto-managed by Razorpay
```

### Key Implementation Points

```tsx
// payments/razorpay.service.ts

// 1. Create a subscription
const subscription = await razorpay.subscriptions.create({
  plan_id: razorpayPlanId,        // Pre-created in Razorpay dashboard
  total_count: 12,                 // Max billing cycles
  quantity: 1,
  customer_notify: 0,              // We handle notifications ourselves
  notes: {
    patientId: patient.id,
    vertical: plan.vertical,
    planName: plan.name
  }
});

// 2. Webhook handling (critical for reliability)
// Razorpay sends webhooks for:
// - subscription.activated
// - subscription.charged (recurring payment success)
// - subscription.pending (payment due)
// - subscription.halted (payment failed after retries)
// - subscription.cancelled

// 3. Dunning flow (failed payments)
// Razorpay retries failed payments 3 times over 7 days
// After 3 failures → subscription.halted
// Our system: Send SMS/WhatsApp at each failure asking to update payment method
// Grace period: 3 days after halt before pausing treatment
```

### Pricing Strategy

```
Hair Loss:
  Monthly:   ₹999/mo
  Quarterly: ₹2,499/quarter (₹833/mo — save 17%)
  Annual:    ₹8,999/year (₹750/mo — save 25%)

Sexual Health:
  Monthly:   ₹799/mo
  Quarterly: ₹1,999/quarter (₹666/mo — save 17%)
  Annual:    ₹6,999/year (₹583/mo — save 27%)

PCOS & Hormonal:
  Monthly:   ₹1,199/mo
  Quarterly: ₹2,999/quarter (₹999/mo — save 17%)
  Annual:    ₹10,999/year (₹917/mo — save 24%)

Weight Management:
  Monthly:   ₹2,499/mo
  Quarterly: ₹6,499/quarter (₹2,166/mo — save 13%)
  Annual:    ₹23,999/year (₹2,000/mo — save 20%)
```

---

# 9. NOTIFICATION & COMMUNICATION SYSTEM

## Channels

| Channel | Provider | Use Cases |
| --- | --- | --- |
| Push (iOS) | APNs via Firebase | Medication reminders, order updates, doctor messages |
| Push (Android) | FCM | Same as iOS |
| SMS | MSG91 | OTP, critical alerts (payment failures, prescription ready) |
| WhatsApp | Gupshup / MSG91 | Order tracking, follow-up reminders, re-engagement |
| Email | AWS SES or Resend | Receipts, prescription PDFs, monthly progress reports |
| In-App | Custom | Messages from care team, system notifications |

## Notification Templates

```
// OTP
"{{otp}} is your Onlyou verification code. Valid for 5 minutes. Do not share."

// Prescription Ready
"Great news! Dr. {{doctorName}} has approved your treatment plan.
Your first shipment is being prepared and will ship within 24 hours. 🎉"

// Order Shipped
"Your Onlyou order #{{orderNumber}} has been shipped!
Track: {{trackingUrl}}
Expected delivery: {{estimatedDate}}"

// Medication Reminder (Push)
"Time for your {{medicationName}}! 💊"
[action: "Taken" | "Skipped" | "Remind Later"]

// Follow-up Check-in (WhatsApp)
"Hi {{firstName}}, it's been {{weeks}} weeks since you started your treatment.
How are you feeling? Any side effects?
Reply GOOD, OK, or HELP"

// Payment Failed
"Your Onlyou subscription payment of ₹{{amount}} failed.
Please update your payment method to continue receiving your treatment.
Update here: {{link}}"

// Subscription Renewal
"Your Onlyou subscription renews on {{date}} for ₹{{amount}}.
Your next shipment will arrive by {{deliveryDate}}."
```

---

# 10. COMPLIANCE & SECURITY

## Indian Regulatory Requirements

### Telemedicine Practice Guidelines 2020 (Board of Governors, MCI)

| Requirement | Implementation |
| --- | --- |
| RMP must sign all prescriptions | Doctor digitally signs via dashboard. Signature stored as image. |
| E-prescription format | Generate PDF with: Doctor name, reg #, qualification, patient details, Rx, signature, date |
| Patient consent | Explicit consent checkbox before consultation. Stored with timestamp. |
| Record retention | All consultation records retained for minimum 3 years |
| First consultation restrictions | No Schedule X drugs on first teleconsultation. No narcotics/psychotropics. |
| Follow-up prescriptions | Can be refilled for up to 6 months for chronic conditions without in-person visit |

### DPDPA 2023 (Digital Personal Data Protection Act)

| Requirement | Implementation |
| --- | --- |
| Consent | Explicit, informed consent before data collection. Clear privacy policy. |
| Purpose limitation | Data used only for stated purposes (treatment, billing, communication) |
| Data minimization | Collect only what’s needed for clinical assessment |
| Right to erasure | Patient can request data deletion (with medical record retention exceptions) |
| Data breach notification | 72-hour notification to DPDPA authority + affected individuals |
| Data localization | Store all data in India (AWS Mumbai ap-south-1) |

### Drug & Cosmetics Act 1940 / Pharmacy Act 1948

| Requirement | Implementation |
| --- | --- |
| Valid drug license | Display license number on website and all communications |
| Schedule H labeling | “To be sold by retail on the prescription of a Registered Medical Practitioner only” |
| Prescription validation | Pharmacist verifies every prescription before dispensing |
| Cold chain (if applicable) | Temperature-controlled shipping for semaglutide injections |
| Batch tracking | Every dispensed medication traced to batch # for recall management |

## Technical Security

```
ENCRYPTION:
- Data in transit: TLS 1.3 everywhere
- Data at rest: AES-256 for database (AWS RDS encryption)
- Sensitive fields: Application-level encryption for Aadhaar, medical records
  → Use AWS KMS for key management

AUTHENTICATION:
- Patient: Phone OTP + optional biometric (FaceID/TouchID)
- Doctor: Email/password + OTP (2FA mandatory)
- Staff: Email/password + OTP (2FA mandatory)
- JWT access tokens (15 min expiry) + refresh tokens (30 day expiry)

AUTHORIZATION:
- Role-based access control (RBAC) via NestJS Guards
- Patients can only access their own data
- Doctors can only access assigned consultations
- Nurses can access patient communications they're assigned to
- Pharmacists can access order/inventory data only
- Admin has full access with audit logging

AUDIT LOGGING:
- Every access to patient data logged (who, what, when, from where)
- Audit logs are append-only (cannot be modified or deleted)
- Retained for 5 years minimum
- Searchable by patient ID, user ID, action type, date range

INFRASTRUCTURE:
- VPC with private subnets for database and backend
- No public database endpoints
- WAF (Web Application Firewall) on API
- DDoS protection via AWS Shield
- Regular security scans (Snyk for dependencies)
```

---

# 11. STEP-BY-STEP BUILD PLAN (16 WEEKS)

## Week 1-2: Foundation

### Backend Setup

- [ ]  Initialize NestJS project with TypeScript
- [ ]  Configure PostgreSQL + Prisma ORM
- [ ]  Set up Redis connection
- [ ]  Create Auth module (phone OTP via MSG91)
- [ ]  Create User module (CRUD, roles)
- [ ]  Set up JWT authentication + refresh tokens
- [ ]  Configure AWS S3 for file uploads
- [ ]  Set up basic audit logging interceptor
- [ ]  Write database seed script (test data)
- [ ]  Set up environment configuration (.env)
- [ ]  Configure CORS for web + mobile clients

### DevOps

- [ ]  Set up GitHub repo (monorepo: /backend, /web, /mobile, /shared)
- [ ]  Configure GitHub Actions CI (lint, test, build)
- [ ]  Set up AWS infrastructure (RDS, ElastiCache, S3, EC2/ECS)
- [ ]  Configure staging environment
- [ ]  Set up Sentry error tracking

### Mobile App Setup

- [ ]  Initialize Expo project: `npx create-expo-app onlyou-mobile --template expo-template-blank-typescript`
- [ ]  Install core dependencies: expo-router, nativewind, apollo-client, expo-secure-store, react-native-mmkv
- [ ]  Configure Expo Router (file-based routing) with auth/tabs/intake groups
- [ ]  Configure NativeWind (Tailwind for React Native)
- [ ]  Set up Apollo Client with GraphQL endpoint
- [ ]  Set up expo-secure-store for token management
- [ ]  Configure expo-notifications (push + local)
- [ ]  Set up EAS Build for iOS and Android (`eas build:configure`)
- [ ]  Create app.json with both iOS and Android config
- [ ]  Set up development build with expo-dev-client

## Week 3-4: Core Clinical Flow

### Backend

- [ ]  Create QuestionnaireTemplate module
- [ ]  Build IntakeResponse module (save/resume questionnaire)
- [ ]  Create Consultation module (status workflow)
- [ ]  Integrate Claude API for AI pre-assessment
- [ ]  Build AI pre-assessment prompt engineering
- [ ]  Create Prescription module (generate, sign)
- [ ]  Build e-prescription PDF generator
- [ ]  Implement photo upload flow (S3 presigned URLs)
- [ ]  Create Hair Loss questionnaire schema (JSON)
- [ ]  Create Sexual Health questionnaire schema (JSON)

### Mobile App

- [ ]  Build onboarding screens (3 slides with Lottie animations)
- [ ]  Build phone auth flow (OTP input with auto-fill)
- [ ]  Build profile creation screen (name, DOB, gender)
- [ ]  Build questionnaire engine (renders dynamically from JSON schema)
- [ ]  Build photo capture with expo-camera + overlay guides
- [ ]  Build questionnaire progress saving (MMKV for offline drafts)
- [ ]  Test on both iOS Simulator and Android Emulator

## Week 5-6: Doctor Dashboard + Payments

### Web (Next.js)

- [ ]  Initialize Next.js 14 project with App Router
- [ ]  Set up Tailwind CSS + component library (shadcn/ui)
- [ ]  Build authentication pages (login, OTP)
- [ ]  Build Doctor Dashboard — Queue View
- [ ]  Build Doctor Dashboard — Review View (3-panel layout)
- [ ]  Build Doctor Dashboard — Approve/Modify/Reject workflow
- [ ]  Build Doctor Dashboard — Keyboard shortcuts
- [ ]  Build prescription preview/edit interface
- [ ]  Build Doctor Stats page

### Backend

- [ ]  Create Subscription module
- [ ]  Integrate Razorpay (subscriptions, webhooks)
- [ ]  Create subscription plans in Razorpay dashboard
- [ ]  Build webhook handler for payment events
- [ ]  Create Order module (auto-create from subscription payment)
- [ ]  Build dunning flow (failed payment handling)

## Week 7-8: Pharmacy, Fulfillment & Patient App Core

### Web

- [ ]  Build Pharmacy Dashboard — Order Queue (all tabs)
- [ ]  Build Pharmacy Dashboard — Prescription Verification flow
- [ ]  Build Pharmacy Dashboard — Picking workflow
- [ ]  Build Pharmacy Dashboard — Packing checklist
- [ ]  Build Pharmacy Dashboard — QC check
- [ ]  Build Inventory Management — Stock levels
- [ ]  Build Inventory Management — Receive stock flow
- [ ]  Integrate Shiprocket/Delhivery API for label generation
- [ ]  Build shipment tracking view

### Mobile App

- [ ]  Build Home tab (active treatment card, medication reminders, quick actions)
- [ ]  Build Explore tab (vertical selection, treatment detail pages)
- [ ]  Build plan selection + Razorpay payment integration (react-native-razorpay)
- [ ]  Build order confirmation screen
- [ ]  Build order tracking screen (with shipment status timeline)
- [ ]  Set up push notifications (medication reminders via expo-notifications)
- [ ]  Test payment flow on both iOS and Android

### Backend

- [ ]  Create Fulfillment module (Shiprocket/Delhivery integration)
- [ ]  Build batch management (FEFO selection)
- [ ]  Create shipping label generation service
- [ ]  Build webhook handler for courier tracking updates
- [ ]  Create Notification module (push, SMS, email)
- [ ]  Build medication reminder scheduler (cron jobs)

## Week 9-10: Communication + Nurse Dashboard

### Backend

- [ ]  Create Message module (real-time chat via WebSocket)
- [ ]  Build AI chat assistant (patient-facing)
- [ ]  Create follow-up scheduler (auto-generate check-in tasks)
- [ ]  Build quick reply template system

### Web

- [ ]  Build Nurse Dashboard — Inbox
- [ ]  Build Nurse Dashboard — Patient Communication (chat)
- [ ]  Build Nurse Dashboard — Follow-up Manager
- [ ]  Build Nurse Dashboard — Triage Queue

### Mobile App

- [ ]  Build Messages tab (chat interface with real-time WebSocket)
- [ ]  Build chat UI (message bubbles, typing indicator, image sharing)
- [ ]  Build Progress tab (photo timeline with comparison slider)
- [ ]  Build BeforeAfterSlider component (reanimated gesture handler)
- [ ]  Build health metric charts (recharts-native or victory-native)
- [ ]  Build Profile tab (settings, subscriptions, orders, prescriptions)
- [ ]  Test real-time messaging on both platforms

## Week 11-12: Admin Dashboard + PCOS Vertical

### Web

- [ ]  Build Admin Dashboard — Overview (metrics)
- [ ]  Build Admin Dashboard — User Management
- [ ]  Build Admin Dashboard — Subscription Management
- [ ]  Build Admin Dashboard — Financial reports
- [ ]  Build Admin Dashboard — Analytics
- [ ]  Build Admin Dashboard — Compliance tools

### Clinical

- [ ]  Create PCOS questionnaire schema
- [ ]  Add PCOS-specific AI prompts
- [ ]  Add PCOS medication formulary
- [ ]  Test end-to-end PCOS flow

### Mobile App

- [ ]  Build subscription management (pause, cancel, change plan)
- [ ]  Build prescription viewer (PDF rendering with expo-document-picker or WebView)
- [ ]  Build notification preferences screen
- [ ]  Build address management (add/edit/delete, set default)
- [ ]  Build Hindi language support (i18n with expo-localization)
- [ ]  Cross-platform QA pass (test every screen on iOS + Android)

## Week 13-14: Landing Page + SEO + Polish

### Web

- [ ]  Build marketing landing page (/)
- [ ]  Build condition pages (/hair-loss, /sexual-health, /pcos)
- [ ]  Set up Sanity CMS for blog content
- [ ]  SEO optimization (meta tags, structured data, sitemap)
- [ ]  Build FAQ pages
- [ ]  Build legal pages (Terms, Privacy, Refund)

### Mobile App

- [ ]  UI polish pass (reanimated transitions, loading skeletons, haptic feedback)
- [ ]  Error handling pass (offline states, API failures, retry logic)
- [ ]  Accessibility pass (screen reader labels, dynamic font sizes)
- [ ]  Performance optimization (expo-image caching, list virtualization, memo)
- [ ]  App Store assets (iOS screenshots, Android screenshots, descriptions, keywords)
- [ ]  Google Play Store assets (feature graphic, screenshots, descriptions)
- [ ]  Platform-specific polish (iOS blur effects, Android Material ripples)
- [ ]  Test on low-end Android devices (budget phones are common in India)

## Week 15-16: Testing, QA & Launch

### Testing

- [ ]  Backend: Unit tests for all services
- [ ]  Backend: Integration tests for critical flows (intake → consultation → prescription → order)
- [ ]  Mobile: E2E tests with Detox (onboarding + intake flow on both platforms)
- [ ]  Load testing (can the system handle 100 concurrent intakes?)
- [ ]  Security audit (penetration testing basics)
- [ ]  Prescription PDF compliance review with doctor
- [ ]  End-to-end test with real doctor (full consultation cycle)
- [ ]  Cross-platform regression test (every screen on iOS + Android)

### Launch Prep

- [ ]  Apple App Store submission via EAS Submit (allow 2-3 days for review)
- [ ]  Google Play Store submission via EAS Submit (allow 1-2 days for review)
- [ ]  Domain + SSL setup for production
- [ ]  Production database migration
- [ ]  Configure production monitoring (Sentry, Grafana)
- [ ]  Set up backup strategy (daily DB backups)
- [ ]  Razorpay production mode activation
- [ ]  Test production payment flow (both iOS and Android)
- [ ]  Load seed data (medications, plans, questionnaire templates)

### Go-Live Checklist

- [ ]  Drug license number displayed on website
- [ ]  Doctor credentials visible/verifiable
- [ ]  Privacy policy and terms published
- [ ]  Medical disclaimer on all relevant pages
- [ ]  Consent flows working correctly
- [ ]  Prescription PDF format approved by doctor
- [ ]  SMS/WhatsApp templates approved
- [ ]  Customer support channel ready (WhatsApp Business)
- [ ]  First batch of inventory procured and catalogued
- [ ]  Both App Store and Play Store listings live

---

# 12. CURSOR/ANTIGRAVITY IDE IMPLEMENTATION GUIDES

## System Prompt for Backend Development (Cursor/Antigravity)

```
You are building the backend for Onlyou, an Indian telehealth platform.

TECH STACK:
- NestJS (TypeScript) with GraphQL (Apollo)
- PostgreSQL with Prisma ORM
- Redis for caching and sessions
- AWS S3 for file storage
- Razorpay for payments
- MSG91 for SMS/OTP
- Claude API for AI pre-assessments

PROJECT STRUCTURE:
/backend
├── src/
│   ├── app.module.ts
│   ├── main.ts
│   ├── common/
│   │   ├── guards/           # JWT, Role-based guards
│   │   ├── interceptors/     # Audit logging, response transform
│   │   ├── decorators/       # @CurrentUser, @Roles
│   │   ├── filters/          # Exception filters
│   │   └── pipes/            # Validation pipes
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts
│   │   ├── auth.resolver.ts  # GraphQL resolver
│   │   ├── strategies/       # JWT strategy
│   │   └── dto/
│   ├── user/
│   ├── patient/
│   ├── doctor/
│   ├── intake/
│   ├── consultation/
│   ├── ai/
│   │   ├── ai.module.ts
│   │   ├── ai.service.ts     # Claude API integration
│   │   └── prompts/          # Prompt templates
│   ├── prescription/
│   ├── pharmacy/
│   ├── subscription/
│   ├── payment/
│   ├── fulfillment/
│   ├── notification/
│   ├── message/
│   └── analytics/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── test/
├── .env
├── nest-cli.json
├── tsconfig.json
└── package.json

CODING STANDARDS:
- Always use TypeScript strict mode
- Every service method that touches patient data must call the audit logger
- Use Prisma transactions for multi-table operations
- GraphQL resolvers should be thin — business logic goes in services
- Always validate inputs with class-validator decorators
- Error messages should never expose internal details to clients
- Use environment variables for all secrets and configuration
- Write JSDoc comments for all public service methods

SECURITY RULES:
- Never log sensitive data (passwords, OTPs, medical data)
- Always use parameterized queries (Prisma handles this)
- Rate limit all public endpoints (especially OTP)
- Validate file uploads (type, size) before S3 upload
- Sanitize all user inputs
- CORS: Only allow specific origins
```

## System Prompt for Mobile App Development (Cursor/Antigravity)

```
You are building the mobile app for Onlyou, an Indian telehealth platform.
Single codebase shipping to iOS AND Android.

TECH STACK:
- React Native with Expo SDK 52+ (managed workflow)
- TypeScript (strict mode)
- Expo Router v4 (file-based routing)
- Apollo Client (GraphQL)
- NativeWind v4 (Tailwind CSS for React Native)
- React Hook Form + Zod (form validation — shared schemas with backend)
- expo-secure-store (token storage — Keychain on iOS, EncryptedSharedPreferences on Android)
- expo-camera (guided photo capture)
- expo-notifications (local + push)
- expo-image (fast image loading with caching)
- expo-local-authentication (FaceID/TouchID/Fingerprint)
- react-native-mmkv (fast local storage for questionnaire progress)
- react-native-reanimated (animations)
- expo-health (HealthKit on iOS, Health Connect on Android — Phase 2)

PROJECT STRUCTURE:
/mobile
├── app/                          # Expo Router (file-based routing)
│   ├── _layout.tsx               # Root layout (auth check, providers)
│   ├── index.tsx                 # Splash/redirect
│   ├── (auth)/                   # Auth group
│   │   ├── _layout.tsx
│   │   ├── phone.tsx             # Phone number entry
│   │   ├── otp.tsx               # OTP verification
│   │   └── profile-setup.tsx     # Name, DOB, gender
│   ├── (onboarding)/             # First-time onboarding slides
│   │   ├── _layout.tsx
│   │   └── index.tsx
│   ├── (tabs)/                   # Main tab navigation
│   │   ├── _layout.tsx           # Tab bar config
│   │   ├── home/                 # Tab 1: Today
│   │   │   ├── index.tsx
│   │   │   └── treatment-detail.tsx
│   │   ├── explore/              # Tab 2: Treatments
│   │   │   ├── index.tsx
│   │   │   └── [vertical].tsx    # Dynamic: hair-loss, sexual-health, etc.
│   │   ├── messages/             # Tab 3: Chat
│   │   │   ├── index.tsx
│   │   │   └── [conversationId].tsx
│   │   ├── progress/             # Tab 4: Progress
│   │   │   ├── index.tsx
│   │   │   └── compare.tsx       # Before/after slider
│   │   └── profile/              # Tab 5: Profile
│   │       ├── index.tsx
│   │       ├── medical-info.tsx
│   │       ├── subscriptions.tsx
│   │       ├── orders/
│   │       │   ├── index.tsx
│   │       │   └── [orderId].tsx # Order tracking
│   │       ├── prescriptions.tsx
│   │       ├── addresses.tsx
│   │       └── settings.tsx
│   └── intake/                   # Intake flow (modal stack)
│       ├── _layout.tsx
│       ├── [vertical]/
│       │   ├── questionnaire.tsx # Dynamic questionnaire renderer
│       │   ├── photos.tsx        # Guided photo capture
│       │   ├── plan-select.tsx   # Plan selection + pricing
│       │   ├── address.tsx       # Shipping address
│       │   ├── payment.tsx       # Razorpay checkout
│       │   └── confirmation.tsx  # Success + timeline
├── components/
│   ├── ui/                       # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Input.tsx
│   │   ├── OTPInput.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── Skeleton.tsx
│   │   └── Toast.tsx
│   ├── questionnaire/            # Questionnaire-specific components
│   │   ├── QuestionRenderer.tsx  # Routes to correct question type
│   │   ├── SingleSelect.tsx
│   │   ├── MultiSelect.tsx
│   │   ├── TextInput.tsx
│   │   ├── TextListInput.tsx
│   │   ├── NumberInput.tsx
│   │   ├── DateInput.tsx
│   │   ├── PhotoCapture.tsx      # Camera with overlay
│   │   └── ProgressIndicator.tsx
│   ├── home/
│   │   ├── TreatmentCard.tsx
│   │   ├── MedicationReminder.tsx
│   │   └── QuickActions.tsx
│   ├── chat/
│   │   ├── MessageBubble.tsx
│   │   ├── MessageInput.tsx
│   │   └── TypingIndicator.tsx
│   └── progress/
│       ├── PhotoTimeline.tsx
│       ├── BeforeAfterSlider.tsx
│       └── MetricChart.tsx
├── lib/
│   ├── graphql/
│   │   ├── client.ts             # Apollo Client setup
│   │   ├── queries/              # .graphql query files
│   │   └── mutations/            # .graphql mutation files
│   ├── auth/
│   │   ├── AuthContext.tsx
│   │   └── useAuth.ts
│   ├── storage/
│   │   ├── secureStore.ts        # Token management (expo-secure-store)
│   │   └── mmkv.ts               # Fast local storage (questionnaire drafts)
│   ├── notifications/
│   │   ├── pushSetup.ts          # Register for push (FCM + APNs)
│   │   └── localReminders.ts     # Medication reminder scheduler
│   └── utils/
│       ├── formatting.ts         # Currency, dates, etc.
│       └── validation.ts         # Shared Zod schemas (import from shared package)
├── hooks/
│   ├── useQuestionnaire.ts       # Manages questionnaire state, branching, progress
│   ├── useSubscription.ts
│   ├── useOrders.ts
│   └── useMessages.ts
├── constants/
│   ├── colors.ts                 # Design tokens
│   ├── typography.ts
│   └── config.ts                 # API URLs, feature flags
├── assets/
│   ├── images/
│   ├── fonts/
│   ├── lottie/                   # Loading, success, onboarding animations
│   └── overlays/                 # Camera guide overlays for photo capture
├── app.json                      # Expo config
├── eas.json                      # EAS Build config (for App Store + Play Store builds)
├── tailwind.config.js            # NativeWind config
├── tsconfig.json
└── package.json

DESIGN SYSTEM:
- Color palette:
  - Primary: #0D6B4B (deep green — trust, health, growth)
  - Primary Light: #E8F5EF
  - Secondary: #1A1A2E (deep navy — sophistication)
  - Accent: #F4A261 (warm amber — friendly CTA)
  - Background: #FAFAF8 (warm white)
  - Surface: #FFFFFF
  - Text Primary: #1A1A2E
  - Text Secondary: #6B7280
  - Error: #DC2626
  - Success: #16A34A
  - Warning: #F59E0B

- Typography (NativeWind):
  - Display: System font weight 700, tracking tight
  - Heading: System font weight 600
  - Body: System font weight 400, 16px
  - Caption: System font weight 400, 13px
  - Use platform-default system fonts (SF Pro on iOS, Roboto on Android)
    for maximum trust in a health context

- Spacing: 4px base unit (4, 8, 12, 16, 20, 24, 32, 48, 64)
- Border radius: 8px (cards), 12px (buttons), 24px (pills), 9999px (circles)
- Shadows: Subtle only — health apps should feel clean, not heavy

CODING STANDARDS:
- TypeScript strict mode — no 'any' types
- All components are functional with hooks
- Use expo-router for ALL navigation (file-based routing)
- Use NativeWind (Tailwind) for ALL styling — no StyleSheet.create
- Apollo Client for data fetching — useQuery/useMutation hooks
- React Hook Form + Zod for all forms (share schemas with backend)
- Reanimated for all animations (60fps native thread)
- Every screen must handle: loading, empty, error, and offline states
- Use expo-image instead of React Native Image (better caching, blur hash)
- Store auth tokens in expo-secure-store (never AsyncStorage)
- Store questionnaire drafts in MMKV (fast, synchronous)
- All text must support Hindi + English (i18n-ready from day one)
- Use Platform.select() for platform-specific styling when needed
- Test on both iOS and Android simulators before committing

CRITICAL EXPO NOTES:
- Use Expo SDK 52+
- Use EAS Build for App Store and Play Store submissions
- expo-dev-client for development builds (when using native modules)
- app.json handles both iOS and Android config in one place
- Use expo-constants for environment-based config
- Push notifications: expo-notifications handles both APNs and FCM
- Deep linking: Configured via Expo Router automatically
- OTA updates: expo-updates for bug fixes without store re-submission

PAYMENT INTEGRATION (Razorpay):
- Use react-native-razorpay package
- Medical subscriptions are "real-world goods" — NOT subject to Apple/Google 30% cut
- But Apple requires you declare this in App Review submission
- Razorpay checkout opens as a native modal on both platforms
- Handle webhook confirmations server-side, not in the app

SECURITY:
- Tokens in expo-secure-store (Keychain/EncryptedSharedPrefs)
- Certificate pinning via expo-network (consider for production)
- Biometric auth gate for viewing prescriptions and medical data
- Screen capture prevention on sensitive screens (medical data, prescriptions)
- No sensitive data in console.log (use __DEV__ checks)
```

## System Prompt for Web Dashboard Development (Cursor/Antigravity)

```
You are building the web dashboards for Onlyou, an Indian telehealth platform.

TECH STACK:
- Next.js 14 (App Router) with TypeScript
- Tailwind CSS
- shadcn/ui component library
- Apollo Client (GraphQL)
- Recharts (charts and analytics)
- React Hook Form + Zod (form validation)

PROJECT STRUCTURE:
/web
├── src/
│   ├── app/
│   │   ├── (marketing)/           # Public pages (landing, conditions)
│   │   │   ├── page.tsx           # Landing page
│   │   │   ├── hair-loss/
│   │   │   ├── sexual-health/
│   │   │   └── pcos/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── verify/
│   │   ├── (dashboard)/           # Authenticated area
│   │   │   ├── layout.tsx         # Sidebar + header
│   │   │   ├── doctor/
│   │   │   │   ├── queue/
│   │   │   │   ├── review/[id]/
│   │   │   │   ├── patients/
│   │   │   │   └── stats/
│   │   │   ├── nurse/
│   │   │   │   ├── inbox/
│   │   │   │   ├── follow-ups/
│   │   │   │   └── triage/
│   │   │   ├── pharmacy/
│   │   │   │   ├── orders/
│   │   │   │   ├── inventory/
│   │   │   │   └── shipments/
│   │   │   └── admin/
│   │   │       ├── overview/
│   │   │       ├── users/
│   │   │       ├── subscriptions/
│   │   │       ├── financial/
│   │   │       └── analytics/
│   │   └── api/                   # API routes (webhooks)
│   │       ├── razorpay/webhook/
│   │       └── courier/webhook/
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components
│   │   ├── dashboard/
│   │   ├── forms/
│   │   └── charts/
│   ├── lib/
│   │   ├── graphql/
│   │   ├── auth/
│   │   └── utils/
│   └── hooks/
├── public/
├── tailwind.config.ts
├── next.config.ts
└── package.json

DESIGN PRINCIPLES:
- Clean, professional dashboard aesthetic
- Sidebar navigation with role-based menu items
- Responsive but optimized for desktop (dashboards are desktop-first)
- Status badges with consistent color coding:
  - Green: approved, active, delivered
  - Yellow: pending, in progress
  - Red: rejected, failed, flagged
  - Blue: informational
- Data tables with sorting, filtering, pagination
- Keyboard accessible

CODING STANDARDS:
- Server Components by default, Client Components only when needed
- Use React Server Components for data fetching
- Implement proper loading.tsx and error.tsx for every route
- Use Zod schemas for all form validation
- Consistent error handling with toast notifications
- Role-based route protection via middleware
```

---

# 13. API SPECIFICATION (Key Endpoints)

## GraphQL Schema (Highlights)

```graphql
# Auth
type Mutation {
  sendOTP(phone: String!): OTPResponse!
  verifyOTP(phone: String!, code: String!): AuthResponse!
  refreshToken(refreshToken: String!): AuthResponse!
  logout: Boolean!
}

# Patient
type Query {
  me: User!
  myProfile: PatientProfile!
  myConsultations(status: ConsultationStatus): [Consultation!]!
  mySubscriptions: [Subscription!]!
  myOrders(status: OrderStatus): [Order!]!
  myMessages(cursor: String, limit: Int): MessageConnection!
  myProgressPhotos(vertical: VerticalType!): [ProgressPhoto!]!
}

type Mutation {
  updateProfile(input: UpdateProfileInput!): PatientProfile!
  startIntake(vertical: VerticalType!): IntakeResponse!
  updateIntakeResponse(id: ID!, responses: JSON!): IntakeResponse!
  submitIntake(id: ID!): Consultation!
  uploadPhoto(file: Upload!, type: String!): String! # Returns S3 URL
  sendMessage(content: String!, attachments: [String!]): Message!
  addProgressPhoto(vertical: VerticalType!, photoUrl: String!, angle: String): ProgressPhoto!
  logHealthMetric(vertical: VerticalType!, type: String!, value: Float!, unit: String!): HealthMetric!
  createSubscription(planId: ID!, addressId: ID!): SubscriptionResponse!
  cancelSubscription(id: ID!, reason: String): Subscription!
  pauseSubscription(id: ID!): Subscription!
}

# Doctor
type Query {
  consultationQueue(
    vertical: VerticalType
    status: ConsultationStatus
    sortBy: QueueSortBy
  ): [Consultation!]!
  consultation(id: ID!): Consultation!
  patientHistory(patientId: ID!): PatientHistory!
  myDoctorStats(period: StatsPeriod!): DoctorStats!
}

type Mutation {
  startReview(consultationId: ID!): Consultation!
  approveConsultation(id: ID!, notes: String): Consultation!
  modifyTreatment(id: ID!, input: ModifyTreatmentInput!): Consultation!
  requestMoreInfo(id: ID!, message: String!): Consultation!
  rejectConsultation(id: ID!, reason: String!): Consultation!
  referToSpecialist(id: ID!, reason: String!, speciality: String!): Consultation!
}

# Pharmacy
type Query {
  orderQueue(status: OrderStatus, tab: PharmacyTab): [Order!]!
  inventoryLevels(lowStockOnly: Boolean): [InventoryLevel!]!
  expiringBatches(withinDays: Int!): [InventoryBatch!]!
}

type Mutation {
  verifyPrescription(orderId: ID!): Order!
  assignBatch(orderItemId: ID!, batchId: ID!): OrderItem!
  markPicked(orderId: ID!): Order!
  markPacked(orderId: ID!, weight: Float!): Order!
  passQualityCheck(orderId: ID!): Order!
  generateShippingLabel(orderId: ID!): Shipment!
  markDispatched(orderId: ID!, trackingNumber: String!): Order!
  receiveStock(input: ReceiveStockInput!): InventoryBatch!
  adjustStock(batchId: ID!, adjustment: Int!, reason: String!): InventoryBatch!
}

# Admin
type Query {
  dashboardMetrics(period: StatsPeriod!): DashboardMetrics!
  allUsers(role: UserRole, search: String, page: Int): UserConnection!
  allSubscriptions(status: SubscriptionStatus, vertical: VerticalType): SubscriptionConnection!
  revenueReport(startDate: DateTime!, endDate: DateTime!): RevenueReport!
  funnelAnalytics(vertical: VerticalType, period: StatsPeriod!): FunnelData!
  auditLogs(userId: ID, action: String, startDate: DateTime, endDate: DateTime): [AuditLog!]!
}
```

---

# 14. DEPLOYMENT & INFRASTRUCTURE

## AWS Architecture (Mumbai — ap-south-1)

```
Internet
    │
    ├── CloudFront (CDN) → Next.js static assets, images
    │
    ├── Route 53 (DNS) → onlyou.in
    │
    └── Application Load Balancer
        │
        ├── ECS Fargate (Backend — NestJS)
        │   ├── Task: api (port 4000)
        │   ├── Auto-scaling: 1-4 tasks
        │   └── Health checks: /health
        │
        └── ECS Fargate (Web — Next.js)
            ├── Task: web (port 3000)
            ├── Auto-scaling: 1-3 tasks
            └── Health checks: /api/health

    ┌── RDS PostgreSQL 16 (db.t3.medium)
    │   ├── Multi-AZ: Yes
    │   ├── Encrypted: Yes
    │   ├── Automated backups: 7 days
    │   └── Private subnet only
    │
    ├── ElastiCache Redis (cache.t3.micro)
    │   └── Private subnet only
    │
    ├── S3 Bucket (onlyou-uploads)
    │   ├── Encryption: SSE-S3
    │   ├── Lifecycle: Move to Glacier after 1 year
    │   └── CORS: Configured for presigned URLs
    │
    └── CloudWatch (Logs + Metrics + Alarms)
```

## Estimated Monthly AWS Cost (MVP)

| Service | Config | Monthly Cost |
| --- | --- | --- |
| ECS Fargate (Backend) | 0.5 vCPU, 1GB RAM, 2 tasks | ~₹3,000 |
| ECS Fargate (Web) | 0.25 vCPU, 0.5GB RAM, 1 task | ~₹1,500 |
| RDS PostgreSQL | db.t3.micro, Multi-AZ | ~₹3,000 |
| ElastiCache Redis | cache.t3.micro | ~₹1,200 |
| S3 | ~10GB storage + transfers | ~₹200 |
| CloudFront | ~50GB transfer | ~₹400 |
| Route 53 | 1 hosted zone | ~₹50 |
| CloudWatch | Basic monitoring | ~₹500 |
| **Total** |  | **~₹10,000/mo** |

## Domain & SSL

- Primary: `onlyou.in` (register on GoDaddy or Namecheap)
- API: `api.onlyou.in`
- Dashboard: `dashboard.onlyou.in`
- SSL: AWS Certificate Manager (free)

---

# 15. TESTING STRATEGY

## Priority Testing Matrix

| Test Type | Scope | Tools | Priority |
| --- | --- | --- | --- |
| Unit Tests | Service methods, utilities | Jest | HIGH |
| Integration Tests | API endpoints, DB operations | Jest + Supertest | HIGH |
| E2E Clinical Flow | Intake → Consultation → Rx → Order | Cypress | CRITICAL |
| Payment Flow | Subscription create → charge → webhook | Razorpay test mode | CRITICAL |
| iOS UI Tests | Onboarding, intake, payment | XCTest | MEDIUM |
| Load Testing | 100 concurrent intakes, 50 concurrent doctor reviews | k6 | MEDIUM |
| Security | SQL injection, XSS, auth bypass | OWASP ZAP | HIGH |

## Critical Test Scenarios

```
1. Happy Path: New patient → Hair loss intake → AI assessment → Doctor approves
   → Prescription generated → Payment succeeds → Order created → Shipped → Delivered

2. AI Flags High Risk: Patient has drug interaction → AI flags "high" risk
   → Doctor sees warning prominently → Doctor modifies treatment or refers

3. Payment Failure: Subscription renewal fails → Dunning SMS sent
   → Patient updates payment → Retry succeeds → No treatment gap

4. Doctor Requests Info: Incomplete intake → Doctor asks for more details
   → Patient receives notification → Patient responds → Doctor reviews again

5. Prescription Refill: Monthly subscription renews → New order auto-created
   → Same prescription (if within validity) → Pharmacy picks → Ships

6. Cancellation: Patient cancels mid-cycle → Prorated refund calculated
   → Remaining medications shipped → Subscription marked inactive

7. Inventory Alert: Stock drops below threshold → Auto-PO generated
   → Admin notified → New batch received and catalogued

8. Data Deletion Request: Patient requests data erasure
   → System anonymizes patient data → Retains medical records (legal requirement)
   → Confirms deletion to patient
```

---

# APPENDIX A: Quick-Reference Commands

## Backend

```bash
# Setup
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run seed

# Development
npm run start:dev          # Hot reload
npm run start:debug        # Debug mode

# Testing
npm run test               # Unit tests
npm run test:e2e           # Integration tests
npm run test:cov           # Coverage report

# Database
npx prisma studio          # Visual DB browser
npx prisma migrate deploy  # Production migrations
```

## Web

```bash
# Setup
cd web
npm install

# Development
npm run dev                # http://localhost:3000

# Build
npm run build
npm run start              # Production mode
```

## Mobile App

```bash
# Setup
cd mobile
npm install
npx expo install              # Ensure compatible versions

# Development
npx expo start                # Start dev server (press i for iOS, a for Android)
npx expo start --dev-client   # With native modules (after first EAS build)

# Build (via EAS)
eas build --platform ios      # iOS build for App Store / TestFlight
eas build --platform android  # Android build for Play Store / APK
eas build --platform all      # Both platforms

# Submit to stores
eas submit --platform ios     # Submit to App Store Connect
eas submit --platform android # Submit to Google Play Console

# OTA Update (skip store review for JS-only changes)
eas update --branch production --message "Bug fix: medication reminder timing"

# Testing
npx expo run:ios              # Run on iOS simulator
npx expo run:android          # Run on Android emulator
```

---

# APPENDIX B: Third-Party Account Setup Checklist

- [ ]  AWS Account (with billing alerts set at ₹5K, ₹10K, ₹20K)
- [ ]  Razorpay Business Account (KYC required — takes 2-3 days)
- [ ]  MSG91 Account (for OTP and SMS)
- [ ]  Gupshup Account (for WhatsApp Business API)
- [ ]  Anthropic API Key (Claude for AI assessments)
- [ ]  Sentry Account (error tracking — free tier sufficient)
- [ ]  Sanity Account (CMS — free tier sufficient)
- [ ]  Shiprocket Account (shipping — or Delhivery direct)
- [ ]  GitHub Organization (private repos)
- [ ]  Apple Developer Account (already have ✓)
- [ ]  Google Play Developer Account (₹2,100 one-time — needed for Android launch)
- [ ]  Expo Account (free — for EAS Build and Submit)
- [ ]  Domain: onlyou.in (check availability)
- [ ]  Cloudflare Account (DNS + CDN — free tier)
- [ ]  Firebase Project (push notifications)

---

# APPENDIX C: Medication Formulary (Launch)

## Hair Loss

| Generic Name | Brand (India) | Manufacturer | Schedule | Form | Strength | Est. Procurement Cost |
| --- | --- | --- | --- | --- | --- | --- |
| Finasteride | Finpecia | Cipla | Sch H | Tablet | 1mg | ₹3-5/tab |
| Minoxidil | Mintop | Dr. Reddy’s | OTC | Solution | 5% (60ml) | ₹150-200/bottle |
| Biotin | Keraglo | Sun Pharma | OTC | Tablet | 10mg | ₹5-8/tab |
| Ketoconazole | Nizral | J&J | OTC | Shampoo | 2% (100ml) | ₹120-150/bottle |

## Sexual Health

| Generic Name | Brand (India) | Manufacturer | Schedule | Form | Strength | Est. Procurement Cost |
| --- | --- | --- | --- | --- | --- | --- |
| Sildenafil | Penegra | Zydus | Sch H | Tablet | 50mg, 100mg | ₹15-25/tab |
| Tadalafil | Megalis | Macleods | Sch H | Tablet | 10mg, 20mg | ₹20-30/tab |
| Dapoxetine | Duralast | Sun Pharma | Sch H | Tablet | 30mg, 60mg | ₹25-40/tab |

## PCOS & Hormonal

| Generic Name | Brand (India) | Manufacturer | Schedule | Form | Strength | Est. Procurement Cost |
| --- | --- | --- | --- | --- | --- | --- |
| Metformin | Glycomet | USV | Sch H | Tablet | 500mg, 1000mg | ₹1-2/tab |
| Myo-Inositol | Inofol | Sterling | OTC | Sachet | 2g + Folic Acid | ₹15-20/sachet |
| Spironolactone | Aldactone | RPG | Sch H | Tablet | 25mg, 50mg | ₹3-5/tab |

## Weight Management (Post March 2026)

| Generic Name | Brand (India) | Manufacturer | Schedule | Form | Strength | Est. Procurement Cost |
| --- | --- | --- | --- | --- | --- | --- |
| Semaglutide (generic) | TBD | Multiple expected | Sch H | Injection pen | 0.25-2.4mg | TBD (est. ₹2,000-5,000/month) |
| Metformin | Glycomet | USV | Sch H | Tablet | 500mg | ₹1-2/tab |

---

---

# APPENDIX D: Additional Questionnaire Schemas

## Sexual Health Questionnaire (ED)

## PCOS & Hormonal Health Questionnaire

## Weight Management Questionnaire

---

# APPENDIX E: E-Prescription PDF Template

The e-prescription must comply with Telemedicine Practice Guidelines 2020. Required fields:

```
┌──────────────────────────────────────────────────────────┐
│                        Onlyou                            │
│              Telehealth Clinical Platform                 │
│          Drug License No: [YOUR_LICENSE_NUMBER]           │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  PRESCRIPTION                                            │
│  Rx No: OY-RX-20260207-001                              │
│  Date: 07 February 2026                                  │
│                                                          │
│  ─── PRESCRIBER ───                                      │
│  Dr. [Name], [Qualifications]                            │
│  Registration No: [MCI/State Council Reg #]              │
│  [Council Name, e.g., AP Medical Council]                │
│  Consultation Mode: Teleconsultation (Asynchronous)      │
│                                                          │
│  ─── PATIENT ───                                         │
│  Name: [Patient Full Name]                               │
│  Age/Gender: [Age] / [Gender]                            │
│  Phone: [Masked: ****1234]                               │
│                                                          │
│  ─── CLINICAL ───                                        │
│  Chief Complaint: [e.g., Hair thinning for 2 years]      │
│  Diagnosis: [e.g., Androgenetic Alopecia, Grade III]     │
│                                                          │
│  ─── MEDICATIONS ───                                     │
│                                                          │
│  1. Tab. Finasteride 1mg                                 │
│     Sig: Once daily at night                             │
│     Duration: 3 months                                   │
│     Qty: 90 tablets                                      │
│     ⚠ Sch H — Rx only                                   │
│                                                          │
│  2. Minoxidil 5% Solution (60ml)                         │
│     Sig: Apply 1ml to affected area twice daily          │
│     Duration: 3 months                                   │
│     Qty: 3 bottles                                       │
│                                                          │
│  3. Tab. Biotin 10mg                                     │
│     Sig: Once daily after breakfast                      │
│     Duration: 3 months                                   │
│     Qty: 90 tablets                                      │
│                                                          │
│  ─── INSTRUCTIONS ───                                    │
│  • Take finasteride at the same time daily               │
│  • Apply minoxidil to dry scalp, not wet hair            │
│  • Report any: breast tenderness, dizziness,             │
│    sexual side effects                                   │
│  • Do not donate blood while on finasteride              │
│                                                          │
│  ─── FOLLOW UP ───                                       │
│  Review in 3 months. Upload progress photos at           │
│  Week 4, 8, and 12 via the Onlyou app.                  │
│                                                          │
│  Valid Until: 07 May 2026                                │
│                                                          │
│  [DIGITAL SIGNATURE]                                     │
│  Dr. [Name]                                              │
│  [Date & Time of Signing]                                │
│                                                          │
│  ─── DISCLAIMER ───                                      │
│  This prescription has been issued following a            │
│  teleconsultation in compliance with the Telemedicine    │
│  Practice Guidelines 2020 (Board of Governors, MCI).     │
│  AI-assisted clinical decision support was used in the   │
│  assessment. All treatment decisions were made by the    │
│  registered medical practitioner named above.            │
│  The AI system can make errors — this prescription       │
│  has been independently verified by the prescriber.      │
│                                                          │
│  "To be sold by retail on the prescription of a          │
│  Registered Medical Practitioner only"                   │
│  — Schedule H, Drugs and Cosmetics Rules                 │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  Onlyou Health Pvt. Ltd. | onlyou.in                    │
│  Drug License: [Number] | GSTIN: [Number]                │
│  Support: help@onlyou.in | WhatsApp: +91-XXXXXXXXXX     │
└──────────────────────────────────────────────────────────┘
```

---

# APPENDIX F: Doctor Compensation Model

## Options

| Model | How It Works | Pros | Cons |
| --- | --- | --- | --- |
| **Per-review fee** | ₹50-100 per consultation reviewed | Low fixed cost, scales with volume | Doctor may rush reviews |
| **Monthly retainer** | ₹20,000-50,000/month for up to N reviews | Predictable cost, doctor committed | Paying even during slow months |
| **Equity + retainer** | Lower retainer (₹10-15K) + 2-5% equity | Aligned incentives, lower cash burn | Dilution, legal complexity |
| **Revenue share** | 10-15% of subscription revenue per patient they manage | Highly aligned, no cash upfront | Complex tracking, lower margin |

**Recommended for MVP**: Per-review fee (₹75/review). At 20 reviews/day average, that’s ₹1,500/day = ~₹45,000/month. Discuss equity separately as the business proves traction.

---

# APPENDIX G: Refund & Return Policy

## Refund Rules

| Scenario | Policy |
| --- | --- |
| Cancellation before first shipment | Full refund within 5-7 business days |
| Cancellation after shipment dispatched | No refund for current cycle; subscription stops at end of period |
| Medication quality issue | Full replacement or refund + free return pickup |
| Wrong medication sent | Immediate replacement + free return pickup + ₹200 credit |
| Medication damaged in transit | Full replacement shipped next day |
| Side effects — wants to stop | Prorated refund for unused months (quarterly/annual plans only) |
| Delivery failure (RTO) | Reship at no cost or full refund |
| Payment charged after cancellation | Immediate full refund |

## Return Handling

Returned medications CANNOT be restocked (pharma regulation). They are logged, quarantined, and disposed per Drug & Cosmetics Act rules. This is a cost of doing business — factor it into margin calculations.

---

# APPENDIX H: Referral Program & Discount System

## Referral Program

```
Referrer: Gets ₹200 credit for each successful referral (applied to next subscription)
Referee: Gets ₹200 off their first subscription month

Tracking: Unique referral codes per patient (format: OY-[FIRST_NAME]-[4_DIGIT_CODE])
Example: OY-RAHUL-7823

Rules:
- Credit applied only after referee's first payment succeeds
- Max 10 referrals per month (anti-fraud)
- Self-referral detection (same phone, same address, same device)
```

## Discount/Coupon System

```
model Coupon {
  id              String   @id @default(cuid())
  code            String   @unique  // "LAUNCH50", "NEWYEAR25"
  type            String   // "percentage", "fixed_amount"
  value           Int      // 50 (for 50%) or 20000 (for ₹200 in paise)
  maxUses         Int?     // null = unlimited
  usedCount       Int      @default(0)
  minOrderValue   Int?     // Minimum order value in paise
  applicablePlans String[] // Empty = all plans
  validFrom       DateTime
  validUntil      DateTime
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())

  @@index([code])
  @@index([isActive, validUntil])
}

model CouponUsage {
  id          String   @id @default(cuid())
  couponId    String
  patientId   String
  orderId     String
  discount    Int      // Actual discount applied in paise
  createdAt   DateTime @default(now())

  @@unique([couponId, patientId]) // One use per patient per coupon
  @@index([couponId])
}
```

Launch coupons to consider:
- `LAUNCH50` — 50% off first month (cap at ₹500)
- `HAIR25` — 25% off hair loss plan (first 3 months)
- `FRIEND200` — ₹200 off (referral redemption code)

---

# APPENDIX I: Cold Chain Management (Semaglutide)

Semaglutide injection pens require 2-8°C storage (refrigerated). This adds complexity to fulfillment:

| Stage | Requirement |
| --- | --- |
| **Storage** | Dedicated pharmaceutical refrigerator (2-8°C) with temperature logging |
| **Picking** | Remove from fridge last, minimize room temp exposure |
| **Packing** | Insulated box + gel ice packs + temperature indicator strip |
| **Shipping** | Priority/express only (max 24-36 hour transit). No surface shipping. |
| **Delivery** | Patient must refrigerate immediately upon receipt |
| **In-app guidance** | Push notification on dispatch: “Your medication is temperature-sensitive. Please refrigerate immediately upon delivery.” |
| **Monitoring** | Temperature indicator strip in package — patient can verify cold chain wasn’t broken |

**Cost impact**: Insulated packaging adds ₹80-120 per shipment. Express shipping adds ₹100-200. Factor into weight management plan pricing.

---

# APPENDIX J: App Store & Play Store Review Considerations

## Apple App Store

Apple has specific rules for health apps. Key things to get right to avoid rejection:

| Requirement | Implementation |
| --- | --- |
| **Guideline 1.4.1 — Physical harm** | AI disclaimer on every AI-generated assessment. “AI can make mistakes. All treatments verified by licensed doctor.” |
| **Guideline 5.1.1 — Data collection** | Clear privacy policy. App Tracking Transparency prompt if using analytics. |
| **Guideline 5.1.2 — Health data** | Request only necessary HealthKit data. Explain why in permission dialog. |
| **Guideline 3.1.1 — In-app purchases** | Medical subscriptions can use external payment (Razorpay) — they’re classified as “real-world goods/services” not digital content. No Apple 30% cut. |
| **Guideline 5.3.4 — Prescription drugs** | App must not directly sell prescription drugs to consumers in countries where this requires additional licensing. Frame it as “subscription to clinical service that includes medication.” |
| **Guideline 2.5.1 — APIs** | Must use official APIs only. No private frameworks. |
| **ATS (App Transport Security)** | All network calls must be HTTPS. |
| **Required metadata** | Medical disclaimer in app description. Link to privacy policy. Support URL. |

## Google Play Store

| Requirement | Implementation |
| --- | --- |
| **Health apps policy** | Declare app as health-related in Play Console. Provide evidence of medical oversight. |
| **Data Safety section** | Complete the Data Safety form accurately — declare all data collected, shared, and security practices. |
| **Payments policy** | Real-world goods (medications) can use third-party payment (Razorpay). Not subject to Google 15-30% cut. |
| **Sensitive permissions** | Camera (for progress photos) — must explain usage in store listing. |
| **Target API level** | Must target latest Android API level (currently API 34+). Expo handles this. |
| **App signing** | Use Play App Signing (EAS Build configures this automatically). |
| **Family policy** | If app could be accessed by minors, ensure content is appropriate. Add age gate if needed. |

**Critical for both stores**: Frame the app description as a “telehealth subscription service” not “online pharmacy.” The medication is part of the clinical service, not a standalone product.

---

# APPENDIX K: Patient Onboarding Email/WhatsApp Drip

| Trigger | Channel | Message |
| --- | --- | --- |
| Sign up (no intake started) | WhatsApp (1h later) | “Welcome to Onlyou! Start your free consultation — it takes less than 5 minutes. [Link]” |
| Intake started but not completed | Push (24h later) | “You’re almost there! Complete your health assessment to get your personalized treatment plan.” |
| Intake completed, pending doctor review | WhatsApp (immediate) | “Your health assessment is with our doctor! You’ll hear back within 24 hours.” |
| Doctor approved, payment pending | SMS | “Great news — your doctor has approved your treatment plan! Subscribe to get started: [Link]” |
| First payment success | Email + WhatsApp | “Welcome to Onlyou! 🎉 Your first treatment kit is being prepared. Expected delivery: [Date]. Here’s what to expect in Week 1…” |
| Order shipped | WhatsApp + Push | “Your Onlyou order is on its way! Track: [Link]. Expected: [Date]” |
| Delivered | Push (2h after delivery) | “Your treatment kit has arrived! Open the app for your medication guide and set up daily reminders.” |
| Day 3 | Push | “How’s it going? Tap here if you have any questions about your medication.” |
| Week 1 | WhatsApp | “One week in! Remember: results take time. Most patients see initial changes by week 8-12. Keep going! 💪” |
| Week 4 | Push | “It’s been a month! Time for your first progress photo. Upload it in the app to track your journey.” |
| Week 8 | WhatsApp | “Two months in — you’re doing great. Your doctor will review your progress this week.” |
| Week 12 | Push + Email | “3-month milestone! Upload your latest progress photo for your doctor review. Many patients see visible results around now.” |
| Payment failure | SMS + WhatsApp | “Your Onlyou payment of ₹{{amount}} couldn’t be processed. Update your payment method to avoid a gap in treatment: [Link]” |
| 7 days before renewal | Push | “Your Onlyou subscription renews on {{date}}. Your next treatment kit will ship automatically.” |
| Cancellation | Email | “We’re sorry to see you go. If you change your mind, your treatment history is always here. Use code COMEBACK20 for 20% off if you rejoin within 60 days.” |

---

# APPENDIX L: SEO Strategy

## Target Keywords (by vertical)

### Hair Loss

- “hair loss treatment online India”
- “finasteride online consultation”
- “hair fall solution without clinic visit”
- “online dermatologist for hair loss”
- “minoxidil prescription online”
- “male pattern baldness treatment at home”
- “women hair loss treatment online”

### Sexual Health

- “ED treatment online India”
- “erectile dysfunction consultation online”
- “sildenafil online prescription India”
- “premature ejaculation treatment online”
- “men’s health clinic online”
- “discreet ED medication delivery”

### PCOS

- “PCOS treatment online India”
- “PCOS consultation online”
- “PCOS medication online”
- “irregular periods treatment online”
- “hormonal acne treatment online”
- “metformin for PCOS online”

### Weight Management

- “weight loss medication India”
- “GLP-1 India”
- “semaglutide India”
- “medical weight loss program online”
- “ozempic alternative India”

## Content Strategy

Each condition page (/hair-loss, /sexual-health, /pcos, /weight-management) should be 2,000-3,000 words covering:

1. What is the condition (education)
2. Causes and risk factors
3. Available treatments (positions Onlyou’s approach)
4. How Onlyou’s treatment works
5. FAQ section
6. CTA to start intake

Blog posts (via Sanity CMS) targeting long-tail keywords:
- “Is finasteride safe? Side effects explained by a doctor”
- “PCOS diet plan India — what works and what doesn’t”
- “Understanding erectile dysfunction in your 20s and 30s”
- “What happens when semaglutide patent expires in India”

---

*This document is the single source of truth for the Onlyou development project. Every technical decision, every interface, every flow is defined here. Build exactly this.*