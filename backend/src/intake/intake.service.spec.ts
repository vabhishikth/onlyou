import { Test, TestingModule } from '@nestjs/testing';
import { IntakeService } from './intake.service';
import { PrismaService } from '../prisma/prisma.service';
import { HealthVertical, ConsultationStatus } from '@prisma/client';
import { NotFoundException, BadRequestException } from '@nestjs/common';

// Spec: master spec Section 4, hair-loss spec Section 3

describe('IntakeService', () => {
  let service: IntakeService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockPatientProfile = {
    id: 'profile-123',
    userId: 'user-123',
    gender: null,
    dateOfBirth: null,
    height: null,
    weight: null,
    addressLine1: null,
    addressLine2: null,
    city: null,
    state: null,
    pincode: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockQuestionnaireTemplate = {
    id: 'template-123',
    vertical: HealthVertical.HAIR_LOSS,
    version: 1,
    isActive: true,
    schema: { questions: [] },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockIntakeResponse = {
    id: 'intake-123',
    patientProfileId: 'profile-123',
    questionnaireTemplateId: 'template-123',
    responses: { Q1: 25, Q2: 'Male' },
    isDraft: true,
    submittedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntakeService,
        {
          provide: PrismaService,
          useValue: {
            patientProfile: {
              findUnique: jest.fn(),
              create: jest.fn(),
            },
            questionnaireTemplate: {
              findFirst: jest.fn(),
            },
            intakeResponse: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            patientPhoto: {
              createMany: jest.fn(),
            },
            consultation: {
              create: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<IntakeService>(IntakeService);
    prismaService = module.get(PrismaService);
  });

  describe('getAvailableVerticals', () => {
    it('should return all 4 health verticals', () => {
      const verticals = service.getAvailableVerticals();

      expect(verticals).toHaveLength(4);
      expect(verticals.map((v) => v.id)).toEqual([
        HealthVertical.HAIR_LOSS,
        HealthVertical.SEXUAL_HEALTH,
        HealthVertical.PCOS,
        HealthVertical.WEIGHT_MANAGEMENT,
      ]);
    });

    it('should return correct pricing for Hair Loss (₹999/month in paise)', () => {
      const verticals = service.getAvailableVerticals();
      const hairLoss = verticals.find((v) => v.id === HealthVertical.HAIR_LOSS);

      expect(hairLoss?.pricePerMonth).toBe(99900);
    });
  });

  describe('getQuestionnaireTemplate', () => {
    it('should return active questionnaire template for vertical', async () => {
      prismaService.questionnaireTemplate.findFirst.mockResolvedValue(mockQuestionnaireTemplate);

      const result = await service.getQuestionnaireTemplate(HealthVertical.HAIR_LOSS);

      expect(prismaService.questionnaireTemplate.findFirst).toHaveBeenCalledWith({
        where: {
          vertical: HealthVertical.HAIR_LOSS,
          isActive: true,
        },
        orderBy: { version: 'desc' },
      });
      expect(result.vertical).toBe(HealthVertical.HAIR_LOSS);
    });

    it('should return specific version if provided', async () => {
      prismaService.questionnaireTemplate.findFirst.mockResolvedValue(mockQuestionnaireTemplate);

      await service.getQuestionnaireTemplate(HealthVertical.HAIR_LOSS, 1);

      expect(prismaService.questionnaireTemplate.findFirst).toHaveBeenCalledWith({
        where: {
          vertical: HealthVertical.HAIR_LOSS,
          isActive: true,
          version: 1,
        },
        orderBy: { version: 'desc' },
      });
    });

    it('should throw NotFoundException if no template found', async () => {
      prismaService.questionnaireTemplate.findFirst.mockResolvedValue(null);

      await expect(
        service.getQuestionnaireTemplate(HealthVertical.HAIR_LOSS)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('saveIntakeDraft', () => {
    it('should create new draft for new patient', async () => {
      prismaService.patientProfile.findUnique.mockResolvedValue(null);
      prismaService.patientProfile.create.mockResolvedValue(mockPatientProfile);
      prismaService.questionnaireTemplate.findFirst.mockResolvedValue(mockQuestionnaireTemplate);
      prismaService.intakeResponse.findFirst.mockResolvedValue(null);
      prismaService.intakeResponse.create.mockResolvedValue(mockIntakeResponse);

      const result = await service.saveIntakeDraft('user-123', {
        vertical: HealthVertical.HAIR_LOSS,
        responses: { Q1: 25, Q2: 'Male' },
      });

      expect(prismaService.patientProfile.create).toHaveBeenCalledWith({
        data: { userId: 'user-123' },
      });
      expect(prismaService.intakeResponse.create).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.message).toBe('Draft created successfully');
    });

    it('should update existing draft for same vertical', async () => {
      prismaService.patientProfile.findUnique.mockResolvedValue(mockPatientProfile);
      prismaService.questionnaireTemplate.findFirst.mockResolvedValue(mockQuestionnaireTemplate);
      prismaService.intakeResponse.findFirst.mockResolvedValue(mockIntakeResponse);
      prismaService.intakeResponse.update.mockResolvedValue({
        ...mockIntakeResponse,
        responses: { Q1: 30, Q2: 'Male', Q3: 'thinning_gradually' },
      });

      const result = await service.saveIntakeDraft('user-123', {
        vertical: HealthVertical.HAIR_LOSS,
        responses: { Q1: 30, Q2: 'Male', Q3: 'thinning_gradually' },
      });

      expect(prismaService.intakeResponse.update).toHaveBeenCalledWith({
        where: { id: mockIntakeResponse.id },
        data: {
          responses: { Q1: 30, Q2: 'Male', Q3: 'thinning_gradually' },
        },
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe('Draft updated successfully');
    });

    it('should update specific draft by intakeResponseId', async () => {
      prismaService.patientProfile.findUnique.mockResolvedValue(mockPatientProfile);
      prismaService.questionnaireTemplate.findFirst.mockResolvedValue(mockQuestionnaireTemplate);
      prismaService.intakeResponse.findUnique.mockResolvedValue(mockIntakeResponse);
      prismaService.intakeResponse.update.mockResolvedValue({
        ...mockIntakeResponse,
        responses: { Q1: 28 },
      });

      const result = await service.saveIntakeDraft('user-123', {
        vertical: HealthVertical.HAIR_LOSS,
        responses: { Q1: 28 },
        intakeResponseId: 'intake-123',
      });

      expect(prismaService.intakeResponse.findUnique).toHaveBeenCalledWith({
        where: { id: 'intake-123' },
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe('Draft saved successfully');
    });

    it('should throw NotFoundException for non-existent draft ID', async () => {
      prismaService.patientProfile.findUnique.mockResolvedValue(mockPatientProfile);
      prismaService.questionnaireTemplate.findFirst.mockResolvedValue(mockQuestionnaireTemplate);
      prismaService.intakeResponse.findUnique.mockResolvedValue(null);

      await expect(
        service.saveIntakeDraft('user-123', {
          vertical: HealthVertical.HAIR_LOSS,
          responses: { Q1: 28 },
          intakeResponseId: 'non-existent',
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when trying to update submitted intake', async () => {
      const submittedIntake = {
        ...mockIntakeResponse,
        isDraft: false,
        submittedAt: new Date(),
      };
      prismaService.patientProfile.findUnique.mockResolvedValue(mockPatientProfile);
      prismaService.questionnaireTemplate.findFirst.mockResolvedValue(mockQuestionnaireTemplate);
      prismaService.intakeResponse.findUnique.mockResolvedValue(submittedIntake);

      await expect(
        service.saveIntakeDraft('user-123', {
          vertical: HealthVertical.HAIR_LOSS,
          responses: { Q1: 28 },
          intakeResponseId: 'intake-123',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when draft belongs to different user', async () => {
      const otherUserDraft = {
        ...mockIntakeResponse,
        patientProfileId: 'other-profile',
      };
      prismaService.patientProfile.findUnique.mockResolvedValue(mockPatientProfile);
      prismaService.questionnaireTemplate.findFirst.mockResolvedValue(mockQuestionnaireTemplate);
      prismaService.intakeResponse.findUnique.mockResolvedValue(otherUserDraft);

      await expect(
        service.saveIntakeDraft('user-123', {
          vertical: HealthVertical.HAIR_LOSS,
          responses: { Q1: 28 },
          intakeResponseId: 'intake-123',
        })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMyIntakes', () => {
    it('should return empty array if no patient profile', async () => {
      prismaService.patientProfile.findUnique.mockResolvedValue(null);

      const result = await service.getMyIntakes('user-123');

      expect(result).toEqual([]);
    });

    it('should return all intake responses for patient', async () => {
      prismaService.patientProfile.findUnique.mockResolvedValue(mockPatientProfile);
      prismaService.intakeResponse.findMany.mockResolvedValue([mockIntakeResponse]);

      const result = await service.getMyIntakes('user-123');

      expect(prismaService.intakeResponse.findMany).toHaveBeenCalledWith({
        where: { patientProfileId: mockPatientProfile.id },
        include: {
          questionnaireTemplate: true,
          consultation: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('getIntakeByVertical', () => {
    it('should return null if no patient profile', async () => {
      prismaService.patientProfile.findUnique.mockResolvedValue(null);

      const result = await service.getIntakeByVertical('user-123', HealthVertical.HAIR_LOSS);

      expect(result).toBeNull();
    });

    it('should return most recent intake for vertical', async () => {
      prismaService.patientProfile.findUnique.mockResolvedValue(mockPatientProfile);
      prismaService.intakeResponse.findFirst.mockResolvedValue(mockIntakeResponse);

      const result = await service.getIntakeByVertical('user-123', HealthVertical.HAIR_LOSS);

      expect(prismaService.intakeResponse.findFirst).toHaveBeenCalledWith({
        where: {
          patientProfileId: mockPatientProfile.id,
          questionnaireTemplate: { vertical: HealthVertical.HAIR_LOSS },
        },
        include: {
          questionnaireTemplate: true,
          consultation: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result?.id).toBe(mockIntakeResponse.id);
    });
  });

  describe('submitIntake', () => {
    it('should create consultation with PENDING_ASSESSMENT status', async () => {
      prismaService.patientProfile.findUnique.mockResolvedValue(mockPatientProfile);
      prismaService.questionnaireTemplate.findFirst.mockResolvedValue(mockQuestionnaireTemplate);
      prismaService.intakeResponse.findFirst.mockResolvedValue(null);

      // Mock transaction
      const mockConsultation = {
        id: 'consultation-123',
        patientId: 'user-123',
        intakeResponseId: 'intake-123',
        vertical: HealthVertical.HAIR_LOSS,
        status: ConsultationStatus.PENDING_ASSESSMENT,
        createdAt: new Date(),
      };
      prismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          intakeResponse: {
            create: jest.fn().mockResolvedValue({ ...mockIntakeResponse, isDraft: false }),
          },
          patientPhoto: {
            createMany: jest.fn(),
          },
          consultation: {
            create: jest.fn().mockResolvedValue(mockConsultation),
          },
        };
        return callback(tx);
      });

      const result = await service.submitIntake('user-123', {
        vertical: HealthVertical.HAIR_LOSS,
        responses: { Q1: 25, Q2: 'Male' },
      });

      expect(result.success).toBe(true);
      expect(result.consultation?.status).toBe(ConsultationStatus.PENDING_ASSESSMENT);
    });

    it('should save photos when provided', async () => {
      prismaService.patientProfile.findUnique.mockResolvedValue(mockPatientProfile);
      prismaService.questionnaireTemplate.findFirst.mockResolvedValue(mockQuestionnaireTemplate);
      prismaService.intakeResponse.findFirst.mockResolvedValue(null);

      const mockTx = {
        intakeResponse: {
          create: jest.fn().mockResolvedValue({ ...mockIntakeResponse, isDraft: false }),
        },
        patientPhoto: {
          createMany: jest.fn(),
        },
        consultation: {
          create: jest.fn().mockResolvedValue({
            id: 'consultation-123',
            status: ConsultationStatus.PENDING_ASSESSMENT,
          }),
        },
      };
      prismaService.$transaction.mockImplementation(async (callback) => callback(mockTx));

      await service.submitIntake('user-123', {
        vertical: HealthVertical.HAIR_LOSS,
        responses: { Q1: 25, Q2: 'Male' },
        photos: [
          { type: 'scalp_top', url: 'https://s3.amazonaws.com/scalp_top.jpg' },
          { type: 'scalp_front', url: 'https://s3.amazonaws.com/scalp_front.jpg' },
        ],
      });

      expect(mockTx.patientPhoto.createMany).toHaveBeenCalledWith({
        data: [
          { patientProfileId: mockPatientProfile.id, type: 'scalp_top', url: 'https://s3.amazonaws.com/scalp_top.jpg' },
          { patientProfileId: mockPatientProfile.id, type: 'scalp_front', url: 'https://s3.amazonaws.com/scalp_front.jpg' },
        ],
      });
    });

    it('should convert existing draft to submitted intake', async () => {
      prismaService.patientProfile.findUnique.mockResolvedValue(mockPatientProfile);
      prismaService.questionnaireTemplate.findFirst.mockResolvedValue(mockQuestionnaireTemplate);
      prismaService.intakeResponse.findFirst.mockResolvedValue(mockIntakeResponse);

      const mockTx = {
        intakeResponse: {
          update: jest.fn().mockResolvedValue({
            ...mockIntakeResponse,
            isDraft: false,
            submittedAt: new Date(),
          }),
        },
        patientPhoto: {
          createMany: jest.fn(),
        },
        consultation: {
          create: jest.fn().mockResolvedValue({
            id: 'consultation-123',
            status: ConsultationStatus.PENDING_ASSESSMENT,
          }),
        },
      };
      prismaService.$transaction.mockImplementation(async (callback) => callback(mockTx));

      const result = await service.submitIntake('user-123', {
        vertical: HealthVertical.HAIR_LOSS,
        responses: { Q1: 25, Q2: 'Male', Q3: 'thinning_gradually' },
      });

      expect(mockTx.intakeResponse.update).toHaveBeenCalledWith({
        where: { id: mockIntakeResponse.id },
        data: {
          responses: { Q1: 25, Q2: 'Male', Q3: 'thinning_gradually' },
          isDraft: false,
          submittedAt: expect.any(Date),
        },
      });
      expect(result.success).toBe(true);
    });
  });
});
