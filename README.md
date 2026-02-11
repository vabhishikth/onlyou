# Onlyou

Indian telehealth platform for stigmatized health conditions (hair loss, ED, PCOS, weight management).

## Project Structure

```
onlyou/
├── backend/          # NestJS + TypeScript + GraphQL + Prisma
├── mobile/           # React Native (Expo) + TypeScript
├── web/              # Next.js 14 + TypeScript + Tailwind CSS
├── shared/           # Shared types, validation schemas, constants
└── pnpm-workspace.yaml
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+

### Setup

1. **Copy environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Fill in your credentials in `.env`:**
   - `DATABASE_URL` - Your Neon PostgreSQL connection string
   - `MSG91_AUTH_KEY` - Your MSG91 API key for OTP

3. **Install dependencies (already done):**
   ```bash
   pnpm install
   ```

4. **Build the shared package:**
   ```bash
   pnpm build:shared
   ```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev:backend` | Start NestJS backend in watch mode |
| `pnpm dev:mobile` | Start Expo mobile app |
| `pnpm dev:web` | Start Next.js web app |
| `pnpm build:shared` | Build shared package |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm lint` | Lint all packages |
| `pnpm typecheck` | TypeCheck all packages |

## Tech Stack

- **Backend:** NestJS, GraphQL (Apollo), Prisma, PostgreSQL (Neon)
- **Mobile:** React Native (Expo 52), NativeWind, Apollo Client
- **Web:** Next.js 14, Tailwind CSS, shadcn/ui
- **Shared:** TypeScript types, Zod schemas

## Next Steps

1. Set up Prisma schema in `backend/prisma/schema.prisma`
2. Create NestJS modules (auth, user, consultation)
3. Build mobile app screens with Expo Router
4. Create web dashboards for doctors/admin
