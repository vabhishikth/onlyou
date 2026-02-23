# External Integrations

**Analysis Date:** 2026-02-23

## APIs & External Services

**SMS & OTP:**
- MSG91 - OTP delivery for phone authentication
  - SDK/Client: Native HTTP calls (no SDK package)
  - Implementation: `backend/src/auth/otp.service.ts`
  - Auth: Environment variables `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`
  - Purpose: 6-digit SMS OTP generation, rate limiting (5 attempts per hour), phone validation

**AI Pre-Assessment:**
- Anthropic Claude API - Health condition analysis and classification
  - SDK: @anthropic-ai/sdk 0.78.0
  - Implementation: `backend/src/ai/ai.service.ts`
  - Auth: `ANTHROPIC_API_KEY` (format: sk-ant-...)
  - Purpose: Hair loss classification (9 categories), ED classification (10 categories), Weight Management (10 categories), PCOS classification
  - Spec reference: master spec Section 6, condition-specific specs Section 5

**Payment Processing:**
- Razorpay - Payment gateway for subscriptions, consultations, lab orders, medicine orders
  - SDK: Native HTTP calls (no SDK package)
  - Implementation: `backend/src/payment/payment.service.ts`, `backend/src/subscription/subscription.service.ts`
  - Mobile SDK: react-native-razorpay 2.3.0 (checkout integration)
  - Auth: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
  - Purpose: Order creation, payment verification, webhook processing
  - Supported methods: UPI, Card, Netbanking, Wallet
  - Pricing stored in paise (₹999/month = 99900 paise)

**Delivery Logistics (Legacy):**
- Shiprocket - Order delivery coordination (being replaced with local delivery)
  - Auth: `SHIPROCKET_EMAIL`, `SHIPROCKET_PASSWORD`
  - Status: Legacy integration, marked for replacement per CLAUDE.md key decisions
  - Note: Not actively integrated in current codebase

## Data Storage

**Databases:**
- PostgreSQL - Primary transactional database
  - Provider: Neon (cloud PostgreSQL for development)
  - Connection: Via `DATABASE_URL` environment variable
  - Client: Prisma @prisma/client 6.0.0
  - Schema: `backend/prisma/schema.prisma`
  - Features: Full ACID support, JSON fields for flexible data

**File Storage:**
- AWS S3 (ap-south-1 — Mumbai) - File uploads (photos, documents, prescriptions)
  - SDK: @aws-sdk/client-s3 3.987.0, @aws-sdk/s3-request-presigner 3.987.0
  - Implementation: `backend/src/upload/upload.service.ts`
  - Bucket: `onlyou-uploads` (configurable via `AWS_S3_BUCKET`)
  - Region: ap-south-1 (set via `AWS_REGION`)
  - Auth: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
  - Purpose: Presigned URL generation (1-hour expiry), photo quality validation, intake photos, prescription PDFs
  - Allowed formats: JPEG, PNG, HEIC, WebP
  - Spec reference: master spec Section 14 (Security — presigned URLs)

**Caching:**
- Redis (via ioredis 5.4.0) - Session caching, rate limiting, token storage
  - Connection: `REDIS_URL` environment variable (default: redis://localhost:6379)
  - Implementation: `backend/src/redis/redis.service.ts`
  - Optional: Gracefully degrades if Redis unavailable
  - Max retries: 3 per request, retry strategy with exponential backoff (max 3000ms)
  - Features: Lazy connection, automatic reconnection handling

## Authentication & Identity

**Auth Provider:**
- Custom JWT-based implementation (no third-party auth provider)
  - Implementation: `backend/src/auth/auth.service.ts`, `backend/src/auth/auth.controller.ts`
  - Libraries: passport 0.7.0, passport-jwt 4.0.1, @nestjs/jwt 10.2.0
  - Phone OTP flow: MSG91 SMS → 6-digit OTP → JWT token generation
  - Token secrets: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (must be 64-byte hex strings)
  - Stateless JWT-based authentication
  - Token storage: Encrypted (Expo Secure Store for mobile), localStorage/sessionStorage for web

**Auth Strategies:**
- JWT Bearer token - API authentication across all requests
- Role-based access: 7 roles (patient, doctor, admin, lab, phlebotomist, pharmacy, delivery)
- Spec reference: master spec Section 14 (Security), Section 3.1 (Auth)

## Notifications & Messaging

**Push Notifications:**
- Firebase Cloud Messaging (FCM) - Referenced in codebase
  - Implementation: `backend/src/notification/` module
  - Mobile: expo-notifications 0.32.16 (manages FCM tokens via DeviceTokenService)
  - Device token storage: `backend/src/notification/device-token.service.ts`
  - Preferences: `backend/src/notification/notification-preference.service.ts`
  - Email notifications: Optional (emailEnabled preference)
  - Spec reference: master spec Section 11 (Notification System)

**SMS Notifications:**
- MSG91 - Already covered under SMS & OTP above
  - Reused for transactional notifications (WhatsApp, SMS)

## Monitoring & Observability

**Error Tracking:**
- Sentry (@sentry/nestjs 10.39.0) - Exception monitoring
  - Implementation: `backend/src/common/sentry/sentry.module.ts`, `backend/src/common/sentry/sentry.interceptor.ts`
  - DSN: `SENTRY_DSN` environment variable (optional)
  - Disabled if SENTRY_DSN not set
  - Sample rates: 100% in development, 10% in production
  - GraphQL error formatter: `backend/src/common/sentry/graphql-error-formatter.ts`
  - Global interceptor: Captures all errors and forwards to Sentry

**Health Checks:**
- Terminus (@nestjs/terminus) - Service health indicators
  - Redis health check: `backend/src/health/indicators/redis.health.ts`
  - Liveness and readiness probes

**Logging:**
- NestJS Logger - Default backend logging
  - No external centralized logging service configured
  - Per-service loggers: Logger instances in each service

## CI/CD & Deployment

**Hosting:**
- Backend: Node.js runtime (port 4000)
- Mobile: Expo (development) → iOS App Store + Android Play Store (production)
- Web: Next.js (port 3000 in development)

**CI Pipeline:**
- Not detected in codebase (no GitHub Actions, CircleCI, etc.)

**Deployment Considerations:**
- Backend must be deployed to serve GraphQL at `/graphql` endpoint
- Database migrations: `pnpm db:migrate:prod` before deployment
- Environment variables must be set in production
- Health checks available at `/health` (Terminus endpoints)

## Environment Configuration

**Required Environment Variables:**

Database & Cache:
- `DATABASE_URL` - PostgreSQL connection string (Neon format)
- `REDIS_URL` - Redis connection URL

Authentication:
- `JWT_ACCESS_SECRET` - 64-byte hex string for access token signing
- `JWT_REFRESH_SECRET` - 64-byte hex string for refresh token signing

SMS/OTP:
- `MSG91_AUTH_KEY` - MSG91 API authentication key
- `MSG91_TEMPLATE_ID` - DLT-registered SMS template ID

AI:
- `ANTHROPIC_API_KEY` - Claude API key (format: sk-ant-...)

Payment:
- `RAZORPAY_KEY_ID` - Razorpay public key
- `RAZORPAY_KEY_SECRET` - Razorpay secret key
- `RAZORPAY_WEBHOOK_SECRET` - Webhook signature verification

AWS Storage:
- `AWS_ACCESS_KEY_ID` - AWS IAM access key
- `AWS_SECRET_ACCESS_KEY` - AWS IAM secret key
- `AWS_REGION` - AWS region (default: ap-south-1)
- `AWS_S3_BUCKET` - S3 bucket name (default: onlyou-uploads)

Application:
- `NODE_ENV` - "development" or "production"
- `PORT` - Server port (default: 4000)
- `CORS_ORIGIN` - CORS allowed origins (comma-separated in production)

Frontend URLs:
- `EXPO_PUBLIC_API_URL` - Mobile API endpoint (e.g., http://192.168.0.104:4000/graphql)
- `NEXT_PUBLIC_API_URL` - Web API endpoint (default: http://localhost:4000/graphql)

Optional:
- `SENTRY_DSN` - Sentry error tracking DSN
- `SHIPROCKET_EMAIL`, `SHIPROCKET_PASSWORD` - Delivery (legacy, being replaced)
- `NEXT_PUBLIC_SANITY_PROJECT_ID` - Content management (if using Sanity CMS)

**Secrets Location:**
- `.env` file (git-ignored) - Development secrets
- Environment variables in production CI/CD (Heroku Config Vars, AWS Secrets Manager, etc.)
- Tokens in secure storage: Expo Secure Store (mobile), encrypted cookies/localStorage (web)

## Webhooks & Callbacks

**Incoming Webhooks:**
- Razorpay Payment Webhooks - Payment status updates (success, failure, refund)
  - Endpoint: `backend/src/payment/payment.service.ts` (processWebhook method)
  - Webhook signature verification: SHA256 HMAC using `RAZORPAY_WEBHOOK_SECRET`
  - Events: payment.authorized, payment.failed, order.paid, refund.created
  - Spec reference: master spec Section 12 (Payment & Subscription)

**Outgoing Webhooks:**
- Not detected in codebase

## API Communication Patterns

**Backend → Frontend:**
- GraphQL API via Apollo Server
  - Endpoint: `/graphql`
  - Auto-generated schema: `backend/src/schema.gql`
  - Authentication: Bearer token in Authorization header
  - Depth limit: 7 (prevents deep recursive queries)

**Frontend → Backend:**
- Apollo Client (@apollo/client)
  - Mobile: Uses expo-secure-store for token persistence
  - Web: Uses localStorage/sessionStorage for token persistence
  - Error handling: Token refresh on 401 UNAUTHENTICATED errors
  - Retry logic: Built into Apollo link chain

**Mobile API Configuration:**
- File: `mobile/src/lib/apollo.ts` (or similar)
- Development API URL: `http://192.168.0.104:4000/graphql` (configurable local IP)
- Production API URL: `https://api.onlyou.life/graphql`
- Token retrieval: Async via SecureStore for each request

**Web API Configuration:**
- File: `web/src/app/providers.tsx`
- Development API URL: `http://localhost:4000/graphql`
- Production API URL: Via `NEXT_PUBLIC_API_URL` environment variable
- Token retrieval: Synchronous from localStorage

---

*Integration audit: 2026-02-23*
