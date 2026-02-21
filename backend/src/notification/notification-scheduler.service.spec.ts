import { Test, TestingModule } from '@nestjs/testing';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { NotificationService } from './notification.service';
import { SlaEscalationService } from '../lab-order/sla-escalation.service';
import { PrismaService } from '../prisma/prisma.service';
import { Logger } from '@nestjs/common';

// Spec: master spec Section 7.4 (SLA Escalation) + Section 11 (Notifications)

describe('NotificationSchedulerService', () => {
  let service: NotificationSchedulerService;
  let notificationService: jest.Mocked<NotificationService>;
  let slaService: jest.Mocked<SlaEscalationService>;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationSchedulerService,
        {
          provide: NotificationService,
          useValue: {
            notifyBookingReminder3Day: jest.fn().mockResolvedValue(true),
            notifyBookingReminder14Day: jest.fn().mockResolvedValue(true),
            notifyLabOverdue48hr: jest.fn().mockResolvedValue(true),
            notifyLabOverdue72hr: jest.fn().mockResolvedValue(true),
            notifyCollectionReminder: jest.fn().mockResolvedValue(true),
            notifyMonthlyReorder: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: SlaEscalationService,
          useValue: {
            getOverduePatientBookings: jest.fn().mockResolvedValue([]),
            getOverdueLabResults: jest.fn().mockResolvedValue([]),
            expireStaleOrders: jest.fn().mockResolvedValue({ expiredCount: 0, expiredOrderIds: [] }),
            markReminderSent: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            labOrder: {
              findMany: jest.fn().mockResolvedValue([]),
            },
            order: {
              findFirst: jest.fn().mockResolvedValue(null),
            },
            subscription: {
              findMany: jest.fn().mockResolvedValue([]),
            },
          },
        },
      ],
    }).compile();

    service = module.get<NotificationSchedulerService>(NotificationSchedulerService);
    notificationService = module.get(NotificationService);
    slaService = module.get(SlaEscalationService);
    prisma = module.get(PrismaService);

    // Suppress logger output in tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // --- checkBookingReminders ---

  describe('checkBookingReminders', () => {
    it('should find overdue bookings and send 3-day reminders', async () => {
      const overdueOrders = [
        { id: 'lab-1', breachType: 'PATIENT_BOOKING', hoursOverdue: 80, patientId: 'p1' },
        { id: 'lab-2', breachType: 'PATIENT_BOOKING', hoursOverdue: 100, patientId: 'p2' },
      ];
      slaService.getOverduePatientBookings.mockResolvedValue(overdueOrders);

      await service.checkBookingReminders();

      expect(slaService.getOverduePatientBookings).toHaveBeenCalled();
      expect(notificationService.notifyBookingReminder3Day).toHaveBeenCalledWith('lab-1');
      expect(notificationService.notifyBookingReminder3Day).toHaveBeenCalledWith('lab-2');
      expect(notificationService.notifyBookingReminder3Day).toHaveBeenCalledTimes(2);
    });

    it('should skip if no overdue bookings exist', async () => {
      slaService.getOverduePatientBookings.mockResolvedValue([]);

      await service.checkBookingReminders();

      expect(slaService.getOverduePatientBookings).toHaveBeenCalled();
      expect(notificationService.notifyBookingReminder3Day).not.toHaveBeenCalled();
    });

    it('should mark reminder sent after successful notification', async () => {
      const overdueOrders = [
        { id: 'lab-1', breachType: 'PATIENT_BOOKING', hoursOverdue: 80 },
      ];
      slaService.getOverduePatientBookings.mockResolvedValue(overdueOrders);

      await service.checkBookingReminders();

      expect(slaService.markReminderSent).toHaveBeenCalledWith({
        labOrderId: 'lab-1',
        reminderType: 'BOOKING_REMINDER_3DAY',
      });
    });

    it('should continue processing if one notification fails', async () => {
      const overdueOrders = [
        { id: 'lab-1', breachType: 'PATIENT_BOOKING', hoursOverdue: 80 },
        { id: 'lab-2', breachType: 'PATIENT_BOOKING', hoursOverdue: 100 },
      ];
      slaService.getOverduePatientBookings.mockResolvedValue(overdueOrders);
      notificationService.notifyBookingReminder3Day
        .mockRejectedValueOnce(new Error('Send failed'))
        .mockResolvedValueOnce(true);

      await service.checkBookingReminders();

      // Should still attempt the second notification despite first failure
      expect(notificationService.notifyBookingReminder3Day).toHaveBeenCalledTimes(2);
      expect(notificationService.notifyBookingReminder3Day).toHaveBeenCalledWith('lab-2');
      // Should only mark reminder for the successful one
      expect(slaService.markReminderSent).toHaveBeenCalledTimes(1);
      expect(slaService.markReminderSent).toHaveBeenCalledWith({
        labOrderId: 'lab-2',
        reminderType: 'BOOKING_REMINDER_3DAY',
      });
    });
  });

  // --- checkBookingExpiry ---

  describe('checkBookingExpiry', () => {
    it('should find 14-day overdue orders and send final reminders', async () => {
      const expiringOrders = [
        { id: 'lab-3', breachType: 'PATIENT_BOOKING', hoursOverdue: 340 },
      ];
      // Only return orders that are 14+ days overdue (336 hours = 14 days)
      slaService.getOverduePatientBookings.mockResolvedValue(expiringOrders);

      await service.checkBookingExpiry();

      expect(notificationService.notifyBookingReminder14Day).toHaveBeenCalledWith('lab-3');
    });

    it('should expire stale orders', async () => {
      slaService.getOverduePatientBookings.mockResolvedValue([]);
      slaService.expireStaleOrders.mockResolvedValue({
        expiredCount: 2,
        expiredOrderIds: ['lab-4', 'lab-5'],
      });

      await service.checkBookingExpiry();

      expect(slaService.expireStaleOrders).toHaveBeenCalled();
    });

    it('should filter to only orders over 14 days', async () => {
      const allOverdue = [
        { id: 'lab-3d', breachType: 'PATIENT_BOOKING', hoursOverdue: 80 },   // 3 days - skip
        { id: 'lab-14d', breachType: 'PATIENT_BOOKING', hoursOverdue: 340 },  // 14 days - notify
      ];
      slaService.getOverduePatientBookings.mockResolvedValue(allOverdue);

      await service.checkBookingExpiry();

      // Should only send 14-day reminder for the 14+ day order
      expect(notificationService.notifyBookingReminder14Day).toHaveBeenCalledWith('lab-14d');
      expect(notificationService.notifyBookingReminder14Day).toHaveBeenCalledTimes(1);
    });
  });

  // --- checkLabOverdue ---

  describe('checkLabOverdue', () => {
    it('should send 48hr notifications for overdue lab results', async () => {
      const overdueResults = [
        { id: 'lab-6', breachType: 'LAB_RESULTS', hoursOverdue: 50 },
      ];
      slaService.getOverdueLabResults.mockResolvedValue(overdueResults);

      await service.checkLabOverdue();

      expect(slaService.getOverdueLabResults).toHaveBeenCalled();
      expect(notificationService.notifyLabOverdue48hr).toHaveBeenCalledWith('lab-6');
    });

    it('should send 72hr notifications for critically overdue results', async () => {
      const overdueResults = [
        { id: 'lab-7', breachType: 'LAB_RESULTS', hoursOverdue: 75 },
      ];
      slaService.getOverdueLabResults.mockResolvedValue(overdueResults);

      await service.checkLabOverdue();

      expect(notificationService.notifyLabOverdue72hr).toHaveBeenCalledWith('lab-7');
    });

    it('should differentiate between 48hr and 72hr overdue', async () => {
      const overdueResults = [
        { id: 'lab-48', breachType: 'LAB_RESULTS', hoursOverdue: 50 },  // 48hr tier
        { id: 'lab-72', breachType: 'LAB_RESULTS', hoursOverdue: 75 },  // 72hr tier
      ];
      slaService.getOverdueLabResults.mockResolvedValue(overdueResults);

      await service.checkLabOverdue();

      expect(notificationService.notifyLabOverdue48hr).toHaveBeenCalledWith('lab-48');
      expect(notificationService.notifyLabOverdue72hr).toHaveBeenCalledWith('lab-72');
    });
  });

  // --- checkCollectionReminders ---
  // LabOrder has bookedDate field; LabSlot has no direct LabOrder relation

  describe('checkCollectionReminders', () => {
    it('should find upcoming appointments and send reminders', async () => {
      const upcomingOrders = [
        { id: 'lab-8' },
      ];
      (prisma.labOrder.findMany as jest.Mock).mockResolvedValue(upcomingOrders);

      await service.checkCollectionReminders();

      expect(notificationService.notifyCollectionReminder).toHaveBeenCalledWith('lab-8');
    });

    it('should skip if no upcoming appointments', async () => {
      (prisma.labOrder.findMany as jest.Mock).mockResolvedValue([]);

      await service.checkCollectionReminders();

      expect(notificationService.notifyCollectionReminder).not.toHaveBeenCalled();
    });
  });

  // --- checkMonthlyReorders ---
  // Subscription has no direct Order relation; find latest order per patient

  describe('checkMonthlyReorders', () => {
    it('should find subscriptions nearing period end and notify', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const subs = [
        {
          id: 'sub-1',
          userId: 'user-1',
          currentPeriodEnd: tomorrow,
          status: 'ACTIVE',
        },
      ];
      (prisma.subscription.findMany as jest.Mock).mockResolvedValue(subs);
      (prisma.order.findFirst as jest.Mock).mockResolvedValue({ id: 'order-1' });

      await service.checkMonthlyReorders();

      expect(notificationService.notifyMonthlyReorder).toHaveBeenCalledWith('order-1');
    });

    it('should skip subscriptions with no delivered orders', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const subs = [
        {
          id: 'sub-2',
          userId: 'user-2',
          currentPeriodEnd: tomorrow,
          status: 'ACTIVE',
        },
      ];
      (prisma.subscription.findMany as jest.Mock).mockResolvedValue(subs);
      (prisma.order.findFirst as jest.Mock).mockResolvedValue(null);

      await service.checkMonthlyReorders();

      expect(notificationService.notifyMonthlyReorder).not.toHaveBeenCalled();
    });

    it('should skip if no subscriptions nearing period end', async () => {
      (prisma.subscription.findMany as jest.Mock).mockResolvedValue([]);

      await service.checkMonthlyReorders();

      expect(notificationService.notifyMonthlyReorder).not.toHaveBeenCalled();
    });
  });
});
