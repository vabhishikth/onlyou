import { Test, TestingModule } from '@nestjs/testing';
import { AssignmentService, AssignmentResult } from './assignment.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { HealthVertical, ConsultationStatus, UserRole } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';

// Spec: Phase 12 — Load-Balanced Doctor Auto-Assignment

describe('AssignmentService', () => {
  let service: AssignmentService;
  let prisma: any;
  let notificationService: any;

  const mockConsultation = {
    id: 'consult-1',
    patientId: 'patient-1',
    doctorId: null,
    vertical: HealthVertical.HAIR_LOSS,
    status: ConsultationStatus.AI_REVIEWED,
    assignedAt: null,
    slaDeadline: null,
    previousDoctorIds: [],
    aiAssessment: {
      id: 'ai-1',
      riskLevel: 'LOW',
      summary: 'Mild hair loss',
    },
  };

  const makeDoctorProfile = (overrides: any = {}) => ({
    id: overrides.id || 'dp-1',
    userId: overrides.userId || 'user-doc-1',
    specializations: overrides.specializations || ['Dermatology', 'Trichology'],
    verticals: overrides.verticals || [HealthVertical.HAIR_LOSS],
    isAvailable: overrides.isAvailable ?? true,
    isActive: overrides.isActive ?? true,
    seniorDoctor: overrides.seniorDoctor ?? false,
    dailyCaseLimit: overrides.dailyCaseLimit ?? 15,
    lastAssignedAt: overrides.lastAssignedAt || null,
    user: {
      id: overrides.userId || 'user-doc-1',
      name: overrides.name || 'Dr. Kumar',
      role: UserRole.DOCTOR,
      isVerified: true,
    },
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentService,
        {
          provide: PrismaService,
          useValue: {
            consultation: {
              findUnique: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            doctorProfile: {
              findMany: jest.fn(),
              update: jest.fn(),
            },
            user: {
              findFirst: jest.fn(),
            },
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

    service = module.get<AssignmentService>(AssignmentService);
    prisma = module.get(PrismaService);
    notificationService = module.get(NotificationService);
  });

  // ========================================
  // calculateLoadScore
  // ========================================

  describe('calculateLoadScore', () => {
    it('should calculate load score as activeCount / dailyLimit', () => {
      expect(service.calculateLoadScore(5, 15)).toBeCloseTo(0.333, 2);
    });

    it('should return 1.0 when dailyLimit is 0 (treat as fully loaded)', () => {
      expect(service.calculateLoadScore(0, 0)).toBe(1.0);
    });

    it('should return 0 when no active cases', () => {
      expect(service.calculateLoadScore(0, 15)).toBe(0);
    });
  });

  // ========================================
  // assignDoctor
  // ========================================

  describe('assignDoctor', () => {
    it('should assign to the only eligible doctor', async () => {
      const doctor = makeDoctorProfile();
      prisma.consultation.findUnique.mockResolvedValue(mockConsultation);
      prisma.doctorProfile.findMany.mockResolvedValue([doctor]);
      prisma.consultation.count.mockResolvedValue(5); // 5 active cases
      prisma.consultation.update.mockResolvedValue({
        ...mockConsultation,
        doctorId: 'user-doc-1',
        status: ConsultationStatus.DOCTOR_REVIEWING,
      });
      prisma.doctorProfile.update.mockResolvedValue(doctor);

      const result = await service.assignDoctor('consult-1');

      expect(result.assigned).toBe(true);
      expect(result.doctorId).toBe('user-doc-1');
      expect(result.reason).toBe('assigned');
    });

    it('should assign to doctor with lowest load score', async () => {
      const doctor1 = makeDoctorProfile({ id: 'dp-1', userId: 'doc-1', name: 'Dr. Kumar', dailyCaseLimit: 15 });
      const doctor2 = makeDoctorProfile({ id: 'dp-2', userId: 'doc-2', name: 'Dr. Reddy', dailyCaseLimit: 15 });

      prisma.consultation.findUnique.mockResolvedValue(mockConsultation);
      prisma.doctorProfile.findMany.mockResolvedValue([doctor1, doctor2]);
      // doc-1 has 10 active, doc-2 has 3 active
      prisma.consultation.count
        .mockResolvedValueOnce(10)  // doc-1
        .mockResolvedValueOnce(3);  // doc-2
      prisma.consultation.update.mockResolvedValue({
        ...mockConsultation,
        doctorId: 'doc-2',
        status: ConsultationStatus.DOCTOR_REVIEWING,
      });
      prisma.doctorProfile.update.mockResolvedValue(doctor2);

      const result = await service.assignDoctor('consult-1');

      expect(result.assigned).toBe(true);
      expect(result.doctorId).toBe('doc-2'); // lowest load score
    });

    it('should use lastAssignedAt as tie-breaker when scores equal', async () => {
      const oldDate = new Date('2026-02-20T08:00:00Z');
      const newDate = new Date('2026-02-21T10:00:00Z');
      const doctor1 = makeDoctorProfile({ id: 'dp-1', userId: 'doc-1', dailyCaseLimit: 15, lastAssignedAt: newDate });
      const doctor2 = makeDoctorProfile({ id: 'dp-2', userId: 'doc-2', dailyCaseLimit: 15, lastAssignedAt: oldDate });

      prisma.consultation.findUnique.mockResolvedValue(mockConsultation);
      prisma.doctorProfile.findMany.mockResolvedValue([doctor1, doctor2]);
      // Both have 5 active cases (same load score)
      prisma.consultation.count.mockResolvedValue(5);
      prisma.consultation.update.mockResolvedValue({ ...mockConsultation, doctorId: 'doc-2' });
      prisma.doctorProfile.update.mockResolvedValue(doctor2);

      const result = await service.assignDoctor('consult-1');

      expect(result.assigned).toBe(true);
      expect(result.doctorId).toBe('doc-2'); // older lastAssignedAt wins
    });

    it('should treat dailyCaseLimit=0 as fully loaded (skip)', async () => {
      const doctor1 = makeDoctorProfile({ id: 'dp-1', userId: 'doc-1', dailyCaseLimit: 0 });
      const doctor2 = makeDoctorProfile({ id: 'dp-2', userId: 'doc-2', dailyCaseLimit: 15 });

      prisma.consultation.findUnique.mockResolvedValue(mockConsultation);
      prisma.doctorProfile.findMany.mockResolvedValue([doctor1, doctor2]);
      prisma.consultation.count.mockResolvedValue(0);
      prisma.consultation.update.mockResolvedValue({ ...mockConsultation, doctorId: 'doc-2' });
      prisma.doctorProfile.update.mockResolvedValue(doctor2);

      const result = await service.assignDoctor('consult-1');

      expect(result.assigned).toBe(true);
      expect(result.doctorId).toBe('doc-2'); // doc-1 skipped (limit=0)
    });

    it('should not assign to unavailable doctors', async () => {
      prisma.consultation.findUnique.mockResolvedValue(mockConsultation);
      prisma.doctorProfile.findMany.mockResolvedValue([]); // no available doctors
      // Mock admin user for notification
      prisma.user.findFirst.mockResolvedValue({ id: 'admin-1' });

      const result = await service.assignDoctor('consult-1');

      expect(result.assigned).toBe(false);
      expect(result.reason).toBe('no_eligible_doctors');
    });

    it('should not assign to deactivated doctors', async () => {
      // findMany already filters isActive=true, so empty result
      prisma.consultation.findUnique.mockResolvedValue(mockConsultation);
      prisma.doctorProfile.findMany.mockResolvedValue([]);
      prisma.user.findFirst.mockResolvedValue({ id: 'admin-1' });

      const result = await service.assignDoctor('consult-1');

      expect(result.assigned).toBe(false);
    });

    it('should not assign to doctors who exceeded daily case limit', async () => {
      const doctor = makeDoctorProfile({ dailyCaseLimit: 5 });
      prisma.consultation.findUnique.mockResolvedValue(mockConsultation);
      prisma.doctorProfile.findMany.mockResolvedValue([doctor]);
      prisma.consultation.count.mockResolvedValue(5); // at limit
      prisma.user.findFirst.mockResolvedValue({ id: 'admin-1' });

      const result = await service.assignDoctor('consult-1');

      expect(result.assigned).toBe(false);
      expect(result.reason).toBe('no_eligible_doctors');
    });

    it('should not assign to doctors without matching vertical', async () => {
      // findMany filters by vertical, so empty result for non-matching
      prisma.consultation.findUnique.mockResolvedValue({
        ...mockConsultation,
        vertical: HealthVertical.PCOS,
      });
      prisma.doctorProfile.findMany.mockResolvedValue([]); // no PCOS doctors
      prisma.user.findFirst.mockResolvedValue({ id: 'admin-1' });

      const result = await service.assignDoctor('consult-1');

      expect(result.assigned).toBe(false);
    });

    it('should send admin alert when no eligible doctors found', async () => {
      prisma.consultation.findUnique.mockResolvedValue(mockConsultation);
      prisma.doctorProfile.findMany.mockResolvedValue([]);
      prisma.user.findFirst.mockResolvedValue({ id: 'admin-1' });

      await service.assignDoctor('consult-1');

      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'NO_ELIGIBLE_DOCTORS',
        }),
      );
    });

    it('should prefer senior doctors for HIGH riskLevel', async () => {
      const highRiskConsultation = {
        ...mockConsultation,
        aiAssessment: { ...mockConsultation.aiAssessment, riskLevel: 'HIGH' },
      };
      const juniorDoctor = makeDoctorProfile({ id: 'dp-1', userId: 'doc-1', seniorDoctor: false });
      const seniorDoctor = makeDoctorProfile({ id: 'dp-2', userId: 'doc-2', seniorDoctor: true });

      prisma.consultation.findUnique.mockResolvedValue(highRiskConsultation);
      // First call: senior doctors only
      prisma.doctorProfile.findMany.mockResolvedValueOnce([seniorDoctor]);
      prisma.consultation.count.mockResolvedValue(3);
      prisma.consultation.update.mockResolvedValue({ ...highRiskConsultation, doctorId: 'doc-2' });
      prisma.doctorProfile.update.mockResolvedValue(seniorDoctor);

      const result = await service.assignDoctor('consult-1');

      expect(result.assigned).toBe(true);
      expect(result.doctorId).toBe('doc-2');
    });

    it('should assign to non-senior with alert if no seniors available for HIGH', async () => {
      const highRiskConsultation = {
        ...mockConsultation,
        aiAssessment: { ...mockConsultation.aiAssessment, riskLevel: 'HIGH' },
      };
      const juniorDoctor = makeDoctorProfile({ id: 'dp-1', userId: 'doc-1', seniorDoctor: false });

      prisma.consultation.findUnique.mockResolvedValue(highRiskConsultation);
      // First call: senior doctors — empty
      prisma.doctorProfile.findMany
        .mockResolvedValueOnce([])         // no seniors
        .mockResolvedValueOnce([juniorDoctor]); // fallback to all
      prisma.consultation.count.mockResolvedValue(3);
      prisma.consultation.update.mockResolvedValue({ ...highRiskConsultation, doctorId: 'doc-1' });
      prisma.doctorProfile.update.mockResolvedValue(juniorDoctor);
      prisma.user.findFirst.mockResolvedValue({ id: 'admin-1' });

      const result = await service.assignDoctor('consult-1');

      expect(result.assigned).toBe(true);
      expect(result.doctorId).toBe('doc-1');
      // Should have sent admin alert about non-senior assignment
      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'HIGH_ATTENTION_NON_SENIOR',
        }),
      );
    });

    it('should update consultation status to DOCTOR_REVIEWING', async () => {
      const doctor = makeDoctorProfile();
      prisma.consultation.findUnique.mockResolvedValue(mockConsultation);
      prisma.doctorProfile.findMany.mockResolvedValue([doctor]);
      prisma.consultation.count.mockResolvedValue(3);
      prisma.consultation.update.mockResolvedValue({
        ...mockConsultation,
        doctorId: 'user-doc-1',
        status: ConsultationStatus.DOCTOR_REVIEWING,
      });
      prisma.doctorProfile.update.mockResolvedValue(doctor);

      await service.assignDoctor('consult-1');

      expect(prisma.consultation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ConsultationStatus.DOCTOR_REVIEWING,
          }),
        }),
      );
    });

    it('should set consultation.assignedAt', async () => {
      const doctor = makeDoctorProfile();
      prisma.consultation.findUnique.mockResolvedValue(mockConsultation);
      prisma.doctorProfile.findMany.mockResolvedValue([doctor]);
      prisma.consultation.count.mockResolvedValue(3);
      prisma.consultation.update.mockResolvedValue({
        ...mockConsultation,
        doctorId: 'user-doc-1',
        assignedAt: new Date(),
      });
      prisma.doctorProfile.update.mockResolvedValue(doctor);

      await service.assignDoctor('consult-1');

      expect(prisma.consultation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            assignedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should update doctor lastAssignedAt', async () => {
      const doctor = makeDoctorProfile();
      prisma.consultation.findUnique.mockResolvedValue(mockConsultation);
      prisma.doctorProfile.findMany.mockResolvedValue([doctor]);
      prisma.consultation.count.mockResolvedValue(3);
      prisma.consultation.update.mockResolvedValue({ ...mockConsultation, doctorId: 'user-doc-1' });
      prisma.doctorProfile.update.mockResolvedValue(doctor);

      await service.assignDoctor('consult-1');

      expect(prisma.doctorProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'dp-1' },
          data: { lastAssignedAt: expect.any(Date) },
        }),
      );
    });

    it('should notify assigned doctor', async () => {
      const doctor = makeDoctorProfile();
      prisma.consultation.findUnique.mockResolvedValue(mockConsultation);
      prisma.doctorProfile.findMany.mockResolvedValue([doctor]);
      prisma.consultation.count.mockResolvedValue(3);
      prisma.consultation.update.mockResolvedValue({ ...mockConsultation, doctorId: 'user-doc-1' });
      prisma.doctorProfile.update.mockResolvedValue(doctor);

      await service.assignDoctor('consult-1');

      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'user-doc-1',
          eventType: 'CONSULTATION_ASSIGNED',
        }),
      );
    });

    it('should set correct SLA deadline — 4hr for LOW', async () => {
      const doctor = makeDoctorProfile();
      prisma.consultation.findUnique.mockResolvedValue(mockConsultation); // riskLevel=LOW
      prisma.doctorProfile.findMany.mockResolvedValue([doctor]);
      prisma.consultation.count.mockResolvedValue(3);
      prisma.consultation.update.mockResolvedValue({ ...mockConsultation, doctorId: 'user-doc-1' });
      prisma.doctorProfile.update.mockResolvedValue(doctor);

      const result = await service.assignDoctor('consult-1');

      expect(result.slaDeadline).toBeDefined();
      // SLA deadline should be ~4 hours from now
      const hoursFromNow = (result.slaDeadline!.getTime() - Date.now()) / (1000 * 60 * 60);
      expect(hoursFromNow).toBeGreaterThan(3.9);
      expect(hoursFromNow).toBeLessThan(4.1);
    });

    it('should set correct SLA deadline — 1hr for HIGH', async () => {
      const highRiskConsultation = {
        ...mockConsultation,
        aiAssessment: { ...mockConsultation.aiAssessment, riskLevel: 'HIGH' },
      };
      const doctor = makeDoctorProfile({ seniorDoctor: true });
      prisma.consultation.findUnique.mockResolvedValue(highRiskConsultation);
      prisma.doctorProfile.findMany.mockResolvedValue([doctor]);
      prisma.consultation.count.mockResolvedValue(3);
      prisma.consultation.update.mockResolvedValue({ ...highRiskConsultation, doctorId: 'user-doc-1' });
      prisma.doctorProfile.update.mockResolvedValue(doctor);

      const result = await service.assignDoctor('consult-1');

      expect(result.slaDeadline).toBeDefined();
      const hoursFromNow = (result.slaDeadline!.getTime() - Date.now()) / (1000 * 60 * 60);
      expect(hoursFromNow).toBeGreaterThan(0.9);
      expect(hoursFromNow).toBeLessThan(1.1);
    });

    it('should exclude doctors in excludeDoctorIds on reassignment', async () => {
      const consultationWithPrevious = {
        ...mockConsultation,
        previousDoctorIds: ['doc-1'],
      };
      const doctor2 = makeDoctorProfile({ id: 'dp-2', userId: 'doc-2', name: 'Dr. Reddy' });

      prisma.consultation.findUnique.mockResolvedValue(consultationWithPrevious);
      prisma.doctorProfile.findMany.mockResolvedValue([doctor2]);
      prisma.consultation.count.mockResolvedValue(3);
      prisma.consultation.update.mockResolvedValue({ ...consultationWithPrevious, doctorId: 'doc-2' });
      prisma.doctorProfile.update.mockResolvedValue(doctor2);

      const result = await service.reassignDoctor('consult-1', ['doc-1']);

      expect(result.assigned).toBe(true);
      expect(result.doctorId).toBe('doc-2');
      expect(result.reason).toBe('reassigned');
    });
  });
});
