import { Test, TestingModule } from '@nestjs/testing';
import {
  NotificationService,
  NotificationPayload,
} from './notification.service';
import { PrismaService } from '../prisma/prisma.service';
import { PushDeliveryService } from './push-delivery.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

// Spec: master spec Section 11 (Notification System)

describe('NotificationService', () => {
  let service: NotificationService;
  let mockPrismaService: any;

  const mockUser = {
    id: 'user-1',
    phone: '+919876543210',
    email: 'patient@example.com',
    name: 'Test Patient',
    role: 'PATIENT',
  };

  const mockDoctor = {
    id: 'doctor-1',
    phone: '+919876543211',
    email: 'doctor@example.com',
    name: 'Dr. Test',
    role: 'DOCTOR',
  };

  const mockCoordinator = {
    id: 'admin-1',
    phone: '+919876543212',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'ADMIN',
  };

  const mockPhlebotomist = {
    id: 'phleb-1',
    phone: '+919876543213',
    email: 'phleb@example.com',
    name: 'Phleb User',
    role: 'PHLEBOTOMIST',
  };

  const mockLabOrder = {
    id: 'lab-order-1',
    patientId: 'user-1',
    consultationId: 'consult-1',
    doctorId: 'doctor-1',
    status: 'ORDERED',
    testPanel: ['TSH', 'CBC'],
    panelName: 'Hair Loss Basic Panel',
    collectionAddress: '123 Main St',
    collectionCity: 'Mumbai',
    collectionPincode: '400001',
    phlebotomistId: 'phleb-1',
    bookedDate: new Date('2026-02-15'),
    bookedTimeSlot: '10:00-12:00',
    labCost: 99900,
    orderedAt: new Date(),
  };

  const mockOrder = {
    id: 'order-1',
    patientId: 'user-1',
    prescriptionId: 'presc-1',
    consultationId: 'consult-1',
    status: 'PRESCRIPTION_CREATED',
    deliveryAddress: '123 Main St',
    deliveryCity: 'Mumbai',
    deliveryPincode: '400001',
    deliveryPersonName: 'Delivery Person',
    deliveryPersonPhone: '+919876543214',
    deliveryOtp: '1234',
    medicationCost: 100000,
    deliveryCost: 5000,
    totalAmount: 105000,
  };

  const mockPreference = {
    id: 'pref-1',
    userId: 'user-1',
    pushEnabled: true,
    whatsappEnabled: true,
    smsEnabled: true,
    emailEnabled: true,
    discreetMode: false,
  };

  const mockNotification = {
    id: 'notif-1',
    recipientId: 'user-1',
    recipientRole: 'PATIENT',
    channel: 'PUSH',
    eventType: 'LAB_TESTS_ORDERED',
    title: 'Blood Tests Ordered',
    body: 'Your doctor has ordered blood tests',
    status: 'PENDING',
    isDiscreet: false,
    labOrderId: 'lab-order-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockPrismaService = {
      notification: {
        create: jest.fn(),
        createMany: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
      notificationPreference: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      labOrder: {
        findUnique: jest.fn(),
      },
      order: {
        findUnique: jest.fn(),
      },
    };

    // Set up default mocks that return empty arrays/null to prevent undefined errors
    mockPrismaService.user.findMany.mockResolvedValue([]);
    mockPrismaService.user.findUnique.mockResolvedValue(null);
    mockPrismaService.notificationPreference.findUnique.mockResolvedValue(null);
    mockPrismaService.notification.create.mockImplementation((args) => {
      return Promise.resolve({
        id: 'notif-default',
        ...args.data,
        status: 'SENT',
        sentAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: PushDeliveryService, useValue: { sendPush: jest.fn().mockResolvedValue({ sent: 1, failed: 0, skipped: 0, errors: [] }) } },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendNotification', () => {
    it('should create and send a notification', async () => {
      const payload: NotificationPayload = {
        recipientId: 'user-1',
        recipientRole: 'PATIENT',
        channel: 'PUSH',
        eventType: 'LAB_TESTS_ORDERED',
        title: 'Blood Tests Ordered',
        body: 'Your doctor has ordered blood tests',
        labOrderId: 'lab-order-1',
      };

      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPreference);
      mockPrismaService.notification.create.mockResolvedValue({
        ...mockNotification,
        status: 'SENT',
        sentAt: new Date(),
      });

      const result = await service.sendNotification(payload);

      expect(result.status).toBe('SENT');
      expect(mockPrismaService.notification.create).toHaveBeenCalled();
    });

    it('should respect user preferences and not send if channel disabled', async () => {
      const payload: NotificationPayload = {
        recipientId: 'user-1',
        recipientRole: 'PATIENT',
        channel: 'PUSH',
        eventType: 'LAB_TESTS_ORDERED',
        title: 'Blood Tests Ordered',
        body: 'Your doctor has ordered blood tests',
      };

      mockPrismaService.notificationPreference.findUnique.mockResolvedValue({
        ...mockPreference,
        pushEnabled: false,
      });
      mockPrismaService.notification.create.mockResolvedValue({
        ...mockNotification,
        status: 'PENDING',
      });

      const result = await service.sendNotification(payload);

      // Notification created but not sent (stored for audit)
      expect(result.status).toBe('PENDING');
    });

    it('should apply discreet mode if enabled', async () => {
      const payload: NotificationPayload = {
        recipientId: 'user-1',
        recipientRole: 'PATIENT',
        channel: 'PUSH',
        eventType: 'LAB_TESTS_ORDERED',
        title: 'Blood Tests Ordered',
        body: 'Your doctor ordered blood tests for your hair loss treatment',
      };

      mockPrismaService.notificationPreference.findUnique.mockResolvedValue({
        ...mockPreference,
        discreetMode: true,
      });
      mockPrismaService.notification.create.mockImplementation((args) => {
        return Promise.resolve({
          id: 'notif-1',
          ...args.data,
          status: 'SENT',
          sentAt: new Date(),
        });
      });

      const result = await service.sendNotification(payload);

      expect(result.isDiscreet).toBe(true);
      expect(result.title).toBe('Onlyou');
      expect(result.body).toBe('You have an update');
    });

    // Spec: Push cannot be disabled for critical alerts
    it('should always send critical alerts even if push is disabled', async () => {
      const payload: NotificationPayload = {
        recipientId: 'user-1',
        recipientRole: 'PATIENT',
        channel: 'PUSH',
        eventType: 'LAB_CRITICAL_VALUES',
        title: 'Urgent: Critical Lab Values',
        body: 'Your lab results show critical values - doctor notified',
        labOrderId: 'lab-order-1',
      };

      mockPrismaService.notificationPreference.findUnique.mockResolvedValue({
        ...mockPreference,
        pushEnabled: false, // User disabled push
      });
      mockPrismaService.notification.create.mockResolvedValue({
        ...mockNotification,
        eventType: 'LAB_CRITICAL_VALUES',
        status: 'SENT',
        sentAt: new Date(),
      });

      const result = await service.sendNotification(payload);

      // Critical alerts bypass preference
      expect(result.status).toBe('SENT');
    });
  });

  describe('sendMultiChannelNotification', () => {
    it('should send notification to multiple channels', async () => {
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPreference);
      mockPrismaService.notification.create.mockImplementation((args) => {
        return Promise.resolve({
          id: `notif-${args.data.channel}`,
          ...args.data,
          status: 'SENT',
          sentAt: new Date(),
        });
      });

      const result = await service.sendMultiChannelNotification({
        recipientId: 'user-1',
        recipientRole: 'PATIENT',
        channels: ['PUSH', 'WHATSAPP', 'EMAIL'],
        eventType: 'LAB_RESULTS_READY',
        title: 'Lab Results Ready',
        body: 'Your lab results are ready for review',
        labOrderId: 'lab-order-1',
      });

      expect(result).toHaveLength(3);
      expect(mockPrismaService.notification.create).toHaveBeenCalledTimes(3);
    });
  });

  // ============================================
  // BLOOD WORK NOTIFICATIONS (Spec: Section 11)
  // ============================================

  describe('Blood Work Notifications', () => {
    describe('notifyLabTestsOrdered', () => {
      it('should notify patient when doctor orders tests', async () => {
        mockPrismaService.labOrder.findUnique.mockResolvedValue({
          ...mockLabOrder,
          patient: mockUser,
        });
        mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPreference);
        mockPrismaService.notification.create.mockResolvedValue({
          ...mockNotification,
          eventType: 'LAB_TESTS_ORDERED',
          status: 'SENT',
        });

        const result = await service.notifyLabTestsOrdered('lab-order-1');

        expect(result.patient).toBeDefined();
        expect(result.patient.eventType).toBe('LAB_TESTS_ORDERED');
      });

      it('should notify coordinator dashboard when tests ordered', async () => {
        mockPrismaService.labOrder.findUnique.mockResolvedValue({
          ...mockLabOrder,
          patient: mockUser,
        });
        mockPrismaService.user.findMany.mockResolvedValue([mockCoordinator]);
        mockPrismaService.notificationPreference.findUnique.mockResolvedValue(null);
        mockPrismaService.notification.create.mockResolvedValue({
          ...mockNotification,
          recipientRole: 'ADMIN',
          eventType: 'LAB_TESTS_ORDERED',
          status: 'SENT',
        });

        const result = await service.notifyLabTestsOrdered('lab-order-1');

        expect(result.coordinator).toBeDefined();
      });
    });

    describe('notifyLabSlotBooked', () => {
      it('should send confirmation to patient', async () => {
        mockPrismaService.labOrder.findUnique.mockResolvedValue({
          ...mockLabOrder,
          status: 'SLOT_BOOKED',
          patient: mockUser,
        });
        mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPreference);
        mockPrismaService.notification.create.mockResolvedValue({
          ...mockNotification,
          eventType: 'LAB_SLOT_BOOKED',
          status: 'SENT',
        });

        const result = await service.notifyLabSlotBooked('lab-order-1');

        expect(result.patient).toBeDefined();
        expect(result.patient.eventType).toBe('LAB_SLOT_BOOKED');
      });
    });

    describe('notifyPhlebotomistAssigned', () => {
      it('should notify patient with phlebotomist name', async () => {
        mockPrismaService.labOrder.findUnique.mockResolvedValue({
          ...mockLabOrder,
          status: 'PHLEBOTOMIST_ASSIGNED',
          patient: mockUser,
          phlebotomist: { id: 'phleb-1', name: 'John Phleb', phone: '+919876543213' },
        });
        mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPreference);
        mockPrismaService.notification.create.mockImplementation((args) => {
          return Promise.resolve({
            id: 'notif-1',
            ...args.data,
            status: 'SENT',
          });
        });

        const result = await service.notifyPhlebotomistAssigned('lab-order-1');

        expect(result.patient).toBeDefined();
        expect(result.patient.body).toContain('John Phleb');
      });

      it('should notify phlebotomist of assignment', async () => {
        mockPrismaService.labOrder.findUnique.mockResolvedValue({
          ...mockLabOrder,
          status: 'PHLEBOTOMIST_ASSIGNED',
          patient: mockUser,
          phlebotomist: { id: 'phleb-1', name: 'John Phleb', phone: '+919876543213' },
        });
        mockPrismaService.user.findMany.mockResolvedValue([mockPhlebotomist]);
        mockPrismaService.notificationPreference.findUnique.mockResolvedValue(null);
        mockPrismaService.notification.create.mockImplementation((args) => {
          return Promise.resolve({
            id: 'notif-2',
            ...args.data,
            status: 'SENT',
          });
        });

        const result = await service.notifyPhlebotomistAssigned('lab-order-1');

        expect(result.phlebotomist).toBeDefined();
      });
    });

    describe('notifyCollectionReminder', () => {
      // Spec: 30 min before collection
      it('should send reminder 30 min before collection', async () => {
        mockPrismaService.labOrder.findUnique.mockResolvedValue({
          ...mockLabOrder,
          status: 'PHLEBOTOMIST_ASSIGNED',
          patient: mockUser,
          phlebotomist: { id: 'phleb-1', name: 'John Phleb', phone: '+919876543213' },
        });
        mockPrismaService.user.findMany.mockResolvedValue([mockPhlebotomist]);
        mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPreference);
        mockPrismaService.notification.create.mockResolvedValue({
          ...mockNotification,
          eventType: 'LAB_COLLECTION_REMINDER',
          status: 'SENT',
        });

        const result = await service.notifyCollectionReminder('lab-order-1');

        expect(result.patient).toBeDefined();
        expect(result.patient.eventType).toBe('LAB_COLLECTION_REMINDER');
        expect(result.phlebotomist).toBeDefined();
      });
    });

    describe('notifyRunningLate', () => {
      it('should notify patient of new ETA', async () => {
        mockPrismaService.labOrder.findUnique.mockResolvedValue({
          ...mockLabOrder,
          status: 'PHLEBOTOMIST_ASSIGNED',
          patient: mockUser,
          estimatedArrivalTime: '11:30',
        });
        mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPreference);
        mockPrismaService.notification.create.mockImplementation((args) => {
          return Promise.resolve({
            id: 'notif-1',
            ...args.data,
            status: 'SENT',
          });
        });

        const result = await service.notifyRunningLate('lab-order-1');

        expect(result.patient).toBeDefined();
        expect(result.patient.body).toContain('11:30');
      });
    });

    describe('notifySampleCollected', () => {
      it('should notify patient with checkmark', async () => {
        mockPrismaService.labOrder.findUnique.mockResolvedValue({
          ...mockLabOrder,
          status: 'SAMPLE_COLLECTED',
          patient: mockUser,
        });
        mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPreference);
        mockPrismaService.notification.create.mockResolvedValue({
          ...mockNotification,
          eventType: 'LAB_SAMPLE_COLLECTED',
          status: 'SENT',
        });

        const result = await service.notifySampleCollected('lab-order-1');

        expect(result.patient).toBeDefined();
        expect(result.patient.eventType).toBe('LAB_SAMPLE_COLLECTED');
      });

      it('should notify lab of incoming sample', async () => {
        mockPrismaService.labOrder.findUnique.mockResolvedValue({
          ...mockLabOrder,
          status: 'SAMPLE_COLLECTED',
          patient: mockUser,
          diagnosticCentreId: 'lab-partner-1',
        });
        mockPrismaService.user.findMany.mockResolvedValue([{ id: 'lab-user-1', role: 'LAB' }]);
        mockPrismaService.notificationPreference.findUnique.mockResolvedValue(null);
        mockPrismaService.notification.create.mockImplementation((args) => {
          return Promise.resolve({
            id: 'notif-lab',
            ...args.data,
            status: 'SENT',
          });
        });

        const result = await service.notifySampleCollected('lab-order-1');

        expect(result.lab).toBeDefined();
      });
    });

    describe('notifyCollectionFailed', () => {
      it('should notify patient to reschedule', async () => {
        mockPrismaService.labOrder.findUnique.mockResolvedValue({
          ...mockLabOrder,
          status: 'COLLECTION_FAILED',
          collectionFailedReason: 'Patient not available',
          patient: mockUser,
        });
        mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPreference);
        mockPrismaService.notification.create.mockResolvedValue({
          ...mockNotification,
          eventType: 'LAB_COLLECTION_FAILED',
          status: 'SENT',
        });

        const result = await service.notifyCollectionFailed('lab-order-1');

        expect(result.patient).toBeDefined();
        expect(result.patient.eventType).toBe('LAB_COLLECTION_FAILED');
      });

      // Spec: URGENT coordinator notification
      it('should send URGENT notification to coordinator', async () => {
        mockPrismaService.labOrder.findUnique.mockResolvedValue({
          ...mockLabOrder,
          status: 'COLLECTION_FAILED',
          patient: mockUser,
        });
        mockPrismaService.user.findMany.mockResolvedValue([mockCoordinator]);
        mockPrismaService.notificationPreference.findUnique.mockResolvedValue(null);
        mockPrismaService.notification.create.mockImplementation((args) => {
          return Promise.resolve({
            id: 'notif-urgent',
            ...args.data,
            status: 'SENT',
          });
        });

        const result = await service.notifyCollectionFailed('lab-order-1');

        expect(result.coordinator).toBeDefined();
        expect(result.coordinator.title).toContain('URGENT');
      });
    });

    describe('notifySampleReceived', () => {
      it('should notify patient sample being processed', async () => {
        mockPrismaService.labOrder.findUnique.mockResolvedValue({
          ...mockLabOrder,
          status: 'SAMPLE_RECEIVED',
          patient: mockUser,
        });
        mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPreference);
        mockPrismaService.notification.create.mockResolvedValue({
          ...mockNotification,
          eventType: 'LAB_SAMPLE_RECEIVED',
          status: 'SENT',
        });

        const result = await service.notifySampleReceived('lab-order-1');

        expect(result.patient).toBeDefined();
      });
    });

    describe('notifySampleIssue', () => {
      it('should notify patient of recollection need', async () => {
        mockPrismaService.labOrder.findUnique.mockResolvedValue({
          ...mockLabOrder,
          status: 'SAMPLE_ISSUE',
          sampleIssueReason: 'Sample hemolyzed',
          patient: mockUser,
        });
        mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPreference);
        mockPrismaService.notification.create.mockResolvedValue({
          ...mockNotification,
          eventType: 'LAB_SAMPLE_ISSUE',
          status: 'SENT',
        });

        const result = await service.notifySampleIssue('lab-order-1');

        expect(result.patient).toBeDefined();
        expect(result.patient.eventType).toBe('LAB_SAMPLE_ISSUE');
      });

      // Spec: URGENT coordinator notification
      it('should send URGENT notification to coordinator', async () => {
        mockPrismaService.labOrder.findUnique.mockResolvedValue({
          ...mockLabOrder,
          status: 'SAMPLE_ISSUE',
          patient: mockUser,
        });
        mockPrismaService.user.findMany.mockResolvedValue([mockCoordinator]);
        mockPrismaService.notificationPreference.findUnique.mockResolvedValue(null);
        mockPrismaService.notification.create.mockImplementation((args) => {
          return Promise.resolve({
            id: 'notif-urgent',
            ...args.data,
            status: 'SENT',
          });
        });

        const result = await service.notifySampleIssue('lab-order-1');

        expect(result.coordinator).toBeDefined();
        expect(result.coordinator.title).toContain('URGENT');
      });
    });

    describe('notifyResultsReady', () => {
      // Spec: Push + WhatsApp + Email (PDF)
      it('should send multi-channel notification for results', async () => {
        mockPrismaService.labOrder.findUnique.mockResolvedValue({
          ...mockLabOrder,
          status: 'RESULTS_READY',
          resultFileUrl: 'https://s3.amazonaws.com/results.pdf',
          patient: mockUser,
        });
        mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPreference);
        mockPrismaService.notification.create.mockImplementation((args) => {
          return Promise.resolve({
            id: `notif-${args.data.channel}`,
            ...args.data,
            status: 'SENT',
          });
        });

        const result = await service.notifyResultsReady('lab-order-1');

        expect(result.patient).toHaveLength(3); // Push, WhatsApp, Email
      });

      it('should notify doctor with purple badge marker', async () => {
        mockPrismaService.labOrder.findUnique.mockResolvedValue({
          ...mockLabOrder,
          status: 'RESULTS_READY',
          patient: mockUser,
          doctorId: 'doctor-1',
        });
        mockPrismaService.user.findUnique.mockResolvedValue(mockDoctor);
        mockPrismaService.notificationPreference.findUnique.mockResolvedValue(null);
        mockPrismaService.notification.create.mockImplementation((args) => {
          return Promise.resolve({
            id: 'notif-doctor',
            ...args.data,
            status: 'SENT',
          });
        });

        const result = await service.notifyResultsReady('lab-order-1');

        expect(result.doctor).toBeDefined();
      });
    });

    describe('notifyCriticalValues', () => {
      // Spec: URGENT notifications to patient and doctor
      it('should send urgent notification to patient', async () => {
        mockPrismaService.labOrder.findUnique.mockResolvedValue({
          ...mockLabOrder,
          status: 'RESULTS_READY',
          criticalValues: true,
          patient: mockUser,
        });
        mockPrismaService.notificationPreference.findUnique.mockResolvedValue({
          ...mockPreference,
          pushEnabled: false, // Even if disabled, critical should send
        });
        mockPrismaService.notification.create.mockResolvedValue({
          ...mockNotification,
          eventType: 'LAB_CRITICAL_VALUES',
          status: 'SENT',
        });

        const result = await service.notifyCriticalValues('lab-order-1');

        expect(result.patient).toBeDefined();
        expect(result.patient.status).toBe('SENT');
      });

      it('should send URGENT notification to doctor', async () => {
        mockPrismaService.labOrder.findUnique.mockResolvedValue({
          ...mockLabOrder,
          status: 'RESULTS_READY',
          criticalValues: true,
          patient: mockUser,
          doctorId: 'doctor-1',
        });
        mockPrismaService.user.findUnique.mockResolvedValue(mockDoctor);
        mockPrismaService.notificationPreference.findUnique.mockResolvedValue(null);
        mockPrismaService.notification.create.mockImplementation((args) => {
          return Promise.resolve({
            id: 'notif-doctor',
            ...args.data,
            status: 'SENT',
          });
        });

        const result = await service.notifyCriticalValues('lab-order-1');

        expect(result.doctor).toBeDefined();
        expect(result.doctor.title).toContain('URGENT');
      });

      it('should send URGENT notification to coordinator', async () => {
        mockPrismaService.labOrder.findUnique.mockResolvedValue({
          ...mockLabOrder,
          status: 'RESULTS_READY',
          criticalValues: true,
          patient: mockUser,
        });
        mockPrismaService.user.findMany.mockResolvedValue([mockCoordinator]);
        mockPrismaService.notificationPreference.findUnique.mockResolvedValue(null);
        mockPrismaService.notification.create.mockImplementation((args) => {
          return Promise.resolve({
            id: 'notif-coord',
            ...args.data,
            status: 'SENT',
          });
        });

        const result = await service.notifyCriticalValues('lab-order-1');

        expect(result.coordinator).toBeDefined();
        expect(result.coordinator.title).toContain('URGENT');
      });
    });

    describe('notifyDoctorReviewed', () => {
      it('should notify patient that doctor reviewed results', async () => {
        mockPrismaService.labOrder.findUnique.mockResolvedValue({
          ...mockLabOrder,
          status: 'DOCTOR_REVIEWED',
          patient: mockUser,
        });
        mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPreference);
        mockPrismaService.notification.create.mockResolvedValue({
          ...mockNotification,
          eventType: 'LAB_DOCTOR_REVIEWED',
          status: 'SENT',
        });

        const result = await service.notifyDoctorReviewed('lab-order-1');

        expect(result.patient).toBeDefined();
        expect(result.patient.eventType).toBe('LAB_DOCTOR_REVIEWED');
      });
    });

    // SLA Notifications
    describe('notifyBookingReminder3Day', () => {
      // Spec: Patient doesn't book (3d) — Reminder
      it('should send 3-day reminder to book slot', async () => {
        mockPrismaService.labOrder.findUnique.mockResolvedValue({
          ...mockLabOrder,
          status: 'ORDERED',
          patient: mockUser,
        });
        mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPreference);
        mockPrismaService.notification.create.mockResolvedValue({
          ...mockNotification,
          eventType: 'LAB_BOOKING_REMINDER_3DAY',
          status: 'SENT',
        });

        const result = await service.notifyBookingReminder3Day('lab-order-1');

        expect(result.patient).toBeDefined();
        expect(result.patient.eventType).toBe('LAB_BOOKING_REMINDER_3DAY');
      });
    });

    describe('notifyBookingReminder14Day', () => {
      // Spec: Patient doesn't book (14d) — Final reminder + coordinator alert
      it('should send final reminder to patient', async () => {
        mockPrismaService.labOrder.findUnique.mockResolvedValue({
          ...mockLabOrder,
          status: 'ORDERED',
          patient: mockUser,
        });
        mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPreference);
        mockPrismaService.notification.create.mockResolvedValue({
          ...mockNotification,
          eventType: 'LAB_BOOKING_REMINDER_14DAY',
          status: 'SENT',
        });

        const result = await service.notifyBookingReminder14Day('lab-order-1');

        expect(result.patient).toBeDefined();
        expect(result.patient.eventType).toBe('LAB_BOOKING_REMINDER_14DAY');
      });

      it('should alert coordinator about expiring order', async () => {
        mockPrismaService.labOrder.findUnique.mockResolvedValue({
          ...mockLabOrder,
          status: 'ORDERED',
          patient: mockUser,
        });
        mockPrismaService.user.findMany.mockResolvedValue([mockCoordinator]);
        mockPrismaService.notificationPreference.findUnique.mockResolvedValue(null);
        mockPrismaService.notification.create.mockImplementation((args) => {
          return Promise.resolve({
            id: 'notif-coord',
            ...args.data,
            status: 'SENT',
          });
        });

        const result = await service.notifyBookingReminder14Day('lab-order-1');

        expect(result.coordinator).toBeDefined();
      });
    });

    describe('notifyLabOverdue48hr', () => {
      // Spec: Lab overdue (48h) — "Taking longer" + coordinator alert
      it('should notify patient lab taking longer', async () => {
        mockPrismaService.labOrder.findUnique.mockResolvedValue({
          ...mockLabOrder,
          status: 'PROCESSING',
          patient: mockUser,
        });
        mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPreference);
        mockPrismaService.notification.create.mockResolvedValue({
          ...mockNotification,
          eventType: 'LAB_OVERDUE_48HR',
          status: 'SENT',
        });

        const result = await service.notifyLabOverdue48hr('lab-order-1');

        expect(result.patient).toBeDefined();
      });
    });

    describe('notifyLabOverdue72hr', () => {
      // Spec: Lab overdue (72h) — "Following up" + coordinator escalation
      it('should notify patient we are following up', async () => {
        mockPrismaService.labOrder.findUnique.mockResolvedValue({
          ...mockLabOrder,
          status: 'PROCESSING',
          patient: mockUser,
        });
        mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPreference);
        mockPrismaService.notification.create.mockResolvedValue({
          ...mockNotification,
          eventType: 'LAB_OVERDUE_72HR',
          status: 'SENT',
        });

        const result = await service.notifyLabOverdue72hr('lab-order-1');

        expect(result.patient).toBeDefined();
      });

      it('should escalate to coordinator', async () => {
        mockPrismaService.labOrder.findUnique.mockResolvedValue({
          ...mockLabOrder,
          status: 'PROCESSING',
          patient: mockUser,
        });
        mockPrismaService.user.findMany.mockResolvedValue([mockCoordinator]);
        mockPrismaService.notificationPreference.findUnique.mockResolvedValue(null);
        mockPrismaService.notification.create.mockImplementation((args) => {
          return Promise.resolve({
            id: 'notif-escalate',
            ...args.data,
            status: 'SENT',
          });
        });

        const result = await service.notifyLabOverdue72hr('lab-order-1');

        expect(result.coordinator).toBeDefined();
        expect(result.coordinator.title).toContain('Escalation');
      });
    });
  });

  // ============================================
  // DELIVERY NOTIFICATIONS (Spec: Section 11)
  // ============================================

  describe('Delivery Notifications', () => {
    describe('notifyPrescriptionCreated', () => {
      it('should notify patient "Being prepared"', async () => {
        mockPrismaService.order.findUnique.mockResolvedValue({
          ...mockOrder,
          status: 'PRESCRIPTION_CREATED',
          patient: mockUser,
        });
        mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPreference);
        mockPrismaService.notification.create.mockResolvedValue({
          ...mockNotification,
          eventType: 'DELIVERY_PRESCRIPTION_CREATED',
          status: 'SENT',
        });

        const result = await service.notifyPrescriptionCreated('order-1');

        expect(result.patient).toBeDefined();
      });

      it('should notify coordinator of new order', async () => {
        mockPrismaService.order.findUnique.mockResolvedValue({
          ...mockOrder,
          patient: mockUser,
        });
        mockPrismaService.user.findMany.mockResolvedValue([mockCoordinator]);
        mockPrismaService.notificationPreference.findUnique.mockResolvedValue(null);
        mockPrismaService.notification.create.mockImplementation((args) => {
          return Promise.resolve({
            id: 'notif-coord',
            ...args.data,
            status: 'SENT',
          });
        });

        const result = await service.notifyPrescriptionCreated('order-1');

        expect(result.coordinator).toBeDefined();
      });

      it('should notify pharmacy of prescription received', async () => {
        mockPrismaService.order.findUnique.mockResolvedValue({
          ...mockOrder,
          patient: mockUser,
          pharmacyPartnerId: 'pharmacy-1',
        });
        mockPrismaService.user.findMany.mockResolvedValue([{ id: 'pharm-user', role: 'PHARMACY' }]);
        mockPrismaService.notificationPreference.findUnique.mockResolvedValue(null);
        mockPrismaService.notification.create.mockImplementation((args) => {
          return Promise.resolve({
            id: 'notif-pharm',
            ...args.data,
            status: 'SENT',
          });
        });

        const result = await service.notifyPrescriptionCreated('order-1');

        expect(result.pharmacy).toBeDefined();
      });
    });

    describe('notifyPharmacyReady', () => {
      it('should notify coordinator "Ready for pickup"', async () => {
        mockPrismaService.order.findUnique.mockResolvedValue({
          ...mockOrder,
          status: 'PHARMACY_READY',
          patient: mockUser,
        });
        mockPrismaService.user.findMany.mockResolvedValue([mockCoordinator]);
        mockPrismaService.notificationPreference.findUnique.mockResolvedValue(null);
        mockPrismaService.notification.create.mockResolvedValue({
          ...mockNotification,
          eventType: 'DELIVERY_PHARMACY_READY',
          status: 'SENT',
        });

        const result = await service.notifyPharmacyReady('order-1');

        expect(result.coordinator).toBeDefined();
      });
    });

    describe('notifyPharmacyIssue', () => {
      it('should notify patient "Slight delay"', async () => {
        mockPrismaService.order.findUnique.mockResolvedValue({
          ...mockOrder,
          status: 'PHARMACY_ISSUE',
          pharmacyIssueReason: 'Stock unavailable',
          patient: mockUser,
        });
        mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPreference);
        mockPrismaService.notification.create.mockResolvedValue({
          ...mockNotification,
          eventType: 'DELIVERY_PHARMACY_ISSUE',
          status: 'SENT',
        });

        const result = await service.notifyPharmacyIssue('order-1');

        expect(result.patient).toBeDefined();
      });

      // Spec: URGENT coordinator notification
      it('should send URGENT notification to coordinator', async () => {
        mockPrismaService.order.findUnique.mockResolvedValue({
          ...mockOrder,
          status: 'PHARMACY_ISSUE',
          patient: mockUser,
        });
        mockPrismaService.user.findMany.mockResolvedValue([mockCoordinator]);
        mockPrismaService.notificationPreference.findUnique.mockResolvedValue(null);
        mockPrismaService.notification.create.mockImplementation((args) => {
          return Promise.resolve({
            id: 'notif-urgent',
            ...args.data,
            status: 'SENT',
          });
        });

        const result = await service.notifyPharmacyIssue('order-1');

        expect(result.coordinator).toBeDefined();
        expect(result.coordinator.title).toContain('URGENT');
      });
    });

    describe('notifyOutForDelivery', () => {
      // Spec: [Name], [Phone], ETA, OTP
      it('should notify patient with delivery details', async () => {
        mockPrismaService.order.findUnique.mockResolvedValue({
          ...mockOrder,
          status: 'OUT_FOR_DELIVERY',
          deliveryPersonName: 'Raju',
          deliveryPersonPhone: '+919876543214',
          estimatedDeliveryTime: '2:00 PM',
          deliveryOtp: '1234',
          patient: mockUser,
        });
        mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPreference);
        mockPrismaService.notification.create.mockImplementation((args) => {
          return Promise.resolve({
            id: 'notif-delivery',
            ...args.data,
            status: 'SENT',
          });
        });

        const result = await service.notifyOutForDelivery('order-1');

        expect(result.patient).toBeDefined();
        expect(result.patient.body).toContain('Raju');
        expect(result.patient.body).toContain('1234');
      });
    });

    describe('notifyDelivered', () => {
      it('should notify patient "Delivered"', async () => {
        mockPrismaService.order.findUnique.mockResolvedValue({
          ...mockOrder,
          status: 'DELIVERED',
          patient: mockUser,
        });
        mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPreference);
        mockPrismaService.notification.create.mockResolvedValue({
          ...mockNotification,
          eventType: 'DELIVERY_DELIVERED',
          status: 'SENT',
        });

        const result = await service.notifyDelivered('order-1');

        expect(result.patient).toBeDefined();
        expect(result.patient.eventType).toBe('DELIVERY_DELIVERED');
      });
    });

    describe('notifyDeliveryFailed', () => {
      it('should notify patient "Rescheduling"', async () => {
        mockPrismaService.order.findUnique.mockResolvedValue({
          ...mockOrder,
          status: 'DELIVERY_FAILED',
          deliveryFailedReason: 'Customer not available',
          patient: mockUser,
        });
        mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPreference);
        mockPrismaService.notification.create.mockResolvedValue({
          ...mockNotification,
          eventType: 'DELIVERY_FAILED',
          status: 'SENT',
        });

        const result = await service.notifyDeliveryFailed('order-1');

        expect(result.patient).toBeDefined();
      });

      it('should alert coordinator', async () => {
        mockPrismaService.order.findUnique.mockResolvedValue({
          ...mockOrder,
          status: 'DELIVERY_FAILED',
          patient: mockUser,
        });
        mockPrismaService.user.findMany.mockResolvedValue([mockCoordinator]);
        mockPrismaService.notificationPreference.findUnique.mockResolvedValue(null);
        mockPrismaService.notification.create.mockImplementation((args) => {
          return Promise.resolve({
            id: 'notif-alert',
            ...args.data,
            status: 'SENT',
          });
        });

        const result = await service.notifyDeliveryFailed('order-1');

        expect(result.coordinator).toBeDefined();
      });
    });

    describe('notifyMonthlyReorder', () => {
      it('should notify patient of reorder', async () => {
        mockPrismaService.order.findUnique.mockResolvedValue({
          ...mockOrder,
          isReorder: true,
          patient: mockUser,
        });
        mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPreference);
        mockPrismaService.notification.create.mockResolvedValue({
          ...mockNotification,
          eventType: 'DELIVERY_MONTHLY_REORDER',
          status: 'SENT',
        });

        const result = await service.notifyMonthlyReorder('order-1');

        expect(result.patient).toBeDefined();
        expect(result.patient.eventType).toBe('DELIVERY_MONTHLY_REORDER');
      });

      it('should notify coordinator of new reorder', async () => {
        mockPrismaService.order.findUnique.mockResolvedValue({
          ...mockOrder,
          isReorder: true,
          patient: mockUser,
        });
        mockPrismaService.user.findMany.mockResolvedValue([mockCoordinator]);
        mockPrismaService.notificationPreference.findUnique.mockResolvedValue(null);
        mockPrismaService.notification.create.mockImplementation((args) => {
          return Promise.resolve({
            id: 'notif-coord',
            ...args.data,
            status: 'SENT',
          });
        });

        const result = await service.notifyMonthlyReorder('order-1');

        expect(result.coordinator).toBeDefined();
      });
    });
  });

  // ============================================
  // IN-APP NOTIFICATIONS
  // ============================================

  describe('In-App Notifications', () => {
    describe('getUnreadNotifications', () => {
      it('should return unread in-app notifications for user', async () => {
        mockPrismaService.notification.findMany.mockResolvedValue([
          { ...mockNotification, channel: 'IN_APP', status: 'SENT' },
          { ...mockNotification, id: 'notif-2', channel: 'IN_APP', status: 'DELIVERED' },
        ]);

        const result = await service.getUnreadNotifications('user-1');

        expect(result).toHaveLength(2);
      });
    });

    describe('getUnreadCount', () => {
      it('should return count of unread notifications', async () => {
        mockPrismaService.notification.count.mockResolvedValue(5);

        const count = await service.getUnreadCount('user-1');

        expect(count).toBe(5);
      });
    });

    describe('markAsRead', () => {
      it('should mark notification as read', async () => {
        mockPrismaService.notification.findUnique.mockResolvedValue({
          ...mockNotification,
          channel: 'IN_APP',
          recipientId: 'user-1',
        });
        mockPrismaService.notification.update.mockResolvedValue({
          ...mockNotification,
          status: 'READ',
          readAt: new Date(),
        });

        const result = await service.markAsRead('user-1', 'notif-1');

        expect(result.status).toBe('READ');
        expect(result.readAt).toBeDefined();
      });

      it('should throw if notification not found', async () => {
        mockPrismaService.notification.findUnique.mockResolvedValue(null);

        await expect(service.markAsRead('user-1', 'invalid-id')).rejects.toThrow(
          NotFoundException,
        );
      });

      it('should throw if notification belongs to different user', async () => {
        mockPrismaService.notification.findUnique.mockResolvedValue({
          ...mockNotification,
          recipientId: 'other-user',
        });

        await expect(service.markAsRead('user-1', 'notif-1')).rejects.toThrow(
          BadRequestException,
        );
      });
    });

    describe('markAllAsRead', () => {
      it('should mark all in-app notifications as read', async () => {
        mockPrismaService.notification.updateMany.mockResolvedValue({ count: 5 });

        const result = await service.markAllAsRead('user-1');

        expect(result.count).toBe(5);
      });
    });
  });

  // ============================================
  // NOTIFICATION HISTORY
  // ============================================

  describe('Notification History', () => {
    describe('getNotificationHistory', () => {
      it('should return paginated notification history', async () => {
        mockPrismaService.notification.findMany.mockResolvedValue([
          mockNotification,
          { ...mockNotification, id: 'notif-2' },
        ]);
        mockPrismaService.notification.count.mockResolvedValue(10);

        const result = await service.getNotificationHistory('user-1', { page: 1, limit: 10 });

        expect(result.notifications).toHaveLength(2);
        expect(result.total).toBe(10);
        expect(result.page).toBe(1);
      });

      it('should filter by channel', async () => {
        mockPrismaService.notification.findMany.mockResolvedValue([
          { ...mockNotification, channel: 'PUSH' },
        ]);
        mockPrismaService.notification.count.mockResolvedValue(1);

        const result = await service.getNotificationHistory('user-1', {
          page: 1,
          limit: 10,
          channel: 'PUSH',
        });

        expect(result.notifications).toHaveLength(1);
        expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              channel: 'PUSH',
            }),
          }),
        );
      });

      it('should filter by event type', async () => {
        mockPrismaService.notification.findMany.mockResolvedValue([
          { ...mockNotification, eventType: 'LAB_RESULTS_READY' },
        ]);
        mockPrismaService.notification.count.mockResolvedValue(1);

        const result = await service.getNotificationHistory('user-1', {
          page: 1,
          limit: 10,
          eventType: 'LAB_RESULTS_READY',
        });

        expect(result.notifications).toHaveLength(1);
      });
    });
  });
});
