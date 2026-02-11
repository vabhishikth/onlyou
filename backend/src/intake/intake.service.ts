import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HealthVertical, ConsultationStatus } from '@prisma/client';
import { VerticalInfo, SubmitIntakeInput, SaveDraftInput } from './dto/intake.dto';

@Injectable()
export class IntakeService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Get all available treatment verticals with metadata
     */
    getAvailableVerticals(): VerticalInfo[] {
        return [
            {
                id: HealthVertical.HAIR_LOSS,
                name: 'Hair Loss',
                description: 'Clinically proven treatments for hair thinning and loss',
                tagline: 'Regrow your confidence',
                pricePerMonth: 99900, // ₹999 in paise
                icon: '💇',
                color: '#8B5CF6',
            },
            {
                id: HealthVertical.SEXUAL_HEALTH,
                name: 'Sexual Health',
                description: 'Discreet, effective solutions for intimate wellness',
                tagline: 'Perform at your best',
                pricePerMonth: 79900, // ₹799 in paise
                icon: '❤️',
                color: '#EC4899',
            },
            {
                id: HealthVertical.PCOS,
                name: 'PCOS & Hormones',
                description: 'Comprehensive care for hormonal balance',
                tagline: 'Balance your body',
                pricePerMonth: 119900, // ₹1,199 in paise
                icon: '🌸',
                color: '#F97316',
            },
            {
                id: HealthVertical.WEIGHT_MANAGEMENT,
                name: 'Weight Loss',
                description: 'Medical weight management with GLP-1 treatments',
                tagline: 'Transform your health',
                pricePerMonth: 249900, // ₹2,499 in paise
                icon: '⚖️',
                color: '#10B981',
            },
        ];
    }

    /**
     * Get questionnaire template for a specific vertical
     */
    async getQuestionnaireTemplate(vertical: HealthVertical, version?: number) {
        const template = await this.prisma.questionnaireTemplate.findFirst({
            where: {
                vertical,
                isActive: true,
                ...(version && { version }),
            },
            orderBy: { version: 'desc' },
        });

        if (!template) {
            throw new NotFoundException(`No questionnaire template found for ${vertical}`);
        }

        return template;
    }

    /**
     * Get user's intake responses
     */
    async getMyIntakes(userId: string) {
        const profile = await this.prisma.patientProfile.findUnique({
            where: { userId },
        });

        if (!profile) {
            return [];
        }

        return this.prisma.intakeResponse.findMany({
            where: { patientProfileId: profile.id },
            include: {
                questionnaireTemplate: true,
                consultation: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Get a specific intake response
     */
    async getIntakeByVertical(userId: string, vertical: HealthVertical) {
        const profile = await this.prisma.patientProfile.findUnique({
            where: { userId },
        });

        if (!profile) {
            return null;
        }

        return this.prisma.intakeResponse.findFirst({
            where: {
                patientProfileId: profile.id,
                questionnaireTemplate: { vertical },
            },
            include: {
                questionnaireTemplate: true,
                consultation: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Save intake draft (can be resumed later)
     */
    async saveIntakeDraft(userId: string, input: SaveDraftInput) {
        // Find or create patient profile
        let profile = await this.prisma.patientProfile.findUnique({
            where: { userId },
        });

        if (!profile) {
            profile = await this.prisma.patientProfile.create({
                data: { userId },
            });
        }

        // Get the active template for this vertical
        const template = await this.getQuestionnaireTemplate(input.vertical);

        // If updating existing draft
        if (input.intakeResponseId) {
            const existing = await this.prisma.intakeResponse.findUnique({
                where: { id: input.intakeResponseId },
            });

            if (!existing || existing.patientProfileId !== profile.id) {
                throw new NotFoundException('Draft not found');
            }

            if (!existing.isDraft) {
                throw new BadRequestException('Cannot update a submitted intake');
            }

            const updated = await this.prisma.intakeResponse.update({
                where: { id: input.intakeResponseId },
                data: {
                    responses: input.responses as object,
                },
            });

            return {
                success: true,
                message: 'Draft saved successfully',
                intakeResponse: updated,
            };
        }

        // Check for existing draft for this vertical
        const existingDraft = await this.prisma.intakeResponse.findFirst({
            where: {
                patientProfileId: profile.id,
                questionnaireTemplateId: template.id,
                isDraft: true,
            },
        });

        if (existingDraft) {
            // Update existing draft
            const updated = await this.prisma.intakeResponse.update({
                where: { id: existingDraft.id },
                data: {
                    responses: input.responses as object,
                },
            });

            return {
                success: true,
                message: 'Draft updated successfully',
                intakeResponse: updated,
            };
        }

        // Create new draft
        const intakeResponse = await this.prisma.intakeResponse.create({
            data: {
                patientProfileId: profile.id,
                questionnaireTemplateId: template.id,
                responses: input.responses as object,
                isDraft: true,
            },
        });

        return {
            success: true,
            message: 'Draft created successfully',
            intakeResponse,
        };
    }

    /**
     * Submit intake and create consultation
     */
    async submitIntake(userId: string, input: SubmitIntakeInput) {
        // Find or create patient profile
        let profile = await this.prisma.patientProfile.findUnique({
            where: { userId },
        });

        if (!profile) {
            profile = await this.prisma.patientProfile.create({
                data: { userId },
            });
        }

        // Get the active template for this vertical
        const template = await this.getQuestionnaireTemplate(input.vertical);

        // Check for existing draft
        let intakeResponse = await this.prisma.intakeResponse.findFirst({
            where: {
                patientProfileId: profile.id,
                questionnaireTemplateId: template.id,
                isDraft: true,
            },
        });

        // Use transaction to ensure data consistency
        const result = await this.prisma.$transaction(async (tx) => {
            if (intakeResponse) {
                // Update existing draft and mark as submitted
                intakeResponse = await tx.intakeResponse.update({
                    where: { id: intakeResponse.id },
                    data: {
                        responses: input.responses as object,
                        isDraft: false,
                        submittedAt: new Date(),
                    },
                });
            } else {
                // Create new intake response
                intakeResponse = await tx.intakeResponse.create({
                    data: {
                        patientProfileId: profile.id,
                        questionnaireTemplateId: template.id,
                        responses: input.responses as object,
                        isDraft: false,
                        submittedAt: new Date(),
                    },
                });
            }

            // Save photos if provided
            if (input.photos && input.photos.length > 0) {
                await tx.patientPhoto.createMany({
                    data: input.photos.map((photo) => ({
                        patientProfileId: profile.id,
                        type: photo.type,
                        url: photo.url,
                    })),
                });
            }

            // Create consultation
            const consultation = await tx.consultation.create({
                data: {
                    patientId: userId,
                    intakeResponseId: intakeResponse.id,
                    vertical: input.vertical,
                    status: ConsultationStatus.PENDING_ASSESSMENT,
                },
            });

            return { intakeResponse, consultation };
        });

        return {
            success: true,
            message: 'Intake submitted successfully. A doctor will review your case within 24 hours.',
            intakeResponse: result.intakeResponse,
            consultation: result.consultation,
        };
    }
}
