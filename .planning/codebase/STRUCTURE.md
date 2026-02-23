# Codebase Structure

**Analysis Date:** 2025-02-23

## Directory Layout

```
onlyou/
├── backend/                    # NestJS GraphQL backend (port 4000)
│   ├── src/
│   │   ├── main.ts            # Bootstrap - helmet, CORS, GraphQL config
│   │   ├── app.module.ts      # Root module - imports all feature modules
│   │   ├── auth/              # Phone OTP + JWT auth (7 roles)
│   │   ├── user/              # User profiles + onboarding
│   │   ├── intake/            # Questionnaire engine (shared, condition-specific data)
│   │   ├── ai/                # Claude API integration (condition-specific prompts)
│   │   ├── consultation/      # Consultation lifecycle + case assignment
│   │   ├── prescription/      # Prescription builder + PDF + contraindication checks
│   │   ├── dashboard/         # Doctor/admin dashboards
│   │   ├── messaging/         # Chat per consultation
│   │   ├── photo/             # Photo validation + S3 upload
│   │   ├── lab-order/         # Lab order system (12 statuses, slot booking)
│   │   ├── lab-portal/        # Diagnostic centre portal APIs
│   │   ├── lab-automation/    # Lab result automations
│   │   ├── collect-portal/    # Phlebotomist portal APIs
│   │   ├── order/             # Medicine order system (10 statuses, auto-reorder)
│   │   ├── pharmacy/          # Pharmacy partner management
│   │   ├── pharmacy-portal/   # Pharmacy partner portal APIs
│   │   ├── partner/           # All partner models + CRUD
│   │   ├── admin/             # Admin-only operations
│   │   ├── doctor/            # Doctor onboarding + specialization validation
│   │   ├── assignment/        # Auto-assignment engine by specialization
│   │   ├── payment/           # Razorpay integration
│   │   ├── subscription/      # Subscription lifecycle
│   │   ├── wallet/            # Patient wallet balance
│   │   ├── tracking/          # Order/lab tracking endpoint
│   │   ├── notification/      # Firebase FCM + MSG91 (SMS/WhatsApp)
│   │   ├── video/             # Agora video consultation
│   │   ├── prisma/            # Prisma service + seed
│   │   ├── redis/             # Redis client
│   │   ├── upload/            # S3 presigned URLs
│   │   ├── config/            # env.validation.ts
│   │   ├── common/            # Shared guards, decorators, plugins
│   │   │   ├── cache/         # Cache service + module
│   │   │   ├── decorators/    # @RateLimit decorator
│   │   │   ├── guards/        # RateLimitGuard
│   │   │   ├── plugins/       # GraphQL depth limit plugin
│   │   │   └── sentry/        # Error tracking interceptor + formatter
│   │   ├── types/             # TypeScript type definitions
│   │   ├── health/            # Health check endpoint
│   │   └── schema.gql         # Generated GraphQL schema (auto)
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema (7 roles, all models)
│   │   ├── questionnaires/    # Condition-specific questionnaire data
│   │   │   ├── hair-loss.ts
│   │   │   ├── sexual-health.ts
│   │   │   ├── pcos.ts
│   │   │   └── weight-management.ts
│   │   └── seed.ts            # DB seeding script
│   ├── src/**/*.spec.ts       # 85 test files (Jest)
│   ├── nest-cli.json          # NestJS config (deleteOutDir: false)
│   ├── tsconfig.json          # Backend TypeScript config
│   ├── tsconfig.spec.json     # Test TypeScript config
│   └── package.json           # Backend dependencies
│
├── mobile/                     # React Native Expo (patient app)
│   ├── app/                   # Expo Router file-based routes
│   │   ├── (auth)/            # Phone OTP flow screens
│   │   │   ├── phone.tsx      # Phone input screen
│   │   │   ├── otp.tsx        # OTP verification screen
│   │   │   └── _layout.tsx    # Auth stack layout
│   │   ├── (tabs)/            # Authenticated user tabs (home, activity, messages, orders, profile)
│   │   ├── intake/            # Questionnaire screens
│   │   │   └── [vertical]/    # Condition-specific intake flows
│   │   ├── lab/               # Lab order tracking screens
│   │   │   └── [labOrderId]/  # Lab order detail
│   │   ├── order/             # Medicine order tracking
│   │   ├── pharmacy/          # Pharmacy screens
│   │   ├── chat/              # Messaging screens per consultation
│   │   ├── profile/           # User profile + onboarding
│   │   ├── video/             # Video consultation screen
│   │   ├── onboarding/        # Consent + profile setup
│   │   ├── __tests__/         # Screen component tests (React Testing Library)
│   │   ├── layout.tsx         # Root layout with Apollo + notifications
│   │   ├── providers.tsx      # Global providers (Apollo, theme, Redux)
│   │   └── _layout.tsx        # Expo Router entry point
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/               # apollo.ts (GraphQL client setup), utilities
│   │   ├── graphql/           # Generated GraphQL types + queries
│   │   ├── store/             # Redux slices (auth state, user data)
│   │   ├── styles/            # Tailwind CSS utilities
│   │   ├── theme/             # Color scheme + typography
│   │   ├── data/              # Static data (condition info, etc.)
│   │   └── __mocks__/         # Mock data for tests
│   ├── app.json               # Expo configuration
│   ├── eas.json               # EAS build config
│   ├── package.json           # Mobile dependencies
│   └── tsconfig.json          # Mobile TypeScript config
│
├── web/                        # Next.js 14 (all portals via subdomain)
│   ├── src/
│   │   ├── app/               # Next.js file-based routes
│   │   │   ├── (auth)/        # Public login/signup routes
│   │   │   ├── layout.tsx     # Root layout
│   │   │   ├── page.tsx       # Landing page (public)
│   │   │   ├── admin/         # Admin portal routes (middleware: subdomain=admin)
│   │   │   ├── doctor/        # Doctor portal routes (middleware: subdomain=doctor)
│   │   │   ├── lab/           # Lab portal routes (middleware: subdomain=lab)
│   │   │   ├── collect/       # Phlebotomist portal routes (middleware: subdomain=collect)
│   │   │   ├── pharmacy/      # Pharmacy portal routes (middleware: subdomain=pharmacy)
│   │   │   ├── offline/       # Offline page (PWA)
│   │   │   ├── globals.css    # Tailwind CSS + shadcn/ui globals
│   │   │   └── providers.tsx  # Global providers (Apollo, shadcn/ui, theme)
│   │   ├── components/        # Reusable UI components
│   │   │   ├── ui/            # shadcn/ui primitives (button, input, badge, etc.)
│   │   │   ├── doctor/        # Doctor portal components (condition panels, case queue)
│   │   │   ├── admin/         # Admin dashboard components
│   │   │   ├── lab/           # Lab portal components
│   │   │   ├── pharmacy/      # Pharmacy portal components
│   │   │   ├── auth-guard.tsx # Route protection wrapper
│   │   │   └── pwa-provider.tsx # PWA installation handler
│   │   ├── hooks/             # Custom React hooks (useAuth, useConsultation, etc.)
│   │   ├── lib/               # Utilities (formatters, validators)
│   │   ├── graphql/           # Generated GraphQL types + queries
│   │   └── __mocks__/         # Mock data for tests
│   ├── public/                # Static assets (favicon, PWA manifest)
│   ├── middleware.ts          # Next.js middleware (subdomain detection)
│   ├── next.config.js         # Next.js configuration
│   ├── tsconfig.json          # Web TypeScript config
│   ├── package.json           # Web dependencies
│   └── __mocks__/             # Global test mocks
│
├── shared/                     # pnpm workspace package
│   ├── src/
│   │   ├── types/             # Shared TypeScript types (User, ConsultationStatus, etc.)
│   │   │   └── index.ts       # Re-exports all types
│   │   ├── constants/         # Shared constants (verticals, roles, statuses)
│   │   │   └── index.ts       # Re-exports all constants
│   │   ├── schemas/           # Zod validation schemas
│   │   │   └── index.ts       # Re-exports all schemas
│   │   ├── utils/             # Shared utilities (date formatters, validators)
│   │   │   └── index.ts       # Re-exports all utilities
│   │   └── index.ts           # Barrel export
│   ├── tsconfig.json          # Shared TypeScript config
│   └── package.json           # Shared dependencies
│
├── docs/                       # Project documentation
│   ├── onlyou-spec-master.md  # Master spec (single source of truth)
│   ├── onlyou-spec-hair-loss.md # Hair loss condition spec
│   ├── onlyou-spec-sexual-health.md # Sexual health condition spec
│   ├── onlyou-spec-pcos.md    # PCOS condition spec
│   ├── onlyou-spec-weight-management.md # Weight management spec
│   ├── BUILD-PLAN.md          # Phase breakdown + completion tracker
│   └── CHECKPOINT.md          # Last completed task + next steps
│
├── .planning/codebase/        # GSD codebase analysis documents
│   ├── STRUCTURE.md           # This file
│   ├── ARCHITECTURE.md        # (Future) Architecture patterns
│   ├── CONVENTIONS.md         # (Future) Code style + naming
│   └── CONCERNS.md            # (Future) Technical debt + issues
│
├── pnpm-workspace.yaml        # Monorepo configuration (backend, mobile, web, shared)
├── package.json               # Root workspace dependencies
├── tsconfig.base.json         # Base TypeScript configuration
├── CLAUDE.md                  # Development instructions + rules (TDD mandatory)
└── README.md                  # Project overview
```

## Directory Purposes

**`backend/src/`:**
- Contains all business logic, GraphQL resolvers, and services
- One folder per feature module (auth, user, intake, consultation, etc.)
- Each module has: `*.module.ts`, `*.resolver.ts`, `*.service.ts`, `*.dto.ts`, `*.spec.ts`
- Shared utilities in `common/` (guards, decorators, interceptors)

**`backend/prisma/`:**
- `schema.prisma` is the single source of truth for all database models
- `questionnaires/` contains condition-specific questionnaire data (hair-loss.ts, pcos.ts, etc.)
- One questionnaire file per vertical — no mixing condition logic

**`mobile/app/`:**
- File-based routing with Expo Router
- Grouped routes: `(auth)`, `(tabs)` use layout wrapping instead of disk folders
- Each feature (intake, lab, order, chat) gets its own folder
- `__tests__/` co-located with source screens

**`mobile/src/`:**
- `components/` — reusable UI elements (buttons, cards, inputs)
- `hooks/` — custom React hooks (useAuth, useConsultation, etc.)
- `lib/apollo.ts` — GraphQL client config (API URL set here)
- `store/` — Redux slices for global state
- `graphql/` — auto-generated types and queries (from backend schema)

**`web/src/app/`:**
- Next.js 14 App Router (file-based routes)
- Portal separation via middleware subdomain detection (`doctor.onlyou.life`, `admin.onlyou.life`, etc.)
- Each portal folder (admin, doctor, lab, collect, pharmacy) contains its routes
- Shared routes: `(auth)/` login, `page.tsx` landing page

**`web/src/components/`:**
- `ui/` — shadcn/ui primitives (button, input, badge, switch, etc.) — never modify these
- Portal-specific: `doctor/`, `admin/`, `lab/`, `pharmacy/`
- `auth-guard.tsx` — wrapper for protected routes

**`shared/src/`:**
- Shared across backend + mobile + web
- `types/index.ts` — exported types for User, ConsultationStatus, LabOrderStatus, etc.
- `constants/index.ts` — verticals, roles, status enums, specialization constants
- `schemas/index.ts` — Zod validation schemas reused in backend + web
- `utils/index.ts` — date formatters, validators, currency helpers

## Key File Locations

**Entry Points:**
- Backend: `backend/src/main.ts` — NestFactory, helmet, CORS, GraphQL config
- Mobile: `mobile/app/_layout.tsx` — Expo Router root + Apollo provider
- Web: `web/src/app/layout.tsx` — Next.js root layout + providers
- Web middleware: `web/middleware.ts` — Subdomain detection for portals

**Configuration:**
- Backend: `backend/src/config/env.validation.ts` — validates all required env vars
- Backend: `backend/nest-cli.json` — NestJS schematics config
- Mobile: `mobile/app.json` — Expo app config
- Mobile: `mobile/src/lib/apollo.ts` — GraphQL endpoint URL configuration
- Web: `web/next.config.js` — Next.js config (PWA, image optimization)
- Web: `web/middleware.ts` — Route-to-portal subdomain detection

**Database:**
- Prisma: `backend/prisma/schema.prisma` — all database models, enums, constraints
- Seed: `backend/prisma/seed.ts` — initial data seeding

**Core Logic (by domain):**

**Auth Module:**
- `backend/src/auth/auth.service.ts` — OTP generation/verification, JWT creation
- `backend/src/auth/auth.resolver.ts` — GraphQL mutations (requestOtp, verifyOtp)
- `backend/src/auth/guards/jwt-auth.guard.ts` — Protected route guard
- `backend/src/auth/guards/roles.guard.ts` — Role-based access control (7 roles)
- `backend/src/auth/strategies/jwt.strategy.ts` — JWT passport strategy

**User Module:**
- `backend/src/user/user.service.ts` — Profile CRUD, onboarding completion
- `backend/src/user/user.resolver.ts` — GraphQL queries/mutations
- `backend/src/user/user.types.ts` — GraphQL object types (PatientProfile, DoctorProfile)

**Intake Module (Questionnaire Engine):**
- `backend/src/intake/intake.service.ts` — Engine logic, skip validation, response parsing
- `backend/src/intake/intake.resolver.ts` — GraphQL for getQuestionnaire, submitIntake, saveDraft
- `backend/src/questionnaire/data/*.ts` — Condition-specific question data

**AI Module:**
- `backend/src/ai/ai.service.ts` — Claude API integration (streaming, fallback handling)
- `backend/src/ai/*.service.ts` — Condition-specific prompts + response parsers

**Consultation & Assignment:**
- `backend/src/consultation/consultation.service.ts` — Lifecycle + photo association
- `backend/src/assignment/assignment.service.ts` — Auto-assign by specialization

**Prescription System:**
- `backend/src/prescription/prescription.service.ts` — Builder, PDF generation, contraindication checks
- `backend/src/prescription/prescription.resolver.ts` — GraphQL mutations

**Lab & Order Systems:**
- `backend/src/lab-order/lab-order.service.ts` — 12-status state machine, slot booking
- `backend/src/order/order.service.ts` — 10-status state machine, auto-reorder logic

**Portals:**
- Lab: `backend/src/lab-portal/lab-portal.controller.ts` (or resolver)
- Phlebotomist: `backend/src/collect-portal/collect-portal.controller.ts`
- Pharmacy: `backend/src/pharmacy-portal/pharmacy-portal.controller.ts`
- Admin: `backend/src/admin/admin.resolver.ts`

**Testing:**
- Backend tests: `backend/src/**/*.spec.ts` (Jest, Supertest)
- Mobile tests: `mobile/app/**/__tests__/*.test.tsx` (React Testing Library, Jest)
- Web tests: `web/src/components/**/__tests__/*.spec.tsx` (React Testing Library, Jest)

## Naming Conventions

**Files:**
- Modules: `*.module.ts` (e.g., `auth.module.ts`)
- Resolvers: `*.resolver.ts` (e.g., `auth.resolver.ts`) — GraphQL entry points
- Services: `*.service.ts` (e.g., `auth.service.ts`) — business logic
- DTOs: `*.dto.ts` (e.g., `auth.dto.ts`) — input/output validation schemas
- Types: `*.types.ts` (e.g., `user.types.ts`) — GraphQL object type definitions
- Guards: `*.guard.ts` (e.g., `jwt-auth.guard.ts`) — route/resolver protection
- Tests: `*.spec.ts` (backend) or `*.test.tsx` (mobile/web) — Jest test files
- Decorators: `*.decorator.ts` (e.g., `current-user.decorator.ts`)
- Screens: `*.tsx` (e.g., `phone.tsx`, `otp.tsx`) — React Native / Next.js pages
- Components: `*.tsx` (e.g., `button.tsx`, `otp-input.tsx`)
- Utilities: `*.ts` (e.g., `formatters.ts`, `validators.ts`)

**Directories:**
- Feature modules (lowercase with hyphens): `auth/`, `lab-order/`, `lab-automation/`
- Grouped routes (parentheses): `(auth)/`, `(tabs)/` — Expo Router convention
- Subdirectories (lowercase): `dto/`, `guards/`, `decorators/`, `strategies/`, `data/`
- Barrel exports: `index.ts` in each `src/` subdirectory

**Functions:**
- camelCase: `requestOtp()`, `verifyOtp()`, `submitIntake()`, `markSampleCollected()`
- Prefix: async/promise functions return `Promise<Type>`
- Private methods: `#privateMethod()` or `private privateMethod()`

**Variables:**
- camelCase: `userId`, `consultationId`, `labOrderStatus`
- Constants: UPPER_SNAKE_CASE: `CONSULTATION_STATUSES`, `LAB_ORDER_STATUSES`
- Enum members: PascalCase in TS/GraphQL: `HAIR_LOSS`, `SLOT_BOOKED`, `SAMPLE_COLLECTED`

**Types/Classes:**
- PascalCase: `User`, `Consultation`, `LabOrder`, `PatientProfile`, `DoctorProfile`
- GraphQL object types: PascalCase with `Type` suffix: `ConsultationType`, `LabOrderType`
- Prisma models: PascalCase (auto-synced to schema)
- Zod schemas: camelCase or UPPER_SNAKE_CASE by use

## Where to Add New Code

**New Feature:**
1. **Backend implementation:**
   - Create module folder: `backend/src/{feature}/`
   - Add: `{feature}.module.ts`, `{feature}.service.ts`, `{feature}.resolver.ts`
   - Add DTOs in: `backend/src/{feature}/dto/{feature}.dto.ts`
   - Add tests: `backend/src/{feature}/*.spec.ts`
   - Register in: `backend/src/app.module.ts` (imports array)

2. **Database schema:**
   - Add model to: `backend/prisma/schema.prisma`
   - Run: `npx prisma migrate dev --name {feature_name}`
   - Update generated types used in backend

3. **Shared types (if cross-cutting):**
   - Export from: `shared/src/types/index.ts`
   - Import in backend/mobile/web as: `import { Type } from '@onlyou/shared'`

4. **Mobile feature:**
   - Create route folder: `mobile/app/{feature}/`
   - Add screens: `mobile/app/{feature}/*.tsx`
   - Add tests: `mobile/app/{feature}/__tests__/*.test.tsx`
   - Components shared in: `mobile/src/components/`
   - Hook-specific logic in: `mobile/src/hooks/use{Feature}.ts`

5. **Web portal feature:**
   - Create route folder: `web/src/app/{portal}/{feature}/`
   - Add page: `web/src/app/{portal}/{feature}/page.tsx`
   - Add components: `web/src/components/{portal}/{feature}/`
   - Tests: `web/src/components/{portal}/{feature}/__tests__/*.spec.tsx`

**New Component/Module:**
- Backend service: Place in module's service file or create separate utility
- Mobile component: Place in `mobile/src/components/{domain}/`
- Web component: Place in `web/src/components/{portal}/` or `web/src/components/ui/` if shared

**Utilities:**
- Shared (used by 2+ packages): `shared/src/utils/`
- Backend-only: `backend/src/common/`
- Mobile-only: `mobile/src/lib/`
- Web-only: `web/src/lib/`

**New Questionnaire (Condition-Specific):**
- Add data: `backend/prisma/questionnaires/{vertical}.ts` (e.g., `erectile-dysfunction.ts`)
- Follow existing pattern (hair-loss.ts, pcos.ts)
- Register in: `backend/src/questionnaire/questionnaire.service.ts`
- Do NOT mix condition logic — one file per vertical

**New Portal:**
- Create folder: `web/src/app/{new-portal}/`
- Create subdomain route in: `web/middleware.ts`
- Add auth guard wrapper component in: `web/src/components/auth-guard.tsx`
- Ensure backend exposes role-specific resolvers

## Special Directories

**`backend/src/common/`:**
- Purpose: Cross-cutting concerns (guards, decorators, interceptors, plugins)
- Generated: Yes (`schema.gql` is auto-generated from resolvers)
- Committed: Yes

**`backend/src/types/`:**
- Purpose: TypeScript-only type definitions (e.g., GraphQL depth limit types)
- Generated: No
- Committed: Yes

**`backend/prisma/questionnaires/`:**
- Purpose: Condition-specific question data (separate from condition-specific logic)
- Generated: No
- Committed: Yes

**`mobile/src/graphql/`:**
- Purpose: Auto-generated GraphQL types + queries from backend schema
- Generated: Yes (via GraphQL Code Generator from backend schema.gql)
- Committed: No (regenerate after backend schema changes)

**`web/src/graphql/`:**
- Purpose: Auto-generated GraphQL types + queries from backend schema
- Generated: Yes (via GraphQL Code Generator from backend schema.gql)
- Committed: No (regenerate after backend schema changes)

**`backend/.next/` and `web/.next/`:**
- Purpose: Next.js build output
- Generated: Yes
- Committed: No (in .gitignore)

**`backend/dist/` and `mobile/dist/`:**
- Purpose: Compiled JavaScript output (backend NestJS, mobile Expo)
- Generated: Yes
- Committed: No (in .gitignore)

**`backend/node_modules/`, `mobile/node_modules/`, `web/node_modules/`:**
- Purpose: Installed dependencies
- Generated: Yes (by pnpm install)
- Committed: No (in .gitignore)
- Managed by: pnpm workspaces

---

*Structure analysis: 2025-02-23*
