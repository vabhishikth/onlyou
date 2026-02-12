import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConsultationStatus, HealthVertical, OrderStatus, UserRole } from '@prisma/client';

// Spec: hair-loss spec Section 6 (Prescription Templates)
// Spec: hair-loss spec Section 5 (Finasteride Contraindication Matrix)

// Prescription template types
export enum PrescriptionTemplate {
  STANDARD = 'STANDARD',
  MINOXIDIL_ONLY = 'MINOXIDIL_ONLY',
  CONSERVATIVE = 'CONSERVATIVE',
  COMBINATION_PLUS = 'COMBINATION_PLUS',
  ADVANCED = 'ADVANCED',
  FEMALE_AGA = 'FEMALE_AGA',
  CUSTOM = 'CUSTOM',
}

// Medication structure
export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration?: string;
  instructions?: string;
}

// Template definition
export interface TemplateDefinition {
  name: string;
  description: string;
  medications: Medication[];
  whenToUse: string;
}

// Spec: hair-loss spec Section 6 — 7 prescription templates
export const HAIR_LOSS_TEMPLATES: Record<PrescriptionTemplate, TemplateDefinition> = {
  [PrescriptionTemplate.STANDARD]: {
    name: 'Standard',
    description: 'Standard treatment for typical AGA with no contraindications',
    whenToUse: 'Typical AGA, no contraindications',
    medications: [
      {
        name: 'Finasteride',
        dosage: '1mg',
        frequency: 'Once daily',
        instructions: 'Take with or without food',
      },
      {
        name: 'Minoxidil 5%',
        dosage: '1ml',
        frequency: 'Twice daily',
        instructions: 'Apply to dry scalp, massage gently',
      },
    ],
  },
  [PrescriptionTemplate.MINOXIDIL_ONLY]: {
    name: 'Minoxidil Only',
    description: 'Treatment without finasteride',
    whenToUse: 'Finasteride contraindicated or patient declines',
    medications: [
      {
        name: 'Minoxidil 5%',
        dosage: '1ml',
        frequency: 'Twice daily',
        instructions: 'Apply to dry scalp, massage gently',
      },
    ],
  },
  [PrescriptionTemplate.CONSERVATIVE]: {
    name: 'Conservative',
    description: 'Conservative approach for young (<22) or mild cases',
    whenToUse: 'Young patients (<22), mild hair loss, or cautious approach preferred',
    medications: [
      {
        name: 'Minoxidil 5%',
        dosage: '1ml',
        frequency: 'Twice daily',
        duration: '3 months initial trial',
        instructions: 'Apply to dry scalp, massage gently',
      },
    ],
  },
  [PrescriptionTemplate.COMBINATION_PLUS]: {
    name: 'Combination Plus',
    description: 'Standard plus ketoconazole for dandruff/seborrheic component',
    whenToUse: 'AGA with dandruff/seborrheic dermatitis component',
    medications: [
      {
        name: 'Finasteride',
        dosage: '1mg',
        frequency: 'Once daily',
        instructions: 'Take with or without food',
      },
      {
        name: 'Minoxidil 5%',
        dosage: '1ml',
        frequency: 'Twice daily',
        instructions: 'Apply to dry scalp, massage gently',
      },
      {
        name: 'Ketoconazole 2% Shampoo',
        dosage: 'As needed',
        frequency: 'Twice weekly',
        instructions: 'Leave on scalp for 3-5 minutes before rinsing',
      },
    ],
  },
  [PrescriptionTemplate.ADVANCED]: {
    name: 'Advanced',
    description: 'Aggressive treatment for significant hair loss',
    whenToUse: 'Aggressive loss, at doctor\'s discretion',
    medications: [
      {
        name: 'Finasteride',
        dosage: '1mg',
        frequency: 'Once daily',
        instructions: 'Take with or without food',
      },
      {
        name: 'Minoxidil 5%',
        dosage: '1ml',
        frequency: 'Twice daily',
        instructions: 'Apply to dry scalp, massage gently',
      },
      {
        name: 'Minoxidil Oral',
        dosage: '2.5mg',
        frequency: 'Once daily',
        instructions: 'Take with food',
      },
    ],
  },
  [PrescriptionTemplate.FEMALE_AGA]: {
    name: 'Female AGA',
    description: 'Treatment for female pattern hair loss',
    whenToUse: 'Female pattern hair loss',
    medications: [
      {
        name: 'Minoxidil 2%',
        dosage: '1ml',
        frequency: 'Twice daily',
        instructions: 'Apply to dry scalp, massage gently',
      },
      {
        name: 'Spironolactone',
        dosage: '50-100mg',
        frequency: 'Once daily',
        instructions: 'If appropriate, to be adjusted by doctor',
      },
    ],
  },
  [PrescriptionTemplate.CUSTOM]: {
    name: 'Custom',
    description: 'Doctor builds prescription from scratch',
    whenToUse: 'Unusual cases requiring custom approach',
    medications: [],
  },
};

// Contraindication check result
export interface ContraindicationCheckResult {
  isBlocked: boolean;
  requiresDoctorReview: boolean;
  suggestMinoxidilOnly?: boolean;
  reasons: string[];
  flags: string[];
}

// Create prescription input
export interface CreatePrescriptionInput {
  consultationId: string;
  doctorId: string;
  template: PrescriptionTemplate;
  customMedications?: Medication[];
  instructions?: string;
}

// PDF data structure
export interface PrescriptionPdfData {
  id: string;
  doctorName: string;
  doctorRegistrationNo: string;
  doctorQualifications: string[];
  patientName: string;
  patientAge: number;
  patientGender: string;
  patientAddress: string;
  medications: Medication[];
  instructions: string;
  issuedAt: Date;
  validUntil: Date;
  digitalSignature?: string;
}

@Injectable()
export class PrescriptionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check finasteride contraindications from questionnaire responses
   * Spec: hair-loss spec Section 5 — Contraindication Matrix
   */
  async checkFinasterideContraindications(
    responses: Record<string, any>
  ): Promise<ContraindicationCheckResult> {
    const result: ContraindicationCheckResult = {
      isBlocked: false,
      requiresDoctorReview: false,
      suggestMinoxidilOnly: false,
      reasons: [],
      flags: [],
    };

    // Q1: Age check
    const age = parseInt(responses.Q1, 10);
    if (age < 18) {
      result.isBlocked = true;
      result.reasons.push('Under 18 years old');
    }

    // Q2: Female of childbearing age
    if (responses.Q2 === 'Female') {
      result.isBlocked = true;
      result.reasons.push('Female of childbearing age');
    }

    // Q2b: Pregnant or breastfeeding
    if (responses.Q2b === 'Yes') {
      result.isBlocked = true;
      result.reasons.push('Pregnant or breastfeeding');
    }

    // Q10: Medical conditions
    const conditions = responses.Q10 || [];
    if (Array.isArray(conditions)) {
      if (conditions.includes('Liver disease')) {
        result.requiresDoctorReview = true;
        result.flags.push('Liver disease present');
      }
      if (conditions.includes('Depression or anxiety')) {
        // Check if also on antidepressants
        const medications = responses.Q12 || [];
        if (Array.isArray(medications) && medications.includes('Antidepressants')) {
          result.requiresDoctorReview = true;
          result.flags.push('Depression with antidepressants');
        }
      }
    }

    // Q12: Current medications
    const currentMeds = responses.Q12 || [];
    if (Array.isArray(currentMeds)) {
      if (currentMeds.includes('Blood thinners')) {
        result.requiresDoctorReview = true;
        result.flags.push('On blood thinners');
      }
    }

    // Q14: Existing sexual dysfunction
    const sexualIssues = responses.Q14 || [];
    if (Array.isArray(sexualIssues) && !sexualIssues.includes('None') && sexualIssues.length > 0) {
      result.requiresDoctorReview = true;
      result.flags.push('Existing sexual dysfunction');
    }

    // Q15: Planning children
    if (responses.Q15 === 'Yes') {
      result.requiresDoctorReview = true;
      result.flags.push('Planning children within 12 months');
    }

    // Q17 & Q19: Previous finasteride with side effects
    const previousTreatments = responses.Q17 || [];
    const previousSideEffects = responses.Q19 || [];
    if (
      Array.isArray(previousTreatments) &&
      previousTreatments.includes('Finasteride') &&
      Array.isArray(previousSideEffects) &&
      (previousSideEffects.includes('Sexual side effects') ||
        previousSideEffects.includes('Mood changes') ||
        previousSideEffects.includes('Breast tenderness'))
    ) {
      result.suggestMinoxidilOnly = true;
      result.flags.push('Previous finasteride side effects');
    }

    // Q22: Daily alcohol
    if (responses.Q22 === 'Daily') {
      result.requiresDoctorReview = true;
      result.flags.push('Daily alcohol consumption');
    }

    return result;
  }

  /**
   * Check if template contains finasteride
   */
  private templateContainsFinasteride(template: PrescriptionTemplate): boolean {
    const templateDef = HAIR_LOSS_TEMPLATES[template];
    return templateDef.medications.some(
      (med) => med.name.toLowerCase().includes('finasteride')
    );
  }

  /**
   * Verify doctor
   */
  private async verifyDoctor(doctorId: string): Promise<any> {
    const doctor = await this.prisma.user.findFirst({
      where: {
        id: doctorId,
        role: UserRole.DOCTOR,
        isVerified: true,
      },
      include: {
        doctorProfile: true,
      },
    });

    if (!doctor) {
      throw new ForbiddenException('Access denied. Verified doctor required.');
    }

    return doctor;
  }

  /**
   * Generate unique order number
   */
  private generateOrderNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ORD-${timestamp}-${random}`;
  }

  /**
   * Calculate patient age from DOB
   */
  private calculateAge(dateOfBirth: Date | null): number {
    if (!dateOfBirth) return 0;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  /**
   * Create prescription for a consultation
   * Spec: master spec Section 5.4 — Prescription Builder
   */
  async createPrescription(input: CreatePrescriptionInput): Promise<{
    prescription: any;
    order: any;
  }> {
    const doctor = await this.verifyDoctor(input.doctorId);

    const consultation = await this.prisma.consultation.findUnique({
      where: { id: input.consultationId },
      include: {
        patient: {
          include: {
            patientProfile: true,
          },
        },
        intakeResponse: true,
      },
    });

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    if (consultation.doctorId !== input.doctorId) {
      throw new BadRequestException('Doctor is not assigned to this consultation');
    }

    // Get responses for contraindication check
    const responses = consultation.intakeResponse.responses as Record<string, any>;

    // Check finasteride contraindications if template contains finasteride
    if (this.templateContainsFinasteride(input.template)) {
      const contraindications = await this.checkFinasterideContraindications(responses);

      if (contraindications.isBlocked) {
        throw new BadRequestException(
          `Cannot prescribe finasteride: ${contraindications.reasons.join(', ')}`
        );
      }
    }

    // Get medications from template or custom
    let medications: Medication[];
    if (input.template === PrescriptionTemplate.CUSTOM) {
      medications = input.customMedications || [];
    } else {
      medications = HAIR_LOSS_TEMPLATES[input.template].medications;
    }

    // Calculate validity (6 months from now)
    const validUntil = new Date();
    validUntil.setMonth(validUntil.getMonth() + 6);

    const issuedAt = new Date();

    // Patient address
    const profile = consultation.patient.patientProfile;
    const patientAddress = profile
      ? `${profile.addressLine1 || ''}, ${profile.city || ''}, ${profile.state || ''} ${profile.pincode || ''}`
      : '';

    // Create prescription
    const prescription = await this.prisma.prescription.create({
      data: {
        consultationId: input.consultationId,
        medications: medications as any,
        instructions: input.instructions || '',
        validUntil,
        issuedAt,
        // Regulatory fields
        doctorName: doctor.name || 'Doctor',
        doctorRegistrationNo: doctor.doctorProfile?.registrationNo || '',
        patientName: consultation.patient.name || 'Patient',
        patientPhone: consultation.patient.phone,
      },
    });

    // Create order
    const order = await this.prisma.order.create({
      data: {
        userId: consultation.patientId,
        prescriptionId: prescription.id,
        orderNumber: this.generateOrderNumber(),
        status: OrderStatus.PENDING,
        items: medications as any,
        subtotalPaise: 0, // To be calculated based on actual pricing
        totalPaise: 0,
        shippingAddress: {
          name: consultation.patient.name,
          phone: consultation.patient.phone,
          addressLine1: profile?.addressLine1 || '',
          addressLine2: profile?.addressLine2 || '',
          city: profile?.city || '',
          state: profile?.state || '',
          pincode: profile?.pincode || '',
        },
      },
    });

    // Update consultation status to APPROVED
    await this.prisma.consultation.update({
      where: { id: input.consultationId },
      data: { status: ConsultationStatus.APPROVED },
    });

    return { prescription, order };
  }

  /**
   * Generate prescription PDF data
   * Spec: master spec Section 5.4 — PDF generated and stored
   */
  generatePrescriptionPdfData(data: {
    id: string;
    doctorName: string;
    doctorRegistrationNo: string;
    doctorQualifications: string[];
    patientName: string;
    patientAge: number;
    patientGender: string;
    patientAddress: string;
    medications: Medication[];
    instructions: string;
    issuedAt: Date;
    validUntil: Date;
  }): PrescriptionPdfData {
    return {
      ...data,
      digitalSignature: `Digitally signed by ${data.doctorName} (${data.doctorRegistrationNo})`,
    };
  }

  /**
   * Get prescription by ID
   */
  async getPrescription(prescriptionId: string): Promise<any> {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        consultation: {
          include: {
            patient: true,
            doctor: true,
          },
        },
        orders: true,
      },
    });

    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }

    return prescription;
  }

  /**
   * Get prescription by consultation ID
   */
  async getPrescriptionByConsultation(consultationId: string): Promise<any> {
    const prescription = await this.prisma.prescription.findFirst({
      where: { consultationId },
      include: {
        orders: true,
      },
    });

    if (!prescription) {
      throw new NotFoundException('Prescription not found for this consultation');
    }

    return prescription;
  }

  /**
   * Suggest appropriate template based on patient profile
   */
  suggestTemplate(profile: {
    gender: string;
    age: number;
    contraindications: ContraindicationCheckResult;
  }): PrescriptionTemplate {
    // Female patients
    if (profile.gender === 'FEMALE') {
      return PrescriptionTemplate.FEMALE_AGA;
    }

    // If finasteride should be avoided
    if (profile.contraindications.suggestMinoxidilOnly) {
      return PrescriptionTemplate.MINOXIDIL_ONLY;
    }

    // Young patients (<22)
    if (profile.age < 22) {
      return PrescriptionTemplate.CONSERVATIVE;
    }

    // Default to standard
    return PrescriptionTemplate.STANDARD;
  }
}
