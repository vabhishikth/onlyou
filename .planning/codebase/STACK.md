# Technology Stack

**Analysis Date:** 2026-02-23

## Languages

**Primary:**
- TypeScript 5.7.2 - Used across all packages (backend, mobile, web, shared)

**Secondary:**
- JavaScript - Configuration files and build tooling

## Runtime

**Environment:**
- Node.js 20.0.0 or later - Backend and build tools

**Package Manager:**
- pnpm 9.15.0 - Monorepo package manager with workspaces
- Lockfile: pnpm-lock.yaml (present)

## Frameworks

**Backend:**
- NestJS 10.4.0 - REST/GraphQL API framework
  - Location: `backend/src/main.ts`
  - Modules: Auth, User, Intake, Payment, Subscription, AI, Notifications, Lab Orders, Orders, Prescriptions, Messaging, Dashboard, Video, Doctor, Assignment, Lab Portal, Pharmacy Portal

**API Communication:**
- Apollo Server 4.11.0 - GraphQL server (NestJS integration via @nestjs/apollo)
- GraphQL 16.9.0 - Query language
- GraphQL Scalars 1.25.0 - Custom scalar types

**Frontend - Mobile:**
- React Native 0.81.5 - Native mobile framework
- Expo 54.0.33 - React Native development and distribution platform
- Expo Router 6.0.23 - File-based routing for React Native
- React 19.1.0 - UI library
- NativeWind 4.1.0 - Tailwind CSS for React Native

**Frontend - Web:**
- Next.js 14.2.20 - React framework with file-based routing
- React 18.3.1 - UI library
- Tailwind CSS 3.4.16 - Utility-first CSS framework

**UI Components:**
- shadcn/ui (Web via Radix UI) - Accessible component library
  - @radix-ui/react-dialog, dropdown-menu, label, slot, toast
- Lucide React 0.468.0 (Web) - Icon library
- Lucide React Native 0.563.0 (Mobile) - Icon library for native

**Form Handling:**
- React Hook Form 7.54.0 - Form state management (Web, Mobile)
- @hookform/resolvers 5.2.2 - Validation schema integration
- Zod 3.24.0 - TypeScript-first schema validation

## Database & ORM

**Database:**
- PostgreSQL - Primary data store (via Neon for development)
- Connection: Neon PostgreSQL (see .env.example DATABASE_URL)

**ORM:**
- Prisma 6.0.0 - Database access layer
  - Schema: `backend/prisma/schema.prisma`
  - Client: @prisma/client 6.0.0
  - Migrations: Prisma migrate

## Key Dependencies

**Critical Backend:**
- @anthropic-ai/sdk 0.78.0 - Claude API for AI pre-assessment
- @aws-sdk/client-s3 3.987.0 - AWS S3 file uploads
- @aws-sdk/s3-request-presigner 3.987.0 - S3 presigned URL generation
- ioredis 5.4.0 - Redis client for caching and session management
- passport 0.7.0 - Authentication middleware
- passport-jwt 4.0.1 - JWT strategy for Passport
- @nestjs/jwt 10.2.0 - JWT token handling
- helmet 8.1.0 - Security headers
- pdfkit 0.17.2 - PDF prescription generation
- @sentry/nestjs 10.39.0 - Error tracking and monitoring
- @nestjs/schedule 6.1.1 - Task scheduling for cron jobs
- @nestjs/terminus 11.1.1 - Health check indicators
- class-validator 0.14.1 - DTO validation
- class-transformer 0.5.1 - DTO serialization

**Critical Mobile:**
- @apollo/client 3.14.0 - GraphQL client
- expo-secure-store 15.0.8 - Secure token storage (encrypted)
- react-native-razorpay 2.3.0 - Payment gateway integration
- react-native-mmkv 3.2.0 - Fast key-value storage
- zustand 5.0.11 - Lightweight state management
- expo-camera 17.0.10 - Camera for photos/video
- expo-image-picker 17.0.10 - Image/video selection
- expo-notifications 0.32.16 - Push notification delivery
- expo-file-system 19.0.21 - File system access
- expo-linear-gradient 15.0.8 - Gradient rendering

**Critical Web:**
- @apollo/client 3.11.0 - GraphQL client
- recharts 2.14.0 - Chart library for dashboards
- date-fns 4.1.0 - Date manipulation
- framer-motion 12.34.0 - Animation library

## Configuration

**Environment:**
- Configuration: NestJS @nestjs/config module (ConfigService)
- .env file (not committed) - see `.env.example` for required variables
- Validation: `backend/src/config/env.validation.ts`

**Key Environment Variables:**
- `DATABASE_URL` - PostgreSQL connection string (Neon)
- `REDIS_URL` - Redis connection (localhost:6379 for dev)
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` - Token secrets
- `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID` - SMS OTP service
- `ANTHROPIC_API_KEY` - Claude AI integration
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` - Payment processing
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`, `AWS_REGION` - File storage
- `SENTRY_DSN` - Error tracking (optional)
- `SHIPROCKET_EMAIL`, `SHIPROCKET_PASSWORD` - Delivery logistics (legacy)
- `NODE_ENV` - Development, production
- `PORT` - Server port (default: 4000)
- `CORS_ORIGIN` - CORS allowed origins
- `EXPO_PUBLIC_API_URL` - Mobile API endpoint
- `NEXT_PUBLIC_API_URL` - Web API endpoint

**Build Configuration:**
- TypeScript Config: `tsconfig.base.json` (root), per-package tsconfig.json overrides
- Backend target: ES2022, CommonJS module
- Prettier: `.prettierrc` (semi: true, singleQuote: true, printWidth: 100)
- Jest: per-package jest.config.js files

## Testing

**Test Frameworks:**
- Jest 29.0-30.2.0 (version varies by package)
  - Config files: `backend/jest.config.js`, `mobile/jest.config.js`, `web/jest.config.js`
- ts-jest 29.4.6 - TypeScript transformation for Jest
- React Testing Library - Component testing (web)
- @testing-library/react-native - Component testing (mobile)
- jest-expo 54.0.17 - Expo testing utilities

**Test Commands:**
```bash
pnpm test                     # Run all tests across packages
pnpm test:watch             # Watch mode
pnpm test:cov               # Coverage report
pnpm --filter backend test  # Backend only
pnpm --filter mobile test   # Mobile only
pnpm --filter web test      # Web only
```

## GraphQL

**Schema Generation:**
- Auto-schema file: `backend/src/schema.gql` (auto-generated)
- GraphQL Depth Limit: 7 (prevents deep query attacks)
- Playground: Enabled in development, disabled in production
- Introspection: Enabled in development, disabled in production

**Custom Scalars:**
- JSON type via graphql-type-json

## Security

**CORS Configuration:**
- Production: Whitelisted domains (onlyou.life, doctor.onlyou.life, admin.onlyou.life, lab.onlyou.life, collect.onlyou.life, pharmacy.onlyou.life)
- Development: Unrestricted

**Security Headers:**
- Helmet 8.1.0 - Sets standard security headers (CSP, HSTS, X-Frame-Options, etc.)
- ContentSecurityPolicy: Disabled in dev, enabled in prod

**Secrets Management:**
- Environment variables via .env (never committed)
- Redis for session/token caching
- Secure token storage: Expo Secure Store (mobile), localStorage/sessionStorage (web)

## Logging & Monitoring

**Error Tracking:**
- Sentry (@sentry/nestjs 10.39.0) - Exception monitoring and error aggregation
  - Optional via SENTRY_DSN environment variable
  - Sample rate: 100% in dev, 10% in production
- NestJS Logger - Default logging for backend

**Health Checks:**
- TerminusModule (@nestjs/terminus) - Service health indicators
- Redis health check (`backend/src/health/indicators/redis.health.ts`)

## Deployment Platforms

**Hosting Targets:**
- Backend: Node.js server (port 4000)
- Mobile: Expo Go (development), iOS App Store + Android Play Store (production)
- Web: Next.js static export or server-side rendering

---

*Stack analysis: 2026-02-23*
