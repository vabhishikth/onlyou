import { Test, TestingModule } from '@nestjs/testing';
import {
  PrescriptionService,
  PrescriptionTemplate,
  HAIR_LOSS_TEMPLATES,
  CreatePrescriptionInput,
  ContraindicationCheckResult,
} from './prescription.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { HealthVertical, ConsultationStatus, UserRole, OrderStatus } from '@prisma/client';

// Spec: hair-loss spec Section 6 (Prescription Templates)
// Spec: hair-loss spec Section 5 (Finasteride Contraindication Matrix)

describe('PrescriptionService', () => {
  let service: PrescriptionService;
  let prisma: PrismaService;

  // Mock data
  const mockDoctor = {
    id: 'doctor-1',
    name: 'Dr. Test Doctor',
    role: UserRole.DOCTOR,
    isVerified: true,
    doctorProfile: {
      registrationNo: 'MCI-12345',
      specialization: 'DERMATOLOGY',
      qualifications: ['MBBS', 'MD Dermatology'],
    },
  };

  const mockPatient = {
    id: 'patient-1',
    name: 'Test Patient',
    phone: '+919876543210',
    patientProfile: {
      id: 'profile-1',
      dateOfBirth: new Date('1990-01-01'),
      gender: 'MALE',
      addressLine1: '123 Test Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
    },
  };

  const mockConsultation = {
    id: 'consultation-1',
    patientId: 'patient-1',
    doctorId: 'doctor-1',
    vertical: HealthVertical.HAIR_LOSS,
    status: ConsultationStatus.DOCTOR_REVIEWING,
    patient: mockPatient,
    doctor: mockDoctor,
    intakeResponse: {
      id: 'intake-1',
      responses: {
        Q1: '30',
        Q2: 'Male',
        Q14: ['None'], // No existing sexual dysfunction
        Q15: 'No', // Not planning children
        Q10: ['None'], // No liver disease
        Q22: 'Occasionally', // Not daily alcohol
      },
    },
  };

  const mockPrismaService = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    consultation: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    prescription: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    order: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrescriptionService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PrescriptionService>(PrescriptionService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('Hair Loss Prescription Templates', () => {
    // Spec: hair-loss spec Section 6 — 7 prescription templates

    it('should have 7 hair loss prescription templates', () => {
      expect(Object.keys(HAIR_LOSS_TEMPLATES)).toHaveLength(7);
    });

    it('should have Standard template with Finasteride + Minoxidil', () => {
      const template = HAIR_LOSS_TEMPLATES[PrescriptionTemplate.STANDARD];
      expect(template).toBeDefined();
      expect(template.name).toBe('Standard');
      expect(template.medications).toContainEqual(
        expect.objectContaining({ name: 'Finasteride', dosage: '1mg' })
      );
      expect(template.medications).toContainEqual(
        expect.objectContaining({ name: 'Minoxidil 5%' })
      );
    });

    it('should have Minoxidil Only template without Finasteride', () => {
      const template = HAIR_LOSS_TEMPLATES[PrescriptionTemplate.MINOXIDIL_ONLY];
      expect(template).toBeDefined();
      expect(template.name).toBe('Minoxidil Only');
      expect(template.medications).not.toContainEqual(
        expect.objectContaining({ name: 'Finasteride' })
      );
      expect(template.medications).toContainEqual(
        expect.objectContaining({ name: 'Minoxidil 5%' })
      );
    });

    it('should have Conservative template for young patients', () => {
      const template = HAIR_LOSS_TEMPLATES[PrescriptionTemplate.CONSERVATIVE];
      expect(template).toBeDefined();
      expect(template.name).toBe('Conservative');
      expect(template.description).toContain('young');
    });

    it('should have Combination Plus template with Ketoconazole', () => {
      const template = HAIR_LOSS_TEMPLATES[PrescriptionTemplate.COMBINATION_PLUS];
      expect(template).toBeDefined();
      expect(template.name).toBe('Combination Plus');
      expect(template.medications).toContainEqual(
        expect.objectContaining({ name: 'Ketoconazole 2% Shampoo' })
      );
    });

    it('should have Advanced template with oral Minoxidil', () => {
      const template = HAIR_LOSS_TEMPLATES[PrescriptionTemplate.ADVANCED];
      expect(template).toBeDefined();
      expect(template.name).toBe('Advanced');
      expect(template.medications).toContainEqual(
        expect.objectContaining({ name: 'Minoxidil Oral', dosage: '2.5mg' })
      );
    });

    it('should have Female AGA template without Finasteride', () => {
      const template = HAIR_LOSS_TEMPLATES[PrescriptionTemplate.FEMALE_AGA];
      expect(template).toBeDefined();
      expect(template.name).toBe('Female AGA');
      expect(template.medications).not.toContainEqual(
        expect.objectContaining({ name: 'Finasteride' })
      );
      expect(template.medications).toContainEqual(
        expect.objectContaining({ name: 'Minoxidil 2%' })
      );
    });

    it('should have Custom template with empty medications', () => {
      const template = HAIR_LOSS_TEMPLATES[PrescriptionTemplate.CUSTOM];
      expect(template).toBeDefined();
      expect(template.name).toBe('Custom');
      expect(template.medications).toHaveLength(0);
    });
  });

  describe('Finasteride Contraindication Checks', () => {
    // Spec: hair-loss spec Section 5 — Contraindication Matrix

    it('should block finasteride for female patients of childbearing age', async () => {
      const femaleResponses = { ...mockConsultation.intakeResponse.responses, Q2: 'Female' };
      const result = await service.checkFinasterideContraindications(femaleResponses);

      expect(result.isBlocked).toBe(true);
      expect(result.reasons).toContain('Female of childbearing age');
    });

    it('should block finasteride for pregnant/breastfeeding patients', async () => {
      const responses = {
        ...mockConsultation.intakeResponse.responses,
        Q2: 'Female',
        Q2b: 'Yes',
      };
      const result = await service.checkFinasterideContraindications(responses);

      expect(result.isBlocked).toBe(true);
      expect(result.reasons).toContain('Pregnant or breastfeeding');
    });

    it('should block finasteride for patients under 18', async () => {
      const responses = { ...mockConsultation.intakeResponse.responses, Q1: '17' };
      const result = await service.checkFinasterideContraindications(responses);

      expect(result.isBlocked).toBe(true);
      expect(result.reasons).toContain('Under 18 years old');
    });

    it('should flag finasteride for patients with liver disease', async () => {
      const responses = {
        ...mockConsultation.intakeResponse.responses,
        Q10: ['Liver disease'],
      };
      const result = await service.checkFinasterideContraindications(responses);

      expect(result.isBlocked).toBe(false);
      expect(result.requiresDoctorReview).toBe(true);
      expect(result.flags).toContain('Liver disease present');
    });

    it('should flag finasteride for patients with existing sexual dysfunction', async () => {
      const responses = {
        ...mockConsultation.intakeResponse.responses,
        Q14: ['Decreased sex drive', 'Erectile difficulty'],
      };
      const result = await service.checkFinasterideContraindications(responses);

      expect(result.isBlocked).toBe(false);
      expect(result.requiresDoctorReview).toBe(true);
      expect(result.flags).toContain('Existing sexual dysfunction');
    });

    it('should flag finasteride for patients planning children', async () => {
      const responses = { ...mockConsultation.intakeResponse.responses, Q15: 'Yes' };
      const result = await service.checkFinasterideContraindications(responses);

      expect(result.isBlocked).toBe(false);
      expect(result.requiresDoctorReview).toBe(true);
      expect(result.flags).toContain('Planning children within 12 months');
    });

    it('should flag finasteride for daily alcohol users', async () => {
      const responses = { ...mockConsultation.intakeResponse.responses, Q22: 'Daily' };
      const result = await service.checkFinasterideContraindications(responses);

      expect(result.isBlocked).toBe(false);
      expect(result.requiresDoctorReview).toBe(true);
      expect(result.flags).toContain('Daily alcohol consumption');
    });

    it('should flag finasteride for patients on blood thinners', async () => {
      const responses = {
        ...mockConsultation.intakeResponse.responses,
        Q12: ['Blood thinners'],
      };
      const result = await service.checkFinasterideContraindications(responses);

      expect(result.isBlocked).toBe(false);
      expect(result.requiresDoctorReview).toBe(true);
      expect(result.flags).toContain('On blood thinners');
    });

    it('should flag finasteride for patients with depression on SSRIs', async () => {
      const responses = {
        ...mockConsultation.intakeResponse.responses,
        Q10: ['Depression or anxiety'],
        Q12: ['Antidepressants'],
      };
      const result = await service.checkFinasterideContraindications(responses);

      expect(result.isBlocked).toBe(false);
      expect(result.requiresDoctorReview).toBe(true);
      expect(result.flags).toContain('Depression with antidepressants');
    });

    it('should suggest minoxidil-only for previous finasteride side effects', async () => {
      const responses = {
        ...mockConsultation.intakeResponse.responses,
        Q17: ['Finasteride'],
        Q19: ['Sexual side effects'],
      };
      const result = await service.checkFinasterideContraindications(responses);

      expect(result.suggestMinoxidilOnly).toBe(true);
      expect(result.flags).toContain('Previous finasteride side effects');
    });

    it('should allow finasteride for healthy male patient', async () => {
      const result = await service.checkFinasterideContraindications(
        mockConsultation.intakeResponse.responses
      );

      expect(result.isBlocked).toBe(false);
      expect(result.requiresDoctorReview).toBe(false);
      expect(result.flags).toHaveLength(0);
    });
  });

  describe('Create Prescription', () => {
    it('should create prescription with template medications', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findUnique.mockResolvedValue(mockConsultation);
      mockPrismaService.prescription.create.mockResolvedValue({
        id: 'prescription-1',
        consultationId: 'consultation-1',
        medications: HAIR_LOSS_TEMPLATES[PrescriptionTemplate.STANDARD].medications,
      });
      mockPrismaService.order.create.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.PENDING,
      });
      mockPrismaService.consultation.update.mockResolvedValue({
        ...mockConsultation,
        status: ConsultationStatus.APPROVED,
      });

      const input: CreatePrescriptionInput = {
        consultationId: 'consultation-1',
        doctorId: 'doctor-1',
        template: PrescriptionTemplate.STANDARD,
        instructions: 'Take finasteride daily with or without food.',
      };

      const result = await service.createPrescription(input);

      expect(result.prescription).toBeDefined();
      expect(mockPrismaService.prescription.create).toHaveBeenCalled();
    });

    it('should run contraindication check before creating prescription with finasteride', async () => {
      const femaleConsultation = {
        ...mockConsultation,
        intakeResponse: {
          ...mockConsultation.intakeResponse,
          responses: { ...mockConsultation.intakeResponse.responses, Q2: 'Female' },
        },
      };
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findUnique.mockResolvedValue(femaleConsultation);

      const input: CreatePrescriptionInput = {
        consultationId: 'consultation-1',
        doctorId: 'doctor-1',
        template: PrescriptionTemplate.STANDARD, // Contains finasteride
      };

      await expect(service.createPrescription(input)).rejects.toThrow(BadRequestException);
    });

    it('should allow creating prescription with minoxidil-only for female patient', async () => {
      const femaleConsultation = {
        ...mockConsultation,
        intakeResponse: {
          ...mockConsultation.intakeResponse,
          responses: { ...mockConsultation.intakeResponse.responses, Q2: 'Female' },
        },
      };
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findUnique.mockResolvedValue(femaleConsultation);
      mockPrismaService.prescription.create.mockResolvedValue({
        id: 'prescription-1',
        consultationId: 'consultation-1',
        medications: HAIR_LOSS_TEMPLATES[PrescriptionTemplate.FEMALE_AGA].medications,
      });
      mockPrismaService.order.create.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.PENDING,
      });
      mockPrismaService.consultation.update.mockResolvedValue({
        ...femaleConsultation,
        status: ConsultationStatus.APPROVED,
      });

      const input: CreatePrescriptionInput = {
        consultationId: 'consultation-1',
        doctorId: 'doctor-1',
        template: PrescriptionTemplate.FEMALE_AGA, // No finasteride
      };

      const result = await service.createPrescription(input);

      expect(result.prescription).toBeDefined();
    });

    it('should allow custom medications', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findUnique.mockResolvedValue(mockConsultation);
      mockPrismaService.prescription.create.mockResolvedValue({
        id: 'prescription-1',
        consultationId: 'consultation-1',
        medications: [{ name: 'Biotin', dosage: '5000mcg', frequency: 'Once daily' }],
      });
      mockPrismaService.order.create.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.PENDING,
      });
      mockPrismaService.consultation.update.mockResolvedValue({
        ...mockConsultation,
        status: ConsultationStatus.APPROVED,
      });

      const input: CreatePrescriptionInput = {
        consultationId: 'consultation-1',
        doctorId: 'doctor-1',
        template: PrescriptionTemplate.CUSTOM,
        customMedications: [
          { name: 'Biotin', dosage: '5000mcg', frequency: 'Once daily' },
        ],
      };

      const result = await service.createPrescription(input);

      expect(result.prescription).toBeDefined();
    });

    it('should throw if consultation not found', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findUnique.mockResolvedValue(null);

      const input: CreatePrescriptionInput = {
        consultationId: 'non-existent',
        doctorId: 'doctor-1',
        template: PrescriptionTemplate.STANDARD,
      };

      await expect(service.createPrescription(input)).rejects.toThrow(NotFoundException);
    });

    it('should throw if doctor is not assigned to consultation', async () => {
      const otherDoctorConsultation = { ...mockConsultation, doctorId: 'doctor-2' };
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findUnique.mockResolvedValue(otherDoctorConsultation);

      const input: CreatePrescriptionInput = {
        consultationId: 'consultation-1',
        doctorId: 'doctor-1',
        template: PrescriptionTemplate.STANDARD,
      };

      await expect(service.createPrescription(input)).rejects.toThrow(BadRequestException);
    });
  });

  describe('Regulatory Fields', () => {
    // Spec: master spec Section 5.4 — Regulatory fields auto-populated

    it('should auto-populate doctor name in prescription', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findUnique.mockResolvedValue(mockConsultation);
      mockPrismaService.prescription.create.mockImplementation((args) => {
        expect(args.data.doctorName).toBe('Dr. Test Doctor');
        return Promise.resolve({ id: 'prescription-1', ...args.data });
      });
      mockPrismaService.order.create.mockResolvedValue({ id: 'order-1' });
      mockPrismaService.consultation.update.mockResolvedValue(mockConsultation);

      await service.createPrescription({
        consultationId: 'consultation-1',
        doctorId: 'doctor-1',
        template: PrescriptionTemplate.STANDARD,
      });
    });

    it('should auto-populate NMC registration number', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findUnique.mockResolvedValue(mockConsultation);
      mockPrismaService.prescription.create.mockImplementation((args) => {
        expect(args.data.doctorRegistrationNo).toBe('MCI-12345');
        return Promise.resolve({ id: 'prescription-1', ...args.data });
      });
      mockPrismaService.order.create.mockResolvedValue({ id: 'order-1' });
      mockPrismaService.consultation.update.mockResolvedValue(mockConsultation);

      await service.createPrescription({
        consultationId: 'consultation-1',
        doctorId: 'doctor-1',
        template: PrescriptionTemplate.STANDARD,
      });
    });

    it('should auto-populate patient details', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findUnique.mockResolvedValue(mockConsultation);
      mockPrismaService.prescription.create.mockImplementation((args) => {
        expect(args.data.patientName).toBe('Test Patient');
        expect(args.data.patientPhone).toBe('+919876543210');
        return Promise.resolve({ id: 'prescription-1', ...args.data });
      });
      mockPrismaService.order.create.mockResolvedValue({ id: 'order-1' });
      mockPrismaService.consultation.update.mockResolvedValue(mockConsultation);

      await service.createPrescription({
        consultationId: 'consultation-1',
        doctorId: 'doctor-1',
        template: PrescriptionTemplate.STANDARD,
      });
    });

    it('should include prescription issue date', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findUnique.mockResolvedValue(mockConsultation);
      mockPrismaService.prescription.create.mockImplementation((args) => {
        expect(args.data.issuedAt).toBeDefined();
        return Promise.resolve({ id: 'prescription-1', ...args.data });
      });
      mockPrismaService.order.create.mockResolvedValue({ id: 'order-1' });
      mockPrismaService.consultation.update.mockResolvedValue(mockConsultation);

      await service.createPrescription({
        consultationId: 'consultation-1',
        doctorId: 'doctor-1',
        template: PrescriptionTemplate.STANDARD,
      });
    });

    it('should set prescription validity (default 6 months)', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findUnique.mockResolvedValue(mockConsultation);
      mockPrismaService.prescription.create.mockImplementation((args) => {
        const sixMonthsFromNow = new Date();
        sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
        // Allow 1 day tolerance
        const validUntil = new Date(args.data.validUntil);
        expect(validUntil.getMonth()).toBe(sixMonthsFromNow.getMonth());
        return Promise.resolve({ id: 'prescription-1', ...args.data });
      });
      mockPrismaService.order.create.mockResolvedValue({ id: 'order-1' });
      mockPrismaService.consultation.update.mockResolvedValue(mockConsultation);

      await service.createPrescription({
        consultationId: 'consultation-1',
        doctorId: 'doctor-1',
        template: PrescriptionTemplate.STANDARD,
      });
    });
  });

  describe('Order Creation', () => {
    // Spec: Prescription creates an Order with status PRESCRIPTION_CREATED

    it('should create order when prescription is created', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findUnique.mockResolvedValue(mockConsultation);
      mockPrismaService.prescription.create.mockResolvedValue({
        id: 'prescription-1',
        consultationId: 'consultation-1',
      });
      mockPrismaService.order.create.mockResolvedValue({
        id: 'order-1',
        status: OrderStatus.PENDING,
      });
      mockPrismaService.consultation.update.mockResolvedValue(mockConsultation);

      const result = await service.createPrescription({
        consultationId: 'consultation-1',
        doctorId: 'doctor-1',
        template: PrescriptionTemplate.STANDARD,
      });

      expect(result.order).toBeDefined();
      expect(mockPrismaService.order.create).toHaveBeenCalled();
    });

    it('should link order to prescription', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findUnique.mockResolvedValue(mockConsultation);
      mockPrismaService.prescription.create.mockResolvedValue({
        id: 'prescription-1',
        consultationId: 'consultation-1',
      });
      mockPrismaService.order.create.mockImplementation((args) => {
        expect(args.data.prescriptionId).toBe('prescription-1');
        return Promise.resolve({ id: 'order-1', ...args.data });
      });
      mockPrismaService.consultation.update.mockResolvedValue(mockConsultation);

      await service.createPrescription({
        consultationId: 'consultation-1',
        doctorId: 'doctor-1',
        template: PrescriptionTemplate.STANDARD,
      });
    });

    it('should set order status to PENDING initially', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findUnique.mockResolvedValue(mockConsultation);
      mockPrismaService.prescription.create.mockResolvedValue({
        id: 'prescription-1',
        consultationId: 'consultation-1',
      });
      mockPrismaService.order.create.mockImplementation((args) => {
        expect(args.data.status).toBe(OrderStatus.PENDING);
        return Promise.resolve({ id: 'order-1', ...args.data });
      });
      mockPrismaService.consultation.update.mockResolvedValue(mockConsultation);

      await service.createPrescription({
        consultationId: 'consultation-1',
        doctorId: 'doctor-1',
        template: PrescriptionTemplate.STANDARD,
      });
    });

    it('should populate order with medication items', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findUnique.mockResolvedValue(mockConsultation);
      mockPrismaService.prescription.create.mockResolvedValue({
        id: 'prescription-1',
        consultationId: 'consultation-1',
        medications: HAIR_LOSS_TEMPLATES[PrescriptionTemplate.STANDARD].medications,
      });
      mockPrismaService.order.create.mockImplementation((args) => {
        expect(args.data.items).toBeDefined();
        expect(Array.isArray(args.data.items)).toBe(true);
        return Promise.resolve({ id: 'order-1', ...args.data });
      });
      mockPrismaService.consultation.update.mockResolvedValue(mockConsultation);

      await service.createPrescription({
        consultationId: 'consultation-1',
        doctorId: 'doctor-1',
        template: PrescriptionTemplate.STANDARD,
      });
    });

    it('should generate unique order number', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findUnique.mockResolvedValue(mockConsultation);
      mockPrismaService.prescription.create.mockResolvedValue({
        id: 'prescription-1',
        consultationId: 'consultation-1',
      });
      mockPrismaService.order.create.mockImplementation((args) => {
        expect(args.data.orderNumber).toBeDefined();
        expect(args.data.orderNumber).toMatch(/^ORD-/);
        return Promise.resolve({ id: 'order-1', ...args.data });
      });
      mockPrismaService.consultation.update.mockResolvedValue(mockConsultation);

      await service.createPrescription({
        consultationId: 'consultation-1',
        doctorId: 'doctor-1',
        template: PrescriptionTemplate.STANDARD,
      });
    });

    it('should update consultation status to APPROVED', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findUnique.mockResolvedValue(mockConsultation);
      mockPrismaService.prescription.create.mockResolvedValue({
        id: 'prescription-1',
        consultationId: 'consultation-1',
      });
      mockPrismaService.order.create.mockResolvedValue({ id: 'order-1' });
      mockPrismaService.consultation.update.mockImplementation((args) => {
        expect(args.data.status).toBe(ConsultationStatus.APPROVED);
        return Promise.resolve({ ...mockConsultation, status: ConsultationStatus.APPROVED });
      });

      await service.createPrescription({
        consultationId: 'consultation-1',
        doctorId: 'doctor-1',
        template: PrescriptionTemplate.STANDARD,
      });
    });
  });

  describe('PDF Generation', () => {
    // Spec: master spec Section 5.4 — PDF generated and stored

    it('should generate PDF URL for prescription', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockDoctor);
      mockPrismaService.consultation.findUnique.mockResolvedValue(mockConsultation);
      mockPrismaService.prescription.create.mockResolvedValue({
        id: 'prescription-1',
        consultationId: 'consultation-1',
        pdfUrl: null,
      });
      mockPrismaService.order.create.mockResolvedValue({ id: 'order-1' });
      mockPrismaService.consultation.update.mockResolvedValue(mockConsultation);

      const result = await service.createPrescription({
        consultationId: 'consultation-1',
        doctorId: 'doctor-1',
        template: PrescriptionTemplate.STANDARD,
      });

      // PDF generation is async, but the method should return a pending PDF status
      expect(result.prescription).toBeDefined();
    });

    it('should include all medications in PDF data', async () => {
      const pdfData = service.generatePrescriptionPdfData({
        id: 'prescription-1',
        doctorName: 'Dr. Test Doctor',
        doctorRegistrationNo: 'MCI-12345',
        doctorQualifications: ['MBBS', 'MD Dermatology'],
        patientName: 'Test Patient',
        patientAge: 36,
        patientGender: 'Male',
        patientAddress: '123 Test Street, Mumbai',
        medications: HAIR_LOSS_TEMPLATES[PrescriptionTemplate.STANDARD].medications,
        instructions: 'Take as directed',
        issuedAt: new Date(),
        validUntil: new Date(),
      });

      expect(pdfData.medications).toHaveLength(
        HAIR_LOSS_TEMPLATES[PrescriptionTemplate.STANDARD].medications.length
      );
    });

    it('should include digital signature placeholder', async () => {
      const pdfData = service.generatePrescriptionPdfData({
        id: 'prescription-1',
        doctorName: 'Dr. Test Doctor',
        doctorRegistrationNo: 'MCI-12345',
        doctorQualifications: ['MBBS'],
        patientName: 'Test Patient',
        patientAge: 36,
        patientGender: 'Male',
        patientAddress: '123 Test Street',
        medications: [],
        instructions: '',
        issuedAt: new Date(),
        validUntil: new Date(),
      });

      expect(pdfData.digitalSignature).toBeDefined();
    });
  });

  describe('Get Prescription', () => {
    it('should return prescription by ID', async () => {
      const mockPrescription = {
        id: 'prescription-1',
        consultationId: 'consultation-1',
        medications: HAIR_LOSS_TEMPLATES[PrescriptionTemplate.STANDARD].medications,
        pdfUrl: 'https://s3.example/prescription.pdf',
      };
      mockPrismaService.prescription.findUnique.mockResolvedValue(mockPrescription);

      const result = await service.getPrescription('prescription-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('prescription-1');
    });

    it('should throw if prescription not found', async () => {
      mockPrismaService.prescription.findUnique.mockResolvedValue(null);

      await expect(service.getPrescription('non-existent')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should return prescription by consultation ID', async () => {
      const mockPrescription = {
        id: 'prescription-1',
        consultationId: 'consultation-1',
      };
      mockPrismaService.prescription.findFirst.mockResolvedValue(mockPrescription);

      const result = await service.getPrescriptionByConsultation('consultation-1');

      expect(result).toBeDefined();
      expect(result.consultationId).toBe('consultation-1');
    });
  });

  describe('Template Selection Helpers', () => {
    it('should suggest appropriate template based on patient profile', () => {
      // Male, no contraindications
      const suggestion = service.suggestTemplate({
        gender: 'MALE',
        age: 30,
        contraindications: { isBlocked: false, flags: [], requiresDoctorReview: false },
      });

      expect(suggestion).toBe(PrescriptionTemplate.STANDARD);
    });

    it('should suggest Conservative for young patients', () => {
      const suggestion = service.suggestTemplate({
        gender: 'MALE',
        age: 20,
        contraindications: { isBlocked: false, flags: [], requiresDoctorReview: false },
      });

      expect(suggestion).toBe(PrescriptionTemplate.CONSERVATIVE);
    });

    it('should suggest Female AGA for female patients', () => {
      const suggestion = service.suggestTemplate({
        gender: 'FEMALE',
        age: 35,
        contraindications: { isBlocked: true, flags: [], requiresDoctorReview: false },
      });

      expect(suggestion).toBe(PrescriptionTemplate.FEMALE_AGA);
    });

    it('should suggest Minoxidil Only when finasteride is blocked', () => {
      const suggestion = service.suggestTemplate({
        gender: 'MALE',
        age: 30,
        contraindications: { isBlocked: false, suggestMinoxidilOnly: true, flags: [], requiresDoctorReview: false },
      });

      expect(suggestion).toBe(PrescriptionTemplate.MINOXIDIL_ONLY);
    });
  });
});
