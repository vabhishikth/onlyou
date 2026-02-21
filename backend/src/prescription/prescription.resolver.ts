import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import {
  PrescriptionService,
  PrescriptionTemplate,
  HAIR_LOSS_TEMPLATES,
  Medication,
} from './prescription.service';
import {
  PrescriptionType,
  CreatePrescriptionInput,
  CreatePrescriptionResponse,
  CheckContraindicationsInput,
  CheckContraindicationsResponse,
  TemplateSuggestionType,
  AvailableTemplatesResponse,
  RegeneratePdfResponse,
  DoctorPrescriptionItem,
  DoctorPrescriptionsFilterInput,
} from './dto/prescription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { HealthVertical } from '@prisma/client';

// Spec: master spec Section 5.4 (Prescription Builder)

@Resolver()
export class PrescriptionResolver {
  constructor(
    private readonly prescriptionService: PrescriptionService,
    private readonly prisma: PrismaService
  ) {}

  /**
   * Get all prescriptions for the logged-in doctor
   * Spec: master spec Section 5.4 — Doctor prescription list
   */
  @Query(() => [DoctorPrescriptionItem])
  @UseGuards(JwtAuthGuard)
  async doctorPrescriptions(
    @Context() context: any,
    @Args('filters', { type: () => DoctorPrescriptionsFilterInput, nullable: true })
    filters?: DoctorPrescriptionsFilterInput,
  ): Promise<DoctorPrescriptionItem[]> {
    const doctorId = context.req.user.id;
    return this.prescriptionService.getDoctorPrescriptions(doctorId, filters ?? undefined);
  }

  /**
   * Get available templates for a vertical
   */
  @Query(() => AvailableTemplatesResponse)
  @UseGuards(JwtAuthGuard)
  async availableTemplates(
    @Args('vertical', { type: () => HealthVertical }) vertical: HealthVertical
  ): Promise<AvailableTemplatesResponse> {
    // For now, return hair loss templates for all verticals
    // TODO: Add templates for other verticals
    let templates: Record<string, unknown>;

    switch (vertical) {
      case HealthVertical.HAIR_LOSS:
        templates = HAIR_LOSS_TEMPLATES;
        break;
      case HealthVertical.SEXUAL_HEALTH:
        templates = this.prescriptionService.getEDTemplates();
        break;
      case HealthVertical.WEIGHT_MANAGEMENT:
        templates = this.prescriptionService.getWeightTemplates();
        break;
      case HealthVertical.PCOS:
        templates = this.prescriptionService.getPCOSTemplatesNotTrying();
        break;
      default:
        templates = HAIR_LOSS_TEMPLATES;
    }

    return {
      vertical,
      templates,
    };
  }

  /**
   * Get suggested template based on patient profile
   */
  @Query(() => TemplateSuggestionType)
  @UseGuards(JwtAuthGuard)
  async suggestTemplate(
    @Context() context: any,
    @Args('consultationId') consultationId: string
  ): Promise<TemplateSuggestionType> {
    const doctorId = context.req.user.id;

    // Get consultation with responses
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
      include: {
        patient: { include: { patientProfile: true } },
        intakeResponse: true,
      },
    });

    if (!consultation) {
      throw new Error('Consultation not found');
    }

    if (consultation.doctorId !== doctorId) {
      throw new Error('Not authorized to view this consultation');
    }

    const responses = consultation.intakeResponse.responses as Record<string, unknown>;
    const profile = consultation.patient.patientProfile;

    // Calculate age
    let age = 30;
    if (profile?.dateOfBirth) {
      const today = new Date();
      const birthDate = new Date(profile.dateOfBirth);
      age = today.getFullYear() - birthDate.getFullYear();
    }

    // Check contraindications
    const contraindications =
      await this.prescriptionService.checkFinasterideContraindications(responses);

    // Get suggested template
    const suggestedTemplate = this.prescriptionService.suggestTemplate({
      gender: profile?.gender || 'MALE',
      age,
      contraindications,
    });

    const templateDefinition = HAIR_LOSS_TEMPLATES[suggestedTemplate];

    return {
      suggestedTemplate,
      templateDefinition: {
        name: templateDefinition.name,
        description: templateDefinition.description,
        whenToUse: templateDefinition.whenToUse,
        medications: templateDefinition.medications.map((m) => ({
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          duration: m.duration,
          instructions: m.instructions,
        })),
      },
      contraindications: {
        isBlocked: contraindications.isBlocked,
        requiresDoctorReview: contraindications.requiresDoctorReview,
        suggestMinoxidilOnly: contraindications.suggestMinoxidilOnly,
        reasons: contraindications.reasons,
        flags: contraindications.flags,
      },
    };
  }

  /**
   * Check contraindications for a specific template
   */
  @Query(() => CheckContraindicationsResponse)
  @UseGuards(JwtAuthGuard)
  async checkContraindications(
    @Context() context: any,
    @Args('input') input: CheckContraindicationsInput
  ): Promise<CheckContraindicationsResponse> {
    const doctorId = context.req.user.id;

    const consultation = await this.prisma.consultation.findUnique({
      where: { id: input.consultationId },
      include: { intakeResponse: true },
    });

    if (!consultation) {
      throw new Error('Consultation not found');
    }

    if (consultation.doctorId !== doctorId) {
      throw new Error('Not authorized');
    }

    const responses = consultation.intakeResponse.responses as Record<string, unknown>;

    // Check if template contains finasteride
    const containsFinasteride = HAIR_LOSS_TEMPLATES[input.template]?.medications.some(
      (m) => m.name.toLowerCase().includes('finasteride')
    );

    if (!containsFinasteride) {
      return {
        canProceed: true,
        result: {
          isBlocked: false,
          requiresDoctorReview: false,
          reasons: [],
          flags: [],
        },
      };
    }

    const contraindications =
      await this.prescriptionService.checkFinasterideContraindications(responses);

    return {
      canProceed: !contraindications.isBlocked,
      result: {
        isBlocked: contraindications.isBlocked,
        requiresDoctorReview: contraindications.requiresDoctorReview,
        suggestMinoxidilOnly: contraindications.suggestMinoxidilOnly,
        reasons: contraindications.reasons,
        flags: contraindications.flags,
      },
      alternativeTemplate: contraindications.suggestMinoxidilOnly
        ? PrescriptionTemplate.MINOXIDIL_ONLY
        : undefined,
    };
  }

  /**
   * Create prescription
   */
  @Mutation(() => CreatePrescriptionResponse)
  @UseGuards(JwtAuthGuard)
  async createPrescription(
    @Context() context: any,
    @Args('input') input: CreatePrescriptionInput
  ): Promise<CreatePrescriptionResponse> {
    const doctorId = context.req.user.id;

    try {
      const customMeds = input.customMedications
        ? input.customMedications.map((m): Medication => ({
            name: m.name,
            dosage: m.dosage,
            frequency: m.frequency,
            duration: m.duration,
            instructions: m.instructions,
          }))
        : undefined;

      const result = await this.prescriptionService.createPrescription({
        consultationId: input.consultationId,
        doctorId,
        template: input.template,
        customMedications: customMeds,
        instructions: input.instructions ?? undefined,
      });

      return {
        success: true,
        message: 'Prescription created successfully',
        prescription: {
          id: result.prescription.id,
          consultationId: result.prescription.consultationId,
          pdfUrl: result.prescription.pdfUrl ?? undefined,
          medications: result.prescription.medications,
          instructions: result.prescription.instructions ?? undefined,
          validUntil: result.prescription.validUntil,
          issuedAt: result.prescription.issuedAt,
          doctorName: result.prescription.doctorName ?? undefined,
          doctorRegistrationNo: result.prescription.doctorRegistrationNo ?? undefined,
          patientName: result.prescription.patientName ?? undefined,
          patientPhone: result.prescription.patientPhone ?? undefined,
          createdAt: result.prescription.createdAt,
        },
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create prescription';
      return {
        success: false,
        message,
      };
    }
  }

  /**
   * Get prescription by consultation ID
   */
  @Query(() => PrescriptionType, { nullable: true })
  @UseGuards(JwtAuthGuard)
  async prescriptionByConsultation(
    @Context() context: any,
    @Args('consultationId') consultationId: string
  ): Promise<PrescriptionType | null> {
    const userId = context.req.user.id;

    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
    });

    if (!consultation) {
      throw new Error('Consultation not found');
    }

    // Check if user is doctor assigned to this consultation or admin
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    if (user.role === 'DOCTOR' && consultation.doctorId !== userId) {
      throw new Error('Not authorized');
    }

    const prescription = await this.prisma.prescription.findFirst({
      where: { consultationId },
    });

    if (!prescription) {
      return null;
    }

    return {
      id: prescription.id,
      consultationId: prescription.consultationId,
      pdfUrl: prescription.pdfUrl ?? undefined,
      medications: prescription.medications,
      instructions: prescription.instructions ?? undefined,
      validUntil: prescription.validUntil,
      issuedAt: prescription.issuedAt,
      doctorName: prescription.doctorName ?? undefined,
      doctorRegistrationNo: prescription.doctorRegistrationNo ?? undefined,
      patientName: prescription.patientName ?? undefined,
      patientPhone: prescription.patientPhone ?? undefined,
      createdAt: prescription.createdAt,
    };
  }

  /**
   * Regenerate prescription PDF
   * Spec: master spec Section 5.4 — Doctor/admin regenerates PDF
   */
  @Mutation(() => RegeneratePdfResponse)
  @UseGuards(JwtAuthGuard)
  async regeneratePrescriptionPdf(
    @Context() context: any,
    @Args('prescriptionId') prescriptionId: string,
  ): Promise<RegeneratePdfResponse> {
    const userId = context.req.user.id;
    try {
      const result = await this.prescriptionService.regeneratePdf(prescriptionId, userId);
      return {
        success: true,
        message: 'PDF regenerated successfully',
        pdfUrl: result.pdfUrl,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to regenerate PDF';
      return {
        success: false,
        message,
      };
    }
  }
}
