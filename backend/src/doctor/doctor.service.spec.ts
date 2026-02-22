import { Test, TestingModule } from '@nestjs/testing';
import { DoctorService, VALID_SPECIALIZATIONS, VERTICAL_SPECIALIZATION_MAP } from './doctor.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRole, HealthVertical, ConsultationStatus } from '@prisma/client';

// Spec: Phase 12 — Doctor Onboarding + Auto-Assignment

describe('DoctorService', () => {
  let service: DoctorService;
  let prisma: any;
  let notificationService: any;

  const validInput = {
    name: 'Dr. Ramesh Kumar',
    phone: '+919876543210',
    email: 'ramesh@example.com',
    registrationNo: 'KA/12345/2020',
    specializations: ['Dermatology', 'Trichology'],
    verticals: [HealthVertical.HAIR_LOSS],
    qualifications: ['MBBS', 'MD Dermatology'],
    yearsOfExperience: 10,
    dailyCaseLimit: 15,
    consultationFee: 20000, // ₹200 in paise
  };

  const mockDoctorProfile = {
    id: 'dp-1',
    userId: 'user-doc-1',
    registrationNo: 'KA/12345/2020',
    specialization: 'Dermatology',
    specializations: ['Dermatology', 'Trichology'],
    verticals: [HealthVertical.HAIR_LOSS],
    qualifications: ['MBBS', 'MD Dermatology'],
    yearsOfExperience: 10,
    bio: null,
    avatarUrl: null,
    signatureUrl: null,
    isAvailable: true,
    isActive: true,
    seniorDoctor: false,
    dailyCaseLimit: 15,
    consultationFee: 20000,
    lastAssignedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      id: 'user-doc-1',
      name: 'Dr. Ramesh Kumar',
      phone: '+919876543210',
      email: 'ramesh@example.com',
      role: UserRole.DOCTOR,
      isVerified: true,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DoctorService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            doctorProfile: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
            },
            consultation: {
              count: jest.fn(),
              findMany: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
        {
          provide: NotificationService,
          useValue: {
            sendNotification: jest.fn().mockResolvedValue({}),
          },
        },
      ],
    }).compile();

    service = module.get<DoctorService>(DoctorService);
    prisma = module.get(PrismaService);
    notificationService = module.get(NotificationService);
  });

  // ========================================
  // Constants validation
  // ========================================

  describe('constants', () => {
    it('should export valid specializations list', () => {
      expect(VALID_SPECIALIZATIONS).toContain('Dermatology');
      expect(VALID_SPECIALIZATIONS).toContain('Trichology');
      expect(VALID_SPECIALIZATIONS).toContain('Urology');
      expect(VALID_SPECIALIZATIONS).toContain('Andrology');
      expect(VALID_SPECIALIZATIONS).toContain('Sexology');
      expect(VALID_SPECIALIZATIONS).toContain('Endocrinology');
      expect(VALID_SPECIALIZATIONS).toContain('Bariatrics');
      expect(VALID_SPECIALIZATIONS).toContain('Gynecology');
      expect(VALID_SPECIALIZATIONS).toContain('Reproductive Medicine');
      expect(VALID_SPECIALIZATIONS.length).toBeGreaterThanOrEqual(9);
    });

    it('should map SEXUAL_HEALTH vertical to Urology, Andrology, Sexology', () => {
      const specs = VERTICAL_SPECIALIZATION_MAP[HealthVertical.SEXUAL_HEALTH];
      expect(specs).toContain('Urology');
      expect(specs).toContain('Andrology');
      expect(specs).toContain('Sexology');
    });

    it('should map HAIR_LOSS vertical to Dermatology, Trichology', () => {
      const specs = VERTICAL_SPECIALIZATION_MAP[HealthVertical.HAIR_LOSS];
      expect(specs).toContain('Dermatology');
      expect(specs).toContain('Trichology');
    });

    it('should map WEIGHT_MANAGEMENT to Endocrinology, Bariatrics', () => {
      const specs = VERTICAL_SPECIALIZATION_MAP[HealthVertical.WEIGHT_MANAGEMENT];
      expect(specs).toContain('Endocrinology');
      expect(specs).toContain('Bariatrics');
    });

    it('should map PCOS to Gynecology, Endocrinology, Reproductive Medicine', () => {
      const specs = VERTICAL_SPECIALIZATION_MAP[HealthVertical.PCOS];
      expect(specs).toContain('Gynecology');
      expect(specs).toContain('Endocrinology');
      expect(specs).toContain('Reproductive Medicine');
    });
  });

  // ========================================
  // createDoctor
  // ========================================

  describe('createDoctor', () => {
    it('should create a doctor with valid input', async () => {
      prisma.user.findFirst.mockResolvedValue(null); // no duplicate
      prisma.$transaction.mockResolvedValue(mockDoctorProfile);

      const result = await service.createDoctor(validInput);

      expect(result).toEqual(mockDoctorProfile);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should reject if phone number already exists', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'existing', phone: validInput.phone });

      await expect(service.createDoctor(validInput)).rejects.toThrow(BadRequestException);
      await expect(service.createDoctor(validInput)).rejects.toThrow(/phone/i);
    });

    it('should reject if email already exists', async () => {
      // First call for phone - not found; second call for email - found
      prisma.user.findFirst
        .mockResolvedValueOnce(null)  // phone check
        .mockResolvedValueOnce({ id: 'existing', email: validInput.email }); // email check

      await expect(service.createDoctor(validInput)).rejects.toThrow(BadRequestException);
    });

    it('should reject if no specializations selected', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.createDoctor({ ...validInput, specializations: [] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if no verticals selected', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.createDoctor({ ...validInput, verticals: [] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if vertical does not match any specialization', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      // SEXUAL_HEALTH requires Urology/Andrology/Sexology, but only Dermatology given
      await expect(
        service.createDoctor({
          ...validInput,
          verticals: [HealthVertical.SEXUAL_HEALTH],
          specializations: ['Dermatology'],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if daily case limit < 1', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.createDoctor({ ...validInput, dailyCaseLimit: 0 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if daily case limit > 50', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.createDoctor({ ...validInput, dailyCaseLimit: 51 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if consultation fee <= 0', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.createDoctor({ ...validInput, consultationFee: 0 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should set isVerified=true and isAvailable=true by default', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.$transaction.mockImplementation(async (cb: any) => {
        return cb({
          user: {
            create: jest.fn().mockResolvedValue({
              ...mockDoctorProfile.user,
              isVerified: true,
            }),
          },
          doctorProfile: {
            create: jest.fn().mockResolvedValue(mockDoctorProfile),
          },
        });
      });

      const result = await service.createDoctor(validInput);

      // Verify the transaction callback was called
      expect(prisma.$transaction).toHaveBeenCalled();
      const txCallback = prisma.$transaction.mock.calls[0][0];
      expect(typeof txCallback).toBe('function');
    });

    it('should create User record with DOCTOR role', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      let capturedUserData: any;
      prisma.$transaction.mockImplementation(async (cb: any) => {
        const mockTx = {
          user: {
            create: jest.fn().mockImplementation(({ data }) => {
              capturedUserData = data;
              return Promise.resolve({ ...mockDoctorProfile.user, ...data });
            }),
          },
          doctorProfile: {
            create: jest.fn().mockResolvedValue(mockDoctorProfile),
          },
        };
        return cb(mockTx);
      });

      await service.createDoctor(validInput);

      expect(capturedUserData.role).toBe(UserRole.DOCTOR);
      expect(capturedUserData.isVerified).toBe(true);
      expect(capturedUserData.name).toBe(validInput.name);
      expect(capturedUserData.phone).toBe(validInput.phone);
    });
  });

  // ========================================
  // toggleAvailability
  // ========================================

  describe('toggleAvailability', () => {
    it('should toggle doctor availability', async () => {
      prisma.doctorProfile.findUnique.mockResolvedValue({ ...mockDoctorProfile, isAvailable: true });
      prisma.doctorProfile.update.mockResolvedValue({ ...mockDoctorProfile, isAvailable: false });

      const result = await service.toggleAvailability('dp-1');

      expect(result.isAvailable).toBe(false);
      expect(prisma.doctorProfile.update).toHaveBeenCalledWith({
        where: { id: 'dp-1' },
        data: { isAvailable: false },
        include: { user: true },
      });
    });

    it('should throw NotFoundException for non-existent doctor', async () => {
      prisma.doctorProfile.findUnique.mockResolvedValue(null);

      await expect(service.toggleAvailability('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ========================================
  // deactivateDoctor
  // ========================================

  describe('deactivateDoctor', () => {
    it('should deactivate doctor (soft delete)', async () => {
      prisma.doctorProfile.findUnique.mockResolvedValue(mockDoctorProfile);
      prisma.doctorProfile.update.mockResolvedValue({ ...mockDoctorProfile, isActive: false, isAvailable: false });

      const result = await service.deactivateDoctor('dp-1');

      expect(result).toBe(true);
      expect(prisma.doctorProfile.update).toHaveBeenCalledWith({
        where: { id: 'dp-1' },
        data: { isActive: false, isAvailable: false },
      });
    });

    it('should throw NotFoundException for non-existent doctor', async () => {
      prisma.doctorProfile.findUnique.mockResolvedValue(null);

      await expect(service.deactivateDoctor('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ========================================
  // listDoctors
  // ========================================

  describe('listDoctors', () => {
    it('should return doctor list filtered by vertical', async () => {
      prisma.doctorProfile.findMany.mockResolvedValue([mockDoctorProfile]);

      const result = await service.listDoctors({ vertical: HealthVertical.HAIR_LOSS });

      expect(prisma.doctorProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            verticals: { has: HealthVertical.HAIR_LOSS },
          }),
        }),
      );
      expect(result).toHaveLength(1);
    });

    it('should return doctor list filtered by availability', async () => {
      prisma.doctorProfile.findMany.mockResolvedValue([mockDoctorProfile]);

      await service.listDoctors({ isAvailable: true });

      expect(prisma.doctorProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isAvailable: true,
          }),
        }),
      );
    });

    it('should return all active doctors when no filters', async () => {
      prisma.doctorProfile.findMany.mockResolvedValue([mockDoctorProfile]);

      await service.listDoctors();

      expect(prisma.doctorProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        }),
      );
    });
  });

  // ========================================
  // getDoctorStats
  // ========================================

  describe('getDoctorStats', () => {
    it('should return doctor stats with active case count', async () => {
      prisma.doctorProfile.findUnique.mockResolvedValue(mockDoctorProfile);
      prisma.consultation.count
        .mockResolvedValueOnce(5)  // active
        .mockResolvedValueOnce(3); // completed today
      prisma.consultation.findMany.mockResolvedValue([
        { assignedAt: new Date(), completedAt: new Date(Date.now() + 60 * 60 * 1000) },
      ]);

      const result = await service.getDoctorStats('dp-1');

      expect(result.activeCases).toBe(5);
      expect(result.completedToday).toBe(3);
      expect(result.dailyCaseLimit).toBe(15);
      expect(prisma.consultation.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            doctorId: 'user-doc-1',
            status: { in: [ConsultationStatus.DOCTOR_REVIEWING, ConsultationStatus.NEEDS_INFO] },
          }),
        }),
      );
    });

    it('should throw NotFoundException for non-existent doctor', async () => {
      prisma.doctorProfile.findUnique.mockResolvedValue(null);

      await expect(service.getDoctorStats('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
