import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import {
  LabOrderService,
  LabOrderStatus,
  VALID_LAB_ORDER_TRANSITIONS,
  CreateLabOrderInput,
} from './lab-order.service';
import { PrismaService } from '../prisma/prisma.service';
import { HealthVertical, UserRole } from '@prisma/client';

// Spec: master spec Section 7 (Blood Work & Diagnostics)
// Spec: master spec Section 7.3 (Lab Order Status Enum)

describe('LabOrderService', () => {
  let service: LabOrderService;
  let mockPrismaService: any;

  const mockPatient = {
    id: 'patient-1',
    phone: '+911234567890',
    name: 'Test Patient',
    role: UserRole.PATIENT,
    patientProfile: {
      id: 'profile-1',
      addressLine1: '123 Test Street',
      city: 'Mumbai',
      pincode: '400001',
    },
  };

  const mockDoctor = {
    id: 'doctor-1',
    phone: '+919876543210',
    name: 'Dr. Smith',
    role: UserRole.DOCTOR,
  };

  const mockConsultation = {
    id: 'consultation-1',
    patientId: 'patient-1',
    doctorId: 'doctor-1',
    vertical: HealthVertical.HAIR_LOSS,
  };

  const mockLabOrder = {
    id: 'lab-order-1',
    patientId: 'patient-1',
    consultationId: 'consultation-1',
    doctorId: 'doctor-1',
    testPanel: ['TSH', 'CBC', 'Ferritin', 'Vitamin_D'],
    panelName: 'Hair Loss Basic Panel',
    status: LabOrderStatus.ORDERED,
    orderedAt: new Date('2026-02-10T10:00:00Z'),
    collectionAddress: '123 Test Street',
    collectionCity: 'Mumbai',
    collectionPincode: '400001',
    labCost: 99900, // ₹999 in paise
    patientCharge: 0,
    coveredBySubscription: true,
    criticalValues: false,
    patientUploadedResults: false,
  };

  beforeEach(async () => {
    mockPrismaService = {
      labOrder: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      consultation: {
        findUnique: jest.fn(),
      },
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LabOrderService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<LabOrderService>(LabOrderService);
  });

  // ============================================
  // STATUS ENUM TESTS
  // ============================================

  describe('LabOrderStatus Enum', () => {
    it('should have all 15 required statuses per spec', () => {
      // Spec: master spec Section 7.3
      expect(LabOrderStatus.ORDERED).toBe('ORDERED');
      expect(LabOrderStatus.SLOT_BOOKED).toBe('SLOT_BOOKED');
      expect(LabOrderStatus.PHLEBOTOMIST_ASSIGNED).toBe('PHLEBOTOMIST_ASSIGNED');
      expect(LabOrderStatus.SAMPLE_COLLECTED).toBe('SAMPLE_COLLECTED');
      expect(LabOrderStatus.COLLECTION_FAILED).toBe('COLLECTION_FAILED');
      expect(LabOrderStatus.DELIVERED_TO_LAB).toBe('DELIVERED_TO_LAB');
      expect(LabOrderStatus.SAMPLE_RECEIVED).toBe('SAMPLE_RECEIVED');
      expect(LabOrderStatus.SAMPLE_ISSUE).toBe('SAMPLE_ISSUE');
      expect(LabOrderStatus.PROCESSING).toBe('PROCESSING');
      expect(LabOrderStatus.RESULTS_READY).toBe('RESULTS_READY');
      expect(LabOrderStatus.RESULTS_UPLOADED).toBe('RESULTS_UPLOADED');
      expect(LabOrderStatus.DOCTOR_REVIEWED).toBe('DOCTOR_REVIEWED');
      expect(LabOrderStatus.CLOSED).toBe('CLOSED');
      expect(LabOrderStatus.CANCELLED).toBe('CANCELLED');
      expect(LabOrderStatus.EXPIRED).toBe('EXPIRED');
    });

    it('should have exactly 15 statuses', () => {
      const statusCount = Object.keys(LabOrderStatus).length;
      expect(statusCount).toBe(15);
    });
  });

  // ============================================
  // VALID TRANSITIONS TESTS
  // ============================================

  describe('Status Transitions', () => {
    // Spec: master spec Section 7.3 — Valid transition paths

    it('should allow ORDERED → SLOT_BOOKED', () => {
      expect(VALID_LAB_ORDER_TRANSITIONS[LabOrderStatus.ORDERED]).toContain(
        LabOrderStatus.SLOT_BOOKED
      );
    });

    it('should allow ORDERED → RESULTS_UPLOADED (patient self-upload path)', () => {
      // Spec: Section 7.2 Step 2 — Alt: patient uploads own results
      expect(VALID_LAB_ORDER_TRANSITIONS[LabOrderStatus.ORDERED]).toContain(
        LabOrderStatus.RESULTS_UPLOADED
      );
    });

    it('should allow ORDERED → CANCELLED', () => {
      expect(VALID_LAB_ORDER_TRANSITIONS[LabOrderStatus.ORDERED]).toContain(
        LabOrderStatus.CANCELLED
      );
    });

    it('should allow ORDERED → EXPIRED', () => {
      expect(VALID_LAB_ORDER_TRANSITIONS[LabOrderStatus.ORDERED]).toContain(
        LabOrderStatus.EXPIRED
      );
    });

    it('should allow SLOT_BOOKED → PHLEBOTOMIST_ASSIGNED', () => {
      expect(VALID_LAB_ORDER_TRANSITIONS[LabOrderStatus.SLOT_BOOKED]).toContain(
        LabOrderStatus.PHLEBOTOMIST_ASSIGNED
      );
    });

    it('should allow SLOT_BOOKED → CANCELLED', () => {
      expect(VALID_LAB_ORDER_TRANSITIONS[LabOrderStatus.SLOT_BOOKED]).toContain(
        LabOrderStatus.CANCELLED
      );
    });

    it('should allow PHLEBOTOMIST_ASSIGNED → SAMPLE_COLLECTED', () => {
      expect(VALID_LAB_ORDER_TRANSITIONS[LabOrderStatus.PHLEBOTOMIST_ASSIGNED]).toContain(
        LabOrderStatus.SAMPLE_COLLECTED
      );
    });

    it('should allow PHLEBOTOMIST_ASSIGNED → COLLECTION_FAILED', () => {
      expect(VALID_LAB_ORDER_TRANSITIONS[LabOrderStatus.PHLEBOTOMIST_ASSIGNED]).toContain(
        LabOrderStatus.COLLECTION_FAILED
      );
    });

    it('should allow PHLEBOTOMIST_ASSIGNED → CANCELLED (with ≥4hr notice)', () => {
      expect(VALID_LAB_ORDER_TRANSITIONS[LabOrderStatus.PHLEBOTOMIST_ASSIGNED]).toContain(
        LabOrderStatus.CANCELLED
      );
    });

    it('should allow COLLECTION_FAILED → SLOT_BOOKED (patient rebooks)', () => {
      // Spec: Section 7.3 — COLLECTION_FAILED → patient rebooks → SLOT_BOOKED
      expect(VALID_LAB_ORDER_TRANSITIONS[LabOrderStatus.COLLECTION_FAILED]).toContain(
        LabOrderStatus.SLOT_BOOKED
      );
    });

    it('should allow SAMPLE_COLLECTED → DELIVERED_TO_LAB', () => {
      expect(VALID_LAB_ORDER_TRANSITIONS[LabOrderStatus.SAMPLE_COLLECTED]).toContain(
        LabOrderStatus.DELIVERED_TO_LAB
      );
    });

    it('should allow DELIVERED_TO_LAB → SAMPLE_RECEIVED', () => {
      expect(VALID_LAB_ORDER_TRANSITIONS[LabOrderStatus.DELIVERED_TO_LAB]).toContain(
        LabOrderStatus.SAMPLE_RECEIVED
      );
    });

    it('should allow SAMPLE_RECEIVED → PROCESSING', () => {
      expect(VALID_LAB_ORDER_TRANSITIONS[LabOrderStatus.SAMPLE_RECEIVED]).toContain(
        LabOrderStatus.PROCESSING
      );
    });

    it('should allow SAMPLE_RECEIVED → SAMPLE_ISSUE', () => {
      expect(VALID_LAB_ORDER_TRANSITIONS[LabOrderStatus.SAMPLE_RECEIVED]).toContain(
        LabOrderStatus.SAMPLE_ISSUE
      );
    });

    it('should allow PROCESSING → RESULTS_READY', () => {
      expect(VALID_LAB_ORDER_TRANSITIONS[LabOrderStatus.PROCESSING]).toContain(
        LabOrderStatus.RESULTS_READY
      );
    });

    it('should allow RESULTS_READY → DOCTOR_REVIEWED', () => {
      expect(VALID_LAB_ORDER_TRANSITIONS[LabOrderStatus.RESULTS_READY]).toContain(
        LabOrderStatus.DOCTOR_REVIEWED
      );
    });

    it('should allow RESULTS_UPLOADED → DOCTOR_REVIEWED', () => {
      // Spec: Section 7.3 — RESULTS_UPLOADED → DOCTOR_REVIEWED → CLOSED
      expect(VALID_LAB_ORDER_TRANSITIONS[LabOrderStatus.RESULTS_UPLOADED]).toContain(
        LabOrderStatus.DOCTOR_REVIEWED
      );
    });

    it('should allow DOCTOR_REVIEWED → CLOSED', () => {
      expect(VALID_LAB_ORDER_TRANSITIONS[LabOrderStatus.DOCTOR_REVIEWED]).toContain(
        LabOrderStatus.CLOSED
      );
    });

    it('should NOT allow ORDERED → DELIVERED_TO_LAB (invalid skip)', () => {
      expect(VALID_LAB_ORDER_TRANSITIONS[LabOrderStatus.ORDERED]).not.toContain(
        LabOrderStatus.DELIVERED_TO_LAB
      );
    });

    it('should NOT allow CLOSED → any status (terminal state)', () => {
      expect(VALID_LAB_ORDER_TRANSITIONS[LabOrderStatus.CLOSED]).toEqual([]);
    });

    it('should NOT allow CANCELLED → any status (terminal state)', () => {
      expect(VALID_LAB_ORDER_TRANSITIONS[LabOrderStatus.CANCELLED]).toEqual([]);
    });

    it('should NOT allow EXPIRED → any status (terminal state)', () => {
      expect(VALID_LAB_ORDER_TRANSITIONS[LabOrderStatus.EXPIRED]).toEqual([]);
    });
  });

  // ============================================
  // CREATE LAB ORDER TESTS
  // ============================================

  describe('createLabOrder', () => {
    it('should create a lab order with ORDERED status', async () => {
      const input: CreateLabOrderInput = {
        consultationId: 'consultation-1',
        doctorId: 'doctor-1',
        testPanel: ['TSH', 'CBC', 'Ferritin', 'Vitamin_D'],
        panelName: 'Hair Loss Basic Panel',
        doctorNotes: 'Check thyroid function',
      };

      mockPrismaService.consultation.findUnique.mockResolvedValue(mockConsultation);
      mockPrismaService.user.findUnique.mockResolvedValue(mockPatient);
      mockPrismaService.labOrder.create.mockResolvedValue({
        ...mockLabOrder,
        doctorNotes: input.doctorNotes,
      });

      const result = await service.createLabOrder(input);

      expect(result.status).toBe(LabOrderStatus.ORDERED);
      expect(result.testPanel).toEqual(input.testPanel);
      expect(mockPrismaService.labOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: LabOrderStatus.ORDERED,
            orderedAt: expect.any(Date),
            testPanel: input.testPanel,
          }),
        })
      );
    });

    it('should set orderedAt timestamp on creation', async () => {
      const input: CreateLabOrderInput = {
        consultationId: 'consultation-1',
        doctorId: 'doctor-1',
        testPanel: ['TSH'],
      };

      mockPrismaService.consultation.findUnique.mockResolvedValue(mockConsultation);
      mockPrismaService.user.findUnique.mockResolvedValue(mockPatient);
      mockPrismaService.labOrder.create.mockResolvedValue(mockLabOrder);

      await service.createLabOrder(input);

      expect(mockPrismaService.labOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderedAt: expect.any(Date),
          }),
        })
      );
    });

    it('should throw NotFoundException if consultation not found', async () => {
      mockPrismaService.consultation.findUnique.mockResolvedValue(null);

      await expect(
        service.createLabOrder({
          consultationId: 'invalid',
          doctorId: 'doctor-1',
          testPanel: ['TSH'],
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should copy patient address to collection address', async () => {
      const input: CreateLabOrderInput = {
        consultationId: 'consultation-1',
        doctorId: 'doctor-1',
        testPanel: ['TSH'],
      };

      mockPrismaService.consultation.findUnique.mockResolvedValue(mockConsultation);
      mockPrismaService.user.findUnique.mockResolvedValue(mockPatient);
      mockPrismaService.labOrder.create.mockResolvedValue(mockLabOrder);

      await service.createLabOrder(input);

      expect(mockPrismaService.labOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            collectionAddress: mockPatient.patientProfile.addressLine1,
            collectionCity: mockPatient.patientProfile.city,
            collectionPincode: mockPatient.patientProfile.pincode,
          }),
        })
      );
    });
  });

  // ============================================
  // TRANSITION VALIDATION TESTS
  // ============================================

  describe('validateTransition', () => {
    it('should return true for valid transition ORDERED → SLOT_BOOKED', () => {
      const result = service.isValidTransition(
        LabOrderStatus.ORDERED,
        LabOrderStatus.SLOT_BOOKED
      );
      expect(result).toBe(true);
    });

    it('should return false for invalid transition ORDERED → DELIVERED_TO_LAB', () => {
      const result = service.isValidTransition(
        LabOrderStatus.ORDERED,
        LabOrderStatus.DELIVERED_TO_LAB
      );
      expect(result).toBe(false);
    });

    it('should return false for transition from terminal state CLOSED', () => {
      const result = service.isValidTransition(
        LabOrderStatus.CLOSED,
        LabOrderStatus.ORDERED
      );
      expect(result).toBe(false);
    });

    it('should return false for transition from terminal state CANCELLED', () => {
      const result = service.isValidTransition(
        LabOrderStatus.CANCELLED,
        LabOrderStatus.SLOT_BOOKED
      );
      expect(result).toBe(false);
    });
  });

  // ============================================
  // STATUS TRANSITION WITH TIMESTAMP TESTS
  // ============================================

  describe('transitionStatus', () => {
    it('should update status and set slotBookedAt timestamp for ORDERED → SLOT_BOOKED', async () => {
      const orderedLabOrder = { ...mockLabOrder, status: LabOrderStatus.ORDERED };
      const updatedLabOrder = {
        ...orderedLabOrder,
        status: LabOrderStatus.SLOT_BOOKED,
        slotBookedAt: new Date(),
        bookedDate: new Date('2026-02-13'),
        bookedTimeSlot: '8:00-10:00',
      };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(orderedLabOrder);
      mockPrismaService.labOrder.update.mockResolvedValue(updatedLabOrder);

      const result = await service.transitionStatus('lab-order-1', LabOrderStatus.SLOT_BOOKED, {
        bookedDate: new Date('2026-02-13'),
        bookedTimeSlot: '8:00-10:00',
      });

      expect(result.status).toBe(LabOrderStatus.SLOT_BOOKED);
      expect(mockPrismaService.labOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: LabOrderStatus.SLOT_BOOKED,
            slotBookedAt: expect.any(Date),
          }),
        })
      );
    });

    it('should set phlebotomistAssignedAt for SLOT_BOOKED → PHLEBOTOMIST_ASSIGNED', async () => {
      const slotBookedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.SLOT_BOOKED,
        slotBookedAt: new Date(),
      };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(slotBookedOrder);
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...slotBookedOrder,
        status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED,
        phlebotomistAssignedAt: new Date(),
        phlebotomistId: 'phlebotomist-1',
      });

      await service.transitionStatus('lab-order-1', LabOrderStatus.PHLEBOTOMIST_ASSIGNED, {
        phlebotomistId: 'phlebotomist-1',
      });

      expect(mockPrismaService.labOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED,
            phlebotomistAssignedAt: expect.any(Date),
            phlebotomistId: 'phlebotomist-1',
          }),
        })
      );
    });

    it('should set sampleCollectedAt for PHLEBOTOMIST_ASSIGNED → SAMPLE_COLLECTED', async () => {
      const assignedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED,
        phlebotomistId: 'phlebotomist-1',
      };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(assignedOrder);
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...assignedOrder,
        status: LabOrderStatus.SAMPLE_COLLECTED,
        sampleCollectedAt: new Date(),
        tubeCount: 3,
      });

      await service.transitionStatus('lab-order-1', LabOrderStatus.SAMPLE_COLLECTED, {
        tubeCount: 3,
      });

      expect(mockPrismaService.labOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: LabOrderStatus.SAMPLE_COLLECTED,
            sampleCollectedAt: expect.any(Date),
            tubeCount: 3,
          }),
        })
      );
    });

    it('should set collectionFailedAt and reason for PHLEBOTOMIST_ASSIGNED → COLLECTION_FAILED', async () => {
      const assignedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED,
      };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(assignedOrder);
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...assignedOrder,
        status: LabOrderStatus.COLLECTION_FAILED,
        collectionFailedAt: new Date(),
        collectionFailedReason: 'Patient not home',
      });

      await service.transitionStatus('lab-order-1', LabOrderStatus.COLLECTION_FAILED, {
        reason: 'Patient not home',
      });

      expect(mockPrismaService.labOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: LabOrderStatus.COLLECTION_FAILED,
            collectionFailedAt: expect.any(Date),
            collectionFailedReason: 'Patient not home',
          }),
        })
      );
    });

    it('should set deliveredToLabAt and diagnosticCentreId for SAMPLE_COLLECTED → DELIVERED_TO_LAB', async () => {
      const collectedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.SAMPLE_COLLECTED,
        sampleCollectedAt: new Date(),
      };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(collectedOrder);
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...collectedOrder,
        status: LabOrderStatus.DELIVERED_TO_LAB,
        deliveredToLabAt: new Date(),
        diagnosticCentreId: 'lab-centre-1',
      });

      await service.transitionStatus('lab-order-1', LabOrderStatus.DELIVERED_TO_LAB, {
        diagnosticCentreId: 'lab-centre-1',
      });

      expect(mockPrismaService.labOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: LabOrderStatus.DELIVERED_TO_LAB,
            deliveredToLabAt: expect.any(Date),
            diagnosticCentreId: 'lab-centre-1',
          }),
        })
      );
    });

    it('should set sampleReceivedAt for DELIVERED_TO_LAB → SAMPLE_RECEIVED', async () => {
      const deliveredOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.DELIVERED_TO_LAB,
        deliveredToLabAt: new Date(),
      };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(deliveredOrder);
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...deliveredOrder,
        status: LabOrderStatus.SAMPLE_RECEIVED,
        sampleReceivedAt: new Date(),
        receivedTubeCount: 3,
      });

      await service.transitionStatus('lab-order-1', LabOrderStatus.SAMPLE_RECEIVED, {
        receivedTubeCount: 3,
      });

      expect(mockPrismaService.labOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: LabOrderStatus.SAMPLE_RECEIVED,
            sampleReceivedAt: expect.any(Date),
            receivedTubeCount: 3,
          }),
        })
      );
    });

    it('should set sampleIssueAt and reason for SAMPLE_RECEIVED → SAMPLE_ISSUE', async () => {
      const receivedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.SAMPLE_RECEIVED,
      };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(receivedOrder);
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...receivedOrder,
        status: LabOrderStatus.SAMPLE_ISSUE,
        sampleIssueAt: new Date(),
        sampleIssueReason: 'Hemolysis',
      });

      await service.transitionStatus('lab-order-1', LabOrderStatus.SAMPLE_ISSUE, {
        reason: 'Hemolysis',
      });

      expect(mockPrismaService.labOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: LabOrderStatus.SAMPLE_ISSUE,
            sampleIssueAt: expect.any(Date),
            sampleIssueReason: 'Hemolysis',
          }),
        })
      );
    });

    it('should set processingStartedAt for SAMPLE_RECEIVED → PROCESSING', async () => {
      const receivedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.SAMPLE_RECEIVED,
      };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(receivedOrder);
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...receivedOrder,
        status: LabOrderStatus.PROCESSING,
        processingStartedAt: new Date(),
      });

      await service.transitionStatus('lab-order-1', LabOrderStatus.PROCESSING);

      expect(mockPrismaService.labOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: LabOrderStatus.PROCESSING,
            processingStartedAt: expect.any(Date),
          }),
        })
      );
    });

    it('should set resultsUploadedAt and resultFileUrl for PROCESSING → RESULTS_READY', async () => {
      const processingOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.PROCESSING,
      };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(processingOrder);
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...processingOrder,
        status: LabOrderStatus.RESULTS_READY,
        resultsUploadedAt: new Date(),
        resultFileUrl: 'https://s3.amazonaws.com/results/123.pdf',
        abnormalFlags: { TSH: 'HIGH', CBC: 'NORMAL' },
      });

      await service.transitionStatus('lab-order-1', LabOrderStatus.RESULTS_READY, {
        resultFileUrl: 'https://s3.amazonaws.com/results/123.pdf',
        abnormalFlags: { TSH: 'HIGH', CBC: 'NORMAL' },
      });

      expect(mockPrismaService.labOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: LabOrderStatus.RESULTS_READY,
            resultsUploadedAt: expect.any(Date),
            resultFileUrl: 'https://s3.amazonaws.com/results/123.pdf',
            abnormalFlags: { TSH: 'HIGH', CBC: 'NORMAL' },
          }),
        })
      );
    });

    it('should set doctorReviewedAt for RESULTS_READY → DOCTOR_REVIEWED', async () => {
      const resultsReadyOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.RESULTS_READY,
        resultFileUrl: 'https://s3.amazonaws.com/results/123.pdf',
      };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(resultsReadyOrder);
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...resultsReadyOrder,
        status: LabOrderStatus.DOCTOR_REVIEWED,
        doctorReviewedAt: new Date(),
      });

      await service.transitionStatus('lab-order-1', LabOrderStatus.DOCTOR_REVIEWED);

      expect(mockPrismaService.labOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: LabOrderStatus.DOCTOR_REVIEWED,
            doctorReviewedAt: expect.any(Date),
          }),
        })
      );
    });

    it('should set closedAt for DOCTOR_REVIEWED → CLOSED', async () => {
      const reviewedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.DOCTOR_REVIEWED,
      };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(reviewedOrder);
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...reviewedOrder,
        status: LabOrderStatus.CLOSED,
        closedAt: new Date(),
      });

      await service.transitionStatus('lab-order-1', LabOrderStatus.CLOSED);

      expect(mockPrismaService.labOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: LabOrderStatus.CLOSED,
            closedAt: expect.any(Date),
          }),
        })
      );
    });

    it('should throw BadRequestException for invalid transition', async () => {
      const orderedLabOrder = { ...mockLabOrder, status: LabOrderStatus.ORDERED };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(orderedLabOrder);

      await expect(
        service.transitionStatus('lab-order-1', LabOrderStatus.DELIVERED_TO_LAB)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if lab order not found', async () => {
      mockPrismaService.labOrder.findUnique.mockResolvedValue(null);

      await expect(
        service.transitionStatus('invalid-id', LabOrderStatus.SLOT_BOOKED)
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // COLLECTION FAILED → REBOOK FLOW TESTS
  // ============================================

  describe('Collection Failed Rebook Flow', () => {
    // Spec: Section 7.3 — COLLECTION_FAILED → patient rebooks → SLOT_BOOKED

    it('should allow rebooking after COLLECTION_FAILED', async () => {
      const failedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.COLLECTION_FAILED,
        collectionFailedAt: new Date(),
        collectionFailedReason: 'Patient not home',
      };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(failedOrder);
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...failedOrder,
        status: LabOrderStatus.SLOT_BOOKED,
        slotBookedAt: new Date(),
        bookedDate: new Date('2026-02-14'),
        bookedTimeSlot: '10:00-12:00',
        // Previous failure data preserved
        collectionFailedAt: failedOrder.collectionFailedAt,
        collectionFailedReason: failedOrder.collectionFailedReason,
      });

      const result = await service.transitionStatus('lab-order-1', LabOrderStatus.SLOT_BOOKED, {
        bookedDate: new Date('2026-02-14'),
        bookedTimeSlot: '10:00-12:00',
      });

      expect(result.status).toBe(LabOrderStatus.SLOT_BOOKED);
    });

    it('should reset phlebotomistId and assignment timestamp when rebooking', async () => {
      const failedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.COLLECTION_FAILED,
        phlebotomistId: 'old-phlebotomist',
        phlebotomistAssignedAt: new Date('2026-02-12'),
      };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(failedOrder);
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...failedOrder,
        status: LabOrderStatus.SLOT_BOOKED,
        phlebotomistId: null,
        phlebotomistAssignedAt: null,
      });

      await service.transitionStatus('lab-order-1', LabOrderStatus.SLOT_BOOKED, {
        bookedDate: new Date('2026-02-14'),
        bookedTimeSlot: '10:00-12:00',
      });

      expect(mockPrismaService.labOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            phlebotomistId: null,
            phlebotomistAssignedAt: null,
          }),
        })
      );
    });
  });

  // ============================================
  // SAMPLE ISSUE → AUTO-CREATE NEW ORDER TESTS
  // ============================================

  describe('Sample Issue Auto-Recollection', () => {
    // Spec: Section 7.3 — SAMPLE_ISSUE → auto-new-order → ORDERED

    it('should create a new lab order when sample issue is reported', async () => {
      const issueOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.SAMPLE_ISSUE,
        sampleIssueAt: new Date(),
        sampleIssueReason: 'Hemolysis',
      };

      const newRecollectionOrder = {
        ...mockLabOrder,
        id: 'lab-order-2',
        status: LabOrderStatus.ORDERED,
        orderedAt: new Date(),
        parentLabOrderId: 'lab-order-1',
        isFreeRecollection: true,
        labCost: 0,
        patientCharge: 0,
      };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(issueOrder);
      mockPrismaService.labOrder.create.mockResolvedValue(newRecollectionOrder);

      const result = await service.createRecollectionOrder('lab-order-1');

      expect(result.isFreeRecollection).toBe(true);
      expect(result.parentLabOrderId).toBe('lab-order-1');
      expect(result.labCost).toBe(0);
      expect(result.patientCharge).toBe(0);
      expect(result.status).toBe(LabOrderStatus.ORDERED);
    });

    it('should copy test panel from original order to recollection', async () => {
      const issueOrder = {
        ...mockLabOrder,
        testPanel: ['TSH', 'CBC', 'Ferritin'],
        status: LabOrderStatus.SAMPLE_ISSUE,
      };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(issueOrder);
      mockPrismaService.labOrder.create.mockResolvedValue({
        ...issueOrder,
        id: 'lab-order-2',
        status: LabOrderStatus.ORDERED,
        testPanel: issueOrder.testPanel,
      });

      await service.createRecollectionOrder('lab-order-1');

      expect(mockPrismaService.labOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            testPanel: ['TSH', 'CBC', 'Ferritin'],
          }),
        })
      );
    });

    it('should throw error if original order is not in SAMPLE_ISSUE status', async () => {
      mockPrismaService.labOrder.findUnique.mockResolvedValue({
        ...mockLabOrder,
        status: LabOrderStatus.PROCESSING,
      });

      await expect(service.createRecollectionOrder('lab-order-1')).rejects.toThrow(
        BadRequestException
      );
    });
  });

  // ============================================
  // PATIENT SELF-UPLOAD PATH TESTS
  // ============================================

  describe('Patient Self-Upload Results', () => {
    // Spec: Section 7.2 Step 2 — Alt: patient uploads own results

    it('should allow patient to upload results from ORDERED status', async () => {
      const orderedLabOrder = { ...mockLabOrder, status: LabOrderStatus.ORDERED };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(orderedLabOrder);
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...orderedLabOrder,
        status: LabOrderStatus.RESULTS_UPLOADED,
        patientUploadedResults: true,
        patientUploadedFileUrl: 'https://s3.amazonaws.com/uploads/patient-results.pdf',
        resultsUploadedAt: new Date(),
      });

      const result = await service.uploadPatientResults('lab-order-1', {
        fileUrl: 'https://s3.amazonaws.com/uploads/patient-results.pdf',
        patientId: 'patient-1',
      });

      expect(result.status).toBe(LabOrderStatus.RESULTS_UPLOADED);
      expect(result.patientUploadedResults).toBe(true);
    });

    it('should set patientUploadedResults flag to true for self-upload', async () => {
      const orderedLabOrder = { ...mockLabOrder, status: LabOrderStatus.ORDERED };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(orderedLabOrder);
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...orderedLabOrder,
        status: LabOrderStatus.RESULTS_UPLOADED,
        patientUploadedResults: true,
      });

      await service.uploadPatientResults('lab-order-1', {
        fileUrl: 'https://s3.amazonaws.com/uploads/patient-results.pdf',
        patientId: 'patient-1',
      });

      expect(mockPrismaService.labOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            patientUploadedResults: true,
            patientUploadedFileUrl: 'https://s3.amazonaws.com/uploads/patient-results.pdf',
          }),
        })
      );
    });

    it('should allow RESULTS_UPLOADED → DOCTOR_REVIEWED transition', async () => {
      const uploadedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.RESULTS_UPLOADED,
        patientUploadedResults: true,
        patientUploadedFileUrl: 'https://s3.amazonaws.com/uploads/patient-results.pdf',
      };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(uploadedOrder);
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...uploadedOrder,
        status: LabOrderStatus.DOCTOR_REVIEWED,
        doctorReviewedAt: new Date(),
      });

      const result = await service.transitionStatus('lab-order-1', LabOrderStatus.DOCTOR_REVIEWED);

      expect(result.status).toBe(LabOrderStatus.DOCTOR_REVIEWED);
    });

    it('should throw ForbiddenException if non-patient tries to upload', async () => {
      const orderedLabOrder = { ...mockLabOrder, status: LabOrderStatus.ORDERED };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(orderedLabOrder);

      await expect(
        service.uploadPatientResults('lab-order-1', {
          fileUrl: 'https://s3.amazonaws.com/uploads/patient-results.pdf',
          patientId: 'different-patient',
        })
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================
  // CANCELLED STATUS TESTS
  // ============================================

  describe('Cancel Lab Order', () => {
    it('should allow cancellation from ORDERED status', async () => {
      const orderedLabOrder = { ...mockLabOrder, status: LabOrderStatus.ORDERED };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(orderedLabOrder);
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...orderedLabOrder,
        status: LabOrderStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: 'Patient requested',
      });

      const result = await service.cancelLabOrder('lab-order-1', {
        reason: 'Patient requested',
      });

      expect(result.status).toBe(LabOrderStatus.CANCELLED);
    });

    it('should allow cancellation from SLOT_BOOKED status', async () => {
      const bookedLabOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.SLOT_BOOKED,
        slotBookedAt: new Date(),
      };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(bookedLabOrder);
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...bookedLabOrder,
        status: LabOrderStatus.CANCELLED,
      });

      const result = await service.cancelLabOrder('lab-order-1', {
        reason: 'Changed mind',
      });

      expect(result.status).toBe(LabOrderStatus.CANCELLED);
    });

    it('should allow cancellation from PHLEBOTOMIST_ASSIGNED with ≥4hr notice', async () => {
      const assignedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED,
        bookedDate: new Date(Date.now() + 5 * 60 * 60 * 1000), // 5 hours from now
        bookedTimeSlot: '10:00-12:00',
      };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(assignedOrder);
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...assignedOrder,
        status: LabOrderStatus.CANCELLED,
      });

      const result = await service.cancelLabOrder('lab-order-1', {
        reason: 'Not needed',
      });

      expect(result.status).toBe(LabOrderStatus.CANCELLED);
    });

    it('should throw error when cancelling PHLEBOTOMIST_ASSIGNED with <4hr notice', async () => {
      const assignedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED,
        bookedDate: new Date(),
        bookedTimeSlot: '10:00-12:00', // current time window
      };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(assignedOrder);

      await expect(
        service.cancelLabOrder('lab-order-1', {
          reason: 'Too late to cancel',
          checkCutoff: true,
          currentTime: new Date(assignedOrder.bookedDate.getTime() - 2 * 60 * 60 * 1000), // 2hr before
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should NOT allow cancellation from SAMPLE_COLLECTED onwards', async () => {
      const collectedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.SAMPLE_COLLECTED,
      };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(collectedOrder);

      await expect(
        service.cancelLabOrder('lab-order-1', { reason: 'Too late' })
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // EXPIRED STATUS TESTS
  // ============================================

  describe('Expire Lab Order', () => {
    // Spec: Section 7.4 — 14 days without booking → EXPIRED

    it('should expire orders that are ORDERED for more than 14 days without booking', async () => {
      const oldOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.ORDERED,
        orderedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
      };

      mockPrismaService.labOrder.findMany.mockResolvedValue([oldOrder]);
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...oldOrder,
        status: LabOrderStatus.EXPIRED,
        expiredAt: new Date(),
      });

      const result = await service.expireStaleOrders();

      expect(result.expiredCount).toBe(1);
      expect(mockPrismaService.labOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: oldOrder.id },
          data: expect.objectContaining({
            status: LabOrderStatus.EXPIRED,
            expiredAt: expect.any(Date),
          }),
        })
      );
    });

    it('should NOT expire orders that are less than 14 days old', async () => {
      const recentOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.ORDERED,
        orderedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      };

      mockPrismaService.labOrder.findMany.mockResolvedValue([]);

      const result = await service.expireStaleOrders();

      expect(result.expiredCount).toBe(0);
    });

    it('should only check ORDERED status for expiry', async () => {
      // Even if SLOT_BOOKED is old, it shouldn't expire (patient already booked)
      mockPrismaService.labOrder.findMany.mockResolvedValue([]);

      await service.expireStaleOrders();

      expect(mockPrismaService.labOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: LabOrderStatus.ORDERED,
          }),
        })
      );
    });
  });

  // ============================================
  // CRITICAL VALUES FLAG TESTS
  // ============================================

  describe('Critical Values Detection', () => {
    // Spec: Section 7.2 Step 7 — Critical values → URGENT notification

    it('should set criticalValues flag when lab marks critical result', async () => {
      const processingOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.PROCESSING,
      };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(processingOrder);
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...processingOrder,
        status: LabOrderStatus.RESULTS_READY,
        criticalValues: true,
        abnormalFlags: { TSH: 'CRITICAL', CBC: 'NORMAL' },
      });

      const result = await service.transitionStatus('lab-order-1', LabOrderStatus.RESULTS_READY, {
        resultFileUrl: 'https://s3.amazonaws.com/results/123.pdf',
        abnormalFlags: { TSH: 'CRITICAL', CBC: 'NORMAL' },
        criticalValues: true,
      });

      expect(result.criticalValues).toBe(true);
    });

    it('should detect critical values from abnormalFlags automatically', async () => {
      const processingOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.PROCESSING,
      };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(processingOrder);
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...processingOrder,
        status: LabOrderStatus.RESULTS_READY,
        criticalValues: true,
      });

      await service.transitionStatus('lab-order-1', LabOrderStatus.RESULTS_READY, {
        resultFileUrl: 'https://s3.amazonaws.com/results/123.pdf',
        abnormalFlags: { TSH: 'CRITICAL', VitaminD: 'LOW' },
      });

      expect(mockPrismaService.labOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            criticalValues: true,
          }),
        })
      );
    });
  });

  // ============================================
  // GET LAB ORDER TESTS
  // ============================================

  describe('getLabOrder', () => {
    it('should return lab order by ID', async () => {
      mockPrismaService.labOrder.findUnique.mockResolvedValue(mockLabOrder);

      const result = await service.getLabOrder('lab-order-1');

      expect(result).toEqual(mockLabOrder);
      expect(mockPrismaService.labOrder.findUnique).toHaveBeenCalledWith({
        where: { id: 'lab-order-1' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if lab order not found', async () => {
      mockPrismaService.labOrder.findUnique.mockResolvedValue(null);

      await expect(service.getLabOrder('invalid')).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // GET PATIENT LAB ORDERS TESTS
  // ============================================

  describe('getPatientLabOrders', () => {
    it('should return all lab orders for a patient', async () => {
      const patientOrders = [mockLabOrder, { ...mockLabOrder, id: 'lab-order-2' }];
      mockPrismaService.labOrder.findMany.mockResolvedValue(patientOrders);

      const result = await service.getPatientLabOrders('patient-1');

      expect(result).toHaveLength(2);
      expect(mockPrismaService.labOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { patientId: 'patient-1' },
          orderBy: { orderedAt: 'desc' },
        })
      );
    });
  });

  // ============================================
  // GET LAB ORDERS BY STATUS TESTS
  // ============================================

  describe('getLabOrdersByStatus', () => {
    it('should return lab orders filtered by status', async () => {
      const orderedOrders = [mockLabOrder];
      mockPrismaService.labOrder.findMany.mockResolvedValue(orderedOrders);

      const result = await service.getLabOrdersByStatus(LabOrderStatus.ORDERED);

      expect(result).toHaveLength(1);
      expect(mockPrismaService.labOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: LabOrderStatus.ORDERED },
        })
      );
    });

    it('should return empty array if no orders match status', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([]);

      const result = await service.getLabOrdersByStatus(LabOrderStatus.PROCESSING);

      expect(result).toHaveLength(0);
    });
  });

  // ============================================
  // TIMESTAMP PRESERVATION TESTS
  // ============================================

  describe('Timestamp Preservation', () => {
    it('should preserve all previous timestamps when transitioning', async () => {
      const orderWithHistory = {
        ...mockLabOrder,
        status: LabOrderStatus.SAMPLE_RECEIVED,
        orderedAt: new Date('2026-02-10T10:00:00Z'),
        slotBookedAt: new Date('2026-02-10T12:00:00Z'),
        phlebotomistAssignedAt: new Date('2026-02-11T09:00:00Z'),
        sampleCollectedAt: new Date('2026-02-12T10:00:00Z'),
        deliveredToLabAt: new Date('2026-02-12T14:00:00Z'),
        sampleReceivedAt: new Date('2026-02-12T15:00:00Z'),
      };

      mockPrismaService.labOrder.findUnique.mockResolvedValue(orderWithHistory);
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...orderWithHistory,
        status: LabOrderStatus.PROCESSING,
        processingStartedAt: new Date(),
      });

      await service.transitionStatus('lab-order-1', LabOrderStatus.PROCESSING);

      // Should NOT overwrite previous timestamps
      expect(mockPrismaService.labOrder.update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderedAt: expect.any(Date),
            slotBookedAt: expect.any(Date),
            sampleCollectedAt: expect.any(Date),
          }),
        })
      );
    });
  });
});
