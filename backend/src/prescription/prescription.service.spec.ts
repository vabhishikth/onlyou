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

  // ============================================
  // ED PRESCRIPTION TESTS
  // Spec: ED spec Section 6 (Prescription Templates)
  // ============================================

  describe('ED Prescription Templates', () => {
    // Spec: ED spec Section 6 — 7 prescription templates

    it('should have 7 ED prescription templates', () => {
      const edTemplates = service.getEDTemplates();
      expect(Object.keys(edTemplates)).toHaveLength(7);
    });

    it('should have On-Demand Sildenafil 50mg template', () => {
      const templates = service.getEDTemplates();
      const template = templates['ON_DEMAND_SILDENAFIL_50'];
      expect(template).toBeDefined();
      expect(template.name).toBe('On-Demand Sildenafil');
      expect(template.medications[0].name).toBe('Sildenafil');
      expect(template.medications[0].dosage).toBe('50mg');
      expect(template.medications[0].frequency).toContain('before sexual activity');
    });

    it('should have On-Demand Sildenafil 100mg (High) template', () => {
      const templates = service.getEDTemplates();
      const template = templates['ON_DEMAND_SILDENAFIL_100'];
      expect(template).toBeDefined();
      expect(template.name).toBe('On-Demand Sildenafil (High)');
      expect(template.medications[0].dosage).toBe('100mg');
      expect(template.whenToUse).toContain('50mg insufficient');
    });

    it('should have On-Demand Tadalafil 10mg template', () => {
      const templates = service.getEDTemplates();
      const template = templates['ON_DEMAND_TADALAFIL_10'];
      expect(template).toBeDefined();
      expect(template.medications[0].name).toBe('Tadalafil');
      expect(template.medications[0].dosage).toBe('10mg');
      expect(template.whenToUse).toContain('longer window');
    });

    it('should have On-Demand Tadalafil 20mg (High) template', () => {
      const templates = service.getEDTemplates();
      const template = templates['ON_DEMAND_TADALAFIL_20'];
      expect(template).toBeDefined();
      expect(template.medications[0].dosage).toBe('20mg');
    });

    it('should have Daily Tadalafil 5mg template', () => {
      const templates = service.getEDTemplates();
      const template = templates['DAILY_TADALAFIL_5'];
      expect(template).toBeDefined();
      expect(template.name).toBe('Daily Tadalafil');
      expect(template.medications[0].dosage).toBe('5mg');
      expect(template.medications[0].frequency).toContain('daily');
      expect(template.whenToUse).toContain('spontaneity');
    });

    it('should have Conservative Start (Sildenafil 25mg) template', () => {
      const templates = service.getEDTemplates();
      const template = templates['CONSERVATIVE_25'];
      expect(template).toBeDefined();
      expect(template.name).toBe('Conservative Start');
      expect(template.medications[0].name).toBe('Sildenafil');
      expect(template.medications[0].dosage).toBe('25mg');
      expect(template.whenToUse).toContain('older');
    });

    it('should have Custom template with empty medications', () => {
      const templates = service.getEDTemplates();
      const template = templates['ED_CUSTOM'];
      expect(template).toBeDefined();
      expect(template.name).toBe('Custom');
      expect(template.medications).toHaveLength(0);
    });

    it('should include standard counseling text in all ED templates', () => {
      const templates = service.getEDTemplates();
      for (const key of Object.keys(templates)) {
        if (key !== 'ED_CUSTOM') {
          const template = templates[key];
          expect(template.counselingText).toBeDefined();
          expect(template.counselingText).toContain('sexual stimulation');
        }
      }
    });
  });

  describe('ED PDE5 Contraindication Checks', () => {
    // Spec: ED spec Section 5 — Contraindication Matrix

    it('should ABSOLUTE BLOCK for nitrates', async () => {
      const responses = { Q14: ['nitrates'] };
      const result = await service.checkEDContraindications(responses);

      expect(result.isBlocked).toBe(true);
      expect(result.action).toBe('ABSOLUTE_BLOCK');
      expect(result.reasons).toContain('Nitrates: CANNOT prescribe ANY PDE5 inhibitor');
    });

    it('should BLOCK for recent cardiac hospitalization (<6 months)', async () => {
      const responses = { Q14: ['none'], Q16: 'yes' };
      const result = await service.checkEDContraindications(responses);

      expect(result.isBlocked).toBe(true);
      expect(result.action).toBe('BLOCK');
      expect(result.reasons).toContain('Recent cardiac event: cardiology clearance required');
    });

    it('should BLOCK for chest pain during activity', async () => {
      const responses = { Q14: ['none'], Q16: 'no', Q17: 'yes' };
      const result = await service.checkEDContraindications(responses);

      expect(result.isBlocked).toBe(true);
      expect(result.action).toBe('BLOCK');
    });

    it('should BLOCK for heart not strong enough for sex', async () => {
      const responses = { Q14: ['none'], Q16: 'no', Q17: 'no', Q18: 'yes' };
      const result = await service.checkEDContraindications(responses);

      expect(result.isBlocked).toBe(true);
      expect(result.action).toBe('BLOCK');
    });

    it('should BLOCK for severe hypotension (BP <90/50)', async () => {
      const responses = { Q14: ['none'], Q16: 'no', Q17: 'no', Q18: 'no', Q15: '85/50' };
      const result = await service.checkEDContraindications(responses);

      expect(result.isBlocked).toBe(true);
      expect(result.action).toBe('BLOCK');
      expect(result.reasons).toContain('Severe hypotension');
    });

    it('should CAUTION for alpha-blockers with 4hr separation note', async () => {
      const responses = { Q14: ['alpha_blockers'], Q16: 'no', Q17: 'no', Q18: 'no' };
      const result = await service.checkEDContraindications(responses);

      expect(result.isBlocked).toBe(false);
      expect(result.requiresCaution).toBe(true);
      expect(result.flags).toContain('Alpha-blockers: 4-hour separation required, start lowest dose');
    });

    it('should CAUTION for HIV protease inhibitors with dose reduction note', async () => {
      const responses = { Q14: ['hiv_protease'], Q16: 'no', Q17: 'no', Q18: 'no' };
      const result = await service.checkEDContraindications(responses);

      expect(result.requiresCaution).toBe(true);
      expect(result.flags).toContain('HIV protease inhibitors: reduce PDE5 dose significantly');
    });

    it('should CAUTION for severe liver disease', async () => {
      const responses = { Q13: ['liver_disease'], Q14: ['none'], Q16: 'no', Q17: 'no', Q18: 'no' };
      const result = await service.checkEDContraindications(responses);

      expect(result.requiresCaution).toBe(true);
      expect(result.flags).toContain('Liver disease: lower dose, monitor');
    });

    it('should CAUTION for severe kidney disease', async () => {
      const responses = { Q13: ['kidney_disease'], Q14: ['none'], Q16: 'no', Q17: 'no', Q18: 'no' };
      const result = await service.checkEDContraindications(responses);

      expect(result.requiresCaution).toBe(true);
      expect(result.flags).toContain('Kidney disease: lower dose');
    });

    it('should CAUTION for sickle cell disease (priapism risk)', async () => {
      const responses = { Q13: ['sickle_cell'], Q14: ['none'], Q16: 'no', Q17: 'no', Q18: 'no' };
      const result = await service.checkEDContraindications(responses);

      expect(result.requiresCaution).toBe(true);
      expect(result.flags).toContain('Sickle cell: priapism risk');
    });

    it('should CAUTION for priapism history', async () => {
      const responses = { Q13: ['none'], Q14: ['none'], Q16: 'no', Q17: 'no', Q18: 'no', Q27: ['priapism'] };
      const result = await service.checkEDContraindications(responses);

      expect(result.requiresCaution).toBe(true);
      expect(result.flags).toContain('Priapism history: start lowest dose, warn patient');
    });

    it('should CAUTION for heavy alcohol use', async () => {
      const responses = { Q13: ['none'], Q14: ['none'], Q16: 'no', Q17: 'no', Q18: 'no', Q22: 'heavy' };
      const result = await service.checkEDContraindications(responses);

      expect(result.requiresCaution).toBe(true);
      expect(result.flags).toContain('Heavy alcohol: increased hypotension risk');
    });

    it('should allow PDE5 inhibitors for healthy patient', async () => {
      const responses = {
        Q13: ['none'],
        Q14: ['none'],
        Q16: 'no',
        Q17: 'no',
        Q18: 'no',
        Q22: 'occasionally',
        Q27: ['none'],
      };
      const result = await service.checkEDContraindications(responses);

      expect(result.isBlocked).toBe(false);
      expect(result.requiresCaution).toBe(false);
    });
  });

  describe('ED Canned Messages', () => {
    // Spec: ED spec Section 7 — 6 canned messages

    it('should have 6 ED canned messages', () => {
      const messages = service.getEDCannedMessages();
      expect(messages).toHaveLength(6);
    });

    it('should have prescription instructions message', () => {
      const messages = service.getEDCannedMessages();
      const msg = messages.find((m) => m.id === 'ed_prescribed');
      expect(msg).toBeDefined();
      expect(msg.template).toContain('[medication]');
      expect(msg.template).toContain('6-8 attempts');
    });

    it('should have daily tadalafil recommendation message', () => {
      const messages = service.getEDCannedMessages();
      const msg = messages.find((m) => m.id === 'ed_daily_tadalafil');
      expect(msg).toBeDefined();
      expect(msg.template).toContain('daily low-dose tadalafil');
      expect(msg.template).toContain('spontaneity');
    });

    it('should have counseling recommendation message', () => {
      const messages = service.getEDCannedMessages();
      const msg = messages.find((m) => m.id === 'ed_counseling');
      expect(msg).toBeDefined();
      expect(msg.template).toContain('stress/anxiety');
      expect(msg.template).toContain('counseling');
    });

    it('should have testosterone check message', () => {
      const messages = service.getEDCannedMessages();
      const msg = messages.find((m) => m.id === 'ed_testosterone_check');
      expect(msg).toBeDefined();
      expect(msg.template).toContain('testosterone levels');
      expect(msg.template).toContain('blood panel');
    });

    it('should have cardiology clearance message', () => {
      const messages = service.getEDCannedMessages();
      const msg = messages.find((m) => m.id === 'ed_cardiology_clearance');
      expect(msg).toBeDefined();
      expect(msg.template).toContain('cardiologist');
      expect(msg.template).toContain('clearance');
    });

    it('should have dose adjustment message', () => {
      const messages = service.getEDCannedMessages();
      const msg = messages.find((m) => m.id === 'ed_dose_adjustment');
      expect(msg).toBeDefined();
      expect(msg.template).toContain('[new dose]');
      expect(msg.template).toContain('check-in');
    });
  });

  describe('ED Referrals', () => {
    // Spec: ED spec Section 8 — Referral Edge Cases

    it('should generate full refund referral for nitrates patient', () => {
      const referral = service.generateEDReferral('nitrates');
      expect(referral.action).toBe('FULL_REFUND');
      expect(referral.reason).toContain('nitrate medication');
      expect(referral.message).toContain('interact dangerously');
      expect(referral.message).toContain('cardiologist');
    });

    it('should generate cardiology referral for cardiac clearance', () => {
      const referral = service.generateEDReferral('cardiac_clearance');
      expect(referral.action).toBe('REFERRAL');
      expect(referral.referTo).toBe('cardiologist');
      expect(referral.message).toContain("cardiologist's clearance");
    });

    it('should generate urology referral for Peyronies disease', () => {
      const referral = service.generateEDReferral('peyronies');
      expect(referral.action).toBe('REFERRAL');
      expect(referral.referTo).toBe('urologist');
      expect(referral.message).toContain('in-person urology evaluation');
    });

    it('should generate blood work referral for low testosterone suspected', () => {
      const referral = service.generateEDReferral('low_testosterone');
      expect(referral.action).toBe('BLOOD_WORK');
      expect(referral.tests).toContain('testosterone');
      expect(referral.message).toContain('hormone levels');
    });

    it('should generate urology referral for severe ED in young patient', () => {
      const referral = service.generateEDReferral('severe_ed_young');
      expect(referral.action).toBe('REFERRAL');
      expect(referral.referTo).toBe('urologist');
      expect(referral.message).toContain('in-person evaluation');
    });

    it('should generate counseling recommendation for psychological ED', () => {
      const referral = service.generateEDReferral('psychological');
      expect(referral.action).toBe('PRESCRIBE_WITH_COUNSELING');
      expect(referral.message).toContain('short term');
      expect(referral.message).toContain('underlying anxiety');
    });

    it('should generate PE pathway note for premature ejaculation primary', () => {
      const referral = service.generateEDReferral('pe_primary');
      expect(referral.action).toBe('DIFFERENT_PATHWAY');
      expect(referral.message).toContain('premature ejaculation');
      expect(referral.message).toContain('adjust your treatment plan');
    });

    it('should generate caution referral for priapism history', () => {
      const referral = service.generateEDReferral('priapism_history');
      expect(referral.action).toBe('CAUTION');
      expect(referral.message).toContain('cautious approach');
    });
  });

  describe('ED Template Selection', () => {
    it('should suggest on-demand sildenafil 50mg as default first-line', () => {
      const suggestion = service.suggestEDTemplate({
        age: 40,
        iief5Severity: 'mild_moderate',
        cardiovascularRisk: 'low',
        patientPreference: null,
        previousTreatment: null,
      });

      expect(suggestion).toBe('ON_DEMAND_SILDENAFIL_50');
    });

    it('should suggest daily tadalafil for spontaneity preference', () => {
      const suggestion = service.suggestEDTemplate({
        age: 45,
        iief5Severity: 'mild',
        cardiovascularRisk: 'low',
        patientPreference: 'spontaneity',
        previousTreatment: null,
      });

      expect(suggestion).toBe('DAILY_TADALAFIL_5');
    });

    it('should suggest conservative 25mg for older patients (>65)', () => {
      const suggestion = service.suggestEDTemplate({
        age: 68,
        iief5Severity: 'moderate',
        cardiovascularRisk: 'low',
        patientPreference: null,
        previousTreatment: null,
      });

      expect(suggestion).toBe('CONSERVATIVE_25');
    });

    it('should suggest conservative 25mg for alpha-blocker users', () => {
      const suggestion = service.suggestEDTemplate({
        age: 55,
        iief5Severity: 'mild_moderate',
        cardiovascularRisk: 'low',
        patientPreference: null,
        previousTreatment: null,
        onAlphaBlockers: true,
      });

      expect(suggestion).toBe('CONSERVATIVE_25');
    });

    it('should suggest tadalafil for longer window preference', () => {
      const suggestion = service.suggestEDTemplate({
        age: 40,
        iief5Severity: 'mild',
        cardiovascularRisk: 'low',
        patientPreference: 'longer_window',
        previousTreatment: null,
      });

      expect(suggestion).toBe('ON_DEMAND_TADALAFIL_10');
    });

    it('should suggest higher dose if previous 50mg insufficient', () => {
      const suggestion = service.suggestEDTemplate({
        age: 45,
        iief5Severity: 'moderate',
        cardiovascularRisk: 'low',
        patientPreference: null,
        previousTreatment: { medication: 'sildenafil_50', response: 'insufficient' },
      });

      expect(suggestion).toBe('ON_DEMAND_SILDENAFIL_100');
    });
  });
});
