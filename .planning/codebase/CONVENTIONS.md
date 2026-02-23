# Coding Conventions

**Analysis Date:** 2026-02-23

## Naming Patterns

**Files:**
- Services: `<feature>.service.ts` (e.g., `auth.service.ts`, `user.service.ts`)
- Tests: `<feature>.service.spec.ts` (co-located with implementation)
- DTOs: `<feature>.dto.ts` in `dto/` subdirectories (e.g., `auth/dto/auth.dto.ts`)
- Resolvers: `<feature>.resolver.ts` for GraphQL
- Controllers: Rare — GraphQL resolvers are preferred
- Guards: `<feature>.guard.ts` in `guards/` subdirectory
- Decorators: `<feature>.decorator.ts` in `decorators/` subdirectory
- Modules: `<feature>.module.ts`

**Functions:**
- camelCase: `verifyOtpAndLogin()`, `checkFinasterideContraindications()`, `calculateLoadScore()`
- Private methods: `private methodName()` — explicitly marked
- Async functions: Standard async/await pattern, not callback-based

**Variables:**
- camelCase: `mockUser`, `consolId`, `doctorProfile`, `intakeResponse`
- Constants: UPPER_SNAKE_CASE: `VALID_SPECIALIZATIONS`, `SLA_THRESHOLDS`, `HAIR_LOSS_CLASSIFICATIONS`
- Boolean variables: prefix with `is`, `has`, `can`: `isVerified`, `hasExperience`, `canAssign`

**Types and Interfaces:**
- PascalCase: `AuthResponse`, `PrescriptionTemplate`, `ContraindicationCheckResult`
- Input types (GraphQL): `<FeatureName>Input` (e.g., `RequestOtpInput`, `VerifyOtpInput`)
- Output types (GraphQL): `<FeatureName>Response` or `<FeatureName>Type` (e.g., `AuthResponse`, `UserType`)
- Service interfaces: Use exported interfaces for return types (e.g., `AuthResponse`, `AuthTokens`)

## Code Style

**Formatting:**
- Prettier config in `/.prettierrc`:
  - Semicolons: enabled
  - Single quotes: enabled
  - Trailing commas: ES5 (no trailing commas in function parameters)
  - Tab width: 2 spaces
  - Print width: 100 characters
  - Bracket spacing: enabled
  - Arrow parens: always
  - Line endings: LF

**Linting:**
- ESLint configured per workspace (backend, mobile, web have separate configs)
- No console.log in production code — use `private readonly logger = new Logger(ClassName.name)`
- Strict TypeScript mode across all files

**Code Structure:**
- NestJS services decorated with `@Injectable()`
- GraphQL resolvers decorated with `@Resolver()`
- Dependency injection via constructor parameters
- Services import other services via constructor, never directly instantiate

## Import Organization

**Order:**
1. NestJS decorators and exceptions
2. Third-party libraries (e.g., `class-validator`, `graphql-scalars`)
3. Database client imports (`@prisma/client`)
4. Internal services (from `../` relative paths)
5. Internal utilities and types

**Path Aliases:**
- `@/` → Backend: `src/`, Mobile: `src/`, Web: `src/`
- Used consistently across all three codebases
- Example: `import { AuthService } from '@/auth/auth.service'`

**Example from `backend/src/auth/auth.resolver.ts`:**
```typescript
import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { RateLimit } from '../common/decorators/rate-limit.decorator';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { RequestOtpInput, VerifyOtpInput, AuthResponse } from './dto/auth.dto';
import { UserService } from '../user/user.service';
```

## Error Handling

**Pattern: Return Objects for API-Level Errors**

Resolvers return structured response objects instead of throwing exceptions:
```typescript
// auth.service.ts
async verifyOtpAndLogin(phone: string, otp: string): Promise<AuthResponse> {
    const otpResult = await this.otp.verifyOtp(phone, otp);
    if (!otpResult.success) {
        return { success: false, message: otpResult.message };
    }
    // ...
}
```

Response object structure:
- `success: boolean` — indicates operation success
- `message: string` — human-readable message
- Optional data fields: `user?`, `tokens?`, `data?`

**Pattern: NestJS Exceptions for Validation/Authorization**

Use NestJS built-in exceptions for input validation and auth failures:
```typescript
import { BadRequestException, UnauthorizedException, NotFoundException, ForbiddenException } from '@nestjs/common';

// In service methods:
if (!user) {
    throw new NotFoundException('User not found');
}
if (!hasPermission) {
    throw new ForbiddenException('You cannot access this resource');
}
if (invalidInput) {
    throw new BadRequestException('Invalid age: must be >= 18');
}
```

**Pattern: Try-Catch for External APIs**

When calling external APIs (Claude, MSG91, S3), wrap in try-catch and log errors:
```typescript
try {
    const response = await this.anthropic.messages.create({...});
} catch (error) {
    this.logger.error(
        `Failed to call Claude API: ${error instanceof Error ? error.message : String(error)}`
    );
    throw new BadRequestException('AI assessment failed');
}
```

## Logging

**Framework:** NestJS built-in Logger

**Pattern:**
```typescript
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MyService {
    private readonly logger = new Logger(MyService.name);

    async doSomething() {
        this.logger.log('Operation started');
        this.logger.warn(`Cache miss for key: ${key}`);
        this.logger.error(`Failed to process: ${error.message}`);
    }
}
```

**Levels:**
- `logger.log()` — normal operations
- `logger.warn()` — non-fatal issues (cache failures, rate limits, missing data)
- `logger.error()` — recoverable errors, external API failures
- `logger.debug()` — detailed tracing (sparingly)

**Never use `console.log()`** in production code.

## Comments

**When to Comment:**
- Spec references: Always include when implementing from spec
- Complex logic: Explain non-obvious algorithms
- Workarounds: Document why a non-standard approach was necessary
- Business rules: Clarify domain constraints

**Pattern: Spec Reference Comments**

Add comments pointing back to spec sections for any spec-driven implementation:
```typescript
// Spec: master spec Section 3.1, Section 14
describe('AuthService', () => {
    // ...
}

// Spec: hair-loss spec Section 5 — Finasteride Contraindication Matrix
async checkFinasterideContraindications(responses): Promise<...> {
    // ...
}
```

**JSDoc/TSDoc:**
- Use JSDoc for exported functions and types
- Include parameter descriptions and return types
- Example from `auth.service.ts`:
```typescript
/**
 * Request OTP for phone authentication
 */
async requestOtp(phone: string): Promise<{ success: boolean; message: string }> {
    // ...
}

/**
 * Verify OTP and authenticate user
 */
async verifyOtpAndLogin(phone: string, otp: string): Promise<AuthResponse> {
    // ...
}
```

## Function Design

**Size:** Keep functions < 50 lines; split longer logic into helper methods

**Parameters:** Max 3-4 parameters; use input DTOs for functions with many options:
```typescript
// Good:
async createPrescription(input: CreatePrescriptionInput): Promise<Prescription> { }

// Avoid:
async createPrescription(
    consultationId: string,
    template: string,
    medications: Medication[],
    dosages: string[],
    notes: string,
    doctorId: string
): Promise<Prescription> { }
```

**Return Values:**
- Async functions return `Promise<T>` where T is the actual return type
- For API operations, return structured response objects: `Promise<AuthResponse>`
- For data queries, return the data: `Promise<User>`
- For operations that may fail, return typed union: `Promise<Result | null>`

## Module Design

**Exports:**
- Each feature module exports its service and DTOs
- Module file format: `<feature>.module.ts`
- Example from `auth.module.ts`:
```typescript
@Module({
    imports: [JwtModule, ConfigModule, PrismaModule],
    providers: [AuthService, OtpService, JwtAuthGuard, RolesGuard],
    exports: [AuthService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
```

**Barrel Files:**
- Use `index.ts` for exporting public API from directories
- Not used for leaf services, only for feature-level exports
- Example: `auth/index.ts` exports `AuthService`, `AuthModule`, types from DTO

**DTO Organization:**
- DTOs live in `<feature>/dto/` subdirectory
- Grouped by related functionality (auth.dto.ts, user.dto.ts)
- GraphQL decorators applied at DTO level:
```typescript
// auth/dto/auth.dto.ts
@InputType()
export class RequestOtpInput {
    @Field()
    @IsString()
    @Matches(/^\+91[6-9]\d{9}$/)
    phone: string;
}

@ObjectType()
export class AuthResponse {
    @Field()
    success: boolean;
    // ...
}
```

## Data Validation

**Pattern: class-validator with class-transformer**

Applied at DTO level:
```typescript
import { IsString, Length, Matches, IsInt, Min, Max } from 'class-validator';

@InputType()
export class VerifyOtpInput {
    @Field()
    @IsString()
    @Matches(/^\+91[6-9]\d{9}$/, { message: 'Invalid Indian phone number' })
    phone: string;

    @Field()
    @IsString()
    @Length(6, 6, { message: 'OTP must be 6 digits' })
    otp: string;
}
```

GraphQL automatically validates inputs against these decorators.

## Status Transitions

**Pattern: Explicit enum validation, never string matching**

Defined as Prisma enums or TypeScript const arrays:
```typescript
// From prescription.service.spec.ts
const mockConsultation = {
    status: ConsultationStatus.DOCTOR_REVIEWING,  // From @prisma/client enum
};

// From ai.service.ts
export type ClassificationCategory =
  | 'androgenetic_alopecia'
  | 'telogen_effluvium_suspected'
  | 'alopecia_areata_suspected'
  // ...

export const HAIR_LOSS_CLASSIFICATIONS: ClassificationCategory[] = [
  'androgenetic_alopecia',
  'telogen_effluvium_suspected',
  // ...
];
```

Status transitions validated before updates:
```typescript
if (consultation.status !== ConsultationStatus.AI_REVIEWED) {
    this.logger.warn(`Cannot assign: consultation is in ${consultation.status}, not AI_REVIEWED`);
    return null;
}
```

## Type Safety

**Rule: No `any` types**

All variables should have explicit types. If uncertain, use union types or generics:
```typescript
// Good:
async getOrSet<T>(key: string, ttlSeconds: number, factory: () => Promise<T>): Promise<T>

// Avoid:
const cached = await this.redis.get(key) as any;
```

**Pattern: Discriminated Unions for Results**

For operations with multiple outcomes:
```typescript
type Result<T> =
    | { success: true; data: T }
    | { success: false; error: string };

async doOperation(): Promise<Result<User>> {
    if (error) return { success: false, error: 'message' };
    return { success: true, data: user };
}
```

---

*Convention analysis: 2026-02-23*
