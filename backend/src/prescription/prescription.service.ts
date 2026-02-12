import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConsultationStatus, UserRole } from '@prisma/client';

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
  duration?: string | undefined;
  instructions?: string | undefined;
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

// Contraindication check result (public/resolver facing)
export interface ContraindicationCheckResult {
  isBlocked: boolean;
  requiresDoctorReview: boolean;
  suggestMinoxidilOnly?: boolean;
  reasons: string[];
  flags: string[];
}

// Internal contraindication check result (used by check functions)
export interface InternalContraindicationCheck {
  safe: boolean;
  action?: 'BLOCK' | 'ABSOLUTE_BLOCK' | 'CAUTION';
  concerns: string[];
}

// Create prescription input
export interface CreatePrescriptionInput {
  consultationId: string;
  doctorId: string;
  template: PrescriptionTemplate;
  customMedications?: Medication[] | undefined;
  instructions?: string | undefined;
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
   * @todo Use when implementing full order number generation
   */
  // @ts-expect-error Utility method reserved for future use
  private _generateOrderNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ORD-${timestamp}-${random}`;
  }

  /**
   * Calculate patient age from DOB
   * @todo Use when implementing age-based prescription logic
   */
  // @ts-expect-error Utility method reserved for future use
  private _calculateAge(dateOfBirth: Date | null): number {
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

    // Patient profile for address info
    const profile = consultation.patient.patientProfile;

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

    // Generate unique order number (format: ORD-XXXXXX)
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Convert medications to order items
    const items = medications.map((med) => ({
      name: med.name,
      dosage: med.dosage,
      quantity: med.quantity || 1,
      frequency: med.frequency,
      duration: med.duration,
    }));

    // Create order (Spec: master spec Section 8 — Order model)
    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        patientId: consultation.patientId,
        prescriptionId: prescription.id,
        consultationId: input.consultationId,
        items,
        // Status defaults to PRESCRIPTION_CREATED via schema default
        medicationCost: 0, // To be calculated based on actual pricing
        deliveryCost: 0,
        totalAmount: 0,
        deliveryAddress: [
          profile?.addressLine1 || '',
          profile?.addressLine2 || '',
        ].filter(Boolean).join(', ') || 'Address pending',
        deliveryCity: profile?.city || 'City pending',
        deliveryPincode: profile?.pincode || '000000',
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
    if (!match || !match[1] || !match[2]) return null;
    return {
      systolic: parseInt(match[1], 10),
      diastolic: parseInt(match[2], 10),
    };
  }

  // ============================================
  // WEIGHT MANAGEMENT METHODS
  // Spec: Weight Management spec Section 6 (Prescription Templates)
  // ============================================

  /**
   * Get Weight prescription templates
   * Spec: Weight Management spec Section 6 — 6 templates
   */
  getWeightTemplates(): Record<string, WeightTemplateDefinition> {
    return WEIGHT_TEMPLATES;
  }

  /**
   * Get Weight canned messages
   */
  getWeightCannedMessages(): WeightCannedMessage[] {
    return WEIGHT_CANNED_MESSAGES;
  }

  /**
   * Check Weight Orlistat contraindications
   * Spec: Weight Management spec Section 5 — Orlistat contraindications
   */
  checkWeightOrlistatContraindications(responses: Record<string, any>): {
    safe: boolean;
    action?: 'BLOCK' | 'CAUTION';
    concerns: string[];
  } {
    const concerns: string[] = [];
    const conditions = responses.Q13 || [];

    // BLOCK: Chronic malabsorption syndrome
    if (
      Array.isArray(conditions) &&
      conditions.some((c: string) => c.toLowerCase().includes('malabsorption'))
    ) {
      concerns.push('Chronic malabsorption syndrome');
      return { safe: false, action: 'BLOCK', concerns };
    }

    // BLOCK: Cholestasis
    if (
      Array.isArray(conditions) &&
      conditions.some((c: string) => c.toLowerCase().includes('cholestasis'))
    ) {
      concerns.push('Cholestasis');
      return { safe: false, action: 'BLOCK', concerns };
    }

    // BLOCK: Pregnancy
    if (responses.Q2 === 'Female' && responses.Q15 === 'Yes') {
      concerns.push('Pregnant or breastfeeding');
      return { safe: false, action: 'BLOCK', concerns };
    }

    // CAUTION: Gallstones
    if (
      Array.isArray(conditions) &&
      conditions.some(
        (c: string) =>
          c.toLowerCase().includes('gallbladder') || c.toLowerCase().includes('gallstone'),
      )
    ) {
      concerns.push('Gallstones present — may worsen');
      return { safe: false, action: 'CAUTION', concerns };
    }

    // CAUTION: Kidney disease (oxalate stones)
    if (
      Array.isArray(conditions) &&
      conditions.some((c: string) => c.toLowerCase().includes('kidney'))
    ) {
      concerns.push('Kidney disease — oxalate stone risk');
      return { safe: false, action: 'CAUTION', concerns };
    }

    return { safe: true, concerns: [] };
  }

  /**
   * Check Weight GLP-1 contraindications
   * Spec: Weight Management spec Section 5 — GLP-1 contraindications
   */
  checkWeightGLP1Contraindications(responses: Record<string, any>): {
    safe: boolean;
    action?: 'ABSOLUTE_BLOCK' | 'BLOCK';
    concerns: string[];
  } {
    const concerns: string[] = [];

    // ABSOLUTE BLOCK: Pancreatitis history
    if (responses.Q16 === 'Yes') {
      concerns.push('History of pancreatitis');
      return { safe: false, action: 'ABSOLUTE_BLOCK', concerns };
    }

    // ABSOLUTE BLOCK: MTC/MEN2 history
    if (responses.Q17 === 'Yes') {
      concerns.push('History of medullary thyroid carcinoma or MEN2');
      return { safe: false, action: 'ABSOLUTE_BLOCK', concerns };
    }

    // BLOCK: Pregnancy
    if (responses.Q2 === 'Female' && responses.Q15 === 'Yes') {
      concerns.push('Pregnant or breastfeeding');
      return { safe: false, action: 'BLOCK', concerns };
    }

    // BLOCK: Eating disorder
    const conditions = responses.Q13 || [];
    if (Array.isArray(conditions)) {
      const hasEatingDisorder = conditions.some(
        (c: string) =>
          c.toLowerCase().includes('eating disorder') ||
          c.toLowerCase().includes('anorexia') ||
          c.toLowerCase().includes('bulimia'),
      );
      if (hasEatingDisorder) {
        concerns.push('Eating disorder history');
        return { safe: false, action: 'BLOCK', concerns };
      }
    }

    return { safe: true, concerns: [] };
  }

  /**
   * Check Weight Metformin contraindications
   * Spec: Weight Management spec Section 5 — Metformin contraindications
   */
  checkWeightMetforminContraindications(responses: Record<string, any>): {
    safe: boolean;
    action?: 'BLOCK' | 'CAUTION';
    concerns: string[];
  } {
    const concerns: string[] = [];
    const conditions = responses.Q13 || [];

    // BLOCK: Severe kidney disease
    if (
      Array.isArray(conditions) &&
      conditions.some((c: string) => c.toLowerCase().includes('kidney'))
    ) {
      concerns.push('Kidney disease');
      return { safe: false, action: 'BLOCK', concerns };
    }

    // BLOCK: Pregnancy
    if (responses.Q2 === 'Female' && responses.Q15 === 'Yes') {
      concerns.push('Pregnant or breastfeeding');
      return { safe: false, action: 'BLOCK', concerns };
    }

    // CAUTION: Liver disease
    if (
      Array.isArray(conditions) &&
      conditions.some(
        (c: string) =>
          c.toLowerCase().includes('liver') || c.toLowerCase().includes('fatty liver'),
      )
    ) {
      concerns.push('Liver disease');
      return { safe: false, action: 'CAUTION', concerns };
    }

    return { safe: true, concerns: [] };
  }

  /**
   * Check Weight referral needs
   * Spec: Weight Management spec Section 8 — Referral Edge Cases
   */
  checkWeightReferral(profile: {
    bmi: number;
    conditions: string[];
    glp1Eligible: boolean;
    classification?: string;
  }): WeightReferralResult {
    // Eating disorder flag = DO NOT PRESCRIBE
    if (profile.classification === 'eating_disorder_flag') {
      return {
        referralNeeded: true,
        referralType: 'mental_health',
        specialties: ['PSYCHIATRY', 'EATING_DISORDER_SPECIALIST'],
        action: 'DO_NOT_PRESCRIBE',
        message:
          'We want to help you with your weight goals safely. Given your history, I recommend working with a counselor who specializes in eating and body image before starting medication.',
      };
    }

    // BMI ≥40 = bariatric surgery discussion
    if (profile.bmi >= 40) {
      return {
        referralNeeded: true,
        referralType: 'bariatric_surgery_discussion',
        specialties: ['BARIATRIC_SURGERY'],
        message:
          'Medication can help, but at your BMI, bariatric surgery may offer more significant, lasting results. We can refer you to a surgeon while also starting medication.',
      };
    }

    // BMI ≥35 with comorbidities = bariatric surgery discussion
    if (profile.bmi >= 35) {
      const comorbidities = ['diabetes', 'blood pressure', 'sleep apnea'];
      const hasComorbidity = profile.conditions.some((c) =>
        comorbidities.some((cm) => c.toLowerCase().includes(cm)),
      );
      if (hasComorbidity) {
        return {
          referralNeeded: true,
          referralType: 'bariatric_surgery_discussion',
          specialties: ['BARIATRIC_SURGERY'],
          message:
            'Given your BMI and health conditions, bariatric surgery may be beneficial alongside medication.',
        };
      }
    }

    // Thyroid suspected
    if (profile.classification === 'thyroid_suspected') {
      return {
        referralNeeded: true,
        referralType: 'blood_work_thyroid',
        specialties: ['ENDOCRINOLOGY'],
        message:
          "Let's check your thyroid first — it could be the main reason for weight gain.",
      };
    }

    // PCOS related
    if (
      profile.classification === 'pcos_related' ||
      profile.conditions.some((c) => c.toLowerCase().includes('pcos'))
    ) {
      return {
        referralNeeded: true,
        referralType: 'pcos_vertical_redirect',
        specialties: ['GYNECOLOGY', 'ENDOCRINOLOGY'],
        message:
          'Your symptoms suggest PCOS may be contributing to weight gain. Our PCOS program addresses both hormones and weight together.',
      };
    }

    // Medication induced
    if (profile.classification === 'medication_induced') {
      return {
        referralNeeded: true,
        referralType: 'prescriber_consult',
        message:
          "Your weight gain may be related to your medication. I'd recommend discussing alternatives with your prescribing doctor. Meanwhile, we can support you with lifestyle strategies.",
      };
    }

    return { referralNeeded: false };
  }

  /**
   * Suggest appropriate Weight template
   * Spec: Weight Management spec Section 6 — Template selection logic
   */
  suggestWeightTemplate(profile: {
    bmi: number;
    conditions: string[];
    patientPreference: 'lifestyle_only' | 'medication' | 'glp1';
    glp1Eligible: boolean;
  }): string {
    // If patient prefers lifestyle only
    if (profile.patientPreference === 'lifestyle_only') {
      return 'LIFESTYLE_ONLY';
    }

    // Check for insulin resistance / pre-diabetes
    const hasInsulinResistance = profile.conditions.some(
      (c) =>
        c.toLowerCase().includes('pre-diabetes') ||
        c.toLowerCase().includes('insulin resistance') ||
        c.toLowerCase().includes('type 2 diabetes'),
    );

    // GLP-1 preference and eligible
    if (profile.patientPreference === 'glp1' && profile.glp1Eligible) {
      if (hasInsulinResistance) {
        return 'GLP1_METFORMIN';
      }
      return 'GLP1_STANDARD';
    }

    // If BMI 25-27.9 with no comorbidities, suggest lifestyle
    if (profile.bmi < 28 && profile.conditions.length === 0) {
      return 'LIFESTYLE_ONLY';
    }

    // If has insulin resistance, add metformin
    if (hasInsulinResistance) {
      return 'METFORMIN_ADDON';
    }

    // Default: standard orlistat
    return 'STANDARD_ORLISTAT';
  }

  // ============================================
  // PCOS PRESCRIPTION METHODS
  // Spec: PCOS spec Section 6 (Prescription Templates)
  // ============================================

  /**
   * Get PCOS templates for NOT trying to conceive
   */
  getPCOSTemplatesNotTrying(): Record<string, PCOSTemplateDefinition> {
    return PCOS_TEMPLATES_NOT_TRYING;
  }

  /**
   * Get PCOS templates for trying to conceive
   */
  getPCOSTemplatesTrying(): Record<string, PCOSTemplateDefinition> {
    return PCOS_TEMPLATES_TRYING;
  }

  /**
   * Get PCOS canned messages
   */
  getPCOSCannedMessages(): PCOSCannedMessage[] {
    return PCOS_CANNED_MESSAGES;
  }

  /**
   * Check combined OCP contraindications for PCOS
   * Spec: PCOS spec Section 5 — Combined OCP contraindicated for blood clots, migraine with aura, etc.
   */
  checkPCOSCombinedOCPContraindications(
    responses: Record<string, any>,
  ): InternalContraindicationCheck {
    const concerns: string[] = [];
    const conditions = responses.Q22 || [];

    // ABSOLUTE BLOCK: Pregnancy
    if (responses.Q21 === 'Yes, pregnant') {
      concerns.push('Pregnancy');
      return {
        safe: false,
        action: 'ABSOLUTE_BLOCK',
        concerns,
      };
    }

    // ABSOLUTE BLOCK: Blood clot history
    if (Array.isArray(conditions) && conditions.includes('Blood clot history (DVT/PE)')) {
      concerns.push('Blood clot history');
      return {
        safe: false,
        action: 'ABSOLUTE_BLOCK',
        concerns,
      };
    }

    // ABSOLUTE BLOCK: Migraine with aura
    if (Array.isArray(conditions) && conditions.includes('Migraine with aura')) {
      concerns.push('Migraine with aura');
      return {
        safe: false,
        action: 'ABSOLUTE_BLOCK',
        concerns,
      };
    }

    // BLOCK: Liver disease
    if (Array.isArray(conditions) && conditions.includes('Liver disease')) {
      concerns.push('Liver disease');
      return {
        safe: false,
        action: 'BLOCK',
        concerns,
      };
    }

    // BLOCK: Smoker >35
    const age = responses.Q2;
    if (
      typeof age === 'number' &&
      age > 35 &&
      Array.isArray(conditions) &&
      conditions.includes('Smoker')
    ) {
      concerns.push('Smoker over 35');
      return {
        safe: false,
        action: 'BLOCK',
        concerns,
      };
    }

    // BLOCK: Breastfeeding
    if (responses.Q21 === 'Yes, breastfeeding') {
      concerns.push('Breastfeeding');
      return {
        safe: false,
        action: 'BLOCK',
        concerns,
      };
    }

    return { safe: true, concerns: [] };
  }

  /**
   * Check spironolactone contraindications for PCOS
   * Spec: PCOS spec Section 5 — Spironolactone is TERATOGENIC
   */
  checkPCOSSpironolactoneContraindications(
    responses: Record<string, any>,
  ): InternalContraindicationCheck {
    const concerns: string[] = [];
    const conditions = responses.Q22 || [];

    // ABSOLUTE BLOCK: Pregnancy (teratogenic)
    if (responses.Q21 === 'Yes, pregnant') {
      concerns.push('Pregnancy — teratogenic');
      return {
        safe: false,
        action: 'ABSOLUTE_BLOCK',
        concerns,
      };
    }

    // ABSOLUTE BLOCK: Trying to conceive
    if (responses.Q19 === 'Yes') {
      concerns.push('Trying to conceive — teratogenic, requires reliable contraception');
      return {
        safe: false,
        action: 'ABSOLUTE_BLOCK',
        concerns,
      };
    }

    // BLOCK: Renal impairment
    if (Array.isArray(conditions) && conditions.includes('Kidney disease')) {
      concerns.push('Kidney disease — renal impairment');
      return {
        safe: false,
        action: 'BLOCK',
        concerns,
      };
    }

    return { safe: true, concerns: [] };
  }

  /**
   * Check metformin contraindications for PCOS
   * Spec: PCOS spec Section 5 — Metformin contraindications
   */
  checkPCOSMetforminContraindications(
    responses: Record<string, any>,
  ): InternalContraindicationCheck {
    const concerns: string[] = [];
    const conditions = responses.Q22 || [];

    // BLOCK: Severe kidney disease
    if (Array.isArray(conditions) && conditions.includes('Kidney disease')) {
      concerns.push('Kidney disease');
      return {
        safe: false,
        action: 'BLOCK',
        concerns,
      };
    }

    // BLOCK: Severe liver disease
    if (Array.isArray(conditions) && conditions.includes('Liver disease')) {
      concerns.push('Liver disease');
      return {
        safe: false,
        action: 'BLOCK',
        concerns,
      };
    }

    return { safe: true, concerns: [] };
  }

  /**
   * Check PCOS referral needs
   * Spec: PCOS spec Section 8 — Referral Edge Cases
   */
  checkPCOSReferral(profile: {
    rotterdamCriteriaMet: number;
    fertilityIntent: 'trying' | 'planning_soon' | 'not_planning' | 'unsure';
    tryingDuration?: string;
    conditions: string[];
    needsUltrasound?: boolean;
    rapidVirilization?: boolean;
    wantsBC?: boolean;
    severeCysticAcne?: boolean;
    endometriosisSuspected?: boolean;
    amenorrheaMonths?: number;
  }): PCOSReferralResult {
    // Ultrasound needed
    if (profile.needsUltrasound) {
      return {
        referralNeeded: true,
        referralType: 'ultrasound',
        message: 'To confirm diagnosis, we recommend a pelvic ultrasound.',
        urgency: 'routine',
      };
    }

    // URGENT: Rapid virilization
    if (profile.rapidVirilization) {
      return {
        referralNeeded: true,
        referralType: 'urgent_endocrinology',
        specialties: ['ENDOCRINOLOGY'],
        message: 'Symptoms need urgent in-person evaluation to rule out androgen-secreting tumor.',
        urgency: 'urgent',
      };
    }

    // Fertility specialist for trying >12 months
    if (
      profile.fertilityIntent === 'trying' &&
      (profile.tryingDuration === '1-2 years' || profile.tryingDuration === '2+ years')
    ) {
      return {
        referralNeeded: true,
        referralType: 'fertility_specialist',
        specialties: ['REPRODUCTIVE_MEDICINE'],
        message: 'A fertility specialist can offer monitored treatments.',
        urgency: 'high',
      };
    }

    // Blood clot history + wants BC
    if (
      profile.wantsBC &&
      profile.conditions.some((c) => c.includes('Blood clot'))
    ) {
      return {
        referralNeeded: false,
        alternativeSuggested: 'PROGESTIN_ONLY',
        message: "Combined BC isn't safe. Here are alternative progestin-only options.",
      };
    }

    // Severe cystic acne
    if (profile.severeCysticAcne) {
      return {
        referralNeeded: true,
        referralType: 'dermatology',
        specialties: ['DERMATOLOGY'],
        message: 'May need isotretinoin (requires in-person dermatology consultation).',
        urgency: 'routine',
      };
    }

    // Eating disorder
    if (profile.conditions.some((c) => c.includes('Eating disorder'))) {
      return {
        referralNeeded: true,
        referralType: 'mental_health_counseling',
        specialties: ['PSYCHIATRY', 'COUNSELING'],
        message: "Let's connect you with a counselor alongside PCOS care.",
        urgency: 'high',
      };
    }

    // Endometriosis suspected
    if (profile.endometriosisSuspected) {
      return {
        referralNeeded: true,
        referralType: 'gynecology_in_person',
        specialties: ['GYNECOLOGY'],
        message: 'Additional condition needs in-person evaluation.',
        urgency: 'routine',
      };
    }

    // Amenorrhea >6 months
    if (profile.amenorrheaMonths && profile.amenorrheaMonths >= 6) {
      return {
        referralNeeded: false,
        bloodWorkRequired: true,
        endometrialProtectionNeeded: true,
        message: 'Long gaps can affect uterine health. Blood work ordered and endometrial protection discussed.',
      };
    }

    // No referral needed for standard PCOS
    return { referralNeeded: false };
  }

  /**
   * Suggest PCOS template based on patient profile
   * Spec: PCOS spec Section 6 — Template selection logic
   */
  suggestPCOSTemplate(profile: {
    fertilityIntent: 'trying' | 'planning_soon' | 'not_planning' | 'unsure';
    primaryConcern: 'irregular_periods' | 'fertility' | 'acne_hirsutism' | 'weight' | 'multiple';
    insulinResistance: boolean;
    bmi: number;
    bcContraindicated?: boolean;
    prefersMinimalMedication?: boolean;
    tryingDuration?: string;
  }): string {
    // TRYING TO CONCEIVE
    if (profile.fertilityIntent === 'trying') {
      // Refer if trying >12 months
      if (
        profile.tryingDuration === '1-2 years' ||
        profile.tryingDuration === '2+ years'
      ) {
        return 'REFER_FERTILITY_SPECIALIST';
      }

      // Metformin first if insulin resistant
      if (profile.insulinResistance) {
        return 'FERTILITY_METFORMIN';
      }

      // Lifestyle first if overweight and just started trying
      if (profile.bmi >= 28 && profile.tryingDuration === '<6 months') {
        return 'FERTILITY_LIFESTYLE_FIRST';
      }

      // Ovulation induction
      return 'OVULATION_INDUCTION';
    }

    // NOT TRYING TO CONCEIVE
    // BC contraindicated
    if (profile.bcContraindicated) {
      return 'PROGESTIN_ONLY';
    }

    // Prefers minimal medication
    if (profile.prefersMinimalMedication) {
      return 'NATURAL_SUPPLEMENT';
    }

    // Multiple symptoms with metabolic features
    if (profile.primaryConcern === 'multiple' && profile.insulinResistance) {
      return 'COMPREHENSIVE';
    }

    // Insulin focused (weight concern or IR)
    if (profile.insulinResistance || profile.primaryConcern === 'weight') {
      return 'INSULIN_FOCUSED';
    }

    // Anti-androgen for acne/hirsutism
    if (profile.primaryConcern === 'acne_hirsutism') {
      return 'ANTI_ANDROGEN';
    }

    // Lean PCOS - normal BMI (WHO Asian: <23) without insulin resistance
    // BMI <23 is truly lean for Asian population
    if (profile.bmi < 23 && !profile.insulinResistance) {
      return 'LEAN_PCOS';
    }

    // Default: Cycle regulation (for BMI 23-27 normal range)
    return 'CYCLE_REGULATION';
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
  action?: 'ABSOLUTE_BLOCK' | 'BLOCK' | 'CAUTION' | undefined;
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

// ============================================
// WEIGHT MANAGEMENT TEMPLATES
// Spec: Weight Management spec Section 6 (Prescription Templates)
// ============================================

export interface WeightTemplateDefinition {
  name: string;
  description: string;
  whenToUse: string;
  medications: Medication[];
  dietGuidelines?: string;
  exerciseRecommendation?: string;
}

// Spec: Weight Management spec Section 6 — 6 templates
export const WEIGHT_TEMPLATES: Record<string, WeightTemplateDefinition> = {
  LIFESTYLE_ONLY: {
    name: 'Lifestyle Only',
    description: 'Diet plan + exercise plan + supplements',
    whenToUse: 'BMI 25-27.9, no comorbidities, patient prefers no meds',
    medications: [
      {
        name: 'Vitamin D',
        dosage: '1000 IU',
        frequency: 'Once daily',
        instructions: 'Take with food for better absorption',
      },
      {
        name: 'Fiber Supplement',
        dosage: '5g',
        frequency: 'Once daily',
        instructions: 'Mix with water, take before main meal',
      },
    ],
    dietGuidelines: 'Personalized calorie target based on BMR, high protein emphasis',
    exerciseRecommendation: '150 minutes moderate activity per week',
  },
  STANDARD_ORLISTAT: {
    name: 'Standard (Orlistat)',
    description: 'Orlistat with each main meal + multivitamin',
    whenToUse: 'BMI ≥28 or ≥25 with comorbidities',
    medications: [
      {
        name: 'Orlistat',
        dosage: '120mg',
        frequency: 'With each main meal (3x daily)',
        instructions: 'Take during or up to 1 hour after meals containing fat. Skip dose if meal has no fat.',
      },
      {
        name: 'Multivitamin',
        dosage: '1 tablet',
        frequency: 'Once daily at bedtime',
        instructions: 'Take 2+ hours away from Orlistat to ensure vitamin absorption',
      },
    ],
    dietGuidelines: 'Low-fat diet (<30% calories from fat) to reduce GI side effects',
    exerciseRecommendation: '150 minutes moderate activity per week',
  },
  METFORMIN_ADDON: {
    name: 'Metformin Add-On',
    description: 'Metformin + Orlistat for insulin resistant patients',
    whenToUse: 'Pre-diabetes, insulin resistance, PCOS co-management',
    medications: [
      {
        name: 'Metformin',
        dosage: '500mg',
        frequency: 'Once daily with dinner, titrate to 1000mg after 2 weeks if tolerated',
        instructions: 'Take with food to reduce GI upset',
      },
      {
        name: 'Orlistat',
        dosage: '120mg',
        frequency: 'With each main meal (3x daily)',
        instructions: 'Take during or up to 1 hour after meals containing fat',
      },
      {
        name: 'Multivitamin',
        dosage: '1 tablet',
        frequency: 'Once daily at bedtime',
        instructions: 'Take 2+ hours away from Orlistat',
      },
    ],
    dietGuidelines: 'Low-carb, low-fat diet. Monitor blood sugar.',
    exerciseRecommendation: '150 minutes moderate activity per week',
  },
  GLP1_STANDARD: {
    name: 'GLP-1 Standard',
    description: 'Semaglutide injection (premium tier)',
    whenToUse: 'BMI ≥30 or ≥27 with comorbidities, premium tier',
    medications: [
      {
        name: 'Semaglutide',
        dosage: '0.25mg',
        frequency: 'Once weekly (subcutaneous injection)',
        instructions: 'Start at 0.25mg, increase to 0.5mg after 4 weeks, then 1mg, then up to 2.4mg based on tolerance',
      },
    ],
    dietGuidelines: 'Balanced diet with protein emphasis. Smaller, more frequent meals.',
    exerciseRecommendation: '150 minutes moderate activity per week',
  },
  GLP1_METFORMIN: {
    name: 'GLP-1 + Metformin',
    description: 'Semaglutide + Metformin for insulin resistant patients',
    whenToUse: 'Insulin resistant + premium tier',
    medications: [
      {
        name: 'Semaglutide',
        dosage: '0.25mg',
        frequency: 'Once weekly (subcutaneous injection)',
        instructions: 'Start at 0.25mg, titrate up based on tolerance',
      },
      {
        name: 'Metformin',
        dosage: '500mg',
        frequency: 'Once daily with dinner, titrate to 1000mg after 2 weeks',
        instructions: 'Take with food to reduce GI upset',
      },
    ],
    dietGuidelines: 'Low-carb balanced diet. Monitor blood sugar.',
    exerciseRecommendation: '150 minutes moderate activity per week',
  },
  WEIGHT_CUSTOM: {
    name: 'Custom',
    description: 'Doctor builds from scratch',
    whenToUse: 'Complex cases',
    medications: [],
  },
};

// Spec: Weight Management spec Section 7 — Canned messages
export interface WeightCannedMessage {
  id: string;
  name: string;
  template: string;
  category: string;
}

export const WEIGHT_CANNED_MESSAGES: WeightCannedMessage[] = [
  {
    id: 'weight_orlistat_started',
    name: 'Orlistat Introduction',
    template:
      "I've started you on Orlistat 120mg. Take it with each meal containing fat. You may experience GI side effects (oily stools, urgency) — these reduce with a low-fat diet. Take your multivitamin at bedtime.",
    category: 'medication',
  },
  {
    id: 'weight_glp1_intro',
    name: 'GLP-1 Introduction',
    template:
      "I've prescribed Semaglutide (weekly injection). Start at 0.25mg for 4 weeks, then increase to 0.5mg. Nausea is common initially but usually improves. Eat smaller meals and stay hydrated.",
    category: 'medication',
  },
  {
    id: 'weight_lifestyle_focus',
    name: 'Lifestyle Focus',
    template:
      "I'm starting with a lifestyle-focused approach. Your personalized diet plan targets [calories] calories daily with [protein]g protein. Aim for 150 minutes of moderate exercise weekly. We'll reassess in 3 months.",
    category: 'lifestyle',
  },
  {
    id: 'weight_metformin_info',
    name: 'Metformin Information',
    template:
      "I've added Metformin to help with insulin resistance. Start with 500mg daily with dinner. We'll increase to 1000mg after 2 weeks if tolerated. Take with food to minimize GI upset.",
    category: 'medication',
  },
  {
    id: 'weight_blood_work_needed',
    name: 'Blood Work Required',
    template:
      "Before starting medication, I need baseline blood work: fasting glucose, HbA1c, lipid panel, and thyroid function. Please complete this within the next week.",
    category: 'lab',
  },
  {
    id: 'weight_thyroid_check',
    name: 'Thyroid Check',
    template:
      "Your symptoms suggest possible thyroid involvement. Let's check your TSH, T3, and T4 levels before starting weight loss medication. This will help us address any underlying cause.",
    category: 'lab',
  },
  {
    id: 'weight_progress_check',
    name: 'Progress Check',
    template:
      "It's been [weeks] weeks. How are you finding the medication? Any side effects? What's your current weight? Let's discuss your progress and any adjustments needed.",
    category: 'followup',
  },
];

// Weight referral result interface
export interface WeightReferralResult {
  referralNeeded: boolean;
  referralType?: string;
  specialties?: string[];
  message?: string;
  action?: string;
}

// ============================================
// PCOS TEMPLATES AND TYPES
// Spec: PCOS spec Section 6 (Prescription Templates)
// ============================================

// PCOS template definition
export interface PCOSTemplateDefinition {
  name: string;
  description: string;
  indication: string;
  medications: Medication[];
  monitoringRequired?: string[];
}

// PCOS canned message
export interface PCOSCannedMessage {
  id: string;
  name: string;
  template: string;
  category: string;
}

// PCOS referral result
export interface PCOSReferralResult {
  referralNeeded: boolean;
  referralType?: string;
  specialties?: string[];
  message?: string;
  urgency?: 'routine' | 'high' | 'urgent';
  alternativeSuggested?: string;
  bloodWorkRequired?: boolean;
  endometrialProtectionNeeded?: boolean;
}

// Spec: PCOS spec Section 6 — 7 templates for NOT trying to conceive
export const PCOS_TEMPLATES_NOT_TRYING: Record<string, PCOSTemplateDefinition> = {
  CYCLE_REGULATION: {
    name: 'Cycle Regulation',
    description: 'Combined OCP for irregular periods',
    indication: 'Irregular periods, no BC contraindications',
    medications: [
      {
        name: 'Combined OCP (Drospirenone/EE)',
        dosage: '3mg/30mcg',
        frequency: 'Once daily for 21 days, 7 day break',
        instructions: 'Start on day 1 of period or anytime with backup contraception for 7 days',
      },
    ],
    monitoringRequired: ['Blood pressure at 3 months'],
  },
  ANTI_ANDROGEN: {
    name: 'Anti-Androgen',
    description: 'Spironolactone for acne/hirsutism',
    indication: 'Acne/hirsutism primary concern, reliable contraception in place',
    medications: [
      {
        name: 'Spironolactone',
        dosage: '50mg',
        frequency: 'Once daily, may increase to 100mg after 2 months',
        instructions: 'Take with food. MUST use reliable contraception — teratogenic',
      },
      {
        name: 'Combined OCP (Drospirenone/EE)',
        dosage: '3mg/30mcg',
        frequency: 'Once daily for 21 days, 7 day break',
        instructions: 'Provides contraception and additional anti-androgen effect',
      },
    ],
    monitoringRequired: ['Potassium at 1 month and 3 months', 'Blood pressure'],
  },
  INSULIN_FOCUSED: {
    name: 'Insulin Focused',
    description: 'Metformin for insulin resistance',
    indication: 'Insulin resistance, weight gain, acanthosis nigricans',
    medications: [
      {
        name: 'Metformin',
        dosage: '500mg',
        frequency: 'Once daily with dinner, titrate to 1500-2000mg over 4-6 weeks',
        instructions: 'Take with food to reduce GI upset. Start low, go slow.',
      },
    ],
    monitoringRequired: ['Fasting glucose at 3 months', 'B12 annually'],
  },
  COMPREHENSIVE: {
    name: 'Comprehensive',
    description: 'Combined OCP + Spironolactone + Metformin',
    indication: 'Multiple symptoms, metabolic PCOS with acne/hirsutism',
    medications: [
      {
        name: 'Combined OCP (Drospirenone/EE)',
        dosage: '3mg/30mcg',
        frequency: 'Once daily for 21 days, 7 day break',
        instructions: 'Cycle regulation + anti-androgen + contraception',
      },
      {
        name: 'Spironolactone',
        dosage: '50-100mg',
        frequency: 'Once daily',
        instructions: 'Anti-androgen for acne/hirsutism. OCP provides required contraception.',
      },
      {
        name: 'Metformin',
        dosage: '500-1000mg',
        frequency: 'Once or twice daily with meals',
        instructions: 'For insulin resistance and weight management',
      },
    ],
    monitoringRequired: ['Potassium at 1 and 3 months', 'Fasting glucose', 'Blood pressure'],
  },
  LEAN_PCOS: {
    name: 'Lean PCOS',
    description: 'Combined OCP + lifestyle for normal BMI patients',
    indication: 'Normal BMI (<25), cycle/androgen issues without insulin resistance',
    medications: [
      {
        name: 'Combined OCP (Drospirenone/EE)',
        dosage: '3mg/30mcg',
        frequency: 'Once daily for 21 days, 7 day break',
        instructions: 'Cycle regulation + anti-androgen effect from drospirenone',
      },
    ],
    monitoringRequired: ['Blood pressure at 3 months'],
  },
  NATURAL_SUPPLEMENT: {
    name: 'Natural/Supplement',
    description: 'Supplements for patients preferring minimal medication',
    indication: 'Prefers minimal medication, mild symptoms',
    medications: [
      {
        name: 'Myo-Inositol',
        dosage: '2g',
        frequency: 'Twice daily (4g total)',
        instructions: 'Mix powder in water, take before meals',
      },
      {
        name: 'Vitamin D',
        dosage: '60,000 IU',
        frequency: 'Once weekly',
        instructions: 'Take with fatty meal for absorption',
      },
      {
        name: 'Omega-3 Fish Oil',
        dosage: '1000mg',
        frequency: 'Once daily',
        instructions: 'Take with food',
      },
    ],
    monitoringRequired: ['Vitamin D levels at 3 months'],
  },
  PROGESTIN_ONLY: {
    name: 'Progestin Only',
    description: 'Cyclical progesterone for BC contraindication cases',
    indication: 'Combined BC contraindication (blood clots, migraine with aura, etc.)',
    medications: [
      {
        name: 'Medroxyprogesterone',
        dosage: '10mg',
        frequency: 'Days 1-14 of each month',
        instructions: 'Induces withdrawal bleed to protect endometrium',
      },
    ],
    monitoringRequired: ['Annual pelvic ultrasound if amenorrheic'],
  },
};

// Spec: PCOS spec Section 6 — 4 templates for trying to conceive
export const PCOS_TEMPLATES_TRYING: Record<string, PCOSTemplateDefinition> = {
  FERTILITY_LIFESTYLE_FIRST: {
    name: 'Lifestyle First',
    description: 'Weight loss + supplements for fertility prep',
    indication: 'Mild PCOS, recently started trying, overweight',
    medications: [
      {
        name: 'Myo-Inositol',
        dosage: '2g',
        frequency: 'Twice daily',
        instructions: 'Improves ovulation and egg quality',
      },
      {
        name: 'Folic Acid',
        dosage: '5mg',
        frequency: 'Once daily',
        instructions: 'Essential for neural tube development',
      },
      {
        name: 'Vitamin D',
        dosage: '60,000 IU',
        frequency: 'Once weekly',
        instructions: 'Supports fertility and pregnancy',
      },
    ],
    monitoringRequired: ['BMI monthly', 'Ovulation tracking'],
  },
  OVULATION_INDUCTION: {
    name: 'Ovulation Induction',
    description: 'Letrozole for ovulation induction',
    indication: 'First-line for PCOS infertility (preferred over clomiphene)',
    medications: [
      {
        name: 'Letrozole',
        dosage: '2.5mg',
        frequency: 'Days 3-7 of cycle, may increase to 5mg',
        instructions: 'Start on day 3 of period. Monitor with ultrasound if available.',
      },
      {
        name: 'Folic Acid',
        dosage: '5mg',
        frequency: 'Once daily',
        instructions: 'Continue throughout treatment and pregnancy',
      },
    ],
    monitoringRequired: ['Ultrasound monitoring recommended', 'Ovulation tracking'],
  },
  FERTILITY_METFORMIN: {
    name: 'Metformin + Lifestyle',
    description: 'Metformin prep for conception (3-6 months)',
    indication: 'Insulin resistant, preparing for conception',
    medications: [
      {
        name: 'Metformin',
        dosage: '500mg',
        frequency: 'Once daily, titrate to 1500mg',
        instructions: 'Safe to continue into early pregnancy. Improves ovulation.',
      },
      {
        name: 'Folic Acid',
        dosage: '5mg',
        frequency: 'Once daily',
        instructions: 'Essential preconception supplement',
      },
      {
        name: 'Myo-Inositol',
        dosage: '2g',
        frequency: 'Twice daily',
        instructions: 'Complementary to metformin for insulin sensitivity',
      },
    ],
    monitoringRequired: ['Fasting glucose', 'Ovulation tracking'],
  },
  REFER_FERTILITY_SPECIALIST: {
    name: 'Refer to Fertility Specialist',
    description: 'Referral for complex fertility cases',
    indication: 'Trying >12 months, complex cases, needs specialist monitoring',
    medications: [
      {
        name: 'Folic Acid',
        dosage: '5mg',
        frequency: 'Once daily',
        instructions: 'Continue while waiting for specialist appointment',
      },
    ],
    monitoringRequired: ['Specialist appointment within 2-4 weeks'],
  },
};

// Spec: PCOS spec Section 7 — 6+ canned messages
export const PCOS_CANNED_MESSAGES: PCOSCannedMessage[] = [
  {
    id: 'pcos_cycle_regulation_started',
    name: 'Cycle Regulation Started',
    template:
      "I've started you on a combined birth control pill (OCP). This will regulate your periods and help with androgen-related symptoms. Expect some breakthrough bleeding in the first 1-2 months. Take at the same time daily.",
    category: 'medication',
  },
  {
    id: 'pcos_spironolactone_started',
    name: 'Spironolactone Started',
    template:
      "I've prescribed Spironolactone for your acne/excess hair. IMPORTANT: You MUST use reliable contraception as this medication can cause birth defects. We'll check potassium levels at 1 and 3 months. Expect results in 3-6 months.",
    category: 'medication',
  },
  {
    id: 'pcos_metformin_started',
    name: 'Metformin Started',
    template:
      "I've started you on Metformin for insulin resistance. Start with 500mg daily with dinner. GI side effects (nausea, diarrhea) are common initially but usually improve. We'll increase the dose gradually over 4-6 weeks.",
    category: 'medication',
  },
  {
    id: 'pcos_fertility_consult_needed',
    name: 'Fertility Consultation',
    template:
      "Since you've been trying to conceive for over 12 months, I recommend seeing a fertility specialist. They can offer monitored ovulation induction and additional interventions. I'll continue supporting your PCOS management alongside.",
    category: 'referral',
  },
  {
    id: 'pcos_blood_work_ordered',
    name: 'Blood Work Ordered',
    template:
      "I've ordered a PCOS diagnostic panel: testosterone, DHEA-S, LH, FSH, TSH, fasting glucose, and HbA1c. This will help confirm diagnosis and guide treatment. Please complete fasting (8+ hours) for accurate results.",
    category: 'lab',
  },
  {
    id: 'pcos_progress_check',
    name: 'Progress Check',
    template:
      "How are you doing with your treatment? I'd like to check: 1) Period regularity 2) Any side effects 3) Changes in acne/hair 4) Weight changes. Let me know and we can adjust as needed.",
    category: 'followup',
  },
  {
    id: 'pcos_lifestyle_guidance',
    name: 'Lifestyle Guidance',
    template:
      "For PCOS, lifestyle is as important as medication. Focus on: low-glycemic foods, 150+ minutes exercise weekly, stress management, and adequate sleep. Even 5-10% weight loss can restore ovulation and improve symptoms.",
    category: 'lifestyle',
  },
];
