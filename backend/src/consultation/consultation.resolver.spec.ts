import { Test, TestingModule } from '@nestjs/testing';
import { ConsultationResolver } from './consultation.resolver';
import { ConsultationService } from './consultation.service';
import { ConsultationStatus, HealthVertical, UserRole } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

// Spec: master spec Section 3.7 (Consultation Lifecycle)
// Spec: master spec Section 5 (Doctor Dashboard — status update actions)

describe('ConsultationResolver', () => {
    let resolver: ConsultationResolver;
    let consultationService: jest.Mocked<ConsultationService>;

    const mockConsultation = {
        id: 'consultation-123',
        patientId: 'patient-123',
        doctorId: 'doctor-123',
        intakeResponseId: 'intake-123',
        vertical: HealthVertical.HAIR_LOSS,
        status: ConsultationStatus.DOCTOR_REVIEWING,
        doctorNotes: null,
        rejectionReason: null,
        scheduledAt: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockDoctor = {
        id: 'doctor-123',
        phone: '+919876543210',
        email: null,
        name: 'Dr. Smith',
        role: UserRole.DOCTOR,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ConsultationResolver,
                {
                    provide: ConsultationService,
                    useValue: {
                        updateStatus: jest.fn(),
                        assignToDoctor: jest.fn(),
                        isValidTransition: jest.fn(),
                    },
                },
            ],
        }).compile();

        resolver = module.get<ConsultationResolver>(ConsultationResolver);
        consultationService = module.get(ConsultationService);
    });

    describe('updateConsultationStatus', () => {
        it('should approve a consultation (DOCTOR_REVIEWING → APPROVED)', async () => {
            const approvedConsultation = {
                ...mockConsultation,
                status: ConsultationStatus.APPROVED,
                completedAt: new Date(),
            };
            consultationService.updateStatus.mockResolvedValue(approvedConsultation);

            const result = await resolver.updateConsultationStatus(
                'consultation-123',
                'APPROVED',
                undefined,
                undefined,
                mockDoctor,
            );

            expect(result.id).toBe('consultation-123');
            expect(result.status).toBe('APPROVED');
            expect(consultationService.updateStatus).toHaveBeenCalledWith(
                'consultation-123',
                ConsultationStatus.APPROVED,
                'doctor-123',
                undefined,
            );
        });

        it('should set consultation to NEEDS_INFO', async () => {
            const needsInfoConsultation = {
                ...mockConsultation,
                status: ConsultationStatus.NEEDS_INFO,
                doctorNotes: 'Please provide clearer photos',
            };
            consultationService.updateStatus.mockResolvedValue(needsInfoConsultation);

            const result = await resolver.updateConsultationStatus(
                'consultation-123',
                'NEEDS_INFO',
                'Please provide clearer photos',
                undefined,
                mockDoctor,
            );

            expect(result.id).toBe('consultation-123');
            expect(result.status).toBe('NEEDS_INFO');
        });

        it('should reject a consultation with reason', async () => {
            const rejectedConsultation = {
                ...mockConsultation,
                status: ConsultationStatus.REJECTED,
                rejectionReason: 'Not suitable for telehealth',
            };
            consultationService.updateStatus.mockResolvedValue(rejectedConsultation);

            const result = await resolver.updateConsultationStatus(
                'consultation-123',
                'REJECTED',
                undefined,
                'Not suitable for telehealth',
                mockDoctor,
            );

            expect(result.id).toBe('consultation-123');
            expect(result.status).toBe('REJECTED');
            expect(consultationService.updateStatus).toHaveBeenCalledWith(
                'consultation-123',
                ConsultationStatus.REJECTED,
                'doctor-123',
                'Not suitable for telehealth',
            );
        });

        it('should throw on invalid status transition', async () => {
            consultationService.updateStatus.mockRejectedValue(
                new BadRequestException('Invalid status transition: APPROVED → DOCTOR_REVIEWING'),
            );

            await expect(
                resolver.updateConsultationStatus(
                    'consultation-123',
                    'DOCTOR_REVIEWING',
                    undefined,
                    undefined,
                    mockDoctor,
                ),
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw when consultation not found', async () => {
            consultationService.updateStatus.mockRejectedValue(
                new NotFoundException('Consultation not found'),
            );

            await expect(
                resolver.updateConsultationStatus(
                    'nonexistent-id',
                    'APPROVED',
                    undefined,
                    undefined,
                    mockDoctor,
                ),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('assignCaseToDoctor', () => {
        it('should assign an AI_REVIEWED case to a doctor', async () => {
            const assignedConsultation = {
                ...mockConsultation,
                status: ConsultationStatus.DOCTOR_REVIEWING,
                doctorId: 'doctor-123',
            };
            consultationService.assignToDoctor.mockResolvedValue(assignedConsultation);

            const result = await resolver.assignCaseToDoctor(
                'consultation-123',
                'doctor-123',
                { id: 'admin-1', role: UserRole.ADMIN } as any,
            );

            expect(result.id).toBe('consultation-123');
            expect(result.status).toBe('DOCTOR_REVIEWING');
            expect(result.doctorId).toBe('doctor-123');
            expect(consultationService.assignToDoctor).toHaveBeenCalledWith(
                'consultation-123',
                'doctor-123',
            );
        });

        it('should throw when consultation is not in AI_REVIEWED status', async () => {
            consultationService.assignToDoctor.mockRejectedValue(
                new BadRequestException('Consultation must be in AI_REVIEWED status to assign'),
            );

            await expect(
                resolver.assignCaseToDoctor(
                    'consultation-123',
                    'doctor-123',
                    { id: 'admin-1', role: UserRole.ADMIN } as any,
                ),
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw when doctor is invalid', async () => {
            consultationService.assignToDoctor.mockRejectedValue(
                new BadRequestException('Invalid doctor'),
            );

            await expect(
                resolver.assignCaseToDoctor(
                    'consultation-123',
                    'invalid-doctor',
                    { id: 'admin-1', role: UserRole.ADMIN } as any,
                ),
            ).rejects.toThrow(BadRequestException);
        });
    });
});
