import { Test, TestingModule } from '@nestjs/testing';
import { AIResolver } from './ai.resolver';
import { AIService, AIAssessment } from './ai.service';
import { ConsultationService } from '../consultation/consultation.service';
import { PrismaService } from '../prisma/prisma.service';

// Spec: master spec Section 6 (AI Pre-Assessment)

describe('AIResolver', () => {
  let resolver: AIResolver;
  let mockAIService: any;
  let mockConsultationService: any;
  let mockPrisma: any;

  const mockUser = { id: 'doctor-1', role: 'DOCTOR' };

  const mockAssessment: AIAssessment = {
    classification: {
      likely_condition: 'androgenetic_alopecia',
      confidence: 'high',
      alternative_considerations: [],
    },
    red_flags: [],
    contraindications: { finasteride: { safe: true, concerns: [] } },
    risk_factors: [],
    recommended_protocol: {
      primary: 'standard',
      medications: [{ name: 'Finasteride', dose: '1mg', frequency: 'daily' }],
      additional: [],
    },
    doctor_attention_level: 'low',
    summary: 'Likely androgenetic alopecia.',
  };

  const mockAIPreAssessment = {
    id: 'ai-1',
    consultationId: 'consult-1',
    summary: 'Likely androgenetic alopecia.',
    riskLevel: 'LOW',
    recommendedPlan: 'standard',
    flags: [],
    rawResponse: mockAssessment,
    modelVersion: 'claude-sonnet-4-5-20250929',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    mockAIService = {
      runAssessment: jest.fn(),
    };
    mockConsultationService = {
      storeAIAssessment: jest.fn(),
    };
    mockPrisma = {
      aIPreAssessment: {
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      consultation: {
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIResolver,
        { provide: AIService, useValue: mockAIService },
        { provide: ConsultationService, useValue: mockConsultationService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    resolver = module.get<AIResolver>(AIResolver);
  });

  // ============================================
  // QUERIES
  // ============================================

  describe('getAssessment', () => {
    it('should return assessment for a consultation', async () => {
      mockPrisma.aIPreAssessment.findUnique.mockResolvedValue(mockAIPreAssessment);

      const result = await resolver.getAssessment('consult-1');
      expect(result).toEqual(mockAIPreAssessment);
      expect(mockPrisma.aIPreAssessment.findUnique).toHaveBeenCalledWith({
        where: { consultationId: 'consult-1' },
      });
    });

    it('should return null if no assessment exists', async () => {
      mockPrisma.aIPreAssessment.findUnique.mockResolvedValue(null);

      const result = await resolver.getAssessment('consult-no-ai');
      expect(result).toBeNull();
    });
  });

  // ============================================
  // MUTATIONS
  // ============================================

  describe('runAssessment', () => {
    it('should trigger assessment and store result', async () => {
      mockAIService.runAssessment.mockResolvedValue(mockAssessment);
      mockConsultationService.storeAIAssessment.mockResolvedValue({
        id: 'consult-1',
        status: 'AI_REVIEWED',
      });

      const result = await resolver.runAssessment(mockUser, {
        consultationId: 'consult-1',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('completed');
      expect(mockAIService.runAssessment).toHaveBeenCalledWith('consult-1');
      expect(mockConsultationService.storeAIAssessment).toHaveBeenCalledWith(
        'consult-1',
        mockAssessment,
      );
    });

    it('should return failure if AI assessment returns null', async () => {
      mockAIService.runAssessment.mockResolvedValue(null);

      const result = await resolver.runAssessment(mockUser, {
        consultationId: 'consult-1',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('failed');
    });

    it('should handle errors gracefully', async () => {
      mockAIService.runAssessment.mockRejectedValue(new Error('Claude API down'));

      const result = await resolver.runAssessment(mockUser, {
        consultationId: 'consult-1',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Claude API down');
    });
  });

  describe('retryAssessment', () => {
    it('should delete existing assessment, reset status, and re-run', async () => {
      mockPrisma.aIPreAssessment.findUnique.mockResolvedValue(mockAIPreAssessment);
      mockPrisma.aIPreAssessment.delete.mockResolvedValue(mockAIPreAssessment);
      mockPrisma.consultation.update.mockResolvedValue({ id: 'consult-1', status: 'PENDING_ASSESSMENT' });
      mockAIService.runAssessment.mockResolvedValue(mockAssessment);
      mockConsultationService.storeAIAssessment.mockResolvedValue({
        id: 'consult-1',
        status: 'AI_REVIEWED',
      });

      const result = await resolver.retryAssessment(mockUser, 'consult-1');

      expect(result.success).toBe(true);
      expect(mockPrisma.aIPreAssessment.delete).toHaveBeenCalledWith({
        where: { consultationId: 'consult-1' },
      });
      expect(mockPrisma.consultation.update).toHaveBeenCalledWith({
        where: { id: 'consult-1' },
        data: { status: 'PENDING_ASSESSMENT' },
      });
      expect(mockAIService.runAssessment).toHaveBeenCalledWith('consult-1');
    });

    it('should run assessment even if no existing assessment to delete', async () => {
      mockPrisma.aIPreAssessment.findUnique.mockResolvedValue(null);
      mockPrisma.consultation.update.mockResolvedValue({ id: 'consult-1', status: 'PENDING_ASSESSMENT' });
      mockAIService.runAssessment.mockResolvedValue(mockAssessment);
      mockConsultationService.storeAIAssessment.mockResolvedValue({
        id: 'consult-1',
        status: 'AI_REVIEWED',
      });

      const result = await resolver.retryAssessment(mockUser, 'consult-1');

      expect(result.success).toBe(true);
      expect(mockPrisma.aIPreAssessment.delete).not.toHaveBeenCalled();
    });

    it('should return failure on error', async () => {
      mockPrisma.aIPreAssessment.findUnique.mockResolvedValue(null);
      mockPrisma.consultation.update.mockResolvedValue({ id: 'consult-1', status: 'PENDING_ASSESSMENT' });
      mockAIService.runAssessment.mockResolvedValue(null);

      const result = await resolver.retryAssessment(mockUser, 'consult-1');

      expect(result.success).toBe(false);
    });
  });
});
