import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LabProcessingService } from './lab-processing.service';
import { PrismaService } from '../prisma/prisma.service';
import { LabOrderStatus } from './lab-order.service';

// Spec: master spec Section 7.2 Steps 5-9 (Lab Processing & Results)

describe('LabProcessingService', () => {
  let service: LabProcessingService;
  let mockPrismaService: any;

  const mockLabOrder = {
    id: 'lab-order-1',
    patientId: 'patient-1',
    consultationId: 'consultation-1',
    doctorId: 'doctor-1',
    testPanel: ['TSH', 'CBC', 'Ferritin'],
    panelName: 'Hair Loss Basic Panel',
    status: LabOrderStatus.DELIVERED_TO_LAB,
    tubeCount: 3,
    collectionAddress: '123 Main St',
    collectionCity: 'Mumbai',
    collectionPincode: '400001',
    orderedAt: new Date(),
    deliveredToLabAt: new Date(),
    diagnosticCentreId: 'lab-1',
    labCost: 99900,
    patientCharge: 0,
    coveredBySubscription: true,
  };

  const mockLab = {
    id: 'lab-1',
    name: 'Test Diagnostic Centre',
    city: 'Mumbai',
    isActive: true,
    phone: '+919999999999',
  };

  beforeEach(async () => {
    mockPrismaService = {
      labOrder: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      partnerDiagnosticCentre: {
        findUnique: jest.fn(),
      },
      phlebotomist: {
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LabProcessingService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<LabProcessingService>(LabProcessingService);
  });

  describe('Service Setup', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  // ============================================
  // SAMPLE RECEIVED
  // Spec: Section 7.2 Step 5 — Lab Receives Sample
  // ============================================
  describe('markSampleReceived', () => {
    it('should mark sample as received with tube count confirmation', async () => {
      const deliveredOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.DELIVERED_TO_LAB,
      };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(deliveredOrder);
      mockPrismaService.partnerDiagnosticCentre.findUnique.mockResolvedValue(mockLab);
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...deliveredOrder,
        status: LabOrderStatus.SAMPLE_RECEIVED,
        sampleReceivedAt: expect.any(Date),
        receivedTubeCount: 3,
      });

      const result = await service.markSampleReceived({
        labOrderId: 'lab-order-1',
        labId: 'lab-1',
        receivedTubeCount: 3,
      });

      expect(result.status).toBe(LabOrderStatus.SAMPLE_RECEIVED);
      expect(mockPrismaService.labOrder.update).toHaveBeenCalledWith({
        where: { id: 'lab-order-1' },
        data: expect.objectContaining({
          status: LabOrderStatus.SAMPLE_RECEIVED,
          sampleReceivedAt: expect.any(Date),
          receivedTubeCount: 3,
        }),
      });
    });

    it('should throw error if lab order not found', async () => {
      mockPrismaService.labOrder.findUnique.mockResolvedValue(null);

      await expect(
        service.markSampleReceived({
          labOrderId: 'non-existent',
          labId: 'lab-1',
          receivedTubeCount: 3,
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error if lab is not assigned to this order', async () => {
      const orderWithDifferentLab = {
        ...mockLabOrder,
        diagnosticCentreId: 'different-lab',
      };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(orderWithDifferentLab);

      await expect(
        service.markSampleReceived({
          labOrderId: 'lab-order-1',
          labId: 'lab-1',
          receivedTubeCount: 3,
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if order not in DELIVERED_TO_LAB status', async () => {
      const wrongStatusOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.SLOT_BOOKED,
      };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(wrongStatusOrder);

      await expect(
        service.markSampleReceived({
          labOrderId: 'lab-order-1',
          labId: 'lab-1',
          receivedTubeCount: 3,
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should flag tube count mismatch if received differs from collected', async () => {
      const deliveredOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.DELIVERED_TO_LAB,
        tubeCount: 3,
      };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(deliveredOrder);
      mockPrismaService.partnerDiagnosticCentre.findUnique.mockResolvedValue(mockLab);
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...deliveredOrder,
        status: LabOrderStatus.SAMPLE_RECEIVED,
        receivedTubeCount: 2,
        tubeCountMismatch: true,
      });

      const result = await service.markSampleReceived({
        labOrderId: 'lab-order-1',
        labId: 'lab-1',
        receivedTubeCount: 2,
      });

      expect(mockPrismaService.labOrder.update).toHaveBeenCalledWith({
        where: { id: 'lab-order-1' },
        data: expect.objectContaining({
          receivedTubeCount: 2,
          tubeCountMismatch: true,
        }),
      });
    });
  });

  // ============================================
  // SAMPLE ISSUE
  // Spec: Section 7.2 Step 5b — Lab Reports Issue
  // ============================================
  describe('reportSampleIssue', () => {
    it('should mark sample as having issue with reason', async () => {
      const receivedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.SAMPLE_RECEIVED,
      };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(receivedOrder);
      mockPrismaService.partnerDiagnosticCentre.findUnique.mockResolvedValue(mockLab);
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...receivedOrder,
        status: LabOrderStatus.SAMPLE_ISSUE,
        sampleIssueAt: expect.any(Date),
        sampleIssueReason: 'Hemolysis detected',
      });
      mockPrismaService.labOrder.create.mockResolvedValue({
        id: 'recollection-order-1',
        parentLabOrderId: 'lab-order-1',
        isFreeRecollection: true,
      });

      const result = await service.reportSampleIssue({
        labOrderId: 'lab-order-1',
        labId: 'lab-1',
        reason: 'Hemolysis detected',
      });

      expect(result.status).toBe(LabOrderStatus.SAMPLE_ISSUE);
      expect(mockPrismaService.labOrder.update).toHaveBeenCalledWith({
        where: { id: 'lab-order-1' },
        data: expect.objectContaining({
          status: LabOrderStatus.SAMPLE_ISSUE,
          sampleIssueAt: expect.any(Date),
          sampleIssueReason: 'Hemolysis detected',
        }),
      });
    });

    it('should auto-create free recollection order on sample issue', async () => {
      const receivedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.SAMPLE_RECEIVED,
      };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(receivedOrder);
      mockPrismaService.partnerDiagnosticCentre.findUnique.mockResolvedValue(mockLab);
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...receivedOrder,
        status: LabOrderStatus.SAMPLE_ISSUE,
      });
      mockPrismaService.labOrder.create.mockResolvedValue({
        id: 'recollection-order-1',
        parentLabOrderId: 'lab-order-1',
        isFreeRecollection: true,
        status: LabOrderStatus.ORDERED,
      });

      const result = await service.reportSampleIssue({
        labOrderId: 'lab-order-1',
        labId: 'lab-1',
        reason: 'Sample clotted',
      });

      expect(mockPrismaService.labOrder.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          parentLabOrderId: 'lab-order-1',
          isFreeRecollection: true,
          patientCharge: 0,
          status: LabOrderStatus.ORDERED,
        }),
      });
      expect(result.recollectionOrderId).toBeDefined();
    });

    it('should throw error if order not in SAMPLE_RECEIVED or DELIVERED_TO_LAB status', async () => {
      const wrongStatusOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.PROCESSING,
      };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(wrongStatusOrder);

      await expect(
        service.reportSampleIssue({
          labOrderId: 'lab-order-1',
          labId: 'lab-1',
          reason: 'Contaminated',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if lab is not assigned to this order', async () => {
      const orderWithDifferentLab = {
        ...mockLabOrder,
        status: LabOrderStatus.SAMPLE_RECEIVED,
        diagnosticCentreId: 'different-lab',
      };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(orderWithDifferentLab);

      await expect(
        service.reportSampleIssue({
          labOrderId: 'lab-order-1',
          labId: 'lab-1',
          reason: 'Lipemic',
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // PROCESSING STARTED
  // Spec: Section 7.2 Step 6 — Lab Starts Processing
  // ============================================
  describe('startProcessing', () => {
    it('should mark order as processing started', async () => {
      const receivedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.SAMPLE_RECEIVED,
      };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(receivedOrder);
      mockPrismaService.partnerDiagnosticCentre.findUnique.mockResolvedValue(mockLab);
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...receivedOrder,
        status: LabOrderStatus.PROCESSING,
        processingStartedAt: expect.any(Date),
      });

      const result = await service.startProcessing({
        labOrderId: 'lab-order-1',
        labId: 'lab-1',
      });

      expect(result.status).toBe(LabOrderStatus.PROCESSING);
      expect(mockPrismaService.labOrder.update).toHaveBeenCalledWith({
        where: { id: 'lab-order-1' },
        data: expect.objectContaining({
          status: LabOrderStatus.PROCESSING,
          processingStartedAt: expect.any(Date),
        }),
      });
    });

    it('should throw error if order not in SAMPLE_RECEIVED status', async () => {
      const wrongStatusOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.DELIVERED_TO_LAB,
      };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(wrongStatusOrder);

      await expect(
        service.startProcessing({
          labOrderId: 'lab-order-1',
          labId: 'lab-1',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if lab is not assigned to this order', async () => {
      const orderWithDifferentLab = {
        ...mockLabOrder,
        status: LabOrderStatus.SAMPLE_RECEIVED,
        diagnosticCentreId: 'different-lab',
      };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(orderWithDifferentLab);

      await expect(
        service.startProcessing({
          labOrderId: 'lab-order-1',
          labId: 'lab-1',
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // RESULTS UPLOAD BY LAB
  // Spec: Section 7.2 Step 7 — Lab Uploads Results
  // ============================================
  describe('uploadResults', () => {
    it('should upload results with normal flags', async () => {
      const processingOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.PROCESSING,
      };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(processingOrder);
      mockPrismaService.partnerDiagnosticCentre.findUnique.mockResolvedValue(mockLab);
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...processingOrder,
        status: LabOrderStatus.RESULTS_READY,
        resultFileUrl: 'https://s3.amazonaws.com/results/lab-order-1.pdf',
        abnormalFlags: { TSH: 'NORMAL', CBC: 'NORMAL', Ferritin: 'NORMAL' },
        criticalValues: false,
        resultsUploadedAt: expect.any(Date),
      });

      const result = await service.uploadResults({
        labOrderId: 'lab-order-1',
        labId: 'lab-1',
        resultFileUrl: 'https://s3.amazonaws.com/results/lab-order-1.pdf',
        abnormalFlags: { TSH: 'NORMAL', CBC: 'NORMAL', Ferritin: 'NORMAL' },
      });

      expect(result.status).toBe(LabOrderStatus.RESULTS_READY);
      expect(result.criticalValues).toBe(false);
      expect(mockPrismaService.labOrder.update).toHaveBeenCalledWith({
        where: { id: 'lab-order-1' },
        data: expect.objectContaining({
          status: LabOrderStatus.RESULTS_READY,
          resultFileUrl: 'https://s3.amazonaws.com/results/lab-order-1.pdf',
          abnormalFlags: { TSH: 'NORMAL', CBC: 'NORMAL', Ferritin: 'NORMAL' },
          criticalValues: false,
          resultsUploadedAt: expect.any(Date),
        }),
      });
    });

    it('should upload results with abnormal flags', async () => {
      const processingOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.PROCESSING,
      };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(processingOrder);
      mockPrismaService.partnerDiagnosticCentre.findUnique.mockResolvedValue(mockLab);
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...processingOrder,
        status: LabOrderStatus.RESULTS_READY,
        resultFileUrl: 'https://s3.amazonaws.com/results/lab-order-1.pdf',
        abnormalFlags: { TSH: 'HIGH', CBC: 'NORMAL', Ferritin: 'LOW' },
        criticalValues: false,
      });

      const result = await service.uploadResults({
        labOrderId: 'lab-order-1',
        labId: 'lab-1',
        resultFileUrl: 'https://s3.amazonaws.com/results/lab-order-1.pdf',
        abnormalFlags: { TSH: 'HIGH', CBC: 'NORMAL', Ferritin: 'LOW' },
      });

      expect(mockPrismaService.labOrder.update).toHaveBeenCalledWith({
        where: { id: 'lab-order-1' },
        data: expect.objectContaining({
          abnormalFlags: { TSH: 'HIGH', CBC: 'NORMAL', Ferritin: 'LOW' },
          criticalValues: false,
        }),
      });
    });

    it('should detect and flag critical values', async () => {
      const processingOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.PROCESSING,
      };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(processingOrder);
      mockPrismaService.partnerDiagnosticCentre.findUnique.mockResolvedValue(mockLab);
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...processingOrder,
        status: LabOrderStatus.RESULTS_READY,
        abnormalFlags: { TSH: 'CRITICAL', CBC: 'NORMAL', Ferritin: 'NORMAL' },
        criticalValues: true,
      });

      const result = await service.uploadResults({
        labOrderId: 'lab-order-1',
        labId: 'lab-1',
        resultFileUrl: 'https://s3.amazonaws.com/results/lab-order-1.pdf',
        abnormalFlags: { TSH: 'CRITICAL', CBC: 'NORMAL', Ferritin: 'NORMAL' },
      });

      expect(result.criticalValues).toBe(true);
      expect(mockPrismaService.labOrder.update).toHaveBeenCalledWith({
        where: { id: 'lab-order-1' },
        data: expect.objectContaining({
          criticalValues: true,
        }),
      });
    });

    it('should detect critical when any flag is CRITICAL', async () => {
      const processingOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.PROCESSING,
        testPanel: ['TSH', 'CBC', 'Ferritin', 'Vitamin_D', 'HbA1c'],
      };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(processingOrder);
      mockPrismaService.partnerDiagnosticCentre.findUnique.mockResolvedValue(mockLab);
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...processingOrder,
        status: LabOrderStatus.RESULTS_READY,
        criticalValues: true,
      });

      await service.uploadResults({
        labOrderId: 'lab-order-1',
        labId: 'lab-1',
        resultFileUrl: 'https://s3.amazonaws.com/results/lab-order-1.pdf',
        abnormalFlags: {
          TSH: 'NORMAL',
          CBC: 'HIGH',
          Ferritin: 'LOW',
          Vitamin_D: 'CRITICAL',
          HbA1c: 'NORMAL',
        },
      });

      expect(mockPrismaService.labOrder.update).toHaveBeenCalledWith({
        where: { id: 'lab-order-1' },
        data: expect.objectContaining({
          criticalValues: true,
        }),
      });
    });

    it('should throw error if order not in PROCESSING status', async () => {
      const wrongStatusOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.SAMPLE_RECEIVED,
      };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(wrongStatusOrder);

      await expect(
        service.uploadResults({
          labOrderId: 'lab-order-1',
          labId: 'lab-1',
          resultFileUrl: 'https://s3.amazonaws.com/results/lab-order-1.pdf',
          abnormalFlags: { TSH: 'NORMAL' },
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if lab is not assigned to this order', async () => {
      const orderWithDifferentLab = {
        ...mockLabOrder,
        status: LabOrderStatus.PROCESSING,
        diagnosticCentreId: 'different-lab',
      };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(orderWithDifferentLab);

      await expect(
        service.uploadResults({
          labOrderId: 'lab-order-1',
          labId: 'lab-1',
          resultFileUrl: 'https://s3.amazonaws.com/results/lab-order-1.pdf',
          abnormalFlags: { TSH: 'NORMAL' },
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if result file URL is not provided', async () => {
      const processingOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.PROCESSING,
      };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(processingOrder);
      mockPrismaService.partnerDiagnosticCentre.findUnique.mockResolvedValue(mockLab);

      await expect(
        service.uploadResults({
          labOrderId: 'lab-order-1',
          labId: 'lab-1',
          resultFileUrl: '',
          abnormalFlags: { TSH: 'NORMAL' },
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if abnormal flags are not provided', async () => {
      const processingOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.PROCESSING,
      };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(processingOrder);
      mockPrismaService.partnerDiagnosticCentre.findUnique.mockResolvedValue(mockLab);

      await expect(
        service.uploadResults({
          labOrderId: 'lab-order-1',
          labId: 'lab-1',
          resultFileUrl: 'https://s3.amazonaws.com/results/lab-order-1.pdf',
          abnormalFlags: {},
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // PATIENT SELF-UPLOAD
  // Spec: Section 7.2 — Patient Self-Upload Path
  // ============================================
  describe('uploadPatientResults', () => {
    it('should allow patient to upload their own results', async () => {
      const orderedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.ORDERED,
      };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(orderedOrder);
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...orderedOrder,
        status: LabOrderStatus.RESULTS_UPLOADED,
        patientUploadedResults: true,
        patientUploadedFileUrl: 'https://s3.amazonaws.com/results/patient-upload.pdf',
        resultsUploadedAt: expect.any(Date),
      });

      const result = await service.uploadPatientResults({
        labOrderId: 'lab-order-1',
        patientId: 'patient-1',
        fileUrl: 'https://s3.amazonaws.com/results/patient-upload.pdf',
      });

      expect(result.status).toBe(LabOrderStatus.RESULTS_UPLOADED);
      expect(result.patientUploadedResults).toBe(true);
      expect(mockPrismaService.labOrder.update).toHaveBeenCalledWith({
        where: { id: 'lab-order-1' },
        data: expect.objectContaining({
          status: LabOrderStatus.RESULTS_UPLOADED,
          patientUploadedResults: true,
          patientUploadedFileUrl: 'https://s3.amazonaws.com/results/patient-upload.pdf',
          resultsUploadedAt: expect.any(Date),
        }),
      });
    });

    it('should throw error if patient does not own this order', async () => {
      const orderWithDifferentPatient = {
        ...mockLabOrder,
        patientId: 'different-patient',
        status: LabOrderStatus.ORDERED,
      };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(orderWithDifferentPatient);

      await expect(
        service.uploadPatientResults({
          labOrderId: 'lab-order-1',
          patientId: 'patient-1',
          fileUrl: 'https://s3.amazonaws.com/results/patient-upload.pdf',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if order not in uploadable status', async () => {
      const closedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.CLOSED,
      };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(closedOrder);

      await expect(
        service.uploadPatientResults({
          labOrderId: 'lab-order-1',
          patientId: 'patient-1',
          fileUrl: 'https://s3.amazonaws.com/results/patient-upload.pdf',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow upload when status is ORDERED', async () => {
      const orderedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.ORDERED,
      };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(orderedOrder);
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...orderedOrder,
        status: LabOrderStatus.RESULTS_UPLOADED,
      });

      const result = await service.uploadPatientResults({
        labOrderId: 'lab-order-1',
        patientId: 'patient-1',
        fileUrl: 'https://s3.amazonaws.com/results/patient-upload.pdf',
      });

      expect(result.status).toBe(LabOrderStatus.RESULTS_UPLOADED);
    });
  });

  // ============================================
  // DOCTOR REVIEW
  // Spec: Section 7.2 Step 8 — Doctor Reviews Results
  // ============================================
  describe('doctorReviewResults', () => {
    it('should allow doctor to review results from lab', async () => {
      const resultsReadyOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.RESULTS_READY,
      };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(resultsReadyOrder);
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...resultsReadyOrder,
        status: LabOrderStatus.DOCTOR_REVIEWED,
        doctorReviewedAt: expect.any(Date),
      });

      const result = await service.doctorReviewResults({
        labOrderId: 'lab-order-1',
        doctorId: 'doctor-1',
        reviewNotes: 'TSH levels within normal range. Continue current treatment.',
      });

      expect(result.status).toBe(LabOrderStatus.DOCTOR_REVIEWED);
      expect(mockPrismaService.labOrder.update).toHaveBeenCalledWith({
        where: { id: 'lab-order-1' },
        data: expect.objectContaining({
          status: LabOrderStatus.DOCTOR_REVIEWED,
          doctorReviewedAt: expect.any(Date),
        }),
      });
    });

    it('should allow doctor to review patient-uploaded results', async () => {
      const uploadedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.RESULTS_UPLOADED,
        patientUploadedResults: true,
      };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(uploadedOrder);
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...uploadedOrder,
        status: LabOrderStatus.DOCTOR_REVIEWED,
      });

      const result = await service.doctorReviewResults({
        labOrderId: 'lab-order-1',
        doctorId: 'doctor-1',
        reviewNotes: 'Reviewed patient-uploaded results.',
      });

      expect(result.status).toBe(LabOrderStatus.DOCTOR_REVIEWED);
    });

    it('should throw error if doctor is not assigned to consultation', async () => {
      const orderWithDifferentDoctor = {
        ...mockLabOrder,
        doctorId: 'different-doctor',
        status: LabOrderStatus.RESULTS_READY,
      };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(orderWithDifferentDoctor);

      await expect(
        service.doctorReviewResults({
          labOrderId: 'lab-order-1',
          doctorId: 'doctor-1',
          reviewNotes: 'Review notes',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if order not in RESULTS_READY or RESULTS_UPLOADED status', async () => {
      const wrongStatusOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.PROCESSING,
      };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(wrongStatusOrder);

      await expect(
        service.doctorReviewResults({
          labOrderId: 'lab-order-1',
          doctorId: 'doctor-1',
          reviewNotes: 'Review notes',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should store doctor review notes', async () => {
      const resultsReadyOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.RESULTS_READY,
      };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(resultsReadyOrder);
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...resultsReadyOrder,
        status: LabOrderStatus.DOCTOR_REVIEWED,
        doctorReviewNotes: 'All values normal. No concerns.',
      });

      await service.doctorReviewResults({
        labOrderId: 'lab-order-1',
        doctorId: 'doctor-1',
        reviewNotes: 'All values normal. No concerns.',
      });

      expect(mockPrismaService.labOrder.update).toHaveBeenCalledWith({
        where: { id: 'lab-order-1' },
        data: expect.objectContaining({
          doctorReviewNotes: 'All values normal. No concerns.',
        }),
      });
    });
  });

  // ============================================
  // CLOSE ORDER
  // Spec: Section 7.2 Step 9 — Close Lab Order
  // ============================================
  describe('closeLabOrder', () => {
    it('should close lab order after doctor review', async () => {
      const reviewedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.DOCTOR_REVIEWED,
      };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(reviewedOrder);
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...reviewedOrder,
        status: LabOrderStatus.CLOSED,
        closedAt: expect.any(Date),
      });

      const result = await service.closeLabOrder({
        labOrderId: 'lab-order-1',
        doctorId: 'doctor-1',
      });

      expect(result.status).toBe(LabOrderStatus.CLOSED);
      expect(mockPrismaService.labOrder.update).toHaveBeenCalledWith({
        where: { id: 'lab-order-1' },
        data: expect.objectContaining({
          status: LabOrderStatus.CLOSED,
          closedAt: expect.any(Date),
        }),
      });
    });

    it('should throw error if order not in DOCTOR_REVIEWED status', async () => {
      const wrongStatusOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.RESULTS_READY,
      };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(wrongStatusOrder);

      await expect(
        service.closeLabOrder({
          labOrderId: 'lab-order-1',
          doctorId: 'doctor-1',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if doctor is not assigned to consultation', async () => {
      const orderWithDifferentDoctor = {
        ...mockLabOrder,
        doctorId: 'different-doctor',
        status: LabOrderStatus.DOCTOR_REVIEWED,
      };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(orderWithDifferentDoctor);

      await expect(
        service.closeLabOrder({
          labOrderId: 'lab-order-1',
          doctorId: 'doctor-1',
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // GET LAB ORDERS FOR LAB
  // ============================================
  describe('getLabOrdersForLab', () => {
    it('should return all orders assigned to a lab', async () => {
      const orders = [
        { ...mockLabOrder, id: 'order-1' },
        { ...mockLabOrder, id: 'order-2' },
      ];
      mockPrismaService.labOrder.findMany.mockResolvedValue(orders);

      const result = await service.getLabOrdersForLab({
        labId: 'lab-1',
      });

      expect(result).toHaveLength(2);
      expect(mockPrismaService.labOrder.findMany).toHaveBeenCalledWith({
        where: { diagnosticCentreId: 'lab-1' },
        orderBy: { orderedAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('should filter by status if provided', async () => {
      const orders = [{ ...mockLabOrder, status: LabOrderStatus.PROCESSING }];
      mockPrismaService.labOrder.findMany.mockResolvedValue(orders);

      const result = await service.getLabOrdersForLab({
        labId: 'lab-1',
        status: LabOrderStatus.PROCESSING,
      });

      expect(mockPrismaService.labOrder.findMany).toHaveBeenCalledWith({
        where: {
          diagnosticCentreId: 'lab-1',
          status: LabOrderStatus.PROCESSING,
        },
        orderBy: { orderedAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('should filter by date range if provided', async () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-31');
      mockPrismaService.labOrder.findMany.mockResolvedValue([]);

      await service.getLabOrdersForLab({
        labId: 'lab-1',
        startDate,
        endDate,
      });

      expect(mockPrismaService.labOrder.findMany).toHaveBeenCalledWith({
        where: {
          diagnosticCentreId: 'lab-1',
          orderedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { orderedAt: 'desc' },
        include: expect.any(Object),
      });
    });
  });

  // ============================================
  // GET PENDING RESULTS
  // ============================================
  describe('getPendingResults', () => {
    it('should return orders awaiting doctor review', async () => {
      const orders = [
        { ...mockLabOrder, status: LabOrderStatus.RESULTS_READY },
        { ...mockLabOrder, status: LabOrderStatus.RESULTS_UPLOADED },
      ];
      mockPrismaService.labOrder.findMany.mockResolvedValue(orders);

      const result = await service.getPendingResults({
        doctorId: 'doctor-1',
      });

      expect(mockPrismaService.labOrder.findMany).toHaveBeenCalledWith({
        where: {
          doctorId: 'doctor-1',
          status: {
            in: [LabOrderStatus.RESULTS_READY, LabOrderStatus.RESULTS_UPLOADED],
          },
        },
        orderBy: expect.any(Object),
        include: expect.any(Object),
      });
    });

    it('should prioritize critical values first', async () => {
      mockPrismaService.labOrder.findMany.mockResolvedValue([]);

      await service.getPendingResults({
        doctorId: 'doctor-1',
      });

      expect(mockPrismaService.labOrder.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        orderBy: [{ criticalValues: 'desc' }, { resultsUploadedAt: 'asc' }],
        include: expect.any(Object),
      });
    });
  });

  // ============================================
  // MARK SAMPLE COLLECTED (phlebotomist)
  // ============================================
  describe('markSampleCollected', () => {
    it('should allow phlebotomist to mark sample as collected', async () => {
      const assignedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED,
        phlebotomistId: 'phlebotomist-1',
      };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(assignedOrder);
      mockPrismaService.phlebotomist.update.mockResolvedValue({});
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...assignedOrder,
        status: LabOrderStatus.SAMPLE_COLLECTED,
        sampleCollectedAt: expect.any(Date),
        tubeCount: 3,
      });

      const result = await service.markSampleCollected({
        labOrderId: 'lab-order-1',
        phlebotomistId: 'phlebotomist-1',
        tubeCount: 3,
      });

      expect(result.status).toBe(LabOrderStatus.SAMPLE_COLLECTED);
      expect(mockPrismaService.labOrder.update).toHaveBeenCalledWith({
        where: { id: 'lab-order-1' },
        data: expect.objectContaining({
          status: LabOrderStatus.SAMPLE_COLLECTED,
          sampleCollectedAt: expect.any(Date),
          tubeCount: 3,
        }),
      });
    });

    it('should increment phlebotomist completed collections', async () => {
      const assignedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED,
        phlebotomistId: 'phlebotomist-1',
      };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(assignedOrder);
      mockPrismaService.phlebotomist.update.mockResolvedValue({});
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...assignedOrder,
        status: LabOrderStatus.SAMPLE_COLLECTED,
      });

      await service.markSampleCollected({
        labOrderId: 'lab-order-1',
        phlebotomistId: 'phlebotomist-1',
        tubeCount: 3,
      });

      expect(mockPrismaService.phlebotomist.update).toHaveBeenCalledWith({
        where: { id: 'phlebotomist-1' },
        data: { completedCollections: { increment: 1 } },
      });
    });

    it('should throw error if phlebotomist is not assigned to this order', async () => {
      const orderWithDifferentPhlebotomist = {
        ...mockLabOrder,
        status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED,
        phlebotomistId: 'different-phlebotomist',
      };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(orderWithDifferentPhlebotomist);

      await expect(
        service.markSampleCollected({
          labOrderId: 'lab-order-1',
          phlebotomistId: 'phlebotomist-1',
          tubeCount: 3,
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if order not in PHLEBOTOMIST_ASSIGNED status', async () => {
      const wrongStatusOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.SLOT_BOOKED,
        phlebotomistId: 'phlebotomist-1',
      };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(wrongStatusOrder);

      await expect(
        service.markSampleCollected({
          labOrderId: 'lab-order-1',
          phlebotomistId: 'phlebotomist-1',
          tubeCount: 3,
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should require tube count to be positive', async () => {
      const assignedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED,
        phlebotomistId: 'phlebotomist-1',
      };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(assignedOrder);

      await expect(
        service.markSampleCollected({
          labOrderId: 'lab-order-1',
          phlebotomistId: 'phlebotomist-1',
          tubeCount: 0,
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // DELIVER TO LAB (phlebotomist)
  // ============================================
  describe('deliverToLab', () => {
    it('should allow phlebotomist to mark delivery to lab', async () => {
      const collectedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.SAMPLE_COLLECTED,
        phlebotomistId: 'phlebotomist-1',
      };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(collectedOrder);
      mockPrismaService.partnerDiagnosticCentre.findUnique.mockResolvedValue(mockLab);
      mockPrismaService.labOrder.update.mockResolvedValue({
        ...collectedOrder,
        status: LabOrderStatus.DELIVERED_TO_LAB,
        deliveredToLabAt: expect.any(Date),
        diagnosticCentreId: 'lab-1',
      });

      const result = await service.deliverToLab({
        labOrderId: 'lab-order-1',
        phlebotomistId: 'phlebotomist-1',
        labId: 'lab-1',
      });

      expect(result.status).toBe(LabOrderStatus.DELIVERED_TO_LAB);
      expect(mockPrismaService.labOrder.update).toHaveBeenCalledWith({
        where: { id: 'lab-order-1' },
        data: expect.objectContaining({
          status: LabOrderStatus.DELIVERED_TO_LAB,
          deliveredToLabAt: expect.any(Date),
          diagnosticCentreId: 'lab-1',
        }),
      });
    });

    it('should throw error if phlebotomist is not assigned', async () => {
      const orderWithDifferentPhlebotomist = {
        ...mockLabOrder,
        status: LabOrderStatus.SAMPLE_COLLECTED,
        phlebotomistId: 'different-phlebotomist',
      };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(orderWithDifferentPhlebotomist);

      await expect(
        service.deliverToLab({
          labOrderId: 'lab-order-1',
          phlebotomistId: 'phlebotomist-1',
          labId: 'lab-1',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if order not in SAMPLE_COLLECTED status', async () => {
      const wrongStatusOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.PHLEBOTOMIST_ASSIGNED,
        phlebotomistId: 'phlebotomist-1',
      };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(wrongStatusOrder);

      await expect(
        service.deliverToLab({
          labOrderId: 'lab-order-1',
          phlebotomistId: 'phlebotomist-1',
          labId: 'lab-1',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if lab does not exist', async () => {
      const collectedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.SAMPLE_COLLECTED,
        phlebotomistId: 'phlebotomist-1',
      };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(collectedOrder);
      mockPrismaService.partnerDiagnosticCentre.findUnique.mockResolvedValue(null);

      await expect(
        service.deliverToLab({
          labOrderId: 'lab-order-1',
          phlebotomistId: 'phlebotomist-1',
          labId: 'non-existent',
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error if lab is not active', async () => {
      const collectedOrder = {
        ...mockLabOrder,
        status: LabOrderStatus.SAMPLE_COLLECTED,
        phlebotomistId: 'phlebotomist-1',
      };
      mockPrismaService.labOrder.findUnique.mockResolvedValue(collectedOrder);
      mockPrismaService.partnerDiagnosticCentre.findUnique.mockResolvedValue({
        ...mockLab,
        isActive: false,
      });

      await expect(
        service.deliverToLab({
          labOrderId: 'lab-order-1',
          phlebotomistId: 'phlebotomist-1',
          labId: 'lab-1',
        })
      ).rejects.toThrow(BadRequestException);
    });
  });
});
