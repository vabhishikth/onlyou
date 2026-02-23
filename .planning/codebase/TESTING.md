# Testing Patterns

**Analysis Date:** 2026-02-23

## Test Framework

**Runner:**
- Jest 30.2.0
- Config: `backend/jest.config.js`, `mobile/jest.config.js`, `web/jest.config.js`

**Backend Setup:**
```javascript
// backend/jest.config.js
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  roots: ['<rootDir>/src', '<rootDir>/prisma/questionnaires'],
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
```

**Mobile Setup:**
```javascript
// mobile/jest.config.js
preset: 'jest-expo',
setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@100mslive/react-native-hms$': '<rootDir>/src/__mocks__/hms-sdk.js',
},
testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
],
```

**Web Setup:**
```javascript
// web/jest.config.js
testEnvironment: 'jsdom',
moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@onlyou/shared$': '<rootDir>/../shared/src',
    '\\.(css|less|scss|sass)$': '<rootDir>/__mocks__/styleMock.js',
},
setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
testMatch: ['**/__tests__/**/*.spec.{ts,tsx}', '**/*.spec.{ts,tsx}'],
```

**Assertion Library:**
- Jest built-in matchers
- React Testing Library (mobile and web)
- `@testing-library/jest-native/extend-expect` (mobile)

**Run Commands:**
```bash
pnpm test                    # Run all tests in workspace
pnpm test --filter=backend   # Run backend tests only
pnpm test:watch             # Watch mode
pnpm test:cov               # Coverage report
```

## Test File Organization

**Location:**
- **Backend:** Co-located with implementation — `src/feature/feature.service.spec.ts` next to `feature.service.ts`
- **Mobile:** In `__tests__/` subdirectories — `src/components/ui/__tests__/BackButton.test.tsx`
- **Web:** In `__tests__/` or same directory with `.spec.tsx` suffix

**Naming:**
- **Backend:** `<feature>.service.spec.ts`, `<feature>.resolver.spec.ts`, `<feature>.guard.spec.ts`
- **Mobile:** `<component>.test.tsx` in `__tests__/` directory
- **Web:** `<component>.spec.tsx` in `__tests__/` or same directory

**Example backend structure:**
```
backend/src/
├── auth/
│   ├── auth.service.ts
│   ├── auth.service.spec.ts      ← Tests co-located
│   ├── auth.resolver.ts
│   ├── otp.service.ts
│   └── otp.service.spec.ts
└── prescription/
    ├── prescription.service.ts
    └── prescription.service.spec.ts
```

## Test Structure

**Suite Organization:**

Backend pattern from `backend/src/auth/auth.service.spec.ts`:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService, AuthResponse, AuthTokens } from './auth.service';
import { OtpService } from './otp.service';
import { PrismaService } from '../prisma/prisma.service';

// Spec reference comment
// Spec: master spec Section 3.1, Section 14
describe('AuthService', () => {
  let service: AuthService;
  let prismaService: jest.Mocked<PrismaService>;
  let otpService: jest.Mocked<OtpService>;

  // Mock data
  const mockUser = {
    id: 'user-123',
    phone: '+919876543210',
    role: UserRole.PATIENT,
    isVerified: true,
  };

  // Setup
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService, ...]
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get(PrismaService);
  });

  // Nested describe for logical grouping
  describe('requestOtp', () => {
    it('should call OtpService.sendOtp with phone number', async () => {
      // Test body
    });
  });
});
```

**Nested describe blocks:** Group tests by method/feature
```typescript
describe('AuthService', () => {
  describe('requestOtp', () => {
    it('should...');
    it('should...');
  });

  describe('verifyOtpAndLogin', () => {
    it('should...');
    it('should...');
  });
});
```

**Setup and Teardown:**
```typescript
beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
        providers: [ServiceUnderTest, { provide: Dependency, useValue: mock }],
    }).compile();

    service = module.get<ServiceUnderTest>(ServiceUnderTest);
});

afterEach(() => {
    jest.clearAllMocks();
});
```

## Mocking

**Framework:** Jest `jest.fn()`, `jest.mock()`

**Backend Service Mocking Pattern:**

From `backend/src/auth/auth.service.spec.ts`:
```typescript
const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  patientProfile: {
    create: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
};

// Inject into test module
const module: TestingModule = await Test.createTestingModule({
  providers: [
    AuthService,
    {
      provide: PrismaService,
      useValue: mockPrismaService,
    },
  ],
}).compile();
```

**Setting Mock Return Values:**
```typescript
// Synchronous return
jest.fn().mockReturnValue('token')

// Async resolution
jest.fn().mockResolvedValue({ success: true, data: user })

// Error simulation
jest.fn().mockRejectedValue(new Error('API failed'))

// Dynamic returns
jest.fn().mockImplementation((arg) => {
    if (arg === 'invalid') return false;
    return true;
})
```

**Example from test:**
```typescript
it('should create prescription with template medications', async () => {
  mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
  mockPrismaService.consultation.findUnique.mockResolvedValue(mockConsultation);
  mockPrismaService.prescription.create.mockResolvedValue({
    id: 'prescription-1',
    status: 'DRAFT',
  });

  const result = await service.createPrescription(input);

  expect(result.id).toBe('prescription-1');
  expect(mockPrismaService.prescription.create).toHaveBeenCalledWith(
    expect.objectContaining({ data: expect.any(Object) })
  );
});
```

**What to Mock:**
- Database access (PrismaService)
- External APIs (Anthropic, MSG91, S3)
- Notification services
- Cache/Redis services
- Configuration services

**What NOT to Mock:**
- Business logic under test
- Validation functions
- Data transformation utilities
- Status transition validators

## Fixtures and Factories

**Test Data Organization:**

From `backend/src/prescription/prescription.service.spec.ts`:
```typescript
const mockDoctor = {
  id: 'doctor-1',
  name: 'Dr. Test Doctor',
  role: UserRole.DOCTOR,
  isVerified: true,
  doctorProfile: {
    registrationNo: 'MCI-12345',
    specialization: 'DERMATOLOGY',
    qualifications: ['MBBS', 'MD Dermatology'],
  },
};

const mockPatient = {
  id: 'patient-1',
  name: 'Test Patient',
  phone: '+919876543210',
  patientProfile: {
    id: 'profile-1',
    dateOfBirth: new Date('1990-01-01'),
    gender: 'MALE',
  },
};

// Factory pattern for variations
const makeDoctorProfile = (overrides: any = {}) => ({
  id: overrides.id || 'dp-1',
  userId: overrides.userId || 'user-doc-1',
  specializations: overrides.specializations || ['Dermatology'],
  isAvailable: overrides.isAvailable ?? true,
  // ... rest of defaults
});
```

**Location:**
- Defined at top of test file (`*.spec.ts`)
- Reused across multiple test cases within same suite
- For shared fixtures across modules, consider `__fixtures__/` directory (not yet used, recommended pattern)

**Pattern: Use factories for variations**
```typescript
// Instead of duplicating mock data:
const activeDoctor = makeDoctorProfile({ isAvailable: true });
const inactiveDoctor = makeDoctorProfile({ isAvailable: false });
const specialistDoctor = makeDoctorProfile({ specializations: ['Trichology'] });
```

## Coverage

**Requirements:** Minimum 80% overall coverage

**Critical 100% coverage areas:**
- `backend/src/auth/` — Auth service, guards, OTP validation
- `backend/src/prescription/` — Contraindication checks, validation
- `backend/src/ai/` — Assessment parsing, classifications
- `backend/src/lab-order/` — Status transitions, SLA logic

**View Coverage:**
```bash
pnpm test:cov              # Generate coverage report
open coverage/index.html   # View detailed HTML report
```

**Current Status** (from Phase 11):
- Backend: 2,108 tests
- Mobile: 501 tests
- Web: 181 tests
- **Total: 2,790 tests**

## Test Types

**Unit Tests:**
- Scope: Single service/function in isolation
- Mocking: External dependencies fully mocked
- Example: `AuthService.requestOtp()` with mocked OtpService and PrismaService
- Location: `*.spec.ts` co-located with code

**Integration Tests:**
- Scope: Multiple services working together
- Mocking: Database (Prisma) mocked, services real
- Pattern: Used sparingly; NestJS testing module with multiple providers
- Example: `PrescriptionService` calling `UploadService` and `PrismaService`

**E2E Tests:**
- Framework: Not currently used
- Recommendation: GraphQL query tests in resolver specs simulate E2E

## Common Patterns

**Async Testing:**

Pattern from `backend/src/auth/auth.service.spec.ts`:
```typescript
it('should verify OTP and login', async () => {
  otpService.verifyOtp.mockResolvedValue({ success: true });
  prismaService.user.findUnique.mockResolvedValue(mockUser);

  const result = await service.verifyOtpAndLogin('+919876543210', '123456');

  expect(result.success).toBe(true);
  expect(result.user).toEqual(expect.objectContaining({ id: 'user-123' }));
});
```

**Error Testing:**

Pattern: Test error cases separately
```typescript
it('should return failure for invalid phone number', async () => {
  otpService.sendOtp.mockResolvedValue({
    success: false,
    message: 'Invalid phone'
  });

  const result = await service.requestOtp('invalid');

  expect(result.success).toBe(false);
  expect(result.message).toContain('Invalid');
});
```

**Exception Testing (for NestJS exceptions):**
```typescript
it('should throw NotFoundException when consultation not found', async () => {
  prismaService.consultation.findUnique.mockResolvedValue(null);

  await expect(
    service.assessConsultation('invalid-id')
  ).rejects.toThrow(NotFoundException);
});
```

**Parametrized Tests:**

Pattern from `backend/src/ai/ai.service.spec.ts`:
```typescript
const expectedCategories: ClassificationCategory[] = [
  'androgenetic_alopecia',
  'telogen_effluvium_suspected',
  'alopecia_areata_suspected',
];

it.each(expectedCategories)(
  'should include %s classification',
  (category) => {
    const categories = service.getClassificationCategories(HealthVertical.HAIR_LOSS);
    expect(categories).toContain(category);
  }
);
```

**Date and Time Testing:**

Pattern: Use specific dates, avoid `Date.now()`
```typescript
const mockConsultation = {
  createdAt: new Date('2026-02-23T10:00:00Z'),
  updatedAt: new Date('2026-02-23T11:00:00Z'),
  assignedAt: null,
};

it('should set assignedAt timestamp', async () => {
  const beforeCall = Date.now();
  await service.assignDoctor(consultation);
  const afterCall = Date.now();

  expect(consultation.assignedAt?.getTime()).toBeGreaterThanOrEqual(beforeCall);
  expect(consultation.assignedAt?.getTime()).toBeLessThanOrEqual(afterCall);
});
```

**Spec-Driven Tests:**

All critical tests include spec references:
```typescript
// Spec: hair-loss spec Section 5 — Contraindication Matrix
describe('Finasteride Contraindication Checks', () => {
  // Spec: hair-loss spec Section 5 — 8 distinct contraindications
  it('should block finasteride for female patients of childbearing age', async () => {
    // ...
  });
});

// Spec: master spec Section 7.4 — SLA Escalation
describe('SLA_THRESHOLDS', () => {
  it('should define PATIENT_BOOK_REMINDER_3D as 3 days in ms', () => {
    expect(SLA_THRESHOLDS.PATIENT_BOOK_REMINDER_3D).toBe(3 * 24 * 60 * 60 * 1000);
  });
});
```

## Mobile Testing (React Native)

**Setup File Pattern:**

`mobile/jest.setup.js` includes comprehensive mocks:

```javascript
// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const useSharedValue = (initial) => ({ value: initial });
  const useAnimatedStyle = (fn) => fn();
  const withTiming = (value, config, callback) => {
    if (callback) setTimeout(() => callback(true), 0);
    return value;
  };
  return { useSharedValue, useAnimatedStyle, withTiming, ... };
});

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

// Mock @apollo/client
jest.mock('@apollo/client', () => ({
  useQuery: jest.fn(() => ({ data: null, loading: false, error: null })),
  useLazyQuery: jest.fn(),
  useMutation: jest.fn(),
  gql: (strings) => strings.join(''),
}));

// Mock @/lib/auth
jest.mock('@/lib/auth', () => ({
  useAuth: jest.fn(() => ({
    user: { id: '1', phone: '+919876543210', isProfileComplete: true },
    isAuthenticated: true,
  })),
}));
```

**Test Pattern:**

From `mobile/src/components/ui/__tests__/BackButton.test.tsx`:
```typescript
import { render, fireEvent } from '@testing-library/react-native';
import { BackButton } from '../BackButton';
import * as Haptics from 'expo-haptics';

describe('BackButton', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByTestId } = render(
      <BackButton onPress={mockOnPress} testID="back-button" />
    );
    expect(getByTestId('back-button')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const { getByTestId } = render(
      <BackButton onPress={mockOnPress} testID="back-button" />
    );
    fireEvent.press(getByTestId('back-button'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('triggers haptic feedback when pressed', () => {
    const { getByTestId } = render(
      <BackButton onPress={mockOnPress} testID="back-button" />
    );
    fireEvent.press(getByTestId('back-button'));
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
  });
});
```

## Test Assertion Patterns

**Common Assertions:**
```typescript
// Existence and truthy
expect(result).toBeTruthy();
expect(result).toBeDefined();

// Equality
expect(result).toBe(expected);                     // Identity (===)
expect(result).toEqual(expected);                  // Deep equality
expect(result).toStrictEqual(expected);            // Strict deep equality

// Numeric
expect(value).toBeCloseTo(0.333, 2);              // Floating point within 2 decimals
expect(value).toBeGreaterThan(5);

// Collections
expect(array).toHaveLength(3);
expect(array).toContain('item');
expect(obj).toHaveProperty('key');

// Mocks
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith(arg1, arg2);
expect(mockFn).toHaveBeenCalledTimes(2);

// Objects
expect(result).toEqual(expect.objectContaining({ id: 'user-1' }));
expect(result).toEqual(expect.any(Object));
```

---

*Testing analysis: 2026-02-23*
