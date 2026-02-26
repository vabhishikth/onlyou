import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuditService', () => {
    let service: AuditService;
    let prisma: { auditLog: { create: jest.Mock } };

    beforeEach(async () => {
        prisma = {
            auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuditService,
                { provide: PrismaService, useValue: prisma },
            ],
        }).compile();

        service = module.get<AuditService>(AuditService);
    });

    it('should create an audit log entry', async () => {
        await service.log(
            { userId: 'user-1', ipAddress: '127.0.0.1' },
            'VIEW_PHI',
            'Consultation',
            'consult-1',
            { verticals: ['HAIR_LOSS'] },
        );

        expect(prisma.auditLog.create).toHaveBeenCalledWith({
            data: {
                userId: 'user-1',
                action: 'VIEW_PHI',
                resource: 'Consultation',
                resourceId: 'consult-1',
                details: { verticals: ['HAIR_LOSS'] },
                ipAddress: '127.0.0.1',
                userAgent: undefined,
            },
        });
    });

    it('should not throw when audit log creation fails', async () => {
        prisma.auditLog.create.mockRejectedValue(new Error('DB connection failed'));

        await expect(
            service.log(
                { userId: 'user-1' },
                'CREATE_PRESCRIPTION',
                'Prescription',
                'rx-1',
            ),
        ).resolves.not.toThrow();
    });

    it('should handle optional details parameter', async () => {
        await service.log(
            { userId: 'user-1' },
            'LOGIN',
            'User',
            'user-1',
        );

        expect(prisma.auditLog.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                details: undefined,
            }),
        });
    });
});
