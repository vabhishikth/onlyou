import { Test, TestingModule } from '@nestjs/testing';
import { DoctorResolver } from './doctor.resolver';
import { DoctorService } from './doctor.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRole, HealthVertical, ConsultationStatus } from '@prisma/client';

// Spec: Phase 12 — Doctor Onboarding Resolver Tests

describe('DoctorResolver', () => {
  let resolver: DoctorResolver;
  let doctorService: any;

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

  const mockStats = {
    activeCases: 5,
    completedToday: 3,
    dailyCaseLimit: 15,
    avgResponseTimeHours: 2.5,
    isAvailable: true,
    seniorDoctor: false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DoctorResolver,
        {
          provide: DoctorService,
          useValue: {
            createDoctor: jest.fn(),
            updateDoctor: jest.fn(),
            toggleAvailability: jest.fn(),
            deactivateDoctor: jest.fn(),
            listDoctors: jest.fn(),
            getDoctorStats: jest.fn(),
            getDoctorById: jest.fn(),
          },
        },
      ],
    }).compile();

    resolver = module.get<DoctorResolver>(DoctorResolver);
    doctorService = module.get(DoctorService);
  });

  describe('createDoctor', () => {
    it('should create a doctor with valid input', async () => {
      doctorService.createDoctor.mockResolvedValue(mockDoctorProfile);

      const input = {
        name: 'Dr. Ramesh Kumar',
        phone: '+919876543210',
        email: 'ramesh@example.com',
        registrationNo: 'KA/12345/2020',
        specializations: ['Dermatology', 'Trichology'],
        verticals: [HealthVertical.HAIR_LOSS],
        qualifications: ['MBBS', 'MD Dermatology'],
        yearsOfExperience: 10,
        dailyCaseLimit: 15,
        consultationFee: 20000,
      };

      const result = await resolver.createDoctor(input);

      expect(result).toEqual(mockDoctorProfile);
      expect(doctorService.createDoctor).toHaveBeenCalledWith(input);
    });

    it('should propagate validation errors from service', async () => {
      doctorService.createDoctor.mockRejectedValue(
        new BadRequestException('A user with this phone number already exists'),
      );

      await expect(
        resolver.createDoctor({
          name: 'Test',
          phone: '+919876543210',
          email: 'test@test.com',
          registrationNo: 'XX/00001/2020',
          specializations: ['Dermatology'],
          verticals: [HealthVertical.HAIR_LOSS],
          qualifications: ['MBBS'],
          yearsOfExperience: 5,
          dailyCaseLimit: 15,
          consultationFee: 10000,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('doctors (list)', () => {
    it('should list doctors with filters', async () => {
      doctorService.listDoctors.mockResolvedValue([mockDoctorProfile]);

      const result = await resolver.doctors(HealthVertical.HAIR_LOSS, true);

      expect(result).toHaveLength(1);
      expect(doctorService.listDoctors).toHaveBeenCalledWith({
        vertical: HealthVertical.HAIR_LOSS,
        isAvailable: true,
      });
    });

    it('should list all doctors when no filters', async () => {
      doctorService.listDoctors.mockResolvedValue([mockDoctorProfile]);

      const result = await resolver.doctors(undefined, undefined);

      expect(doctorService.listDoctors).toHaveBeenCalledWith({
        vertical: undefined,
        isAvailable: undefined,
      });
    });
  });

  describe('doctorStats', () => {
    it('should return doctor stats', async () => {
      doctorService.getDoctorStats.mockResolvedValue(mockStats);

      const result = await resolver.doctorStats('dp-1');

      expect(result).toEqual(mockStats);
      expect(doctorService.getDoctorStats).toHaveBeenCalledWith('dp-1');
    });
  });

  describe('toggleDoctorAvailability', () => {
    it('should toggle availability', async () => {
      const toggled = { ...mockDoctorProfile, isAvailable: false };
      doctorService.toggleAvailability.mockResolvedValue(toggled);

      const result = await resolver.toggleDoctorAvailability('dp-1');

      expect(result.isAvailable).toBe(false);
    });
  });

  describe('deactivateDoctor', () => {
    it('should deactivate doctor', async () => {
      doctorService.deactivateDoctor.mockResolvedValue(true);

      const result = await resolver.deactivateDoctor('dp-1');

      expect(result).toBe(true);
    });
  });

  describe('doctorById', () => {
    it('should return doctor by id', async () => {
      doctorService.getDoctorById.mockResolvedValue(mockDoctorProfile);

      const result = await resolver.doctorById('dp-1');

      expect(result).toEqual(mockDoctorProfile);
    });

    it('should throw NotFoundException for non-existent doctor', async () => {
      doctorService.getDoctorById.mockRejectedValue(
        new NotFoundException('Doctor profile not found'),
      );

      await expect(resolver.doctorById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateDoctor', () => {
    it('should update doctor details', async () => {
      const updated = { ...mockDoctorProfile, dailyCaseLimit: 20 };
      doctorService.updateDoctor.mockResolvedValue(updated);

      const result = await resolver.updateDoctor('dp-1', { dailyCaseLimit: 20 });

      expect(result.dailyCaseLimit).toBe(20);
      expect(doctorService.updateDoctor).toHaveBeenCalledWith('dp-1', { dailyCaseLimit: 20 });
    });
  });
});
