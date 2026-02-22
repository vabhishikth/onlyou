import { Test, TestingModule } from '@nestjs/testing';
import { LabAutomationResolver } from './lab-automation.resolver';
import { LabOnboardingService } from './lab-onboarding.service';
import { PhlebotomistOnboardingService } from './phlebotomist-onboarding.service';
import { LabOrderCreationService } from './lab-order-creation.service';
import { SlotAssignmentService } from './slot-assignment.service';
import { CollectionTrackingService } from './collection-tracking.service';
import { LabProcessingService } from './lab-processing.service';
import { BiomarkerDashboardService } from './biomarker-dashboard.service';
import { PrismaService } from '../prisma/prisma.service';

// Spec: Phase 16 Chunk 8 — GraphQL API Endpoints for All Portals

describe('LabAutomationResolver', () => {
  let resolver: LabAutomationResolver;
  let labOnboarding: any;
  let phlebOnboarding: any;
  let orderCreation: any;
  let slotAssignment: any;
  let collectionTracking: any;
  let labProcessing: any;
  let biomarkerDashboard: any;
  let prisma: any;

  const adminUser = { id: 'admin-1', role: 'ADMIN' };
  const doctorUser = { id: 'doctor-1', role: 'DOCTOR' };
  const patientUser = { id: 'patient-1', role: 'PATIENT' };
  const phlebUser = { id: 'phleb-user-1', role: 'PHLEBOTOMIST' };
  const labUser = { id: 'lab-user-1', role: 'LAB' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LabAutomationResolver,
        {
          provide: LabOnboardingService,
          useValue: {
            registerLab: jest.fn().mockResolvedValue({ id: 'lab-1', name: 'Apollo Lab' }),
            uploadLabDocuments: jest.fn().mockResolvedValue({}),
            reviewLab: jest.fn().mockResolvedValue({}),
            suspendLab: jest.fn().mockResolvedValue({}),
            reactivateLab: jest.fn().mockResolvedValue({}),
            deactivateLab: jest.fn().mockResolvedValue({}),
            inviteLabTechnician: jest.fn().mockResolvedValue({}),
            updateLabTechPermissions: jest.fn().mockResolvedValue({}),
            deactivateLabTechnician: jest.fn().mockResolvedValue({}),
            listLabs: jest.fn().mockResolvedValue([]),
            getLabById: jest.fn().mockResolvedValue({ id: 'lab-1' }),
          },
        },
        {
          provide: PhlebotomistOnboardingService,
          useValue: {
            registerPhlebotomist: jest.fn().mockResolvedValue({ id: 'phleb-1' }),
            uploadPhlebotomistDocuments: jest.fn().mockResolvedValue({}),
            startTraining: jest.fn().mockResolvedValue({}),
            completeTraining: jest.fn().mockResolvedValue({}),
            verifyEquipment: jest.fn().mockResolvedValue({}),
            updateBackgroundVerification: jest.fn().mockResolvedValue({}),
            activatePhlebotomist: jest.fn().mockResolvedValue({}),
            suspendPhlebotomist: jest.fn().mockResolvedValue({}),
            updateServiceableAreas: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: LabOrderCreationService,
          useValue: {
            createLabOrder: jest.fn().mockResolvedValue({ id: 'lo-1', status: 'ORDERED' }),
            autoTriggerProtocolBloodWork: jest.fn().mockResolvedValue({ id: 'lo-2', isProtocolRequired: true }),
            autoTriggerFollowUpBloodWork: jest.fn().mockResolvedValue(null),
            handlePatientUpload: jest.fn().mockResolvedValue({ id: 'lo-1', status: 'RESULTS_UPLOADED' }),
            doctorReviewUploadedResults: jest.fn().mockResolvedValue({ id: 'lo-1', status: 'DOCTOR_REVIEWED' }),
          },
        },
        {
          provide: SlotAssignmentService,
          useValue: {
            bookSlotForLabOrder: jest.fn().mockResolvedValue({ id: 'lo-1', status: 'SLOT_BOOKED' }),
            autoAssignPhlebotomist: jest.fn().mockResolvedValue({ id: 'lo-1', status: 'PHLEBOTOMIST_ASSIGNED' }),
            getAvailableSlots: jest.fn().mockResolvedValue([]),
            getDailyRoster: jest.fn().mockResolvedValue({ totalBookings: 3 }),
            cancelSlotBooking: jest.fn().mockResolvedValue({ id: 'lo-1', status: 'CANCELLED' }),
          },
        },
        {
          provide: CollectionTrackingService,
          useValue: {
            markEnRoute: jest.fn().mockResolvedValue({ id: 'lo-1', status: 'PHLEBOTOMIST_EN_ROUTE' }),
            verifyFastingStatus: jest.fn().mockResolvedValue({ patientNotFasting: false }),
            markSampleCollected: jest.fn().mockResolvedValue({ id: 'lo-1', status: 'SAMPLE_COLLECTED' }),
            markCollectionFailed: jest.fn().mockResolvedValue({ id: 'lo-1', status: 'COLLECTION_FAILED' }),
            markSampleInTransit: jest.fn().mockResolvedValue({ id: 'lo-1', status: 'SAMPLE_IN_TRANSIT' }),
            markDeliveredToLab: jest.fn().mockResolvedValue({ id: 'lo-1', status: 'DELIVERED_TO_LAB' }),
            markSampleReceived: jest.fn().mockResolvedValue({ id: 'lo-1', status: 'SAMPLE_RECEIVED' }),
          },
        },
        {
          provide: LabProcessingService,
          useValue: {
            startProcessing: jest.fn().mockResolvedValue({ id: 'lo-1', status: 'PROCESSING' }),
            uploadResult: jest.fn().mockResolvedValue({ id: 'lr-1', testCode: 'TSH', status: 'NORMAL' }),
            markResultsReady: jest.fn().mockResolvedValue({ id: 'lo-1', status: 'RESULTS_READY' }),
            reportSampleIssue: jest.fn().mockResolvedValue({ id: 'lo-1', status: 'SAMPLE_ISSUE' }),
            acknowledgeCriticalValue: jest.fn().mockResolvedValue({}),
            doctorReviewResults: jest.fn().mockResolvedValue({ id: 'lo-1', status: 'DOCTOR_REVIEWED' }),
          },
        },
        {
          provide: BiomarkerDashboardService,
          useValue: {
            getPatientBiomarkerHistory: jest.fn().mockResolvedValue([]),
            getTestTrend: jest.fn().mockResolvedValue([]),
            getLatestResults: jest.fn().mockResolvedValue([]),
            getLabOrderSummary: jest.fn().mockResolvedValue({ id: 'lo-1' }),
            getCriticalValuesSummary: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            labPhlebotomist: {
              findFirst: jest.fn().mockResolvedValue({ id: 'phleb-1', assignedLabId: 'lab-1' }),
            },
            labTechnician: {
              findFirst: jest.fn().mockResolvedValue({ id: 'labtech-1', labId: 'lab-1' }),
            },
          },
        },
      ],
    }).compile();

    resolver = module.get<LabAutomationResolver>(LabAutomationResolver);
    labOnboarding = module.get(LabOnboardingService);
    phlebOnboarding = module.get(PhlebotomistOnboardingService);
    orderCreation = module.get(LabOrderCreationService);
    slotAssignment = module.get(SlotAssignmentService);
    collectionTracking = module.get(CollectionTrackingService);
    labProcessing = module.get(LabProcessingService);
    biomarkerDashboard = module.get(BiomarkerDashboardService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  // ========================================
  // Admin endpoints
  // ========================================

  describe('Admin endpoints', () => {
    it('registerPartnerLab should delegate to labOnboarding', async () => {
      const result = await resolver.registerPartnerLab(adminUser, { name: 'Lab' });
      expect(labOnboarding.registerLab).toHaveBeenCalledWith('admin-1', { name: 'Lab' });
      expect(result).toEqual({ id: 'lab-1', name: 'Apollo Lab' });
    });

    it('registerPhlebotomist should delegate to phlebOnboarding', async () => {
      await resolver.registerPhlebotomist(adminUser, { name: 'Phleb' });
      expect(phlebOnboarding.registerPhlebotomist).toHaveBeenCalledWith('admin-1', { name: 'Phleb' });
    });

    it('reviewPartnerLab should delegate to labOnboarding', async () => {
      await resolver.reviewPartnerLab(adminUser, 'lab-1', true, 'Approved');
      expect(labOnboarding.reviewLab).toHaveBeenCalledWith('lab-1', 'admin-1', true, 'Approved');
    });

    it('suspendPartnerLab should delegate to labOnboarding', async () => {
      await resolver.suspendPartnerLab(adminUser, 'lab-1', 'License issue');
      expect(labOnboarding.suspendLab).toHaveBeenCalledWith('lab-1', 'admin-1', 'License issue');
    });

    it('triggerAutoAssignment should delegate to slotAssignment', async () => {
      await resolver.triggerAutoAssignment('lo-1');
      expect(slotAssignment.autoAssignPhlebotomist).toHaveBeenCalledWith('lo-1');
    });

    it('listPartnerLabs should delegate with filters', async () => {
      await resolver.listPartnerLabs('Hyderabad', 'ACTIVE');
      expect(labOnboarding.listLabs).toHaveBeenCalledWith({ city: 'Hyderabad', status: 'ACTIVE' });
    });
  });

  // ========================================
  // Doctor endpoints
  // ========================================

  describe('Doctor endpoints', () => {
    it('createLabOrder should delegate to orderCreation', async () => {
      await resolver.createLabOrder(
        doctorUser, 'consult-1', 'patient-1',
        ['CBC', 'TSH'], { collectionAddress: '123 Main', collectionCity: 'Hyderabad', collectionPincode: '500033', labCost: 100000 },
      );
      expect(orderCreation.createLabOrder).toHaveBeenCalledWith(
        'consult-1', 'doctor-1', 'patient-1',
        ['CBC', 'TSH'], expect.any(Object),
      );
    });

    it('autoTriggerProtocolBloodWork should delegate', async () => {
      await resolver.autoTriggerProtocolBloodWork(doctorUser, 'consult-1', 'WEIGHT_MANAGEMENT');
      expect(orderCreation.autoTriggerProtocolBloodWork).toHaveBeenCalledWith('consult-1', 'WEIGHT_MANAGEMENT');
    });

    it('doctorReviewResults should delegate', async () => {
      await resolver.doctorReviewResults(doctorUser, 'lo-1', 'All good');
      expect(labProcessing.doctorReviewResults).toHaveBeenCalledWith('lo-1', 'doctor-1', 'All good');
    });

    it('reviewUploadedResults should delegate', async () => {
      await resolver.reviewUploadedResults(doctorUser, 'lo-1', true);
      expect(orderCreation.doctorReviewUploadedResults).toHaveBeenCalledWith('lo-1', 'doctor-1', true, undefined);
    });

    it('acknowledgeCriticalValue should delegate', async () => {
      await resolver.acknowledgeCriticalValue(doctorUser, 'lo-1', 'lr-1', 'Patient contacted');
      expect(labProcessing.acknowledgeCriticalValue).toHaveBeenCalledWith('lo-1', 'lr-1', 'doctor-1', 'Patient contacted');
    });
  });

  // ========================================
  // Patient endpoints
  // ========================================

  describe('Patient endpoints', () => {
    it('bookLabSlot should delegate to slotAssignment', async () => {
      await resolver.bookLabSlot(patientUser, 'lo-1', 'slot-1');
      expect(slotAssignment.bookSlotForLabOrder).toHaveBeenCalledWith('lo-1', 'patient-1', 'slot-1');
    });

    it('cancelLabSlotBooking should delegate', async () => {
      await resolver.cancelLabSlotBooking(patientUser, 'lo-1', 'Changed plans');
      expect(slotAssignment.cancelSlotBooking).toHaveBeenCalledWith('lo-1', 'patient-1', 'Changed plans');
    });

    it('availableLabSlots should delegate', async () => {
      await resolver.availableLabSlots('500033', 'Hyderabad', '2026-03-01', '2026-03-07');
      expect(slotAssignment.getAvailableSlots).toHaveBeenCalled();
    });

    it('uploadLabResults should delegate', async () => {
      await resolver.uploadLabResults(patientUser, 'lo-1', 'https://s3.example.com/results.pdf');
      expect(orderCreation.handlePatientUpload).toHaveBeenCalledWith('lo-1', 'patient-1', 'https://s3.example.com/results.pdf');
    });

    it('myBiomarkerHistory should delegate', async () => {
      await resolver.myBiomarkerHistory(patientUser);
      expect(biomarkerDashboard.getPatientBiomarkerHistory).toHaveBeenCalledWith('patient-1');
    });

    it('myBiomarkerTrend should delegate', async () => {
      await resolver.myBiomarkerTrend(patientUser, 'TSH');
      expect(biomarkerDashboard.getTestTrend).toHaveBeenCalledWith('patient-1', 'TSH');
    });

    it('myLatestLabResults should delegate', async () => {
      await resolver.myLatestLabResults(patientUser);
      expect(biomarkerDashboard.getLatestResults).toHaveBeenCalledWith('patient-1');
    });
  });

  // ========================================
  // Phlebotomist endpoints
  // ========================================

  describe('Phlebotomist endpoints', () => {
    it('markEnRoute should resolve phlebotomist and delegate', async () => {
      await resolver.markEnRoute(phlebUser, 'lo-1');
      expect(collectionTracking.markEnRoute).toHaveBeenCalled();
    });

    it('verifyFastingStatus should delegate', async () => {
      await resolver.verifyFastingStatus(phlebUser, 'lo-1', true);
      expect(collectionTracking.verifyFastingStatus).toHaveBeenCalled();
    });

    it('markSampleCollected should delegate with tube count', async () => {
      await resolver.markSampleCollected(phlebUser, 'lo-1', 3);
      expect(collectionTracking.markSampleCollected).toHaveBeenCalled();
    });

    it('markCollectionFailed should delegate', async () => {
      await resolver.markCollectionFailed(phlebUser, 'lo-1', 'Patient not home');
      expect(collectionTracking.markCollectionFailed).toHaveBeenCalled();
    });

    it('markSampleInTransit should delegate', async () => {
      await resolver.markSampleInTransit(phlebUser, 'lo-1');
      expect(collectionTracking.markSampleInTransit).toHaveBeenCalled();
    });

    it('markDeliveredToLab should delegate', async () => {
      await resolver.markDeliveredToLab(phlebUser, 'lo-1', 3);
      expect(collectionTracking.markDeliveredToLab).toHaveBeenCalled();
    });

    it('myDailyRoster should delegate', async () => {
      await resolver.myDailyRoster(phlebUser, '2026-03-01');
      expect(slotAssignment.getDailyRoster).toHaveBeenCalled();
    });
  });

  // ========================================
  // Lab Technician endpoints
  // ========================================

  describe('Lab Technician endpoints', () => {
    it('markSampleReceived should resolve lab tech and delegate', async () => {
      await resolver.markSampleReceived(labUser, 'lo-1', 3);
      expect(collectionTracking.markSampleReceived).toHaveBeenCalled();
    });

    it('startLabProcessing should delegate', async () => {
      await resolver.startLabProcessing(labUser, 'lo-1');
      expect(labProcessing.startProcessing).toHaveBeenCalled();
    });

    it('uploadLabResult should delegate', async () => {
      await resolver.uploadLabResult(labUser, 'lo-1', {
        testCode: 'TSH',
        testName: 'TSH',
        value: 2.5,
        unit: 'mIU/L',
        referenceRangeMin: 0.4,
        referenceRangeMax: 4.0,
      });
      expect(labProcessing.uploadResult).toHaveBeenCalled();
    });

    it('markLabResultsReady should delegate', async () => {
      await resolver.markLabResultsReady(labUser, 'lo-1');
      expect(labProcessing.markResultsReady).toHaveBeenCalled();
    });

    it('reportSampleIssue should delegate', async () => {
      await resolver.reportSampleIssue(labUser, 'lo-1', 'hemolyzed');
      expect(labProcessing.reportSampleIssue).toHaveBeenCalled();
    });
  });
});
