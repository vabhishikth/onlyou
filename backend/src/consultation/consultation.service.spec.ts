import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  ConsultationService,
  VALID_STATUS_TRANSITIONS,
} from './consultation.service';
import { PrismaService } from '../prisma/prisma.service';
import { AIService } from '../ai/ai.service';
import { ConsultationStatus, HealthVertical, UserRole } from '@prisma/client';

// Spec: master spec Section 3.7 (Consultation Lifecycle)

describe('ConsultationService', () => {
  let service: ConsultationService;
  let prismaService: jest.Mocked<PrismaService>;
  let aiService: jest.Mocked<AIService>;

  const mockConsultation = {
    id: 'consultation-123',
    patientId: 'patient-123',
    doctorId: null,
    intakeResponseId: 'intake-123',
    vertical: HealthVertical.HAIR_LOSS,
    status: ConsultationStatus.PENDING_ASSESSMENT,
    doctorNotes: null,
    rejectionReason: null,
    scheduledAt: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDoctor = {
    id: 'doctor-123',
    phone: '+919876543210',
    email: null,
    name: 'Dr. Smith',
    role: UserRole.DOCTOR,
    isVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    doctorProfile: {
      id: 'dp-123',
      userId: 'doctor-123',
      specialization: 'DERMATOLOGY',
      registrationNo: 'MH/12345/2020',
      qualifications: ['MBBS', 'MD'],
      yearsOfExperience: 5,
    },
  };

  const mockAIAssessment = {
    id: 'ai-123',
    consultationId: 'consultation-123',
    summary: 'Typical male pattern baldness',
    riskLevel: 'LOW',
    recommendedPlan: 'standard',
    flags: [],
    rawResponse: {},
    modelVersion: 'claude-3-sonnet-20240229',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsultationService,
        {
          provide: PrismaService,
          useValue: {
            consultation: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            aIPreAssessment: {
              create: jest.fn(),
              findUnique: jest.fn(),
            },
            user: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
            },
            patientPhoto: {
              findMany: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
        {
          provide: AIService,
          useValue: {
            getDoctorSpecializations: jest.fn(),
            calculateAttentionLevel: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ConsultationService>(ConsultationService);
    prismaService = module.get(PrismaService);
    aiService = module.get(AIService);
  });

  describe('Status Machine', () => {
    // Spec: master spec Section 3.7 — Status flow
    describe('valid transitions', () => {
      it('should allow PENDING_ASSESSMENT → AI_REVIEWED', () => {
        const isValid = service.isValidTransition(
          ConsultationStatus.PENDING_ASSESSMENT,
          ConsultationStatus.AI_REVIEWED
        );
        expect(isValid).toBe(true);
      });

      it('should allow AI_REVIEWED → DOCTOR_REVIEWING', () => {
        const isValid = service.isValidTransition(
          ConsultationStatus.AI_REVIEWED,
          ConsultationStatus.DOCTOR_REVIEWING
        );
        expect(isValid).toBe(true);
      });

      it('should allow DOCTOR_REVIEWING → APPROVED', () => {
        const isValid = service.isValidTransition(
          ConsultationStatus.DOCTOR_REVIEWING,
          ConsultationStatus.APPROVED
        );
        expect(isValid).toBe(true);
      });

      it('should allow DOCTOR_REVIEWING → NEEDS_INFO', () => {
        const isValid = service.isValidTransition(
          ConsultationStatus.DOCTOR_REVIEWING,
          ConsultationStatus.NEEDS_INFO
        );
        expect(isValid).toBe(true);
      });

      it('should allow DOCTOR_REVIEWING → REJECTED', () => {
        const isValid = service.isValidTransition(
          ConsultationStatus.DOCTOR_REVIEWING,
          ConsultationStatus.REJECTED
        );
        expect(isValid).toBe(true);
      });

      it('should allow NEEDS_INFO → DOCTOR_REVIEWING (patient responds)', () => {
        const isValid = service.isValidTransition(
          ConsultationStatus.NEEDS_INFO,
          ConsultationStatus.DOCTOR_REVIEWING
        );
        expect(isValid).toBe(true);
      });
    });

    describe('invalid transitions', () => {
      it('should NOT allow PENDING_ASSESSMENT → APPROVED (skip AI)', () => {
        const isValid = service.isValidTransition(
          ConsultationStatus.PENDING_ASSESSMENT,
          ConsultationStatus.APPROVED
        );
        expect(isValid).toBe(false);
      });

      it('should NOT allow PENDING_ASSESSMENT → DOCTOR_REVIEWING (skip AI)', () => {
        const isValid = service.isValidTransition(
          ConsultationStatus.PENDING_ASSESSMENT,
          ConsultationStatus.DOCTOR_REVIEWING
        );
        expect(isValid).toBe(false);
      });

      it('should NOT allow AI_REVIEWED → APPROVED (skip doctor)', () => {
        const isValid = service.isValidTransition(
          ConsultationStatus.AI_REVIEWED,
          ConsultationStatus.APPROVED
        );
        expect(isValid).toBe(false);
      });

      it('should NOT allow APPROVED → PENDING_ASSESSMENT (backwards)', () => {
        const isValid = service.isValidTransition(
          ConsultationStatus.APPROVED,
          ConsultationStatus.PENDING_ASSESSMENT
        );
        expect(isValid).toBe(false);
      });

      it('should NOT allow REJECTED → DOCTOR_REVIEWING', () => {
        const isValid = service.isValidTransition(
          ConsultationStatus.REJECTED,
          ConsultationStatus.DOCTOR_REVIEWING
        );
        expect(isValid).toBe(false);
      });
    });
  });

  describe('updateStatus', () => {
    it('should update status when transition is valid', async () => {
      const aiReviewedConsultation = {
        ...mockConsultation,
        status: ConsultationStatus.AI_REVIEWED,
      };
      prismaService.consultation.findUnique.mockResolvedValue(aiReviewedConsultation);
      prismaService.consultation.update.mockResolvedValue({
        ...aiReviewedConsultation,
        status: ConsultationStatus.DOCTOR_REVIEWING,
        doctorId: 'doctor-123',
      });

      const result = await service.updateStatus(
        'consultation-123',
        ConsultationStatus.DOCTOR_REVIEWING,
        'doctor-123'
      );

      expect(result.status).toBe(ConsultationStatus.DOCTOR_REVIEWING);
      expect(prismaService.consultation.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException when transition is invalid', async () => {
      prismaService.consultation.findUnique.mockResolvedValue(mockConsultation);

      await expect(
        service.updateStatus('consultation-123', ConsultationStatus.APPROVED)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when consultation not found', async () => {
      prismaService.consultation.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus('non-existent', ConsultationStatus.AI_REVIEWED)
      ).rejects.toThrow(NotFoundException);
    });

    it('should set completedAt when transitioning to APPROVED', async () => {
      const reviewingConsultation = {
        ...mockConsultation,
        status: ConsultationStatus.DOCTOR_REVIEWING,
        doctorId: 'doctor-123',
      };
      prismaService.consultation.findUnique.mockResolvedValue(reviewingConsultation);
      prismaService.consultation.update.mockResolvedValue({
        ...reviewingConsultation,
        status: ConsultationStatus.APPROVED,
        completedAt: new Date(),
      });

      const result = await service.updateStatus(
        'consultation-123',
        ConsultationStatus.APPROVED
      );

      expect(prismaService.consultation.update).toHaveBeenCalledWith({
        where: { id: 'consultation-123' },
        data: expect.objectContaining({
          status: ConsultationStatus.APPROVED,
          completedAt: expect.any(Date),
        }),
      });
    });

    it('should require rejection reason when transitioning to REJECTED', async () => {
      const reviewingConsultation = {
        ...mockConsultation,
        status: ConsultationStatus.DOCTOR_REVIEWING,
        doctorId: 'doctor-123',
      };
      prismaService.consultation.findUnique.mockResolvedValue(reviewingConsultation);

      await expect(
        service.updateStatus('consultation-123', ConsultationStatus.REJECTED)
      ).rejects.toThrow('Rejection reason is required');
    });

    it('should save rejection reason when provided', async () => {
      const reviewingConsultation = {
        ...mockConsultation,
        status: ConsultationStatus.DOCTOR_REVIEWING,
        doctorId: 'doctor-123',
      };
      prismaService.consultation.findUnique.mockResolvedValue(reviewingConsultation);
      prismaService.consultation.update.mockResolvedValue({
        ...reviewingConsultation,
        status: ConsultationStatus.REJECTED,
        rejectionReason: 'Patient needs in-person examination',
      });

      await service.updateStatus(
        'consultation-123',
        ConsultationStatus.REJECTED,
        undefined,
        'Patient needs in-person examination'
      );

      expect(prismaService.consultation.update).toHaveBeenCalledWith({
        where: { id: 'consultation-123' },
        data: expect.objectContaining({
          status: ConsultationStatus.REJECTED,
          rejectionReason: 'Patient needs in-person examination',
        }),
      });
    });
  });

  describe('Case Assignment', () => {
    // Spec: master spec Section 6 — Routing by specialization
    it('should find available doctors by specialization for hair loss', async () => {
      aiService.getDoctorSpecializations.mockReturnValue(['DERMATOLOGY', 'TRICHOLOGY']);
      prismaService.user.findMany.mockResolvedValue([mockDoctor]);

      const doctors = await service.findAvailableDoctors(HealthVertical.HAIR_LOSS);

      expect(aiService.getDoctorSpecializations).toHaveBeenCalledWith(HealthVertical.HAIR_LOSS);
      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        where: {
          role: UserRole.DOCTOR,
          isVerified: true,
          doctorProfile: {
            specialization: { in: ['DERMATOLOGY', 'TRICHOLOGY'] },
            isAvailable: true,
          },
        },
        include: { doctorProfile: true },
      });
      expect(doctors).toHaveLength(1);
    });

    it('should assign consultation to doctor', async () => {
      const aiReviewedConsultation = {
        ...mockConsultation,
        status: ConsultationStatus.AI_REVIEWED,
      };
      prismaService.consultation.findUnique.mockResolvedValue(aiReviewedConsultation);
      prismaService.user.findFirst.mockResolvedValue(mockDoctor);
      prismaService.consultation.update.mockResolvedValue({
        ...aiReviewedConsultation,
        status: ConsultationStatus.DOCTOR_REVIEWING,
        doctorId: 'doctor-123',
      });

      const result = await service.assignToDoctor('consultation-123', 'doctor-123');

      expect(result.doctorId).toBe('doctor-123');
      expect(result.status).toBe(ConsultationStatus.DOCTOR_REVIEWING);
    });

    it('should throw error when assigning to non-doctor user', async () => {
      const aiReviewedConsultation = {
        ...mockConsultation,
        status: ConsultationStatus.AI_REVIEWED,
      };
      prismaService.consultation.findUnique.mockResolvedValue(aiReviewedConsultation);
      prismaService.user.findFirst.mockResolvedValue(null); // Not a doctor

      await expect(
        service.assignToDoctor('consultation-123', 'patient-123')
      ).rejects.toThrow('Invalid doctor');
    });

    it('should throw error when consultation not in AI_REVIEWED status', async () => {
      prismaService.consultation.findUnique.mockResolvedValue(mockConsultation); // PENDING_ASSESSMENT

      await expect(
        service.assignToDoctor('consultation-123', 'doctor-123')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('AI Assessment Storage', () => {
    it('should store AI assessment result using a database transaction', async () => {
      const aiAssessmentData = {
        classification: {
          likely_condition: 'androgenetic_alopecia',
          confidence: 'high',
          alternative_considerations: [],
        },
        red_flags: [],
        contraindications: { finasteride: { safe: true, concerns: [] } },
        risk_factors: ['Family history'],
        recommended_protocol: {
          primary: 'standard',
          medications: [],
          additional: [],
        },
        doctor_attention_level: 'low',
        summary: 'Typical male pattern baldness.',
      };

      prismaService.consultation.findUnique.mockResolvedValue(mockConsultation);
      aiService.calculateAttentionLevel.mockReturnValue('low');

      // Mock $transaction to execute the callback with a mock transaction client
      const mockTx = {
        aIPreAssessment: { create: jest.fn().mockResolvedValue(mockAIAssessment) },
        consultation: {
          update: jest.fn().mockResolvedValue({
            ...mockConsultation,
            status: ConsultationStatus.AI_REVIEWED,
          }),
        },
      };
      (prismaService as any).$transaction.mockImplementation(async (cb: any) => cb(mockTx));

      const result = await service.storeAIAssessment('consultation-123', aiAssessmentData);

      // Verify $transaction was called (atomicity guarantee)
      expect((prismaService as any).$transaction).toHaveBeenCalled();

      // Verify AI assessment was created via the transaction client
      expect(mockTx.aIPreAssessment.create).toHaveBeenCalledWith({
        data: {
          consultationId: 'consultation-123',
          summary: 'Typical male pattern baldness.',
          riskLevel: 'LOW',
          recommendedPlan: 'standard',
          flags: [],
          rawResponse: aiAssessmentData,
          modelVersion: expect.any(String),
        },
      });

      // Verify consultation update was done via the transaction client
      expect(mockTx.consultation.update).toHaveBeenCalledWith({
        where: { id: 'consultation-123' },
        data: { status: ConsultationStatus.AI_REVIEWED },
      });

      expect(result.status).toBe(ConsultationStatus.AI_REVIEWED);
    });

    it('should transition to AI_REVIEWED after storing assessment', async () => {
      prismaService.consultation.findUnique.mockResolvedValue(mockConsultation);
      aiService.calculateAttentionLevel.mockReturnValue('low');

      const mockTx = {
        aIPreAssessment: { create: jest.fn().mockResolvedValue(mockAIAssessment) },
        consultation: {
          update: jest.fn().mockResolvedValue({
            ...mockConsultation,
            status: ConsultationStatus.AI_REVIEWED,
          }),
        },
      };
      (prismaService as any).$transaction.mockImplementation(async (cb: any) => cb(mockTx));

      const result = await service.storeAIAssessment('consultation-123', {
        summary: 'Test',
        doctor_attention_level: 'low',
        red_flags: [],
        recommended_protocol: { primary: 'standard' },
      } as any);

      expect(result.status).toBe(ConsultationStatus.AI_REVIEWED);
    });

    it('should roll back both operations if transaction fails', async () => {
      prismaService.consultation.findUnique.mockResolvedValue(mockConsultation);
      aiService.calculateAttentionLevel.mockReturnValue('low');

      // Simulate transaction failure (e.g., consultation update fails)
      (prismaService as any).$transaction.mockRejectedValue(new Error('Transaction failed'));

      await expect(
        service.storeAIAssessment('consultation-123', {
          summary: 'Test',
          doctor_attention_level: 'low',
          red_flags: [],
          recommended_protocol: { primary: 'standard' },
        } as any)
      ).rejects.toThrow('Transaction failed');
    });
  });

  describe('Photo Association', () => {
    it('should get photos associated with consultation', async () => {
      const mockPhotos = [
        { id: 'photo-1', type: 'scalp_top', url: 'https://s3.../scalp_top.jpg' },
        { id: 'photo-2', type: 'scalp_front', url: 'https://s3.../scalp_front.jpg' },
      ];
      const consultationWithIntake = {
        ...mockConsultation,
        intakeResponse: {
          patientProfileId: 'profile-123',
        },
      };
      prismaService.consultation.findUnique.mockResolvedValue(consultationWithIntake);
      prismaService.patientPhoto.findMany.mockResolvedValue(mockPhotos);

      const photos = await service.getConsultationPhotos('consultation-123');

      expect(prismaService.patientPhoto.findMany).toHaveBeenCalledWith({
        where: { patientProfileId: 'profile-123' },
        orderBy: { createdAt: 'desc' },
      });
      expect(photos).toHaveLength(2);
    });

    it('should throw NotFoundException when consultation not found', async () => {
      prismaService.consultation.findUnique.mockResolvedValue(null);

      await expect(service.getConsultationPhotos('non-existent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('Queue Management', () => {
    it('should get doctor queue (consultations assigned to doctor)', async () => {
      const assignedConsultations = [
        { ...mockConsultation, status: ConsultationStatus.DOCTOR_REVIEWING, doctorId: 'doctor-123' },
      ];
      prismaService.consultation.findMany.mockResolvedValue(assignedConsultations);

      const queue = await service.getDoctorQueue('doctor-123');

      expect(prismaService.consultation.findMany).toHaveBeenCalledWith({
        where: {
          doctorId: 'doctor-123',
          status: { in: [ConsultationStatus.DOCTOR_REVIEWING, ConsultationStatus.NEEDS_INFO] },
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'asc' },
      });
      expect(queue).toHaveLength(1);
    });

    it('should get unassigned consultations (AI_REVIEWED but no doctor)', async () => {
      const aiReviewedConsultations = [
        { ...mockConsultation, status: ConsultationStatus.AI_REVIEWED },
      ];
      prismaService.consultation.findMany.mockResolvedValue(aiReviewedConsultations);

      const unassigned = await service.getUnassignedConsultations(HealthVertical.HAIR_LOSS);

      expect(prismaService.consultation.findMany).toHaveBeenCalledWith({
        where: {
          status: ConsultationStatus.AI_REVIEWED,
          doctorId: null,
          vertical: HealthVertical.HAIR_LOSS,
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'asc' },
      });
    });

    it('should filter unassigned by attention level', async () => {
      prismaService.consultation.findMany.mockResolvedValue([]);

      await service.getUnassignedConsultations(HealthVertical.HAIR_LOSS, 'high');

      expect(prismaService.consultation.findMany).toHaveBeenCalledWith({
        where: {
          status: ConsultationStatus.AI_REVIEWED,
          doctorId: null,
          vertical: HealthVertical.HAIR_LOSS,
          aiAssessment: { riskLevel: 'HIGH' },
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('VALID_STATUS_TRANSITIONS constant', () => {
    it('should define all valid transitions explicitly', () => {
      expect(VALID_STATUS_TRANSITIONS).toBeDefined();
      expect(VALID_STATUS_TRANSITIONS[ConsultationStatus.PENDING_ASSESSMENT]).toContain(
        ConsultationStatus.AI_REVIEWED
      );
      expect(VALID_STATUS_TRANSITIONS[ConsultationStatus.AI_REVIEWED]).toContain(
        ConsultationStatus.DOCTOR_REVIEWING
      );
      expect(VALID_STATUS_TRANSITIONS[ConsultationStatus.DOCTOR_REVIEWING]).toContain(
        ConsultationStatus.APPROVED
      );
      expect(VALID_STATUS_TRANSITIONS[ConsultationStatus.DOCTOR_REVIEWING]).toContain(
        ConsultationStatus.NEEDS_INFO
      );
      expect(VALID_STATUS_TRANSITIONS[ConsultationStatus.DOCTOR_REVIEWING]).toContain(
        ConsultationStatus.REJECTED
      );
      expect(VALID_STATUS_TRANSITIONS[ConsultationStatus.NEEDS_INFO]).toContain(
        ConsultationStatus.DOCTOR_REVIEWING
      );
    });

    it('should NOT allow backwards transitions', () => {
      expect(VALID_STATUS_TRANSITIONS[ConsultationStatus.APPROVED]).not.toContain(
        ConsultationStatus.PENDING_ASSESSMENT
      );
      expect(VALID_STATUS_TRANSITIONS[ConsultationStatus.APPROVED]).not.toContain(
        ConsultationStatus.AI_REVIEWED
      );
    });
  });

  // Spec: Phase 13 — Video Consultation Status Transitions
  describe('Phase 13: Video Consultation Status Transitions', () => {
    describe('valid video transitions', () => {
      it('should allow DOCTOR_REVIEWING → VIDEO_SCHEDULED', () => {
        expect(service.isValidTransition(
          ConsultationStatus.DOCTOR_REVIEWING,
          ConsultationStatus.VIDEO_SCHEDULED
        )).toBe(true);
      });

      it('should allow VIDEO_SCHEDULED → VIDEO_COMPLETED', () => {
        expect(service.isValidTransition(
          ConsultationStatus.VIDEO_SCHEDULED,
          ConsultationStatus.VIDEO_COMPLETED
        )).toBe(true);
      });

      it('should allow VIDEO_SCHEDULED → DOCTOR_REVIEWING (video cancelled)', () => {
        expect(service.isValidTransition(
          ConsultationStatus.VIDEO_SCHEDULED,
          ConsultationStatus.DOCTOR_REVIEWING
        )).toBe(true);
      });

      it('should allow VIDEO_COMPLETED → APPROVED', () => {
        expect(service.isValidTransition(
          ConsultationStatus.VIDEO_COMPLETED,
          ConsultationStatus.APPROVED
        )).toBe(true);
      });

      it('should allow VIDEO_COMPLETED → AWAITING_LABS', () => {
        expect(service.isValidTransition(
          ConsultationStatus.VIDEO_COMPLETED,
          ConsultationStatus.AWAITING_LABS
        )).toBe(true);
      });

      it('should allow VIDEO_COMPLETED → REJECTED', () => {
        expect(service.isValidTransition(
          ConsultationStatus.VIDEO_COMPLETED,
          ConsultationStatus.REJECTED
        )).toBe(true);
      });

      it('should allow AWAITING_LABS → APPROVED', () => {
        expect(service.isValidTransition(
          ConsultationStatus.AWAITING_LABS,
          ConsultationStatus.APPROVED
        )).toBe(true);
      });

      it('should allow AWAITING_LABS → REJECTED', () => {
        expect(service.isValidTransition(
          ConsultationStatus.AWAITING_LABS,
          ConsultationStatus.REJECTED
        )).toBe(true);
      });
    });

    describe('invalid video transitions', () => {
      it('should NOT allow PENDING_ASSESSMENT → VIDEO_SCHEDULED (skip AI + doctor)', () => {
        expect(service.isValidTransition(
          ConsultationStatus.PENDING_ASSESSMENT,
          ConsultationStatus.VIDEO_SCHEDULED
        )).toBe(false);
      });

      it('should NOT allow VIDEO_SCHEDULED → APPROVED (must go through VIDEO_COMPLETED)', () => {
        expect(service.isValidTransition(
          ConsultationStatus.VIDEO_SCHEDULED,
          ConsultationStatus.APPROVED
        )).toBe(false);
      });

      it('should NOT allow AWAITING_LABS → DOCTOR_REVIEWING', () => {
        expect(service.isValidTransition(
          ConsultationStatus.AWAITING_LABS,
          ConsultationStatus.DOCTOR_REVIEWING
        )).toBe(false);
      });

      it('should NOT allow AI_REVIEWED → VIDEO_SCHEDULED (must go through DOCTOR_REVIEWING)', () => {
        expect(service.isValidTransition(
          ConsultationStatus.AI_REVIEWED,
          ConsultationStatus.VIDEO_SCHEDULED
        )).toBe(false);
      });
    });
  });

  describe('requestVideo', () => {
    it('should set videoRequested flag on consultation', async () => {
      const reviewing = {
        ...mockConsultation,
        status: ConsultationStatus.DOCTOR_REVIEWING,
        doctorId: 'doctor-123',
      };

      (prismaService.consultation.findUnique as jest.Mock).mockResolvedValue(reviewing);
      (prismaService.consultation.update as jest.Mock).mockResolvedValue({
        ...reviewing,
        videoRequested: true,
      });

      const result = await service.requestVideo('consultation-123', 'doctor-123');

      expect(prismaService.consultation.update).toHaveBeenCalledWith({
        where: { id: 'consultation-123' },
        data: { videoRequested: true },
      });
      expect(result.videoRequested).toBe(true);
    });

    it('should throw ForbiddenException if not assigned doctor', async () => {
      const reviewing = {
        ...mockConsultation,
        status: ConsultationStatus.DOCTOR_REVIEWING,
        doctorId: 'other-doctor',
      };

      (prismaService.consultation.findUnique as jest.Mock).mockResolvedValue(reviewing);

      await expect(
        service.requestVideo('consultation-123', 'doctor-123'),
      ).rejects.toThrow('Only the assigned doctor can request video');
    });

    it('should throw BadRequestException if not in DOCTOR_REVIEWING status', async () => {
      const aiReviewed = {
        ...mockConsultation,
        status: ConsultationStatus.AI_REVIEWED,
        doctorId: 'doctor-123',
      };

      (prismaService.consultation.findUnique as jest.Mock).mockResolvedValue(aiReviewed);

      await expect(
        service.requestVideo('consultation-123', 'doctor-123'),
      ).rejects.toThrow('Consultation must be in DOCTOR_REVIEWING status');
    });

    it('should throw NotFoundException if consultation not found', async () => {
      (prismaService.consultation.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.requestVideo('nonexistent', 'doctor-123'),
      ).rejects.toThrow('Consultation not found');
    });
  });
});
