import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService, DashboardStatus, DASHBOARD_STATUS_BADGES } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConsultationStatus, HealthVertical, UserRole } from '@prisma/client';

// Spec: master spec Section 5 (Doctor Dashboard)

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: PrismaService;

  // Mock data
  const mockDoctor = {
    id: 'doctor-1',
    role: UserRole.DOCTOR,
    isVerified: true,
  };

  const mockDoctor2 = {
    id: 'doctor-2',
    role: UserRole.DOCTOR,
    isVerified: true,
  };

  const mockAdmin = {
    id: 'admin-1',
    role: UserRole.ADMIN,
    isVerified: true,
  };

  const mockPatient = {
    id: 'patient-1',
    role: UserRole.PATIENT,
    name: 'Test Patient',
    phone: '+919876543210',
  };

  const mockConsultation = {
    id: 'consultation-1',
    patientId: 'patient-1',
    doctorId: 'doctor-1',
    vertical: HealthVertical.HAIR_LOSS,
    status: ConsultationStatus.DOCTOR_REVIEWING,
    createdAt: new Date('2026-02-10'),
    updatedAt: new Date('2026-02-10'),
    patient: {
      id: 'patient-1',
      name: 'Test Patient',
      phone: '+919876543210',
      patientProfile: {
        gender: 'MALE',
        dateOfBirth: new Date('1990-01-01'),
        city: 'Mumbai',
      },
    },
    intakeResponse: {
      id: 'intake-1',
      responses: { Q1: '30', Q2: 'Male' },
      questionnaireTemplate: { schema: {} },
    },
    aiAssessment: {
      id: 'ai-1',
      summary: 'Likely androgenetic alopecia',
      riskLevel: 'LOW',
      flags: [],
    },
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    consultation: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    patientPhoto: {
      findMany: jest.fn(),
    },
    message: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Status Badge Mapping', () => {
    // Spec: master spec Section 5.1 — Status badges

    it('should map status badges correctly', () => {
      expect(DASHBOARD_STATUS_BADGES.NEW).toBe('🟢');
      expect(DASHBOARD_STATUS_BADGES.IN_REVIEW).toBe('🟡');
      expect(DASHBOARD_STATUS_BADGES.AWAITING_RESPONSE).toBe('🟠');
      expect(DASHBOARD_STATUS_BADGES.LAB_RESULTS_READY).toBe('🟣');
      expect(DASHBOARD_STATUS_BADGES.FOLLOW_UP).toBe('🔵');
      expect(DASHBOARD_STATUS_BADGES.COMPLETED).toBe('⚪');
      expect(DASHBOARD_STATUS_BADGES.REFERRED).toBe('🔴');
    });

    it('should convert PENDING_ASSESSMENT to NEW dashboard status', () => {
      const result = service.mapToDashboardStatus(ConsultationStatus.PENDING_ASSESSMENT);
      expect(result).toBe(DashboardStatus.NEW);
    });

    it('should convert AI_REVIEWED to NEW dashboard status', () => {
      const result = service.mapToDashboardStatus(ConsultationStatus.AI_REVIEWED);
      expect(result).toBe(DashboardStatus.NEW);
    });

    it('should convert DOCTOR_REVIEWING to IN_REVIEW dashboard status', () => {
      const result = service.mapToDashboardStatus(ConsultationStatus.DOCTOR_REVIEWING);
      expect(result).toBe(DashboardStatus.IN_REVIEW);
    });

    it('should convert NEEDS_INFO to AWAITING_RESPONSE dashboard status', () => {
      const result = service.mapToDashboardStatus(ConsultationStatus.NEEDS_INFO);
      expect(result).toBe(DashboardStatus.AWAITING_RESPONSE);
    });

    it('should convert APPROVED to COMPLETED dashboard status', () => {
      const result = service.mapToDashboardStatus(ConsultationStatus.APPROVED);
      expect(result).toBe(DashboardStatus.COMPLETED);
    });

    it('should convert REJECTED to REFERRED dashboard status', () => {
      const result = service.mapToDashboardStatus(ConsultationStatus.REJECTED);
      expect(result).toBe(DashboardStatus.REFERRED);
    });

    it('should get badge for dashboard status', () => {
      expect(service.getBadge(DashboardStatus.NEW)).toBe('🟢');
      expect(service.getBadge(DashboardStatus.IN_REVIEW)).toBe('🟡');
      expect(service.getBadge(DashboardStatus.AWAITING_RESPONSE)).toBe('🟠');
      expect(service.getBadge(DashboardStatus.COMPLETED)).toBe('⚪');
      expect(service.getBadge(DashboardStatus.REFERRED)).toBe('🔴');
    });
  });

  describe('getDoctorQueue', () => {
    // Spec: master spec Section 5.1 — Case Queue

    it('should return cases assigned to the doctor', async () => {
      const mockCases = [mockConsultation];
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findMany.mockResolvedValue(mockCases);

      const result = await service.getDoctorQueue('doctor-1');

      expect(result.cases).toHaveLength(1);
      expect(result.cases[0].id).toBe('consultation-1');
      expect(mockPrismaService.consultation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            doctorId: 'doctor-1',
          }),
        }),
      );
    });

    it('should include patient name, age, sex, condition, time, AI attention level', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findMany.mockResolvedValue([mockConsultation]);

      const result = await service.getDoctorQueue('doctor-1');

      expect(result.cases[0]).toHaveProperty('patientName');
      expect(result.cases[0]).toHaveProperty('patientAge');
      expect(result.cases[0]).toHaveProperty('patientSex');
      expect(result.cases[0]).toHaveProperty('vertical');
      expect(result.cases[0]).toHaveProperty('createdAt');
      expect(result.cases[0]).toHaveProperty('aiAttentionLevel');
      expect(result.cases[0]).toHaveProperty('dashboardStatus');
      expect(result.cases[0]).toHaveProperty('statusBadge');
    });

    it('should order cases by createdAt ascending (oldest first)', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findMany.mockResolvedValue([mockConsultation]);

      await service.getDoctorQueue('doctor-1');

      expect(mockPrismaService.consultation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'asc' },
        }),
      );
    });

    it('should throw ForbiddenException if user is not a doctor or admin', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(service.getDoctorQueue('patient-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('Queue Filtering by Condition', () => {
    // Spec: master spec Section 5.1 — Filterable: All | Hair Loss | ED | Weight | PCOS

    it('should filter by HAIR_LOSS vertical', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findMany.mockResolvedValue([mockConsultation]);

      await service.getDoctorQueue('doctor-1', { vertical: HealthVertical.HAIR_LOSS });

      expect(mockPrismaService.consultation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            vertical: HealthVertical.HAIR_LOSS,
          }),
        }),
      );
    });

    it('should filter by SEXUAL_HEALTH vertical', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findMany.mockResolvedValue([]);

      await service.getDoctorQueue('doctor-1', { vertical: HealthVertical.SEXUAL_HEALTH });

      expect(mockPrismaService.consultation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            vertical: HealthVertical.SEXUAL_HEALTH,
          }),
        }),
      );
    });

    it('should filter by WEIGHT_MANAGEMENT vertical', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findMany.mockResolvedValue([]);

      await service.getDoctorQueue('doctor-1', { vertical: HealthVertical.WEIGHT_MANAGEMENT });

      expect(mockPrismaService.consultation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            vertical: HealthVertical.WEIGHT_MANAGEMENT,
          }),
        }),
      );
    });

    it('should filter by PCOS vertical', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findMany.mockResolvedValue([]);

      await service.getDoctorQueue('doctor-1', { vertical: HealthVertical.PCOS });

      expect(mockPrismaService.consultation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            vertical: HealthVertical.PCOS,
          }),
        }),
      );
    });

    it('should return all verticals when no filter specified', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findMany.mockResolvedValue([]);

      await service.getDoctorQueue('doctor-1', {});

      expect(mockPrismaService.consultation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            vertical: expect.anything(),
          }),
        }),
      );
    });
  });

  describe('Queue Filtering by Dashboard Status', () => {
    // Spec: master spec Section 5.1 — Status badges

    it('should filter by NEW status (PENDING_ASSESSMENT or AI_REVIEWED)', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findMany.mockResolvedValue([]);

      await service.getDoctorQueue('doctor-1', { dashboardStatus: DashboardStatus.NEW });

      expect(mockPrismaService.consultation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: {
              in: [ConsultationStatus.PENDING_ASSESSMENT, ConsultationStatus.AI_REVIEWED],
            },
          }),
        }),
      );
    });

    it('should filter by IN_REVIEW status (DOCTOR_REVIEWING)', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findMany.mockResolvedValue([]);

      await service.getDoctorQueue('doctor-1', { dashboardStatus: DashboardStatus.IN_REVIEW });

      expect(mockPrismaService.consultation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: ConsultationStatus.DOCTOR_REVIEWING,
          }),
        }),
      );
    });

    it('should filter by AWAITING_RESPONSE status (NEEDS_INFO)', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findMany.mockResolvedValue([]);

      await service.getDoctorQueue('doctor-1', { dashboardStatus: DashboardStatus.AWAITING_RESPONSE });

      expect(mockPrismaService.consultation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: ConsultationStatus.NEEDS_INFO,
          }),
        }),
      );
    });

    it('should filter by COMPLETED status (APPROVED)', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findMany.mockResolvedValue([]);

      await service.getDoctorQueue('doctor-1', { dashboardStatus: DashboardStatus.COMPLETED });

      expect(mockPrismaService.consultation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: ConsultationStatus.APPROVED,
          }),
        }),
      );
    });

    it('should filter by REFERRED status (REJECTED)', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findMany.mockResolvedValue([]);

      await service.getDoctorQueue('doctor-1', { dashboardStatus: DashboardStatus.REFERRED });

      expect(mockPrismaService.consultation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: ConsultationStatus.REJECTED,
          }),
        }),
      );
    });

    it('should support combined filters (vertical + status)', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findMany.mockResolvedValue([]);

      await service.getDoctorQueue('doctor-1', {
        vertical: HealthVertical.HAIR_LOSS,
        dashboardStatus: DashboardStatus.IN_REVIEW,
      });

      expect(mockPrismaService.consultation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            vertical: HealthVertical.HAIR_LOSS,
            status: ConsultationStatus.DOCTOR_REVIEWING,
          }),
        }),
      );
    });
  });

  describe('Access Control', () => {
    // Spec: Doctor can only see cases assigned to them

    it('should only return cases assigned to the requesting doctor', async () => {
      const doctorCases = [mockConsultation];
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findMany.mockResolvedValue(doctorCases);

      const result = await service.getDoctorQueue('doctor-1');

      expect(mockPrismaService.consultation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            doctorId: 'doctor-1',
          }),
        }),
      );
      expect(result.cases).toHaveLength(1);
    });

    it('should not return cases assigned to other doctors', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor2);
      mockPrismaService.consultation.findMany.mockResolvedValue([]);

      const result = await service.getDoctorQueue('doctor-2');

      expect(mockPrismaService.consultation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            doctorId: 'doctor-2',
          }),
        }),
      );
      expect(result.cases).toHaveLength(0);
    });

    it('should allow admin to see all cases', async () => {
      const allCases = [
        mockConsultation,
        { ...mockConsultation, id: 'consultation-2', doctorId: 'doctor-2' },
      ];
      mockPrismaService.user.findFirst.mockResolvedValue(mockAdmin);
      mockPrismaService.consultation.findMany.mockResolvedValue(allCases);

      const result = await service.getAdminQueue('admin-1');

      // Admin query should not filter by doctorId
      expect(mockPrismaService.consultation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            doctorId: expect.anything(),
          }),
        }),
      );
      expect(result.cases).toHaveLength(2);
    });

    it('should throw ForbiddenException if non-admin calls getAdminQueue', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);

      await expect(service.getAdminQueue('doctor-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getCaseDetail', () => {
    // Spec: master spec Section 5.2 — Case Review

    const mockLabOrders = [
      {
        id: 'lab-1',
        testPanel: ['TSH', 'CBC', 'Ferritin'],
        panelName: 'Hair Loss Basic Panel',
        status: 'ORDERED',
        orderedAt: new Date('2026-02-15'),
        resultFileUrl: null,
        criticalValues: false,
      },
      {
        id: 'lab-2',
        testPanel: ['Fasting_Glucose', 'HbA1c'],
        panelName: null,
        status: 'RESULTS_UPLOADED',
        orderedAt: new Date('2026-02-10'),
        resultFileUrl: 'https://s3.example/results.pdf',
        criticalValues: true,
      },
    ];

    const mockFullConsultation = {
      ...mockConsultation,
      prescription: null,
      messages: [],
      labOrders: [],
      followUps: [],
    };

    const mockPhotos = [
      { id: 'photo-1', type: 'front_hairline', url: 'https://s3.example/photo1.jpg' },
      { id: 'photo-2', type: 'crown', url: 'https://s3.example/photo2.jpg' },
    ];

    it('should return full case details for assigned doctor', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findUnique.mockResolvedValue(mockFullConsultation);
      mockPrismaService.patientPhoto.findMany.mockResolvedValue(mockPhotos);

      const result = await service.getCaseDetail('consultation-1', 'doctor-1');

      expect(result).toHaveProperty('consultation');
      expect(result).toHaveProperty('patient');
      expect(result).toHaveProperty('questionnaire');
      expect(result).toHaveProperty('aiAssessment');
      expect(result).toHaveProperty('photos');
      expect(result).toHaveProperty('messages');
      expect(result).toHaveProperty('labOrders');
      expect(result.consultation.id).toBe('consultation-1');
    });

    it('should include patient info (name, age, sex, city)', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findUnique.mockResolvedValue(mockFullConsultation);
      mockPrismaService.patientPhoto.findMany.mockResolvedValue([]);

      const result = await service.getCaseDetail('consultation-1', 'doctor-1');

      expect(result.patient).toHaveProperty('name');
      expect(result.patient).toHaveProperty('age');
      expect(result.patient).toHaveProperty('sex');
      expect(result.patient).toHaveProperty('city');
    });

    it('should include questionnaire responses', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findUnique.mockResolvedValue(mockFullConsultation);
      mockPrismaService.patientPhoto.findMany.mockResolvedValue([]);

      const result = await service.getCaseDetail('consultation-1', 'doctor-1');

      expect(result.questionnaire).toHaveProperty('responses');
      expect(result.questionnaire.responses).toEqual({ Q1: '30', Q2: 'Male' });
    });

    it('should include AI assessment (classification, red flags, contraindications)', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findUnique.mockResolvedValue(mockFullConsultation);
      mockPrismaService.patientPhoto.findMany.mockResolvedValue([]);

      const result = await service.getCaseDetail('consultation-1', 'doctor-1');

      expect(result.aiAssessment).toHaveProperty('summary');
      expect(result.aiAssessment).toHaveProperty('riskLevel');
      expect(result.aiAssessment).toHaveProperty('flags');
    });

    it('should include photos', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findUnique.mockResolvedValue(mockFullConsultation);
      mockPrismaService.patientPhoto.findMany.mockResolvedValue(mockPhotos);

      const result = await service.getCaseDetail('consultation-1', 'doctor-1');

      expect(result.photos).toHaveLength(2);
      expect(result.photos[0]).toHaveProperty('type');
      expect(result.photos[0]).toHaveProperty('url');
    });

    it('should include lab orders in case detail', async () => {
      const consultationWithLabOrders = {
        ...mockFullConsultation,
        labOrders: mockLabOrders,
      };
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findUnique.mockResolvedValue(consultationWithLabOrders);
      mockPrismaService.patientPhoto.findMany.mockResolvedValue([]);

      const result = await service.getCaseDetail('consultation-1', 'doctor-1');

      expect(result.labOrders).toHaveLength(2);
      expect(result.labOrders[0]).toEqual({
        id: 'lab-1',
        testPanel: ['TSH', 'CBC', 'Ferritin'],
        panelName: 'Hair Loss Basic Panel',
        status: 'ORDERED',
        orderedAt: new Date('2026-02-15'),
        resultFileUrl: null,
        criticalValues: false,
      });
    });

    it('should map lab order fields correctly including null panelName', async () => {
      const consultationWithLabOrders = {
        ...mockFullConsultation,
        labOrders: mockLabOrders,
      };
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findUnique.mockResolvedValue(consultationWithLabOrders);
      mockPrismaService.patientPhoto.findMany.mockResolvedValue([]);

      const result = await service.getCaseDetail('consultation-1', 'doctor-1');

      // Second lab order has null panelName and a resultFileUrl
      expect(result.labOrders[1].panelName).toBeNull();
      expect(result.labOrders[1].resultFileUrl).toBe('https://s3.example/results.pdf');
      expect(result.labOrders[1].criticalValues).toBe(true);
    });

    it('should return empty lab orders array when consultation has none', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findUnique.mockResolvedValue(mockFullConsultation);
      mockPrismaService.patientPhoto.findMany.mockResolvedValue([]);

      const result = await service.getCaseDetail('consultation-1', 'doctor-1');

      expect(result.labOrders).toEqual([]);
    });

    it('should fetch lab orders ordered by orderedAt descending', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findUnique.mockResolvedValue(mockFullConsultation);
      mockPrismaService.patientPhoto.findMany.mockResolvedValue([]);

      await service.getCaseDetail('consultation-1', 'doctor-1');

      expect(mockPrismaService.consultation.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            labOrders: { orderBy: { orderedAt: 'desc' } },
          }),
        }),
      );
    });

    it('should include message history', async () => {
      const messagesConsultation = {
        ...mockFullConsultation,
        messages: [
          { id: 'msg-1', content: 'Hello', senderId: 'doctor-1', createdAt: new Date() },
        ],
      };
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findUnique.mockResolvedValue(messagesConsultation);
      mockPrismaService.patientPhoto.findMany.mockResolvedValue([]);

      const result = await service.getCaseDetail('consultation-1', 'doctor-1');

      expect(result.messages).toHaveLength(1);
    });

    it('should throw NotFoundException if consultation not found', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findUnique.mockResolvedValue(null);

      await expect(
        service.getCaseDetail('non-existent', 'doctor-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if doctor tries to view another doctors case', async () => {
      const otherDoctorCase = { ...mockFullConsultation, doctorId: 'doctor-2' };
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findUnique.mockResolvedValue(otherDoctorCase);

      await expect(
        service.getCaseDetail('consultation-1', 'doctor-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to view any case', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockAdmin);
      mockPrismaService.consultation.findUnique.mockResolvedValue(mockFullConsultation);
      mockPrismaService.patientPhoto.findMany.mockResolvedValue([]);

      const result = await service.getCaseDetail('consultation-1', 'admin-1');

      expect(result.consultation.id).toBe('consultation-1');
    });
  });

  describe('Queue Statistics', () => {
    it('should return queue counts by status', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.count
        .mockResolvedValueOnce(5) // NEW
        .mockResolvedValueOnce(3) // IN_REVIEW
        .mockResolvedValueOnce(2) // AWAITING_RESPONSE
        .mockResolvedValueOnce(1) // LAB_RESULTS_READY
        .mockResolvedValueOnce(0) // FOLLOW_UP
        .mockResolvedValueOnce(10) // COMPLETED
        .mockResolvedValueOnce(1); // REFERRED

      const result = await service.getQueueStats('doctor-1');

      expect(result).toHaveProperty('new');
      expect(result).toHaveProperty('inReview');
      expect(result).toHaveProperty('awaitingResponse');
      expect(result).toHaveProperty('completed');
      expect(result).toHaveProperty('referred');
      expect(result.new).toBe(5);
      expect(result.inReview).toBe(3);
      expect(result.completed).toBe(10);
    });

    it('should return total active cases', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(1);

      const result = await service.getQueueStats('doctor-1');

      // Active = NEW + IN_REVIEW + AWAITING_RESPONSE + LAB_RESULTS_READY + FOLLOW_UP
      expect(result.totalActive).toBe(11);
    });
  });

  describe('Unassigned Cases (Admin/Coordinator)', () => {
    it('should return unassigned cases awaiting doctor assignment', async () => {
      const unassignedCases = [
        { ...mockConsultation, doctorId: null, status: ConsultationStatus.AI_REVIEWED },
      ];
      mockPrismaService.user.findFirst.mockResolvedValue(mockAdmin);
      mockPrismaService.consultation.findMany.mockResolvedValue(unassignedCases);

      const result = await service.getUnassignedCases('admin-1');

      expect(mockPrismaService.consultation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: ConsultationStatus.AI_REVIEWED,
            doctorId: null,
          }),
        }),
      );
      expect(result.cases).toHaveLength(1);
    });

    it('should filter unassigned cases by vertical', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockAdmin);
      mockPrismaService.consultation.findMany.mockResolvedValue([]);

      await service.getUnassignedCases('admin-1', { vertical: HealthVertical.HAIR_LOSS });

      expect(mockPrismaService.consultation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            vertical: HealthVertical.HAIR_LOSS,
          }),
        }),
      );
    });

    it('should filter unassigned cases by attention level', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockAdmin);
      mockPrismaService.consultation.findMany.mockResolvedValue([]);

      await service.getUnassignedCases('admin-1', { attentionLevel: 'HIGH' });

      expect(mockPrismaService.consultation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            aiAssessment: { riskLevel: 'HIGH' },
          }),
        }),
      );
    });

    it('should throw ForbiddenException if non-admin tries to view unassigned cases', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);

      await expect(service.getUnassignedCases('doctor-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('Follow-Up Cases', () => {
    // Spec: master spec Section 5.1 — 🔵 Follow-Up badge

    it('should identify follow-up cases', async () => {
      const followUpConsultation = {
        ...mockConsultation,
        followUps: [
          { id: 'fu-1', scheduledAt: new Date('2026-03-01'), isCompleted: false },
        ],
      };
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findMany.mockResolvedValue([followUpConsultation]);

      const result = await service.getDoctorQueue('doctor-1');

      expect(result.cases[0].isFollowUp).toBe(true);
    });

    it('should filter by FOLLOW_UP status', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findMany.mockResolvedValue([]);

      await service.getDoctorQueue('doctor-1', { dashboardStatus: DashboardStatus.FOLLOW_UP });

      expect(mockPrismaService.consultation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            followUps: {
              some: {
                isCompleted: false,
                scheduledAt: { lte: expect.any(Date) },
              },
            },
          }),
        }),
      );
    });
  });

  describe('Calculate Patient Age', () => {
    it('should calculate age from date of birth', () => {
      const dob = new Date('1990-02-12');
      const age = service.calculateAge(dob);
      expect(age).toBe(36); // As of 2026-02-12
    });

    it('should return null for null date of birth', () => {
      const age = service.calculateAge(null);
      expect(age).toBeNull();
    });
  });
});
