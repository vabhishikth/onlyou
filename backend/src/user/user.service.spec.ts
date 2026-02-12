import { Test, TestingModule } from '@nestjs/testing';
import { UserService, UpdateProfileInput } from './user.service';
import { PrismaService } from '../prisma/prisma.service';
import { Gender, UserRole } from '@prisma/client';

// Spec: master spec Section 3.2 (User), Section 13 (Partners)
describe('UserService', () => {
  let service: UserService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUser = {
    id: 'user-123',
    phone: '+919876543210',
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.PATIENT,
    isVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPatientProfile = {
    id: 'profile-123',
    userId: 'user-123',
    dateOfBirth: new Date('1990-01-15'),
    gender: Gender.MALE,
    height: 175,
    weight: 70,
    addressLine1: '123 Main St',
    addressLine2: 'Apt 4',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            patientProfile: {
              findUnique: jest.fn(),
              upsert: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prismaService = module.get(PrismaService);
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findById('user-123');

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByPhone', () => {
    it('should return user when found by phone', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByPhone('+919876543210');

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { phone: '+919876543210' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when phone not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findByPhone('+910000000000');

      expect(result).toBeNull();
    });
  });

  describe('getUserWithProfile', () => {
    it('should return user with patient profile included', async () => {
      const userWithProfile = { ...mockUser, patientProfile: mockPatientProfile };
      prismaService.user.findUnique.mockResolvedValue(userWithProfile);

      const result = await service.getUserWithProfile('user-123');

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        include: { patientProfile: true },
      });
      expect(result).toEqual(userWithProfile);
    });
  });

  describe('updateProfile', () => {
    beforeEach(() => {
      prismaService.user.update.mockResolvedValue(mockUser);
      prismaService.patientProfile.upsert.mockResolvedValue(mockPatientProfile);
    });

    it('should update user name', async () => {
      const input: UpdateProfileInput = { name: 'New Name' };

      await service.updateProfile('user-123', input);

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { name: 'New Name' },
      });
    });

    it('should update user email', async () => {
      const input: UpdateProfileInput = { email: 'new@example.com' };

      await service.updateProfile('user-123', input);

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { email: 'new@example.com' },
      });
    });

    it('should update patient profile with dateOfBirth', async () => {
      const dob = new Date('1995-05-15');
      const input: UpdateProfileInput = { dateOfBirth: dob };

      await service.updateProfile('user-123', input);

      expect(prismaService.patientProfile.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        create: expect.objectContaining({ userId: 'user-123', dateOfBirth: dob }),
        update: expect.objectContaining({ dateOfBirth: dob }),
      });
    });

    it('should update patient profile with gender', async () => {
      const input: UpdateProfileInput = { gender: Gender.FEMALE };

      await service.updateProfile('user-123', input);

      expect(prismaService.patientProfile.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        create: expect.objectContaining({ gender: Gender.FEMALE }),
        update: expect.objectContaining({ gender: Gender.FEMALE }),
      });
    });

    it('should update height and weight', async () => {
      const input: UpdateProfileInput = { height: 180, weight: 75 };

      await service.updateProfile('user-123', input);

      expect(prismaService.patientProfile.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        create: expect.objectContaining({ height: 180, weight: 75 }),
        update: expect.objectContaining({ height: 180, weight: 75 }),
      });
    });

    it('should update address fields', async () => {
      const input: UpdateProfileInput = {
        addressLine1: '456 New St',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001',
      };

      await service.updateProfile('user-123', input);

      expect(prismaService.patientProfile.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        create: expect.objectContaining({
          addressLine1: '456 New St',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110001',
        }),
        update: expect.objectContaining({
          addressLine1: '456 New St',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110001',
        }),
      });
    });

    it('should return user with updated profile', async () => {
      const input: UpdateProfileInput = { name: 'Updated Name' };

      const result = await service.updateProfile('user-123', input);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('patientProfile');
    });
  });

  describe('getPatientProfile', () => {
    it('should return patient profile when exists', async () => {
      prismaService.patientProfile.findUnique.mockResolvedValue(mockPatientProfile);

      const result = await service.getPatientProfile('user-123');

      expect(prismaService.patientProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
      expect(result).toEqual(mockPatientProfile);
    });

    it('should return null when profile not found', async () => {
      prismaService.patientProfile.findUnique.mockResolvedValue(null);

      const result = await service.getPatientProfile('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('isProfileComplete', () => {
    it('should return true when all required fields are present', async () => {
      prismaService.user.findUnique.mockResolvedValue({ name: 'Test User' } as any);
      prismaService.patientProfile.findUnique.mockResolvedValue({
        gender: Gender.MALE,
        addressLine1: '123 Main St',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      } as any);

      const result = await service.isProfileComplete('user-123');

      expect(result).toBe(true);
    });

    it('should return false when name is missing', async () => {
      prismaService.user.findUnique.mockResolvedValue({ name: null } as any);
      prismaService.patientProfile.findUnique.mockResolvedValue({
        gender: Gender.MALE,
        addressLine1: '123 Main St',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      } as any);

      const result = await service.isProfileComplete('user-123');

      expect(result).toBe(false);
    });

    it('should return false when gender is missing', async () => {
      prismaService.user.findUnique.mockResolvedValue({ name: 'Test User' } as any);
      prismaService.patientProfile.findUnique.mockResolvedValue({
        gender: null,
        addressLine1: '123 Main St',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      } as any);

      const result = await service.isProfileComplete('user-123');

      expect(result).toBe(false);
    });

    it('should return false when address is missing', async () => {
      prismaService.user.findUnique.mockResolvedValue({ name: 'Test User' } as any);
      prismaService.patientProfile.findUnique.mockResolvedValue({
        gender: Gender.MALE,
        addressLine1: null,
        city: null,
        state: null,
        pincode: null,
      } as any);

      const result = await service.isProfileComplete('user-123');

      expect(result).toBe(false);
    });

    it('should return false when patient profile does not exist', async () => {
      prismaService.user.findUnique.mockResolvedValue({ name: 'Test User' } as any);
      prismaService.patientProfile.findUnique.mockResolvedValue(null);

      const result = await service.isProfileComplete('user-123');

      expect(result).toBe(false);
    });

    it('should return false when user does not exist', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);
      prismaService.patientProfile.findUnique.mockResolvedValue(mockPatientProfile);

      const result = await service.isProfileComplete('user-123');

      expect(result).toBe(false);
    });
  });
});

// Tests for features to be implemented
describe('Age Validation (Future Implementation)', () => {
  it.skip('should validate user is at least 18 years old', () => {
    // To be implemented: validateAge(new Date('2010-01-01')) should fail (too young)
  });

  it.skip('should accept users who are exactly 18 years old', () => {
    // To be implemented: validateAge(eighteenYearsAgo) should pass
  });

  it.skip('should accept users older than 18', () => {
    // To be implemented: validateAge(new Date('1990-01-01')) should pass
  });
});

describe('Pincode Lookup (Future Implementation)', () => {
  const pincodeTestCases = [
    { pincode: '400001', city: 'Mumbai', state: 'Maharashtra' },
    { pincode: '110001', city: 'New Delhi', state: 'Delhi' },
    { pincode: '560001', city: 'Bangalore', state: 'Karnataka' },
    { pincode: '600001', city: 'Chennai', state: 'Tamil Nadu' },
    { pincode: '700001', city: 'Kolkata', state: 'West Bengal' },
  ];

  it.skip.each(pincodeTestCases)(
    'should auto-fill city and state for pincode $pincode',
    ({ pincode, city, state }) => {
      // To be implemented: lookupPincode(pincode) should return { city, state }
    }
  );

  it.skip('should return null for invalid pincode', () => {
    // To be implemented: lookupPincode('000000') should return null
  });

  it.skip('should validate 6-digit Indian pincode format', () => {
    // To be implemented: validatePincode('12345') should fail (5 digits)
    // validatePincode('1234567') should fail (7 digits)
    // validatePincode('123456') should pass
  });
});

describe('DoctorProfile (Future Implementation)', () => {
  it.skip('should create doctor profile with NMC registration number', () => {
    // To be implemented
  });

  it.skip('should validate NMC registration number format', () => {
    // To be implemented: Medical Council of India registration validation
  });

  it.skip('should require specialization for doctor profile', () => {
    // To be implemented
  });

  it.skip('should store qualifications as array', () => {
    // To be implemented
  });
});

describe('Partner Profiles (Future Implementation)', () => {
  describe('LabProfile', () => {
    it.skip('should create lab profile with diagnostic centre details', () => {
      // To be implemented
    });
  });

  describe('PhlebotomistProfile', () => {
    it.skip('should create phlebotomist profile with assignment region', () => {
      // To be implemented
    });
  });

  describe('PharmacyProfile', () => {
    it.skip('should create pharmacy profile with license details', () => {
      // To be implemented
    });
  });
});
