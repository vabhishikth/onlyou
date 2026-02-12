import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { RolesGuard } from './roles.guard';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

// Spec: master spec Section 3.1 (Auth), Section 14 (Security)
// Tests for 7 roles: PATIENT, DOCTOR, ADMIN, LAB, PHLEBOTOMIST, PHARMACY, DELIVERY
describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  const mockGqlContext = (user: any) => {
    const mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;

    jest.spyOn(GqlExecutionContext, 'create').mockReturnValue({
      getContext: () => ({
        req: { user },
      }),
    } as any);

    return mockContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get(Reflector);
  });

  describe('canActivate', () => {
    it('should allow access when no roles are required', () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);
      const context = mockGqlContext({ role: UserRole.PATIENT });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when user has required role', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.PATIENT]);
      const context = mockGqlContext({ role: UserRole.PATIENT });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny access when user lacks required role', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.DOCTOR]);
      const context = mockGqlContext({ role: UserRole.PATIENT });

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should allow access when user has one of multiple allowed roles', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.DOCTOR, UserRole.ADMIN]);
      const context = mockGqlContext({ role: UserRole.ADMIN });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny access when no user in context', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.PATIENT]);
      const context = mockGqlContext(undefined);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    // Tests for all 7 roles (some will fail until schema is updated)
    describe('7-role RBAC system', () => {
      const allRoles = [
        'PATIENT',
        'DOCTOR',
        'ADMIN',
        'LAB',
        'PHLEBOTOMIST',
        'PHARMACY',
        'DELIVERY',
      ];

      it.each(allRoles)('should recognize %s role', (role) => {
        reflector.getAllAndOverride.mockReturnValue([role as UserRole]);
        const context = mockGqlContext({ role: role as UserRole });

        const result = guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should allow PATIENT to access patient-only endpoints', () => {
        reflector.getAllAndOverride.mockReturnValue([UserRole.PATIENT]);
        const context = mockGqlContext({ role: UserRole.PATIENT });

        expect(guard.canActivate(context)).toBe(true);
      });

      it('should allow DOCTOR to access doctor-only endpoints', () => {
        reflector.getAllAndOverride.mockReturnValue([UserRole.DOCTOR]);
        const context = mockGqlContext({ role: UserRole.DOCTOR });

        expect(guard.canActivate(context)).toBe(true);
      });

      it('should allow ADMIN to access admin-only endpoints', () => {
        reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
        const context = mockGqlContext({ role: UserRole.ADMIN });

        expect(guard.canActivate(context)).toBe(true);
      });

      // These tests will FAIL until schema is updated with new roles
      it('should allow LAB staff to access lab portal endpoints', () => {
        reflector.getAllAndOverride.mockReturnValue(['LAB' as UserRole]);
        const context = mockGqlContext({ role: 'LAB' as UserRole });

        expect(guard.canActivate(context)).toBe(true);
      });

      it('should allow PHLEBOTOMIST to access collection endpoints', () => {
        reflector.getAllAndOverride.mockReturnValue(['PHLEBOTOMIST' as UserRole]);
        const context = mockGqlContext({ role: 'PHLEBOTOMIST' as UserRole });

        expect(guard.canActivate(context)).toBe(true);
      });

      it('should allow PHARMACY to access pharmacy portal endpoints', () => {
        reflector.getAllAndOverride.mockReturnValue(['PHARMACY' as UserRole]);
        const context = mockGqlContext({ role: 'PHARMACY' as UserRole });

        expect(guard.canActivate(context)).toBe(true);
      });

      it('should allow DELIVERY to access delivery endpoints', () => {
        reflector.getAllAndOverride.mockReturnValue(['DELIVERY' as UserRole]);
        const context = mockGqlContext({ role: 'DELIVERY' as UserRole });

        expect(guard.canActivate(context)).toBe(true);
      });
    });

    describe('cross-role access control', () => {
      it('should deny PATIENT access to DOCTOR endpoints', () => {
        reflector.getAllAndOverride.mockReturnValue([UserRole.DOCTOR]);
        const context = mockGqlContext({ role: UserRole.PATIENT });

        expect(guard.canActivate(context)).toBe(false);
      });

      it('should deny LAB access to PHARMACY endpoints', () => {
        reflector.getAllAndOverride.mockReturnValue(['PHARMACY' as UserRole]);
        const context = mockGqlContext({ role: 'LAB' as UserRole });

        expect(guard.canActivate(context)).toBe(false);
      });

      it('should allow multi-role endpoints', () => {
        reflector.getAllAndOverride.mockReturnValue([
          UserRole.DOCTOR,
          UserRole.ADMIN,
        ]);
        const context = mockGqlContext({ role: UserRole.DOCTOR });

        expect(guard.canActivate(context)).toBe(true);
      });
    });
  });
});
