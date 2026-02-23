import { Test, TestingModule } from '@nestjs/testing';
import { IntakeResolver } from './intake.resolver';
import { IntakeService } from './intake.service';
import { AIService } from '../ai/ai.service';
import { ConsultationService } from '../consultation/consultation.service';
import { AssignmentService } from '../assignment/assignment.service';
import { NotificationService } from '../notification/notification.service';
import { PrismaService } from '../prisma/prisma.service';
import { HealthVertical, UserRole, User } from '@prisma/client';

// Spec: Phase 12 — AI auto-trigger enhancement + auto-assignment wiring

describe('IntakeResolver', () => {
  let resolver: IntakeResolver;
  let intakeService: any;
  let aiService: any;
  let consultationService: any;
  let assignmentService: any;
  let notificationService: any;
  let prisma: any;

  const mockUser: User = {
    id: 'user-1',
    phone: '+919876543210',
    name: 'Test Patient',
    email: null,
    role: UserRole.PATIENT,
    isVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSubmitResult = {
    intakeResponse: { id: 'intake-1' },
    consultation: { id: 'consult-1', vertical: HealthVertical.HAIR_LOSS },
  };

  const mockAIAssessment = {
    riskLevel: 'LOW',
    summary: 'Mild hair loss',
    recommendations: ['Minoxidil 5%'],
    confidence: 0.85,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntakeResolver,
        {
          provide: IntakeService,
          useValue: {
            getAvailableVerticals: jest.fn(),
            getQuestionnaireTemplate: jest.fn(),
            getMyIntakes: jest.fn(),
            getIntakeByVertical: jest.fn(),
            saveIntakeDraft: jest.fn(),
            submitIntake: jest.fn(),
          },
        },
        {
          provide: AIService,
          useValue: {
            runAssessment: jest.fn(),
          },
        },
        {
          provide: ConsultationService,
          useValue: {
            storeAIAssessment: jest.fn(),
          },
        },
        {
          provide: AssignmentService,
          useValue: {
            assignDoctor: jest.fn(),
          },
        },
        {
          provide: NotificationService,
          useValue: {
            sendNotification: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            user: {
              findFirst: jest.fn().mockResolvedValue({ id: 'admin-1', role: UserRole.ADMIN }),
            },
          },
        },
      ],
    }).compile();

    resolver = module.get<IntakeResolver>(IntakeResolver);
    intakeService = module.get(IntakeService);
    aiService = module.get(AIService);
    consultationService = module.get(ConsultationService);
    assignmentService = module.get(AssignmentService);
    prisma = module.get(PrismaService);
    notificationService = module.get(NotificationService);
  });

  // ========================================
  // myConsultations query
  // ========================================

  describe('myConsultations', () => {
    it('should return consultations for the current user', async () => {
      const mockConsultations = [
        { id: 'c1', patientId: 'user-1', vertical: HealthVertical.HAIR_LOSS, status: 'PENDING_ASSESSMENT', createdAt: new Date() },
        { id: 'c2', patientId: 'user-1', vertical: HealthVertical.SEXUAL_HEALTH, status: 'DOCTOR_ASSIGNED', createdAt: new Date() },
      ];
      prisma.consultation = { findMany: jest.fn().mockResolvedValue(mockConsultations) };

      const result = await resolver.getMyConsultations(mockUser);

      expect(prisma.consultation.findMany).toHaveBeenCalledWith({
        where: { patientId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('c1');
    });

    it('should return empty array when user has no consultations', async () => {
      prisma.consultation = { findMany: jest.fn().mockResolvedValue([]) };

      const result = await resolver.getMyConsultations(mockUser);

      expect(result).toEqual([]);
    });
  });

  // ========================================
  // AI auto-trigger + auto-assignment chain
  // ========================================

  describe('submitIntake — AI + Assignment chain', () => {
    it('should trigger AI assessment after intake submission', async () => {
      intakeService.submitIntake.mockResolvedValue(mockSubmitResult);
      aiService.runAssessment.mockResolvedValue(mockAIAssessment);
      consultationService.storeAIAssessment.mockResolvedValue({ id: 'consult-1' });
      assignmentService.assignDoctor.mockResolvedValue({ assigned: true });

      await resolver.submitIntake(mockUser, {
        vertical: HealthVertical.HAIR_LOSS,
        responses: { Q1: '25' },
      });

      // Wait for fire-and-forget to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(aiService.runAssessment).toHaveBeenCalledWith('consult-1');
    });

    it('should not block intake response while AI runs', async () => {
      // AI takes a long time
      aiService.runAssessment.mockReturnValue(new Promise(() => {})); // never resolves
      intakeService.submitIntake.mockResolvedValue(mockSubmitResult);

      const result = await resolver.submitIntake(mockUser, {
        vertical: HealthVertical.HAIR_LOSS,
        responses: { Q1: '25' },
      });

      // Response should return immediately
      expect(result).toEqual(mockSubmitResult);
    });

    it('should trigger auto-assignment after AI completes', async () => {
      intakeService.submitIntake.mockResolvedValue(mockSubmitResult);
      aiService.runAssessment.mockResolvedValue(mockAIAssessment);
      consultationService.storeAIAssessment.mockResolvedValue({ id: 'consult-1' });
      assignmentService.assignDoctor.mockResolvedValue({ assigned: true });

      await resolver.submitIntake(mockUser, {
        vertical: HealthVertical.HAIR_LOSS,
        responses: { Q1: '25' },
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(consultationService.storeAIAssessment).toHaveBeenCalledWith('consult-1', mockAIAssessment);
      expect(assignmentService.assignDoctor).toHaveBeenCalledWith('consult-1');
    });

    it('should handle AI null response gracefully', async () => {
      intakeService.submitIntake.mockResolvedValue(mockSubmitResult);
      aiService.runAssessment.mockResolvedValue(null);

      await resolver.submitIntake(mockUser, {
        vertical: HealthVertical.HAIR_LOSS,
        responses: { Q1: '25' },
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      // Should NOT call storeAIAssessment or assignDoctor
      expect(consultationService.storeAIAssessment).not.toHaveBeenCalled();
      expect(assignmentService.assignDoctor).not.toHaveBeenCalled();
    });

    it('should notify admin on AI failure', async () => {
      intakeService.submitIntake.mockResolvedValue(mockSubmitResult);
      aiService.runAssessment.mockRejectedValue(new Error('API down'));

      await resolver.submitIntake(mockUser, {
        vertical: HealthVertical.HAIR_LOSS,
        responses: { Q1: '25' },
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'AI_ASSESSMENT_FAILED',
          recipientRole: 'ADMIN',
        }),
      );
    });
  });
});
