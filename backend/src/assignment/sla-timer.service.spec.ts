import { Test, TestingModule } from '@nestjs/testing';
import { SlaTimerService } from './sla-timer.service';
import { AssignmentService } from './assignment.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { ConsultationStatus, UserRole } from '@prisma/client';

// Spec: Phase 12 — SLA Timer Service (cron-based breach detection + reassignment)

describe('SlaTimerService', () => {
  let service: SlaTimerService;
  let prisma: any;
  let assignmentService: any;
  let notificationService: any;

  const now = new Date('2026-02-22T12:00:00Z');

  beforeEach(async () => {
    jest.useFakeTimers({ now });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlaTimerService,
        {
          provide: PrismaService,
          useValue: {
            consultation: {
              findMany: jest.fn().mockResolvedValue([]),
              update: jest.fn(),
            },
            user: {
              findFirst: jest.fn(),
            },
          },
        },
        {
          provide: AssignmentService,
          useValue: {
            reassignDoctor: jest.fn(),
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

    service = module.get<SlaTimerService>(SlaTimerService);
    prisma = module.get(PrismaService);
    assignmentService = module.get(AssignmentService);
    notificationService = module.get(NotificationService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ========================================
  // SLA breach detection
  // ========================================

  it('should detect SLA breach when slaDeadline has passed', async () => {
    const breachedConsultation = {
      id: 'consult-1',
      doctorId: 'doc-1',
      slaDeadline: new Date('2026-02-22T11:00:00Z'), // 1 hour ago
      previousDoctorIds: [],
      status: ConsultationStatus.DOCTOR_REVIEWING,
    };

    prisma.consultation.findMany.mockResolvedValue([breachedConsultation]);
    assignmentService.reassignDoctor.mockResolvedValue({
      assigned: true,
      doctorId: 'doc-2',
      doctorName: 'Dr. New',
      reason: 'reassigned',
    });
    prisma.user.findFirst.mockResolvedValue({ id: 'admin-1' });

    await service.checkSlaBreaches();

    expect(prisma.consultation.findMany).toHaveBeenCalledWith({
      where: {
        status: ConsultationStatus.DOCTOR_REVIEWING,
        slaDeadline: { lt: expect.any(Date) },
      },
    });
  });

  it('should re-assign to next best doctor on breach', async () => {
    const breachedConsultation = {
      id: 'consult-1',
      doctorId: 'doc-1',
      slaDeadline: new Date('2026-02-22T11:00:00Z'),
      previousDoctorIds: [],
      status: ConsultationStatus.DOCTOR_REVIEWING,
    };

    prisma.consultation.findMany.mockResolvedValue([breachedConsultation]);
    assignmentService.reassignDoctor.mockResolvedValue({
      assigned: true,
      doctorId: 'doc-2',
      doctorName: 'Dr. New',
      reason: 'reassigned',
    });
    prisma.user.findFirst.mockResolvedValue({ id: 'admin-1' });

    await service.checkSlaBreaches();

    expect(assignmentService.reassignDoctor).toHaveBeenCalledWith(
      'consult-1',
      ['doc-1'], // excludes current doctor
    );
  });

  it('should exclude ALL previous doctors from reassignment pool', async () => {
    const breachedConsultation = {
      id: 'consult-1',
      doctorId: 'doc-3',
      slaDeadline: new Date('2026-02-22T11:00:00Z'),
      previousDoctorIds: ['doc-1', 'doc-2'],
      status: ConsultationStatus.DOCTOR_REVIEWING,
    };

    prisma.consultation.findMany.mockResolvedValue([breachedConsultation]);
    assignmentService.reassignDoctor.mockResolvedValue({
      assigned: true,
      doctorId: 'doc-4',
      reason: 'reassigned',
    });
    prisma.user.findFirst.mockResolvedValue({ id: 'admin-1' });

    await service.checkSlaBreaches();

    expect(assignmentService.reassignDoctor).toHaveBeenCalledWith(
      'consult-1',
      ['doc-1', 'doc-2', 'doc-3'], // all previous + current
    );
  });

  it('should send admin alert on SLA breach', async () => {
    const breachedConsultation = {
      id: 'consult-1',
      doctorId: 'doc-1',
      slaDeadline: new Date('2026-02-22T11:00:00Z'),
      previousDoctorIds: [],
      status: ConsultationStatus.DOCTOR_REVIEWING,
    };

    prisma.consultation.findMany.mockResolvedValue([breachedConsultation]);
    assignmentService.reassignDoctor.mockResolvedValue({
      assigned: true,
      doctorId: 'doc-2',
      reason: 'reassigned',
    });
    prisma.user.findFirst.mockResolvedValue({ id: 'admin-1' });

    await service.checkSlaBreaches();

    expect(notificationService.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: 'admin-1',
        eventType: 'SLA_BREACH',
        recipientRole: 'ADMIN',
      }),
    );
  });

  it('should send admin alert when re-assignment fails', async () => {
    const breachedConsultation = {
      id: 'consult-1',
      doctorId: 'doc-1',
      slaDeadline: new Date('2026-02-22T11:00:00Z'),
      previousDoctorIds: [],
      status: ConsultationStatus.DOCTOR_REVIEWING,
    };

    prisma.consultation.findMany.mockResolvedValue([breachedConsultation]);
    assignmentService.reassignDoctor.mockResolvedValue({
      assigned: false,
      reason: 'no_eligible_doctors',
    });
    prisma.user.findFirst.mockResolvedValue({ id: 'admin-1' });

    await service.checkSlaBreaches();

    // Should still send SLA breach alert
    expect(notificationService.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'SLA_BREACH',
      }),
    );
  });

  it('should not trigger on already completed consultations', async () => {
    // findMany returns empty because we only query DOCTOR_REVIEWING status
    prisma.consultation.findMany.mockResolvedValue([]);

    await service.checkSlaBreaches();

    expect(assignmentService.reassignDoctor).not.toHaveBeenCalled();
  });

  it('should stop after 3 bounces and send urgent alert', async () => {
    const bouncedConsultation = {
      id: 'consult-1',
      doctorId: 'doc-4',
      slaDeadline: new Date('2026-02-22T11:00:00Z'),
      previousDoctorIds: ['doc-1', 'doc-2', 'doc-3'], // 3 previous = 4 total including current
      status: ConsultationStatus.DOCTOR_REVIEWING,
    };

    prisma.consultation.findMany.mockResolvedValue([bouncedConsultation]);
    prisma.user.findFirst.mockResolvedValue({ id: 'admin-1' });

    await service.checkSlaBreaches();

    // Should NOT try to reassign — max bounces reached
    expect(assignmentService.reassignDoctor).not.toHaveBeenCalled();

    // Should send urgent admin alert
    expect(notificationService.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'SLA_MAX_BOUNCES',
        recipientRole: 'ADMIN',
      }),
    );
  });

  it('should handle errors in individual consultations without stopping others', async () => {
    const consultations = [
      {
        id: 'consult-1',
        doctorId: 'doc-1',
        slaDeadline: new Date('2026-02-22T11:00:00Z'),
        previousDoctorIds: [],
        status: ConsultationStatus.DOCTOR_REVIEWING,
      },
      {
        id: 'consult-2',
        doctorId: 'doc-2',
        slaDeadline: new Date('2026-02-22T11:00:00Z'),
        previousDoctorIds: [],
        status: ConsultationStatus.DOCTOR_REVIEWING,
      },
    ];

    prisma.consultation.findMany.mockResolvedValue(consultations);
    prisma.user.findFirst.mockResolvedValue({ id: 'admin-1' });

    // First one throws, second succeeds
    assignmentService.reassignDoctor
      .mockRejectedValueOnce(new Error('DB error'))
      .mockResolvedValueOnce({ assigned: true, doctorId: 'doc-3', reason: 'reassigned' });

    await service.checkSlaBreaches();

    // Both should be attempted
    expect(assignmentService.reassignDoctor).toHaveBeenCalledTimes(2);
  });
});
