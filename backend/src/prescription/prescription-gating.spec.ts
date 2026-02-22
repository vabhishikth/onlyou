/**
 * Prescription Gating Tests (CRITICAL LEGAL GATE)
 * Phase 13: TPG 2020 — First-time Schedule H prescriptions require completed video consultation
 * Spec: Phase 13 plan — Chunk 5
 *
 * TDD: Write tests FIRST, then implement to make them pass.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PrescriptionService } from './prescription.service';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { ConsultationStatus, VideoSessionStatus, HealthVertical } from '@prisma/client';

// Mock PrismaService
const mockPrisma = {
  consultation: {
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  videoSession: {
    findFirst: jest.fn(),
  },
  prescription: {
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },
  order: {
    create: jest.fn(),
  },
  user: {
    findFirst: jest.fn(),
  },
  aIPreAssessment: {
    create: jest.fn(),
  },
};

// Mock UploadService
const mockUploadService = {
  uploadBuffer: jest.fn().mockResolvedValue('https://s3.example.com/prescriptions/rx-1/prescription.pdf'),
};

describe('Prescription Video Gating (Phase 13 — TPG 2020 Compliance)', () => {
  let service: PrescriptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrescriptionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: UploadService, useValue: mockUploadService },
      ],
    }).compile();

    service = module.get<PrescriptionService>(PrescriptionService);

    jest.clearAllMocks();
  });

  // ============================================================
  // canPrescribe — first consultation, video completed
  // ============================================================

  describe('canPrescribe', () => {
    const consultationId = 'consult-1';
    const patientId = 'patient-1';
    const doctorId = 'doctor-1';

    const makeConsultation = (overrides: any = {}) => ({
      id: consultationId,
      patientId,
      doctorId,
      vertical: HealthVertical.HAIR_LOSS,
      status: ConsultationStatus.VIDEO_COMPLETED,
      ...overrides,
    });

    it('should allow: first consultation + completed video', async () => {
      mockPrisma.consultation.findUnique.mockResolvedValue(makeConsultation());
      // No previous APPROVED consultations for this patient+vertical
      mockPrisma.consultation.count.mockResolvedValue(0);
      // Completed video session exists
      mockPrisma.videoSession.findFirst.mockResolvedValue({
        id: 'vs-1',
        consultationId,
        status: VideoSessionStatus.COMPLETED,
      });

      const result = await service.canPrescribe(consultationId);

      expect(result.allowed).toBe(true);
      expect(result.isFirstConsultation).toBe(true);
      expect(result.videoRequired).toBe(true);
      expect(result.videoCompleted).toBe(true);
    });

    it('should block: first consultation + no video session', async () => {
      mockPrisma.consultation.findUnique.mockResolvedValue(makeConsultation());
      mockPrisma.consultation.count.mockResolvedValue(0);
      mockPrisma.videoSession.findFirst.mockResolvedValue(null);

      const result = await service.canPrescribe(consultationId);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('video consultation');
      expect(result.videoCompleted).toBe(false);
    });

    it('should block: first consultation + video in SCHEDULED status', async () => {
      mockPrisma.consultation.findUnique.mockResolvedValue(makeConsultation());
      mockPrisma.consultation.count.mockResolvedValue(0);
      mockPrisma.videoSession.findFirst.mockResolvedValue({
        id: 'vs-1',
        consultationId,
        status: VideoSessionStatus.SCHEDULED,
      });

      const result = await service.canPrescribe(consultationId);

      expect(result.allowed).toBe(false);
      expect(result.videoCompleted).toBe(false);
    });

    it('should block: first consultation + video in IN_PROGRESS status', async () => {
      mockPrisma.consultation.findUnique.mockResolvedValue(makeConsultation());
      mockPrisma.consultation.count.mockResolvedValue(0);
      mockPrisma.videoSession.findFirst.mockResolvedValue({
        id: 'vs-1',
        consultationId,
        status: VideoSessionStatus.IN_PROGRESS,
      });

      const result = await service.canPrescribe(consultationId);

      expect(result.allowed).toBe(false);
      expect(result.videoCompleted).toBe(false);
    });

    it('should allow: follow-up consultation without video', async () => {
      mockPrisma.consultation.findUnique.mockResolvedValue(makeConsultation());
      // 1 previous APPROVED consultation for same patient+vertical
      mockPrisma.consultation.count.mockResolvedValue(1);

      const result = await service.canPrescribe(consultationId);

      expect(result.allowed).toBe(true);
      expect(result.isFirstConsultation).toBe(false);
      expect(result.videoRequired).toBe(false);
    });

    it('should NOT count REJECTED consultations as previous', async () => {
      mockPrisma.consultation.findUnique.mockResolvedValue(makeConsultation());
      // count query should filter for APPROVED only
      mockPrisma.consultation.count.mockResolvedValue(0);
      mockPrisma.videoSession.findFirst.mockResolvedValue(null);

      const result = await service.canPrescribe(consultationId);

      // Verify count query filters for APPROVED status
      const countCall = mockPrisma.consultation.count.mock.calls[0][0];
      expect(countCall.where.status).toBe(ConsultationStatus.APPROVED);
      expect(result.allowed).toBe(false); // Still first consultation, needs video
    });

    it('should NOT count PENDING_ASSESSMENT as previous', async () => {
      mockPrisma.consultation.findUnique.mockResolvedValue(makeConsultation());
      mockPrisma.consultation.count.mockResolvedValue(0);
      mockPrisma.videoSession.findFirst.mockResolvedValue(null);

      const result = await service.canPrescribe(consultationId);

      // The count query should only match APPROVED status
      const countCall = mockPrisma.consultation.count.mock.calls[0][0];
      expect(countCall.where.status).toBe(ConsultationStatus.APPROVED);
      expect(result.isFirstConsultation).toBe(true);
    });

    it('should check video for correct consultation ID (not another)', async () => {
      mockPrisma.consultation.findUnique.mockResolvedValue(makeConsultation());
      mockPrisma.consultation.count.mockResolvedValue(0);
      mockPrisma.videoSession.findFirst.mockResolvedValue({
        id: 'vs-1',
        consultationId,
        status: VideoSessionStatus.COMPLETED,
      });

      await service.canPrescribe(consultationId);

      // Verify the video session query matches the correct consultation
      const findCall = mockPrisma.videoSession.findFirst.mock.calls[0][0];
      expect(findCall.where.consultationId).toBe(consultationId);
    });

    // Multi-vertical tests
    it('should block: patient completed HAIR_LOSS video, tries SEXUAL_HEALTH prescription', async () => {
      // Current consultation is for SEXUAL_HEALTH
      mockPrisma.consultation.findUnique.mockResolvedValue(
        makeConsultation({ vertical: HealthVertical.SEXUAL_HEALTH }),
      );
      // No previous APPROVED SEXUAL_HEALTH consultations
      mockPrisma.consultation.count.mockResolvedValue(0);
      // No completed video for THIS consultation
      mockPrisma.videoSession.findFirst.mockResolvedValue(null);

      const result = await service.canPrescribe(consultationId);

      expect(result.allowed).toBe(false);
      // Count query should filter by the correct vertical
      const countCall = mockPrisma.consultation.count.mock.calls[0][0];
      expect(countCall.where.vertical).toBe(HealthVertical.SEXUAL_HEALTH);
    });

    it('should allow: patient completed SEXUAL_HEALTH video → SEXUAL_HEALTH prescription', async () => {
      mockPrisma.consultation.findUnique.mockResolvedValue(
        makeConsultation({ vertical: HealthVertical.SEXUAL_HEALTH }),
      );
      mockPrisma.consultation.count.mockResolvedValue(0);
      mockPrisma.videoSession.findFirst.mockResolvedValue({
        id: 'vs-1',
        consultationId,
        status: VideoSessionStatus.COMPLETED,
      });

      const result = await service.canPrescribe(consultationId);

      expect(result.allowed).toBe(true);
    });

    it('should allow: HAIR_LOSS first with completed HAIR_LOSS video', async () => {
      mockPrisma.consultation.findUnique.mockResolvedValue(
        makeConsultation({ vertical: HealthVertical.HAIR_LOSS }),
      );
      mockPrisma.consultation.count.mockResolvedValue(0);
      mockPrisma.videoSession.findFirst.mockResolvedValue({
        id: 'vs-1',
        consultationId,
        status: VideoSessionStatus.COMPLETED,
      });

      const result = await service.canPrescribe(consultationId);

      expect(result.allowed).toBe(true);
      expect(result.isFirstConsultation).toBe(true);
      expect(result.videoCompleted).toBe(true);
    });
  });

  // ============================================================
  // createPrescription integration with canPrescribe
  // ============================================================

  describe('createPrescription + canPrescribe integration', () => {
    const validDoctor = {
      id: 'doctor-1',
      name: 'Dr. Test',
      role: 'DOCTOR',
      isVerified: true,
      doctorProfile: {
        registrationNo: 'KA/12345/2020',
        qualifications: ['MBBS'],
      },
    };

    const validConsultation = {
      id: 'consult-1',
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      vertical: HealthVertical.HAIR_LOSS,
      status: ConsultationStatus.VIDEO_COMPLETED,
      intakeResponse: {
        responses: { Q1: '30', Q2: 'Male' },
        patientProfileId: 'pp-1',
      },
      patient: {
        name: 'Test Patient',
        phone: '+919876543210',
        patientProfile: {
          dateOfBirth: new Date('1996-01-01'),
          gender: 'MALE',
          addressLine1: '123 Main St',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560001',
        },
      },
    };

    it('should call canPrescribe before creating prescription', async () => {
      const canPrescribeSpy = jest.spyOn(service, 'canPrescribe').mockResolvedValue({
        allowed: true,
        isFirstConsultation: false,
        videoRequired: false,
        videoCompleted: false,
      });

      mockPrisma.user.findFirst.mockResolvedValue(validDoctor);
      mockPrisma.consultation.findUnique.mockResolvedValue(validConsultation);
      mockPrisma.prescription.create.mockResolvedValue({ id: 'rx-1' });
      mockPrisma.order.create.mockResolvedValue({ id: 'ord-1' });
      mockPrisma.consultation.update.mockResolvedValue({});

      await service.createPrescription({
        consultationId: 'consult-1',
        doctorId: 'doctor-1',
        template: 'MINOXIDIL_ONLY' as any,
      });

      expect(canPrescribeSpy).toHaveBeenCalledWith('consult-1');

      canPrescribeSpy.mockRestore();
    });

    it('should throw BadRequestException if canPrescribe returns false', async () => {
      jest.spyOn(service, 'canPrescribe').mockResolvedValue({
        allowed: false,
        reason: 'First-time prescriptions require a completed video consultation',
        isFirstConsultation: true,
        videoRequired: true,
        videoCompleted: false,
      });

      mockPrisma.user.findFirst.mockResolvedValue(validDoctor);
      mockPrisma.consultation.findUnique.mockResolvedValue(validConsultation);

      await expect(
        service.createPrescription({
          consultationId: 'consult-1',
          doctorId: 'doctor-1',
          template: 'MINOXIDIL_ONLY' as any,
        }),
      ).rejects.toThrow(BadRequestException);

      jest.spyOn(service, 'canPrescribe').mockRestore();
    });

    it('should proceed normally if canPrescribe returns true', async () => {
      jest.spyOn(service, 'canPrescribe').mockResolvedValue({
        allowed: true,
        isFirstConsultation: false,
        videoRequired: false,
        videoCompleted: false,
      });

      mockPrisma.user.findFirst.mockResolvedValue(validDoctor);
      mockPrisma.consultation.findUnique.mockResolvedValue(validConsultation);
      mockPrisma.prescription.create.mockResolvedValue({ id: 'rx-1', consultationId: 'consult-1' });
      mockPrisma.prescription.update.mockResolvedValue({});
      mockPrisma.order.create.mockResolvedValue({ id: 'ord-1' });
      mockPrisma.consultation.update.mockResolvedValue({});

      const result = await service.createPrescription({
        consultationId: 'consult-1',
        doctorId: 'doctor-1',
        template: 'MINOXIDIL_ONLY' as any,
      });

      expect(result.prescription).toBeDefined();
      expect(result.order).toBeDefined();

      jest.spyOn(service, 'canPrescribe').mockRestore();
    });
  });
});
