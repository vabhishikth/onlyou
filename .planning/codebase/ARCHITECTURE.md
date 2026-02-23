# Architecture

**Analysis Date:** 2025-02-23

## Pattern Overview

**Overall:** Domain-driven modular monolith with vertical slicing per health condition and cross-cutting concerns.

**Key Characteristics:**
- NestJS backend (GraphQL-first) with feature-based domain modules
- Prisma ORM for data access across all layers
- Status machine pattern for complex lifecycle management (consultations, lab orders, prescriptions)
- GraphQL resolvers as domain entry points (not separate controller layer)
- Service-oriented business logic with validation at resolver layer
- React Native mobile (Expo) and Next.js web for thin clients
- Cross-cutting concerns: Auth, Notifications, AI, Payment, File Upload

## Layers

**API/Resolver Layer:**
- Purpose: GraphQL query/mutation entry points, input validation, authorization checks, response mapping
- Location: `backend/src/[domain]/[domain].resolver.ts`
- Contains: @Resolver classes with @Query and @Mutation decorators, type mappings, role-based guards
- Depends on: Service layer, Auth guards, DTO validators
- Used by: GraphQL clients (mobile/web Apollo clients)
- Example: `backend/src/auth/auth.resolver.ts` - handles OTP request, verification, token refresh, logout

**Service Layer:**
- Purpose: Core business logic, status transitions, complex calculations, multi-step workflows
- Location: `backend/src/[domain]/[domain].service.ts`
- Contains: Business rules, validations, state machine logic, Prisma queries, external service coordination
- Depends on: Prisma, other services (e.g., AIService, NotificationService)
- Used by: Resolvers, other services, scheduled tasks
- Examples:
  - `backend/src/consultation/consultation.service.ts` - manages consultation lifecycle with valid status transitions
  - `backend/src/lab-order/lab-order.service.ts` - 15-status lab order state machine with SLA escalation
  - `backend/src/notification/notification.service.ts` - unified notification dispatcher (FCM, MSG91, Email)

**Data Access Layer:**
- Purpose: Database schema and query abstraction
- Location: `backend/prisma/schema.prisma`
- Contains: Prisma models (User, Consultation, LabOrder, etc.), enums, relationships, migrations
- Depends on: PostgreSQL
- Used by: All services via PrismaService
- Characteristics: No raw SQL; all queries through Prisma client

**Common/Cross-Cutting:**
- Purpose: Shared utilities, decorators, guards, interceptors
- Location: `backend/src/common/[concern]/`
- Contains:
  - `cache/` - CacheService for caching questionnaires, templates
  - `decorators/` - @RateLimit for OTP throttling
  - `guards/` - RateLimitGuard for enforcing limits
  - `sentry/` - Error tracking interceptor and formatter
  - `plugins/` - GraphQL plugins
- Used by: All domains

**Portal-Specific APIs:**
- Purpose: Subdomain-specific endpoints for partners (doctor, lab, pharmacy, admin)
- Location: `backend/src/[role]-portal/` (lab-portal, collect-portal, pharmacy-portal)
- Contains: Role-specific mutations, dashboard queries, import resolvers from admin module
- Examples:
  - `backend/src/doctor/` - doctor profile, specialization, availability, case queue
  - `backend/src/lab-portal/` - lab diagnostic centre operations
  - `backend/src/admin/` - coordinator dashboard (escalations, deliveries, orders)

**Condition-Specific Business Logic:**
- Purpose: Questionnaires, AI prompts, prescriptions templated per condition
- Location: `backend/src/questionnaire/data/`, `backend/src/ai/prompts/`, `backend/src/prescription/`
- Contains: Hair Loss, Sexual Health, PCOS, Weight Management condition-specific data
- Characteristics: Condition enum (HealthVertical) drives routing; shared engine abstractions with data files

**Client/Presentation Layers:**

Mobile (React Native Expo):
- Location: `mobile/app/[route]`
- Structure: File-based routing via expo-router; layouts, screens, and components co-located
- Auth: JWT in expo-secure-store; Apollo client with token refresh
- State: useAuth context for auth state; Apollo cache for queries

Web (Next.js 14 PWA):
- Location: `web/src/app/[route]`
- Structure: App Router (server components) with subdomain detection middleware
- Portals: doctor.onlyou.life, lab.onlyou.life, pharmacy.onlyou.life, admin.onlyou.life, collect.onlyou.life
- Auth: JWT in localStorage; Apollo client with error link for token expiry handling
- UI: shadcn/ui components with Tailwind CSS; mobile-first responsive (375px base)

## Data Flow

**Authentication Flow:**
1. User enters phone → `AuthResolver.requestOtp()`
2. OtpService sends via MSG91 (rate-limited: 5 per 60s)
3. User enters OTP → `AuthResolver.verifyOtp()`
4. AuthService validates OTP, creates User if new, generates JWT tokens
5. Tokens stored securely (mobile: expo-secure-store, web: localStorage)
6. Apollo client automatically adds Bearer token to headers
7. Token refresh via `AuthResolver.refreshToken()` when expired

**Consultation Intake Flow:**
1. Patient selects health vertical → loads VerticalInfo metadata
2. Questionnaire template fetched from cache (TTL: 3600s)
3. Patient completes questionnaire, submits via `IntakeResolver.submitIntake()`
4. Consultation created in PENDING_ASSESSMENT state, IntakeResponse saved
5. AIService processes responses via Claude API → AI pre-assessment
6. Consultation transitions to AI_REVIEWED
7. ConsultationService assigns to available doctor by specialization
8. Doctor reviews, transitions to DOCTOR_REVIEWING
9. Doctor approves or requests video/labs (new states in Phase 13)

**Lab Order Lifecycle:**
1. Doctor prescribes tests → LabOrder created in ORDERED state
2. Patient books slot → LabSlot created, order transitions to SLOT_BOOKED
3. Phlebotomist assigned, transitions to PHLEBOTOMIST_ASSIGNED
4. Sample collected → SAMPLE_COLLECTED
5. Delivered to lab → DELIVERED_TO_LAB
6. Lab receives → SAMPLE_RECEIVED
7. Results processed → PROCESSING → RESULTS_READY
8. Doctor reviews → DOCTOR_REVIEWED → CLOSED
9. SLA escalation: if no slot within 14 days → EXPIRED; if processing > 7 days → escalate

**Prescription → Order → Delivery:**
1. Doctor approves consultation → Prescription created
2. Prescription sent to assigned pharmacy via PharmacyOrder (PENDING_ASSIGNMENT)
3. Pharmacy accepts → PHARMACY_PREPARING → PHARMACY_READY
4. Order created (PRESCRIPTION_CREATED → SENT_TO_PHARMACY → ... → DELIVERED)
5. Delivery personnel gets OTP from system, verifies with patient
6. Payment via Razorpay (order status affects wallet/subscription)

**State Management:**
- No Redux/Zustand in mobile or web; Apollo cache as SSOT for queries
- Auth context maintains user session state (isAuthenticated, isLoading, user)
- Status transitions validated at service layer via VALID_*_TRANSITIONS constants
- Timestamps on every status change (e.g., consultation.completedAt set on APPROVED)
- Audit logging: NotificationSchedulerService logs state changes as notifications

## Key Abstractions

**Status Machine Pattern:**
- Purpose: Enforce valid state transitions, prevent impossible states
- Examples: `VALID_STATUS_TRANSITIONS` in consultation.service, `VALID_LAB_ORDER_TRANSITIONS`
- Pattern: Enum → constant Record<Status, Status[]> → isValidTransition() check → guard in service
- Applied to: Consultation, LabOrder, Order, LabAutomation, PharmacyOrder

**Service Composition:**
- Purpose: Complex workflows by orchestrating multiple services
- Example: `NotificationService` injects PrismaService, FirebaseService, MSG91Service to send unified notifications
- Pattern: Constructor dependency injection; services expose public async methods; resolver calls service

**DTO (Data Transfer Objects):**
- Purpose: Input validation and type safety for GraphQL
- Location: `backend/src/[domain]/dto/[domain].dto.ts`
- Pattern: @InputType for mutations, @ObjectType for responses
- Validation: ValidationPipe strips/validates at resolver boundary

**Caching Strategy:**
- Pattern: CacheService.getOrSet(key, ttl, fetchFn)
- Applied to: Questionnaire templates (3600s), vertical metadata (same session)
- Invalidation: Manual or TTL-based; no query invalidation library

**Role-Based Authorization:**
- 7 roles: PATIENT, DOCTOR, ADMIN, LAB, PHLEBOTOMIST, PHARMACY, DELIVERY
- Guard: JwtAuthGuard checks token validity; role validation in resolver logic
- Pattern: @UseGuards(JwtAuthGuard) at resolver method; role check in service if needed

**Error Handling:**
- GraphQL Error Formatter in app.module.ts formats errors for client
- Service layer throws NestJS exceptions (BadRequestException, NotFoundException, etc.)
- Resolver/formatter converts to GraphQL error with extensions
- Client error link in Apollo detects UNAUTHENTICATED, triggers token refresh or logout

## Entry Points

**Backend:**
- Location: `backend/src/main.ts`
- Triggers: npm start (dev) or compiled bootstrap in production
- Responsibilities:
  - Create NestJS app with helmet security headers
  - Enable CORS for production origins (subdomain portals)
  - Register global validation pipe (whitelist, transform)
  - Register Sentry interceptor for error tracking
  - Listen on port 4000
  - Log GraphQL endpoint

**Mobile:**
- Location: `mobile/app/_layout.tsx` (root layout)
- Triggers: Expo start or app launch
- Responsibilities:
  - Apollo provider wraps entire app
  - Auth provider manages session
  - Auth navigation guard redirects unauthenticated users
  - StatusBar and SafeAreaProvider for native styling

**Web:**
- Location: `web/src/app/layout.tsx` (root layout) and `web/src/app/providers.tsx`
- Triggers: next dev or production build
- Responsibilities:
  - Apollo client with error link for 401 handling
  - Toast provider for notifications
  - PWA provider for installability
  - Fonts (Plus Jakarta Sans, Playfair Display)

## Cross-Cutting Concerns

**Logging:**
- Framework: NestJS Logger (no console.log in production code)
- Pattern: `private readonly logger = new Logger(ClassName)`
- Used for: Bootstrap startup, error context, Sentry integration
- Client-side: Limited console.log for dev debugging; errors sent to Sentry

**Validation:**
- Backend: ValidationPipe strips unlisted fields, transforms types (strings to numbers)
- DTO classes with decorators: @IsString(), @IsEmail(), @IsEnum(), etc.
- Service layer: Additional business rule validation (e.g., age ≥18, status transitions)
- Client: Input validation before submission; server response errors displayed to user

**Authentication:**
- JWT (access + refresh token pair)
- Access token: 1-hour expiry, stored in secure storage (mobile) or localStorage (web)
- Refresh token: 30-day expiry, stored in DB, one-time use (rotates on each refresh)
- Guard: JwtAuthGuard uses Passport JWT strategy to extract and validate token
- Decorator: @CurrentUser() injects { userId, phone, role } from decoded token

**Database:**
- Prisma with PostgreSQL (Neon)
- Connection pooling via environment (PgBouncer in production)
- Migrations: prisma migrate (checked into repo)
- Seeding: Optional seed script for dev data
- Relationships: One-to-many (User → PatientProfile, LabOrder → LabSlots), many-to-many (Doctor → Specializations)

**File Storage:**
- S3 presigned URLs: `UploadService` generates 1-hour expiry URLs for client direct upload
- Buckets: onlyou-uploads (ap-south-1 Mumbai region)
- Supported: Profile photos, government IDs, prescription uploads, lab results
- Quality validation: Resolution, blur detection, brightness check before persistence

**Notifications:**
- Channels: Firebase FCM (push), MSG91 (WhatsApp/SMS), Email (transactional)
- Unified dispatcher: NotificationService determines channel by preference + user opt-in
- Scheduling: NotificationSchedulerService uses @Cron for SLA escalation notifications
- Audit: Every notification logged with event type, recipient, status

**Performance:**
- GraphQL depth limit: 7 levels (prevent malicious nested queries)
- Rate limiting: 5 OTP requests per 60s per phone; 10 verify attempts per 60s
- Caching: Questionnaire templates, vertical metadata, doctor availability
- Database: Indexes on frequently queried fields (userId, phone, consultationId)

---

*Architecture analysis: 2025-02-23*
