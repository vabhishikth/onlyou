# CHECKPOINT — Last Updated: 2026-02-20

## Current Phase: Phase 4 — Blood Work & Delivery
## Current Task: PR 12 - Portal Test Coverage
## Status: COMPLETE

## Completed Work:

### Mobile Redesign (PRs 1-7) — ALL COMPLETE
- [x] PR 1: Design System Foundation — 5 tests
- [x] PR 2: Splash + Welcome Restyle — 8 tests
- [x] PR 3: Onboarding Flow (4 screens) — 47 tests
- [x] PR 4: Home Dashboard Restyle — 54 tests
- [x] PR 5: Treatment + Questionnaire + Photo Restyle — 77 tests
- [x] PR 6: Remaining Screens (Activity, Messages, Orders, Profile) — 91 tests
- [x] PR 7: Phone screen restyle + complete theme migration — 21 tests
- [x] Cleanup: Explicit GraphQL field types, Expo Router layouts, Prisma type fixes

### Backend Phases 1-11 — ALL COMPLETE

### Doctor Dashboard (Phase 3):
- [x] PR 8: Consultation + Messaging Resolvers — 18 tests (TDD)
- [x] PR 9: Web fixes + seed data
- [x] PR 10: Doctor Dashboard Polish (4 commits)

### Phase 4 — Blood Work & Delivery:
- [x] PR 11: Order + Wallet GraphQL Resolvers (2 commits)
- [x] PR 12: Portal Test Coverage (4 commits)

## Test Counts:
- Backend: 1,868 tests (38 test suites)
- Mobile: 350 tests
- **Total: 2,218 tests**

---

## Last Completed: PR 11 + PR 12 (2026-02-20)

### PR 11: Order + Wallet GraphQL Resolvers

**Commit 1: feat(order): add GraphQL resolver + DTOs for order/delivery system**
- 23 resolver tests (TDD)
- 4 queries: order, ordersByPatient, pendingDeliveries, ordersDueForReorder
- 10 mutations: createOrder, sendToPharmacy, arrangePickup, markOutForDelivery, confirmDelivery, markDeliveryFailed, rescheduleDelivery, cancelOrder, createReorder, rateDelivery
- DTOs with class-validator decorators

**Commit 2: feat(wallet): add GraphQL resolver + DTOs for wallet/refund system**
- 15 resolver tests (TDD)
- 4 queries: walletBalance, transactionHistory, refundStatus, refundsByUser
- 3 mutations: creditWallet, applyWalletAtCheckout, initiateRefund

### PR 12: Portal Test Coverage

**Commit 3: test(lab-portal): 71 tests for diagnostic centre portal**
- getLabInfo, getTodaySummary, incoming/inProgress/completed samples
- markSampleReceived, reportSampleIssue, startProcessing, uploadResults
- Permission checks, tube count mismatch, critical value detection

**Commit 4: test(collect-portal): 66 tests for phlebotomist portal**
- getPhlebotomistInfo, getTodaySummary, getTodayAssignments
- markCollected, markPatientUnavailable, reportRunningLate, deliverToLab
- getNearbyLabs, time window formatting, stat increments

**Commit 5: test(pharmacy-portal): 53 tests for pharmacy portal**
- getPharmacyInfo, getTodaySummary, getNewOrders, getPreparingOrders, getReadyOrders
- startPreparing, markReady, reportStockIssue
- Medication parsing, patient anonymization

**Commit 6: test(admin): 118 tests for admin dashboard + SLA engine**
- getDashboardStats, countSLABreaches (5 breach types)
- calculateLabOrderSLA (ON_TIME/APPROACHING/BREACHED for all statuses)
- getAdminLabOrders, getAdminDeliveries, getPatients, getPatientDetail
- assignPhlebotomist, arrangeDelivery, partner toggles

---

## Next Up: PR 13 — Mobile Patient Tracking Screens

**Goal:** Build patient-facing mobile screens for blood work and delivery tracking.

**Tasks:**
1. Blood work stepper screen (lab order status progression)
2. Delivery tracking screen (order status + OTP display)
3. Lab results viewer screen (summary + PDF)

**Spec reference:** master spec Section 7 (Blood Work), Section 8 (Delivery)

---

## Known Issues:
- None currently

*Checkpoint updated per CLAUDE.md context protection rules.*
