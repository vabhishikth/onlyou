import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditContext {
    userId: string;
    ipAddress?: string;
    userAgent?: string;
}

@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);

    constructor(private readonly prisma: PrismaService) {}

    async log(
        ctx: AuditContext,
        action: string,
        resource: string,
        resourceId: string,
        details?: Record<string, unknown>,
    ): Promise<void> {
        try {
            await this.prisma.auditLog.create({
                data: {
                    userId: ctx.userId,
                    action,
                    resource,
                    resourceId,
                    details: details ?? undefined,
                    ipAddress: ctx.ipAddress,
                    userAgent: ctx.userAgent,
                },
            });
        } catch (err) {
            // Audit logging must never break the main flow
            this.logger.error(
                `Failed to create audit log: ${(err as Error).message}`,
                { action, resource, resourceId },
            );
        }
    }
}
