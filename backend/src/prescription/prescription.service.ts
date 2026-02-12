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

  // ============================================
  // ED-SPECIFIC METHODS
  // Spec: ED spec Section 6 (Prescription Templates)
  // ============================================

  /**
   * Get ED prescription templates
   * Spec: ED spec Section 6 — 7 templates
   */
  getEDTemplates(): Record<string, EDTemplateDefinition> {
    return ED_TEMPLATES;
  }

  /**
   * Check ED (PDE5) contraindications
   * Spec: ED spec Section 5 — Contraindication Matrix
   */
  async checkEDContraindications(
    responses: Record<string, any>
  ): Promise<EDContraindicationCheckResult> {
    const result: EDContraindicationCheckResult = {
      isBlocked: false,
      requiresCaution: false,
      action: undefined,
      reasons: [],
      flags: [],
    };

    // ABSOLUTE BLOCK: Nitrates
    const medications = responses.Q14 || [];
    if (Array.isArray(medications) && medications.includes('nitrates')) {
      result.isBlocked = true;
      result.action = 'ABSOLUTE_BLOCK';
      result.reasons.push('Nitrates: CANNOT prescribe ANY PDE5 inhibitor');
      return result;
    }

    // BLOCK: Recent cardiac hospitalization
    if (responses.Q16 === 'yes') {
      result.isBlocked = true;
      result.action = 'BLOCK';
      result.reasons.push('Recent cardiac event: cardiology clearance required');
      return result;
    }

    // BLOCK: Chest pain during activity
    if (responses.Q17 === 'yes') {
      result.isBlocked = true;
      result.action = 'BLOCK';
      result.reasons.push('Chest pain during activity: cardiac evaluation needed');
      return result;
    }

    // BLOCK: Heart not strong enough
    if (responses.Q18 === 'yes') {
      result.isBlocked = true;
      result.action = 'BLOCK';
      result.reasons.push('Heart not strong enough for sexual activity');
      return result;
    }

    // BLOCK: Severe hypotension
    if (responses.Q15) {
      const bp = this.parseBP(responses.Q15);
      if (bp && bp.systolic < 90) {
        result.isBlocked = true;
        result.action = 'BLOCK';
        result.reasons.push('Severe hypotension');
        return result;
      }
    }

    // CAUTION: Alpha-blockers
    if (Array.isArray(medications) && medications.includes('alpha_blockers')) {
      result.requiresCaution = true;
      result.flags.push('Alpha-blockers: 4-hour separation required, start lowest dose');
    }

    // CAUTION: HIV protease inhibitors
    if (Array.isArray(medications) && medications.includes('hiv_protease')) {
      result.requiresCaution = true;
      result.flags.push('HIV protease inhibitors: reduce PDE5 dose significantly');
    }

    // CAUTION: Liver disease
    const conditions = responses.Q13 || [];
    if (Array.isArray(conditions) && conditions.includes('liver_disease')) {
      result.requiresCaution = true;
      result.flags.push('Liver disease: lower dose, monitor');
    }

    // CAUTION: Kidney disease
    if (Array.isArray(conditions) && conditions.includes('kidney_disease')) {
      result.requiresCaution = true;
      result.flags.push('Kidney disease: lower dose');
    }

    // CAUTION: Sickle cell
    if (Array.isArray(conditions) && conditions.includes('sickle_cell')) {
      result.requiresCaution = true;
      result.flags.push('Sickle cell: priapism risk');
    }

    // CAUTION: Priapism history
    const sideEffects = responses.Q27 || [];
    if (Array.isArray(sideEffects) && sideEffects.includes('priapism')) {
      result.requiresCaution = true;
      result.flags.push('Priapism history: start lowest dose, warn patient');
    }

    // CAUTION: Heavy alcohol
    if (responses.Q22 === 'heavy') {
      result.requiresCaution = true;
      result.flags.push('Heavy alcohol: increased hypotension risk');
    }

    return result;
  }

  /**
   * Get ED canned messages
   * Spec: ED spec Section 7 — 6 canned messages
   */
  getEDCannedMessages(): EDCannedMessage[] {
    return ED_CANNED_MESSAGES;
  }

  /**
   * Generate ED referral
   * Spec: ED spec Section 8 — Referral Edge Cases
   */
  generateEDReferral(
    referralType: string
  ): EDReferralResult {
    switch (referralType) {
      case 'nitrates':
        return {
          action: 'FULL_REFUND',
          reason: 'Patient on nitrate medication',
          message:
            'ED medications interact dangerously with your nitrate medication. Please discuss alternatives with your cardiologist.',
        };

      case 'cardiac_clearance':
        return {
          action: 'REFERRAL',
          referTo: 'cardiologist',
          reason: 'Cardiac clearance required',
          message:
            "For your safety, we need your cardiologist's clearance before prescribing.",
        };

      case 'peyronies':
        return {
          action: 'REFERRAL',
          referTo: 'urologist',
          reason: "Peyronie's disease",
          message: 'Your condition benefits from an in-person urology evaluation.',
        };

      case 'low_testosterone':
        return {
          action: 'BLOOD_WORK',
          tests: ['testosterone', 'LH', 'FSH', 'prolactin'],
          reason: 'Low testosterone suspected',
          message: "Let's check your hormone levels first.",
        };

      case 'severe_ed_young':
        return {
          action: 'REFERRAL',
          referTo: 'urologist',
          reason: 'Severe ED in young patient',
          message:
            'Given the severity, I recommend an in-person evaluation.',
        };

      case 'psychological':
        return {
          action: 'PRESCRIBE_WITH_COUNSELING',
          reason: 'Primary psychological ED',
          message:
            'Medication will help in the short term, but addressing the underlying anxiety will give lasting results.',
        };

      case 'pe_primary':
        return {
          action: 'DIFFERENT_PATHWAY',
          reason: 'Primary premature ejaculation',
          message:
            'Your primary concern seems to be premature ejaculation rather than erectile difficulty. I\'ll adjust your treatment plan accordingly.',
        };

      case 'priapism_history':
        return {
          action: 'CAUTION',
          reason: 'Priapism history',
          message:
            'Given your history, we\'ll take a very cautious approach.',
        };

      default:
        return {
          action: 'UNKNOWN',
          reason: 'Unknown referral type',
          message: 'Please contact support.',
        };
    }
  }

  /**
   * Suggest appropriate ED template
   * Spec: ED spec Section 6 — Template selection logic
   */
  suggestEDTemplate(profile: {
    age: number;
    iief5Severity: string;
    cardiovascularRisk: string;
    patientPreference: string | null;
    previousTreatment: { medication: string; response: string } | null;
    onAlphaBlockers?: boolean;
  }): string {
    // Conservative for older patients (>65) or alpha-blocker users
    if (profile.age > 65 || profile.onAlphaBlockers) {
      return 'CONSERVATIVE_25';
    }

    // Check for spontaneity preference
    if (profile.patientPreference === 'spontaneity') {
      return 'DAILY_TADALAFIL_5';
    }

    // Check for longer window preference
    if (profile.patientPreference === 'longer_window') {
      return 'ON_DEMAND_TADALAFIL_10';
    }

    // Check if previous 50mg sildenafil was insufficient
    if (
      profile.previousTreatment?.medication === 'sildenafil_50' &&
      profile.previousTreatment?.response === 'insufficient'
    ) {
      return 'ON_DEMAND_SILDENAFIL_100';
    }

    // Default first-line: on-demand sildenafil 50mg
    return 'ON_DEMAND_SILDENAFIL_50';
  }

  /**
   * Parse blood pressure string
   */
  private parseBP(bpString: string): { systolic: number; diastolic: number } | null {
    if (!bpString || typeof bpString !== 'string') return null;
    const match = bpString.match(/(\d+)\s*[\/]\s*(\d+)/);
    if (!match) return null;
    return {
      systolic: parseInt(match[1], 10),
      diastolic: parseInt(match[2], 10),
    };
  }
}

// ============================================
// ED TYPES AND TEMPLATES
// ============================================

// ED template definition with counseling text
export interface EDTemplateDefinition {
  name: string;
  description: string;
  medications: Medication[];
  whenToUse: string;
  counselingText?: string;
}

// ED contraindication result
export interface EDContraindicationCheckResult {
  isBlocked: boolean;
  requiresCaution: boolean;
  action?: 'ABSOLUTE_BLOCK' | 'BLOCK' | 'CAUTION';
  reasons: string[];
  flags: string[];
}

// ED canned message
export interface EDCannedMessage {
  id: string;
  name: string;
  template: string;
}

// ED referral result
export interface EDReferralResult {
  action: string;
  reason: string;
  message: string;
  referTo?: string;
  tests?: string[];
}

// Standard counseling text for all ED prescriptions
const ED_COUNSELING_TEXT = `Take on empty stomach for faster effect (sildenafil) / can take with food (tadalafil).
sexual stimulation still required — medication does not cause automatic erection.
Do NOT combine with nitrates, recreational "poppers," or other PDE5 inhibitors.
Seek emergency help if erection lasts >4 hours.
Common side effects: headache, flushing, nasal congestion — usually mild and temporary.
Avoid grapefruit juice (affects metabolism).`;

// Spec: ED spec Section 6 — 7 templates
export const ED_TEMPLATES: Record<string, EDTemplateDefinition> = {
  ON_DEMAND_SILDENAFIL_50: {
    name: 'On-Demand Sildenafil',
    description: 'Standard first-line treatment',
    whenToUse: 'Standard first-line. Works 4-6hrs.',
    medications: [
      {
        name: 'Sildenafil',
        dosage: '50mg',
        frequency: 'Take 30-60min before sexual activity, max once daily',
        instructions: 'Take on empty stomach for faster effect',
      },
    ],
    counselingText: ED_COUNSELING_TEXT,
  },
  ON_DEMAND_SILDENAFIL_100: {
    name: 'On-Demand Sildenafil (High)',
    description: 'Higher dose sildenafil',
    whenToUse: 'Previous 50mg insufficient after 6-8 attempts',
    medications: [
      {
        name: 'Sildenafil',
        dosage: '100mg',
        frequency: 'Take 30-60min before sexual activity, max once daily',
        instructions: 'Take on empty stomach for faster effect',
      },
    ],
    counselingText: ED_COUNSELING_TEXT,
  },
  ON_DEMAND_TADALAFIL_10: {
    name: 'On-Demand Tadalafil',
    description: 'Tadalafil for longer window',
    whenToUse: 'Patient wants longer window / spontaneity',
    medications: [
      {
        name: 'Tadalafil',
        dosage: '10mg',
        frequency: 'Take 30min before, effective up to 36hrs',
        instructions: 'Can take with or without food',
      },
    ],
    counselingText: ED_COUNSELING_TEXT,
  },
  ON_DEMAND_TADALAFIL_20: {
    name: 'On-Demand Tadalafil (High)',
    description: 'Higher dose tadalafil',
    whenToUse: 'Previous 10mg insufficient',
    medications: [
      {
        name: 'Tadalafil',
        dosage: '20mg',
        frequency: 'Take 30min before, effective up to 36hrs',
        instructions: 'Can take with or without food',
      },
    ],
    counselingText: ED_COUNSELING_TEXT,
  },
  DAILY_TADALAFIL_5: {
    name: 'Daily Tadalafil',
    description: 'Daily low-dose for spontaneity',
    whenToUse: 'Patient wants spontaneity, frequent sexual activity, also has BPH symptoms',
    medications: [
      {
        name: 'Tadalafil',
        dosage: '5mg',
        frequency: 'Take once daily (every day, regardless of activity)',
        instructions: 'Take at the same time each day',
      },
    ],
    counselingText: ED_COUNSELING_TEXT,
  },
  CONSERVATIVE_25: {
    name: 'Conservative Start',
    description: 'Lower dose for older patients or those on alpha-blockers',
    whenToUse: 'older patient, on alpha-blockers, liver/kidney concerns',
    medications: [
      {
        name: 'Sildenafil',
        dosage: '25mg',
        frequency: 'Take 30-60min before sexual activity, max once daily',
        instructions: 'Take on empty stomach for faster effect',
      },
    ],
    counselingText: ED_COUNSELING_TEXT,
  },
  ED_CUSTOM: {
    name: 'Custom',
    description: 'Doctor builds from scratch',
    whenToUse: 'Complex cases',
    medications: [],
  },
};

// Spec: ED spec Section 7 — 6 canned messages
export const ED_CANNED_MESSAGES: EDCannedMessage[] = [
  {
    id: 'ed_prescribed',
    name: 'Prescription Instructions',
    template:
      "I've prescribed [medication] for you. Take it [instructions]. Give it 6-8 attempts before judging effectiveness.",
  },
  {
    id: 'ed_daily_tadalafil',
    name: 'Daily Tadalafil Recommendation',
    template:
      "Based on your responses, I'd recommend trying daily low-dose tadalafil for more spontaneity.",
  },
  {
    id: 'ed_counseling',
    name: 'Counseling Recommendation',
    template:
      'Your symptoms suggest a significant stress/anxiety component. I recommend combining medication with counseling.',
  },
  {
    id: 'ed_testosterone_check',
    name: 'Testosterone Check',
    template:
      'I need to check your testosterone levels before prescribing. Please complete the blood panel.',
  },
  {
    id: 'ed_cardiology_clearance',
    name: 'Cardiology Clearance',
    template:
      'Please see your cardiologist for clearance before I can safely prescribe ED medication.',
  },
  {
    id: 'ed_dose_adjustment',
    name: 'Dose Adjustment',
    template:
      "I've adjusted your dose to [new dose]. Let me know how it works at the next check-in.",
  },
];
