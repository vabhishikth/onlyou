import { Test, TestingModule } from '@nestjs/testing';
import { UserService, UpdateProfileInput, AgeValidationResult } from './user.service';
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

// Tests for age validation
describe('Age Validation', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should reject users under 18 years old', () => {
    // Someone born 10 years ago
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);

    const result = service.validateAge(tenYearsAgo);

    expect(result.valid).toBe(false);
    expect(result.message).toBe('User must be at least 18 years old');
  });

  it('should accept users who are exactly 18 years old', () => {
    const eighteenYearsAgo = new Date();
    eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);

    const result = service.validateAge(eighteenYearsAgo);

    expect(result.valid).toBe(true);
  });

  it('should accept users older than 18', () => {
    const thirtyYearsAgo = new Date();
    thirtyYearsAgo.setFullYear(thirtyYearsAgo.getFullYear() - 30);

    const result = service.validateAge(thirtyYearsAgo);

    expect(result.valid).toBe(true);
  });
});

describe('Pincode Lookup', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  const pincodeTestCases = [
    { pincode: '400001', city: 'Mumbai', state: 'Maharashtra' },
    { pincode: '110001', city: 'New Delhi', state: 'Delhi' },
    { pincode: '560001', city: 'Bangalore', state: 'Karnataka' },
    { pincode: '600001', city: 'Chennai', state: 'Tamil Nadu' },
    { pincode: '700001', city: 'Kolkata', state: 'West Bengal' },
  ];

  it.each(pincodeTestCases)(
    'should auto-fill city and state for pincode $pincode',
    ({ pincode, city, state }) => {
      const result = service.lookupPincode(pincode);

      expect(result).not.toBeNull();
      expect(result?.city).toBe(city);
      expect(result?.state).toBe(state);
    }
  );

  it('should return null for invalid pincode', () => {
    const result = service.lookupPincode('000000');

    expect(result).toBeNull();
  });

  it('should validate 6-digit Indian pincode format', () => {
    // 5 digits - invalid
    expect(service.validatePincode('12345')).toBe(false);
    // 7 digits - invalid
    expect(service.validatePincode('1234567')).toBe(false);
    // 6 digits - valid format
    expect(service.validatePincode('123456')).toBe(true);
  });
});

describe('DoctorProfile', () => {
  let service: UserService;
  let prismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: {
            doctorProfile: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prismaService = module.get(PrismaService);
  });

  it('should create doctor profile with NMC registration number', async () => {
    const mockDoctorProfile = {
      id: 'dp-123',
      userId: 'user-123',
      registrationNo: 'MH/12345/2020',
      specialization: 'Dermatology',
      qualifications: ['MBBS', 'MD'],
      yearsOfExperience: 5,
      bio: null,
      avatarUrl: null,
      isAvailable: true,
      consultationFee: 50000,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prismaService.doctorProfile.create.mockResolvedValue(mockDoctorProfile);

    const result = await service.createDoctorProfile('user-123', {
      registrationNo: 'MH/12345/2020',
      specialization: 'Dermatology',
      qualifications: ['MBBS', 'MD'],
      yearsOfExperience: 5,
    });

    expect(prismaService.doctorProfile.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-123',
        registrationNo: 'MH/12345/2020',
        specialization: 'Dermatology',
        qualifications: ['MBBS', 'MD'],
        yearsOfExperience: 5,
      },
    });
    expect(result.registrationNo).toBe('MH/12345/2020');
  });

  it('should validate NMC registration number format', () => {
    // Format: XX/NNNNN/YYYY (state code / number / year)
    expect(service.validateNmcRegistration('MH/12345/2020')).toBe(true);
    expect(service.validateNmcRegistration('KA/67890/2019')).toBe(true);
    expect(service.validateNmcRegistration('DL/11111/2021')).toBe(true);

    // Invalid formats
    expect(service.validateNmcRegistration('12345')).toBe(false);
    expect(service.validateNmcRegistration('MH12345')).toBe(false);
    expect(service.validateNmcRegistration('')).toBe(false);
  });

  it('should require specialization for doctor profile', async () => {
    await expect(
      service.createDoctorProfile('user-123', {
        registrationNo: 'MH/12345/2020',
        specialization: '', // Empty specialization
        qualifications: ['MBBS'],
        yearsOfExperience: 5,
      })
    ).rejects.toThrow('Specialization is required');
  });

  it('should store qualifications as array', async () => {
    const mockDoctorProfile = {
      id: 'dp-123',
      userId: 'user-123',
      registrationNo: 'MH/12345/2020',
      specialization: 'Dermatology',
      qualifications: ['MBBS', 'MD', 'DNB'],
      yearsOfExperience: 10,
      bio: null,
      avatarUrl: null,
      isAvailable: true,
      consultationFee: 75000,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prismaService.doctorProfile.create.mockResolvedValue(mockDoctorProfile);

    const result = await service.createDoctorProfile('user-123', {
      registrationNo: 'MH/12345/2020',
      specialization: 'Dermatology',
      qualifications: ['MBBS', 'MD', 'DNB'],
      yearsOfExperience: 10,
    });

    expect(result.qualifications).toEqual(['MBBS', 'MD', 'DNB']);
    expect(Array.isArray(result.qualifications)).toBe(true);
  });
});

describe('Partner Profiles', () => {
  let service: UserService;
  let prismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: {
            labProfile: {
              create: jest.fn(),
            },
            phlebotomistProfile: {
              create: jest.fn(),
            },
            pharmacyProfile: {
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prismaService = module.get(PrismaService);
  });

  describe('LabProfile', () => {
    it('should create lab profile with diagnostic centre details', async () => {
      const mockLabProfile = {
        id: 'lab-123',
        userId: 'user-123',
        labName: 'MedLab Diagnostics',
        licenseNumber: 'DL-12345-2020',
        address: '123 Medical St',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prismaService.labProfile.create.mockResolvedValue(mockLabProfile);

      const result = await service.createLabProfile('user-123', {
        labName: 'MedLab Diagnostics',
        licenseNumber: 'DL-12345-2020',
        address: '123 Medical St',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      });

      expect(prismaService.labProfile.create).toHaveBeenCalled();
      expect(result.labName).toBe('MedLab Diagnostics');
      expect(result.licenseNumber).toBe('DL-12345-2020');
    });
  });

  describe('PhlebotomistProfile', () => {
    it('should create phlebotomist profile with assignment region', async () => {
      const mockPhlebotomistProfile = {
        id: 'phleb-123',
        userId: 'user-123',
        employeeId: 'PH-001',
        assignedRegion: 'Mumbai South',
        isAvailable: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prismaService.phlebotomistProfile.create.mockResolvedValue(mockPhlebotomistProfile);

      const result = await service.createPhlebotomistProfile('user-123', {
        employeeId: 'PH-001',
        assignedRegion: 'Mumbai South',
      });

      expect(prismaService.phlebotomistProfile.create).toHaveBeenCalled();
      expect(result.employeeId).toBe('PH-001');
      expect(result.assignedRegion).toBe('Mumbai South');
    });
  });

  describe('PharmacyProfile', () => {
    it('should create pharmacy profile with license details', async () => {
      const mockPharmacyProfile = {
        id: 'pharm-123',
        userId: 'user-123',
        pharmacyName: 'HealthPlus Pharmacy',
        licenseNumber: 'MH/RET/12345',
        gstNumber: '27AABCU9603R1ZP',
        address: '456 Health St',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400002',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prismaService.pharmacyProfile.create.mockResolvedValue(mockPharmacyProfile);

      const result = await service.createPharmacyProfile('user-123', {
        pharmacyName: 'HealthPlus Pharmacy',
        licenseNumber: 'MH/RET/12345',
        gstNumber: '27AABCU9603R1ZP',
        address: '456 Health St',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400002',
      });

      expect(prismaService.pharmacyProfile.create).toHaveBeenCalled();
      expect(result.pharmacyName).toBe('HealthPlus Pharmacy');
      expect(result.licenseNumber).toBe('MH/RET/12345');
    });
  });
});
