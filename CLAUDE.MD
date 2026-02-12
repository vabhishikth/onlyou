# CLAUDE.md — Onlyou Project Instructions

## Documentation Hierarchy
Read docs in this order before writing any code:

1. **`docs/onlyou-spec-master.md`** — READ FIRST. Platform architecture, all shared systems, 
   blood work portal flow, local delivery flow, patient tracking, database schema, 
   domain strategy, mobile-first requirements, build order.

2. **Condition specs** (read the one relevant to current task):
   - `docs/onlyou-spec-hair-loss.md`
   - `docs/onlyou-spec-erectile-dysfunction.md`
   - `docs/onlyou-spec-weight-management.md`
   - `docs/onlyou-spec-pcos.md`

3. **Legacy docs** (for additional context, but NEW specs above take priority if conflicts):
   - `docs/onlyou-dev-bible...`
   - `docs/User Flow...`
   - `docs/What We are Building...`

## Key Decisions (override any conflicting old docs)
- NO Thyrocare/SRL API — use partner diagnostic centre with portal (lab.onlyou.life)
- NO Shiprocket/Delhivery — local delivery with OTP verification
- NO WhatsApp-based coordination — everything through portals/dashboards
- ALL dashboards are mobile-first (design for 375px, then scale up)
- Patient app is React Native Expo (native), NOT web
- All portals are PWA-installable Next.js routes with subdomain routing

## Tech Stack
- Backend: NestJS + TypeScript + GraphQL + Prisma + PostgreSQL + Redis
- Mobile: React Native Expo (patient app)
- Web: Next.js 14 + Tailwind + shadcn/ui (all portals via subdomain)
- Payments: Razorpay
- Storage: AWS S3 ap-south-1
- AI: Claude API (pre-assessment)
- Notifications: Firebase FCM + MSG91 (WhatsApp/SMS)

## Domains
- onlyou.life — primary brand
- doctor.onlyou.life — doctor dashboard
- admin.onlyou.life — coordinator dashboard
- lab.onlyou.life — diagnostic centre portal
- collect.onlyou.life — phlebotomist portal
- pharmacy.onlyou.life — pharmacy portal
- onlyou.co.in — redirects to onlyou.life (regulatory/email use)

## Auth Roles (7)
patient, doctor, admin, lab, phlebotomist, pharmacy, delivery

## Build Order
Follow Phase 1-10 in master spec Section 15. Currently: Phase 1 (Foundation).
Hair Loss vertical first, then ED, Weight, PCOS.

## Code Standards
- TDD: Write tests first, 80% coverage minimum
- TypeScript strict mode
- All business logic in backend (mobile/web are thin clients)
- Every status change must log a timestamp
- Every portal action must be audit-logged