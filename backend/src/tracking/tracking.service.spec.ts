import { Test, TestingModule } from '@nestjs/testing';
import { TrackingService } from './tracking.service';
import { PrismaService } from '../prisma/prisma.service';

// Spec: master spec Section 4 (Patient Tracking Screens)

describe('TrackingService', () => {
  let service: TrackingService;
  let mockPrismaService: any;

  const mockLabOrders = [
    {
      id: 'lab-1',
      patientId: 'user-1',
      status: 'ORDERED',
      testPanel: ['TSH', 'CBC'],
      panelName: 'Basic Panel',
      orderedAt: new Date('2026-02-12T10:00:00Z'),
      bookedDate: null,
      bookedTimeSlot: null,
      phlebotomist: null,
      updatedAt: new Date('2026-02-12T10:00:00Z'),
    },
    {
      id: 'lab-2',
      patientId: 'user-1',
      status: 'SLOT_BOOKED',
      testPanel: ['Ferritin', 'Vitamin_D'],
      panelName: 'Hair Loss Panel',
      orderedAt: new Date('2026-02-10T10:00:00Z'),
      bookedDate: new Date('2026-02-14'),
      bookedTimeSlot: '8:00-10:00',
      phlebotomist: null,
      collectionAddress: '123 Main St',
      updatedAt: new Date('2026-02-11T10:00:00Z'),
    },
    {
      id: 'lab-3',
      patientId: 'user-1',
      status: 'PHLEBOTOMIST_ASSIGNED',
      testPanel: ['TSH'],
      panelName: 'Thyroid Panel',
      orderedAt: new Date('2026-02-08T10:00:00Z'),
      bookedDate: new Date('2026-02-13'),
      bookedTimeSlot: '10:00-12:00',
      phlebotomist: { name: 'Priya R.' },
      updatedAt: new Date('2026-02-12T08:00:00Z'),
    },
  ];

  const mockOrders = [
    {
      id: 'order-1',
      patientId: 'user-1',
      status: 'OUT_FOR_DELIVERY',
      deliveryPersonName: 'Ravi K.',
      deliveryPersonPhone: '+919876543210',
      estimatedDeliveryTime: '3:30 PM',
      deliveryOtp: '1234',
      orderedAt: new Date('2026-02-11T10:00:00Z'),
      outForDeliveryAt: new Date('2026-02-12T14:00:00Z'),
      prescription: { medications: [{ name: 'Finasteride 1mg' }, { name: 'Minoxidil 5%' }] },
      updatedAt: new Date('2026-02-12T14:00:00Z'),
    },
    {
      id: 'order-2',
      patientId: 'user-1',
      status: 'PRESCRIPTION_CREATED',
      orderedAt: new Date('2026-02-10T10:00:00Z'),
      prescription: { medications: [{ name: 'Metformin 500mg' }] },
      updatedAt: new Date('2026-02-10T10:00:00Z'),
    },
  ];

  const mockCompletedLabOrders = [
    {
      id: 'lab-completed-1',
      patientId: 'user-1',
      status: 'CLOSED',
      testPanel: ['TSH', 'CBC'],
      panelName: 'Basic Panel',
      resultFileUrl: 'https://s3.example.com/results.pdf',
      orderedAt: new Date('2026-01-15T10:00:00Z'),
      closedAt: new Date('2026-01-20T10:00:00Z'),
      updatedAt: new Date('2026-01-20T10:00:00Z'),
    },
  ];

  const mockCompletedOrders = [
    {
      id: 'order-completed-1',
      patientId: 'user-1',
      status: 'DELIVERED',
      deliveredAt: new Date('2026-02-05T10:00:00Z'),
      deliveryRating: 5,
      prescription: { medications: [{ name: 'Finasteride 1mg' }] },
      updatedAt: new Date('2026-02-05T10:00:00Z'),
    },
  ];

  beforeEach(async () => {
    mockPrismaService = {
      labOrder: {
        findMany: jest.fn(),
      },
      order: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackingService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TrackingService>(TrackingService);
  });

  describe('getActiveItems', () => {
    it('should return all active lab orders and delivery orders for a patient', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue(mockLabOrders);
      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);

      const result = await service.getActiveItems('user-1');

      expect(result.items).toHaveLength(5);
      expect(result.items.some((item) => item.type === 'lab')).toBe(true);
      expect(result.items.some((item) => item.type === 'delivery')).toBe(true);
    });

    it('should return each item with type, title, currentStatus, patientLabel, icon, and lastUpdated', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([mockLabOrders[0]]);
      mockPrismaService.order.findMany.mockResolvedValue([]);

      const result = await service.getActiveItems('user-1');

      expect(result.items[0]).toHaveProperty('type');
      expect(result.items[0]).toHaveProperty('title');
      expect(result.items[0]).toHaveProperty('currentStatus');
      expect(result.items[0]).toHaveProperty('patientLabel');
      expect(result.items[0]).toHaveProperty('icon');
      expect(result.items[0]).toHaveProperty('lastUpdated');
    });

    it('should sort active items by urgency (items needing patient action first)', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue(mockLabOrders);
      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);

      const result = await service.getActiveItems('user-1');

      // ORDERED status (needs patient to book slot) should come before SLOT_BOOKED
      const orderedIndex = result.items.findIndex(
        (item) => item.currentStatus === 'ORDERED',
      );
      const slotBookedIndex = result.items.findIndex(
        (item) => item.currentStatus === 'SLOT_BOOKED',
      );

      expect(orderedIndex).toBeLessThan(slotBookedIndex);
    });

    it('should return empty array when patient has no active items', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([]);
      mockPrismaService.order.findMany.mockResolvedValue([]);

      const result = await service.getActiveItems('user-1');

      expect(result.items).toHaveLength(0);
    });
  });

  describe('getCompletedItems', () => {
    it('should return completed/historical items sorted by most recent first', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue(mockCompletedLabOrders);
      mockPrismaService.order.findMany.mockResolvedValue(mockCompletedOrders);

      const result = await service.getCompletedItems('user-1');

      expect(result.items.length).toBeGreaterThan(0);
      // Items should be sorted by most recent first
      for (let i = 0; i < result.items.length - 1; i++) {
        expect(result.items[i].lastUpdated.getTime()).toBeGreaterThanOrEqual(
          result.items[i + 1].lastUpdated.getTime(),
        );
      }
    });

    it('should include result file URL for completed lab orders', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue(mockCompletedLabOrders);
      mockPrismaService.order.findMany.mockResolvedValue([]);

      const result = await service.getCompletedItems('user-1');

      const labItem = result.items.find((item) => item.type === 'lab');
      expect(labItem).toHaveProperty('resultFileUrl');
    });
  });

  describe('Lab Status Mapping (Spec: Section 4.2)', () => {
    it('should map ORDERED status to "Doctor ordered blood tests" with icon 🔬', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([
        { ...mockLabOrders[0], status: 'ORDERED' },
      ]);
      mockPrismaService.order.findMany.mockResolvedValue([]);

      const result = await service.getActiveItems('user-1');

      expect(result.items[0].patientLabel).toBe('Doctor ordered blood tests');
      expect(result.items[0].icon).toBe('🔬');
    });

    it('should map SLOT_BOOKED status to "Collection scheduled — [date], [time]" with icon 📅', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([
        { ...mockLabOrders[1], status: 'SLOT_BOOKED' },
      ]);
      mockPrismaService.order.findMany.mockResolvedValue([]);

      const result = await service.getActiveItems('user-1');

      expect(result.items[0].patientLabel).toMatch(/Collection scheduled/);
      expect(result.items[0].icon).toBe('📅');
    });

    it('should map PHLEBOTOMIST_ASSIGNED status to "Phlebotomist assigned — [name]" with icon 👤', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([
        { ...mockLabOrders[2], status: 'PHLEBOTOMIST_ASSIGNED' },
      ]);
      mockPrismaService.order.findMany.mockResolvedValue([]);

      const result = await service.getActiveItems('user-1');

      expect(result.items[0].patientLabel).toMatch(/Phlebotomist assigned/);
      expect(result.items[0].patientLabel).toContain('Priya R.');
      expect(result.items[0].icon).toBe('👤');
    });

    it('should map SAMPLE_COLLECTED status to "Sample collected ✅" with icon ✅', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([
        { ...mockLabOrders[0], status: 'SAMPLE_COLLECTED' },
      ]);
      mockPrismaService.order.findMany.mockResolvedValue([]);

      const result = await service.getActiveItems('user-1');

      expect(result.items[0].patientLabel).toBe('Sample collected ✅');
      expect(result.items[0].icon).toBe('✅');
    });

    it('should map COLLECTION_FAILED status to "Collection missed — please reschedule" with icon ⚠️', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([
        { ...mockLabOrders[0], status: 'COLLECTION_FAILED' },
      ]);
      mockPrismaService.order.findMany.mockResolvedValue([]);

      const result = await service.getActiveItems('user-1');

      expect(result.items[0].patientLabel).toBe('Collection missed — please reschedule');
      expect(result.items[0].icon).toBe('⚠️');
    });

    it('should map DELIVERED_TO_LAB status to "Sample delivered to lab" with icon 🏥', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([
        { ...mockLabOrders[0], status: 'DELIVERED_TO_LAB' },
      ]);
      mockPrismaService.order.findMany.mockResolvedValue([]);

      const result = await service.getActiveItems('user-1');

      expect(result.items[0].patientLabel).toBe('Sample delivered to lab');
      expect(result.items[0].icon).toBe('🏥');
    });

    it('should map SAMPLE_RECEIVED status to "Lab received your sample" with icon 🏥', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([
        { ...mockLabOrders[0], status: 'SAMPLE_RECEIVED' },
      ]);
      mockPrismaService.order.findMany.mockResolvedValue([]);

      const result = await service.getActiveItems('user-1');

      expect(result.items[0].patientLabel).toBe('Lab received your sample');
      expect(result.items[0].icon).toBe('🏥');
    });

    it('should map SAMPLE_ISSUE status to "Sample issue — free recollection scheduled" with icon ⚠️', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([
        { ...mockLabOrders[0], status: 'SAMPLE_ISSUE' },
      ]);
      mockPrismaService.order.findMany.mockResolvedValue([]);

      const result = await service.getActiveItems('user-1');

      expect(result.items[0].patientLabel).toBe('Sample issue — free recollection scheduled');
      expect(result.items[0].icon).toBe('⚠️');
    });

    it('should map PROCESSING status to "Tests being processed — results in 24-48hrs" with icon ⏳', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([
        { ...mockLabOrders[0], status: 'PROCESSING' },
      ]);
      mockPrismaService.order.findMany.mockResolvedValue([]);

      const result = await service.getActiveItems('user-1');

      expect(result.items[0].patientLabel).toBe('Tests being processed — results in 24-48hrs');
      expect(result.items[0].icon).toBe('⏳');
    });

    it('should map RESULTS_READY status to "Results ready! Tap to view" with icon 📄', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([
        { ...mockLabOrders[0], status: 'RESULTS_READY' },
      ]);
      mockPrismaService.order.findMany.mockResolvedValue([]);

      const result = await service.getActiveItems('user-1');

      expect(result.items[0].patientLabel).toBe('Results ready! Tap to view');
      expect(result.items[0].icon).toBe('📄');
    });

    it('should map DOCTOR_REVIEWED status to "Doctor reviewed your results" with icon 👨‍⚕️', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([
        { ...mockLabOrders[0], status: 'DOCTOR_REVIEWED' },
      ]);
      mockPrismaService.order.findMany.mockResolvedValue([]);

      const result = await service.getActiveItems('user-1');

      expect(result.items[0].patientLabel).toBe('Doctor reviewed your results');
      expect(result.items[0].icon).toBe('👨‍⚕️');
    });

    it('should map RESULTS_UPLOADED status to "Your uploaded results are being reviewed" with icon 📤', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([
        { ...mockLabOrders[0], status: 'RESULTS_UPLOADED' },
      ]);
      mockPrismaService.order.findMany.mockResolvedValue([]);

      const result = await service.getActiveItems('user-1');

      expect(result.items[0].patientLabel).toBe('Your uploaded results are being reviewed');
      expect(result.items[0].icon).toBe('📤');
    });
  });

  describe('Delivery Status Mapping (Spec: Section 4.3)', () => {
    it('should map PRESCRIPTION_CREATED status to "Treatment plan ready" with icon 📋', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([]);
      mockPrismaService.order.findMany.mockResolvedValue([
        { ...mockOrders[1], status: 'PRESCRIPTION_CREATED' },
      ]);

      const result = await service.getActiveItems('user-1');

      expect(result.items[0].patientLabel).toBe('Treatment plan ready');
      expect(result.items[0].icon).toBe('📋');
    });

    it('should map SENT_TO_PHARMACY status to "Prescription sent to pharmacy" with icon 💊', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([]);
      mockPrismaService.order.findMany.mockResolvedValue([
        { ...mockOrders[1], status: 'SENT_TO_PHARMACY' },
      ]);

      const result = await service.getActiveItems('user-1');

      expect(result.items[0].patientLabel).toBe('Prescription sent to pharmacy');
      expect(result.items[0].icon).toBe('💊');
    });

    it('should map PHARMACY_PREPARING status to "Medication being prepared" with icon ⏳', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([]);
      mockPrismaService.order.findMany.mockResolvedValue([
        { ...mockOrders[1], status: 'PHARMACY_PREPARING' },
      ]);

      const result = await service.getActiveItems('user-1');

      expect(result.items[0].patientLabel).toBe('Medication being prepared');
      expect(result.items[0].icon).toBe('⏳');
    });

    it('should map PHARMACY_READY status to "Medication ready — arranging delivery" with icon ✅', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([]);
      mockPrismaService.order.findMany.mockResolvedValue([
        { ...mockOrders[1], status: 'PHARMACY_READY' },
      ]);

      const result = await service.getActiveItems('user-1');

      expect(result.items[0].patientLabel).toBe('Medication ready — arranging delivery');
      expect(result.items[0].icon).toBe('✅');
    });

    it('should map PICKUP_ARRANGED status to "Delivery person picking up your kit" with icon 🏃', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([]);
      mockPrismaService.order.findMany.mockResolvedValue([
        { ...mockOrders[1], status: 'PICKUP_ARRANGED' },
      ]);

      const result = await service.getActiveItems('user-1');

      expect(result.items[0].patientLabel).toBe('Delivery person picking up your kit');
      expect(result.items[0].icon).toBe('🏃');
    });

    it('should map OUT_FOR_DELIVERY status with name, phone, and ETA with icon 🚗', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([]);
      mockPrismaService.order.findMany.mockResolvedValue([
        {
          ...mockOrders[0],
          status: 'OUT_FOR_DELIVERY',
          deliveryPersonName: 'Ravi K.',
          deliveryPersonPhone: '+919876543210',
          estimatedDeliveryTime: '3:30 PM',
        },
      ]);

      const result = await service.getActiveItems('user-1');

      expect(result.items[0].patientLabel).toContain('On the way!');
      expect(result.items[0].patientLabel).toContain('Ravi K.');
      expect(result.items[0].icon).toBe('🚗');
      expect(result.items[0].deliveryDetails).toBeDefined();
      expect(result.items[0].deliveryDetails.name).toBe('Ravi K.');
      expect(result.items[0].deliveryDetails.phone).toBe('+919876543210');
      expect(result.items[0].deliveryDetails.eta).toBe('3:30 PM');
    });

    it('should map DELIVERED status to "Delivered ✅ — [date, time]" with icon 📦', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([]);
      mockPrismaService.order.findMany.mockResolvedValue([
        {
          ...mockOrders[1],
          status: 'DELIVERED',
          deliveredAt: new Date('2026-02-12T15:30:00Z'),
        },
      ]);

      const result = await service.getActiveItems('user-1');

      expect(result.items[0].patientLabel).toMatch(/Delivered ✅/);
      expect(result.items[0].icon).toBe('📦');
    });

    it('should map DELIVERY_FAILED status to "Delivery unsuccessful — rescheduling" with icon ⚠️', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([]);
      mockPrismaService.order.findMany.mockResolvedValue([
        { ...mockOrders[1], status: 'DELIVERY_FAILED' },
      ]);

      const result = await service.getActiveItems('user-1');

      expect(result.items[0].patientLabel).toBe('Delivery unsuccessful — rescheduling');
      expect(result.items[0].icon).toBe('⚠️');
    });

    it('should map RESCHEDULED status to "Rescheduled for [new date]" with icon 📅', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([]);
      mockPrismaService.order.findMany.mockResolvedValue([
        {
          ...mockOrders[1],
          status: 'RESCHEDULED',
          rescheduledAt: new Date('2026-02-15'),
        },
      ]);

      const result = await service.getActiveItems('user-1');

      expect(result.items[0].patientLabel).toMatch(/Rescheduled for/);
      expect(result.items[0].icon).toBe('📅');
    });
  });

  describe('getHomeBanner', () => {
    it('should return banner text when patient has active lab orders', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([
        { ...mockLabOrders[0], status: 'PROCESSING' },
      ]);
      mockPrismaService.order.findMany.mockResolvedValue([]);

      const result = await service.getHomeBanner('user-1');

      expect(result.hasBanner).toBe(true);
      expect(result.bannerText).toContain('Blood test');
    });

    it('should return banner text when patient has active delivery orders', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([]);
      mockPrismaService.order.findMany.mockResolvedValue([
        { ...mockOrders[0], status: 'OUT_FOR_DELIVERY' },
      ]);

      const result = await service.getHomeBanner('user-1');

      expect(result.hasBanner).toBe(true);
      expect(result.bannerText).toContain('Medication');
    });

    it('should return no banner when patient has no active orders', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([]);
      mockPrismaService.order.findMany.mockResolvedValue([]);

      const result = await service.getHomeBanner('user-1');

      expect(result.hasBanner).toBe(false);
      expect(result.bannerText).toBeNull();
    });

    it('should prioritize delivery out for delivery over lab orders in banner', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([
        { ...mockLabOrders[0], status: 'PROCESSING' },
      ]);
      mockPrismaService.order.findMany.mockResolvedValue([
        { ...mockOrders[0], status: 'OUT_FOR_DELIVERY' },
      ]);

      const result = await service.getHomeBanner('user-1');

      expect(result.hasBanner).toBe(true);
      expect(result.bannerText).toContain('out for delivery');
    });

    it('should show COLLECTION_FAILED status as urgent in banner', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([
        { ...mockLabOrders[0], status: 'COLLECTION_FAILED' },
      ]);
      mockPrismaService.order.findMany.mockResolvedValue([]);

      const result = await service.getHomeBanner('user-1');

      expect(result.hasBanner).toBe(true);
      expect(result.bannerText).toContain('reschedule');
    });
  });

  describe('getActivityItem', () => {
    it('should return a single activity item by ID and type', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([mockLabOrders[0]]);

      const result = await service.getActivityItem('user-1', 'lab-1', 'lab');

      expect(result).toBeDefined();
      expect(result.id).toBe('lab-1');
      expect(result.type).toBe('lab');
    });

    it('should return null when item not found', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([]);

      const result = await service.getActivityItem('user-1', 'non-existent', 'lab');

      expect(result).toBeNull();
    });

    it('should return delivery item details including prescription medications', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([mockOrders[0]]);

      const result = await service.getActivityItem('user-1', 'order-1', 'delivery');

      expect(result).toBeDefined();
      expect(result.type).toBe('delivery');
      expect(result.medications).toBeDefined();
      expect(result.medications).toHaveLength(2);
    });
  });

  describe('getLabOrderProgress', () => {
    it('should return progress stepper data for lab order', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([
        {
          ...mockLabOrders[2],
          status: 'SAMPLE_COLLECTED',
          sampleCollectedAt: new Date('2026-02-13T09:30:00Z'),
        },
      ]);

      const result = await service.getLabOrderProgress('user-1', 'lab-3');

      expect(result.steps).toBeDefined();
      expect(result.steps.length).toBeGreaterThan(0);
      expect(result.steps[0]).toHaveProperty('label');
      expect(result.steps[0]).toHaveProperty('status'); // 'completed', 'current', 'upcoming'
      expect(result.steps[0]).toHaveProperty('timestamp');
    });

    it('should mark completed steps with timestamp', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([
        {
          ...mockLabOrders[2],
          status: 'SAMPLE_COLLECTED',
          orderedAt: new Date('2026-02-08T10:00:00Z'),
          slotBookedAt: new Date('2026-02-09T10:00:00Z'),
          phlebotomistAssignedAt: new Date('2026-02-12T08:00:00Z'),
          sampleCollectedAt: new Date('2026-02-13T09:30:00Z'),
        },
      ]);

      const result = await service.getLabOrderProgress('user-1', 'lab-3');

      const completedSteps = result.steps.filter((step) => step.status === 'completed');
      completedSteps.forEach((step) => {
        expect(step.timestamp).toBeDefined();
      });
    });

    it('should mark current step as active', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([
        { ...mockLabOrders[0], status: 'PROCESSING' },
      ]);

      const result = await service.getLabOrderProgress('user-1', 'lab-1');

      const currentStep = result.steps.find((step) => step.status === 'current');
      expect(currentStep).toBeDefined();
      expect(currentStep.label).toContain('processing');
    });

    it('should mark future steps as upcoming', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([
        { ...mockLabOrders[0], status: 'ORDERED' },
      ]);

      const result = await service.getLabOrderProgress('user-1', 'lab-1');

      const upcomingSteps = result.steps.filter((step) => step.status === 'upcoming');
      expect(upcomingSteps.length).toBeGreaterThan(0);
    });
  });

  describe('getDeliveryOrderProgress', () => {
    it('should return progress stepper data for delivery order', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([mockOrders[0]]);

      const result = await service.getDeliveryOrderProgress('user-1', 'order-1');

      expect(result.steps).toBeDefined();
      expect(result.steps.length).toBeGreaterThan(0);
    });

    it('should include delivery person details when OUT_FOR_DELIVERY', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([
        {
          ...mockOrders[0],
          status: 'OUT_FOR_DELIVERY',
          deliveryPersonName: 'Ravi K.',
          deliveryPersonPhone: '+919876543210',
        },
      ]);

      const result = await service.getDeliveryOrderProgress('user-1', 'order-1');

      const outForDeliveryStep = result.steps.find(
        (step) => step.label.toLowerCase().includes('on the way'),
      );
      expect(outForDeliveryStep).toBeDefined();
      expect(outForDeliveryStep.details).toContain('Ravi K.');
    });
  });

  describe('Urgency Sorting', () => {
    it('should prioritize COLLECTION_FAILED (needs patient action) over PROCESSING', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([
        { ...mockLabOrders[0], status: 'PROCESSING', updatedAt: new Date('2026-02-12T12:00:00Z') },
        { ...mockLabOrders[1], status: 'COLLECTION_FAILED', updatedAt: new Date('2026-02-12T10:00:00Z') },
      ]);
      mockPrismaService.order.findMany.mockResolvedValue([]);

      const result = await service.getActiveItems('user-1');

      expect(result.items[0].currentStatus).toBe('COLLECTION_FAILED');
    });

    it('should prioritize ORDERED (needs patient to book slot) over SLOT_BOOKED', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([
        { ...mockLabOrders[1], status: 'SLOT_BOOKED', updatedAt: new Date('2026-02-12T12:00:00Z') },
        { ...mockLabOrders[0], status: 'ORDERED', updatedAt: new Date('2026-02-12T10:00:00Z') },
      ]);
      mockPrismaService.order.findMany.mockResolvedValue([]);

      const result = await service.getActiveItems('user-1');

      expect(result.items[0].currentStatus).toBe('ORDERED');
    });

    it('should prioritize RESULTS_READY over DOCTOR_REVIEWED (patient should view)', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([
        { ...mockLabOrders[0], status: 'DOCTOR_REVIEWED', updatedAt: new Date('2026-02-12T12:00:00Z') },
        { ...mockLabOrders[1], status: 'RESULTS_READY', updatedAt: new Date('2026-02-12T10:00:00Z') },
      ]);
      mockPrismaService.order.findMany.mockResolvedValue([]);

      const result = await service.getActiveItems('user-1');

      expect(result.items[0].currentStatus).toBe('RESULTS_READY');
    });
  });

  describe('Active vs Completed Status Classification', () => {
    it('should classify CLOSED lab orders as completed', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([
        { ...mockLabOrders[0], status: 'CLOSED' },
      ]);
      mockPrismaService.order.findMany.mockResolvedValue([]);

      const activeResult = await service.getActiveItems('user-1');
      expect(activeResult.items).toHaveLength(0);
    });

    // Spec: Section 4.4 — DELIVERED requires patient action (enter OTP), so stays active
    it('should classify DELIVERED orders as active (patient needs to enter OTP)', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([]);
      mockPrismaService.order.findMany.mockResolvedValue([
        { ...mockOrders[0], status: 'DELIVERED' },
      ]);

      const activeResult = await service.getActiveItems('user-1');
      expect(activeResult.items).toHaveLength(1);
      expect(activeResult.items[0].currentStatus).toBe('DELIVERED');
    });

    it('should classify RETURNED orders as completed', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([]);
      mockPrismaService.order.findMany.mockResolvedValue([
        { ...mockOrders[0], status: 'RETURNED' },
      ]);

      const activeResult = await service.getActiveItems('user-1');
      expect(activeResult.items).toHaveLength(0);
    });

    it('should classify CANCELLED lab orders as completed', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([
        { ...mockLabOrders[0], status: 'CANCELLED' },
      ]);
      mockPrismaService.order.findMany.mockResolvedValue([]);

      const activeResult = await service.getActiveItems('user-1');
      expect(activeResult.items).toHaveLength(0);
    });

    it('should classify EXPIRED lab orders as completed', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([
        { ...mockLabOrders[0], status: 'EXPIRED' },
      ]);
      mockPrismaService.order.findMany.mockResolvedValue([]);

      const activeResult = await service.getActiveItems('user-1');
      expect(activeResult.items).toHaveLength(0);
    });
  });
});
