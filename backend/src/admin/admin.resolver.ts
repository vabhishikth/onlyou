import { Resolver, Query } from '@nestjs/graphql';
import { AdminService } from './admin.service';
import { AdminDashboardStats, SLAEscalation, SLAStatus } from './dto/admin.dto';

// Spec: master spec Section 15 — Admin dashboard (unified lab + delivery views)

@Resolver()
export class AdminResolver {
    constructor(private readonly adminService: AdminService) {}

    /**
     * Get admin dashboard statistics
     * Spec: Section 7, Section 8 — Lab collections and deliveries overview
     */
    @Query(() => AdminDashboardStats)
    async adminDashboardStats(): Promise<AdminDashboardStats> {
        const stats = await this.adminService.getDashboardStats();

        return {
            labCollections: stats.labCollections,
            deliveries: stats.deliveries,
            openCases: stats.openCases,
            slaBreaches: stats.slaBreaches,
            activePatients: stats.activePatients,
            revenueThisMonthPaise: stats.revenueThisMonthPaise,
        };
    }

    /**
     * Get all SLA escalations
     * Spec: Section 7.4 — SLA Escalation thresholds
     */
    @Query(() => [SLAEscalation])
    async slaEscalations(): Promise<SLAEscalation[]> {
        const escalations = await this.adminService.getSLAEscalations();

        return escalations.map((e) => ({
            ...e,
            slaInfo: {
                ...e.slaInfo,
                status: e.slaInfo.status as SLAStatus,
            },
        }));
    }
}
