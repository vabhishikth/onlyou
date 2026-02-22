import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { UserRole } from '@prisma/client';
import { SLA_HOURS } from './constants';

// Spec: Phase 15 Chunk 6 — SLA Timers + Breach Monitoring

export interface SlaBreach {
  type: 'ACCEPTANCE' | 'PREPARATION' | 'DELIVERY' | 'COLD_CHAIN' | 'OVERALL';
  detectedAt: string;
  elapsedHours: number;
  slaHours: number;
}

export interface SlaStatus {
  orderId: string;
  breaches: SlaBreach[];
  acceptanceTimeRemaining: number; // hours
  preparationTimeRemaining: number;
  deliveryTimeRemaining: number;
}

export interface PerformanceReport {
  pharmacyId: string;
  totalOrders: number;
  avgAcceptanceHours: number;
  avgPreparationHours: number;
  rejectionRate: number;
  breachCount: number;
}

@Injectable()
export class SlaMonitorService {
  private readonly logger = new Logger(SlaMonitorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Send admin notification helper
   */
  private async notifyAdmin(eventType: string, title: string, body: string, data?: Record<string, any>): Promise<void> {
    const admin = await this.prisma.user.findFirst({
      where: { role: UserRole.ADMIN },
    });
    if (admin) {
      await this.notificationService.sendNotification({
        recipientId: admin.id,
        recipientRole: 'ADMIN',
        channel: 'IN_APP',
        eventType,
        title,
        body,
        data,
      }).catch(err => {
        this.logger.error(`Failed to send admin notification: ${err?.message}`);
      });
    }
  }

  /**
   * Calculate hours elapsed since a date
   */
  private hoursElapsed(from: Date | null): number {
    if (!from) return 0;
    return (Date.now() - new Date(from).getTime()) / (1000 * 60 * 60);
  }

  /**
   * Detect SLA breaches for an order
   */
  private detectBreaches(order: any): SlaBreach[] {
    const breaches: SlaBreach[] = [];
    const now = new Date().toISOString();

    // Acceptance SLA: ASSIGNED status, assigned > 4h ago
    if (order.status === 'ASSIGNED' && order.assignedAt) {
      const elapsed = this.hoursElapsed(order.assignedAt);
      if (elapsed > SLA_HOURS.PHARMACY_ACCEPTANCE) {
        breaches.push({
          type: 'ACCEPTANCE',
          detectedAt: now,
          elapsedHours: Math.round(elapsed * 100) / 100,
          slaHours: SLA_HOURS.PHARMACY_ACCEPTANCE,
        });
      }
    }

    // Preparation SLA: PHARMACY_ACCEPTED or PREPARING, accepted > 4h ago
    if (['PHARMACY_ACCEPTED', 'PREPARING'].includes(order.status) && order.acceptedAt) {
      const elapsed = this.hoursElapsed(order.acceptedAt);
      if (elapsed > SLA_HOURS.PHARMACY_PREPARATION) {
        breaches.push({
          type: 'PREPARATION',
          detectedAt: now,
          elapsedHours: Math.round(elapsed * 100) / 100,
          slaHours: SLA_HOURS.PHARMACY_PREPARATION,
        });
      }
    }

    // Delivery SLA: OUT_FOR_DELIVERY, dispatched > 6h ago
    if (order.status === 'OUT_FOR_DELIVERY' && order.dispatchedAt) {
      const elapsed = this.hoursElapsed(order.dispatchedAt);
      if (elapsed > SLA_HOURS.DELIVERY) {
        breaches.push({
          type: 'DELIVERY',
          detectedAt: now,
          elapsedHours: Math.round(elapsed * 100) / 100,
          slaHours: SLA_HOURS.DELIVERY,
        });
      }

      // Cold chain: 2h delivery window
      if (order.requiresColdChain && elapsed > SLA_HOURS.COLD_CHAIN_DELIVERY) {
        breaches.push({
          type: 'COLD_CHAIN',
          detectedAt: now,
          elapsedHours: Math.round(elapsed * 100) / 100,
          slaHours: SLA_HOURS.COLD_CHAIN_DELIVERY,
        });
      }
    }

    return breaches;
  }

  /**
   * Cron job: check all active orders for SLA breaches
   * Spec: Phase 15 Chunk 6 — Runs every 10 minutes
   */
  @Cron('*/10 * * * *')
  async checkSlaBreaches() {
    this.logger.log('Running SLA breach check...');

    // Get all active (non-terminal) orders
    const activeOrders = await this.prisma.pharmacyOrder.findMany({
      where: {
        status: {
          notIn: ['DELIVERED', 'CANCELLED', 'DELIVERY_FAILED'],
        },
      },
    });

    let breachCount = 0;

    for (const order of activeOrders) {
      try {
        const breaches = this.detectBreaches(order);
        if (breaches.length === 0) continue;

        // Merge with existing breaches
        const existing: SlaBreach[] = order.slaBreaches ? JSON.parse(order.slaBreaches as string) : [];
        const existingTypes = new Set(existing.map((b: SlaBreach) => b.type));
        const newBreaches = breaches.filter(b => !existingTypes.has(b.type));

        if (newBreaches.length === 0) continue; // Already recorded

        const allBreaches = [...existing, ...newBreaches];

        await this.prisma.pharmacyOrder.update({
          where: { id: order.id },
          data: {
            slaBreaches: JSON.stringify(allBreaches),
          },
        });

        // Send admin alert per new breach
        for (const breach of newBreaches) {
          await this.notifyAdmin(
            'SLA_BREACH',
            `SLA Breach: ${breach.type}`,
            `Order ${order.id} breached ${breach.type} SLA (${breach.elapsedHours}h vs ${breach.slaHours}h limit).`,
            { pharmacyOrderId: order.id, breach },
          );
        }

        breachCount += newBreaches.length;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed SLA check for order ${order.id}: ${message}`);
      }
    }

    this.logger.log(`SLA check complete. Active orders: ${activeOrders.length}, New breaches: ${breachCount}`);
  }

  /**
   * Get SLA status for a specific order
   * Spec: Phase 15 Chunk 6 — Time remaining per SLA window + existing breaches
   */
  async getSlaStatus(orderId: string): Promise<SlaStatus> {
    const orders = await this.prisma.pharmacyOrder.findMany({
      where: { id: orderId },
    });

    const order = orders[0];
    if (!order) {
      return {
        orderId,
        breaches: [],
        acceptanceTimeRemaining: 0,
        preparationTimeRemaining: 0,
        deliveryTimeRemaining: 0,
      };
    }

    const breaches: SlaBreach[] = order.slaBreaches ? JSON.parse(order.slaBreaches as string) : [];

    // Calculate time remaining
    const acceptanceElapsed = order.assignedAt ? this.hoursElapsed(order.assignedAt) : 0;
    const preparationElapsed = order.acceptedAt ? this.hoursElapsed(order.acceptedAt) : 0;
    const deliveryElapsed = order.dispatchedAt ? this.hoursElapsed(order.dispatchedAt) : 0;

    return {
      orderId,
      breaches,
      acceptanceTimeRemaining: Math.max(0, SLA_HOURS.PHARMACY_ACCEPTANCE - acceptanceElapsed),
      preparationTimeRemaining: Math.max(0, SLA_HOURS.PHARMACY_PREPARATION - preparationElapsed),
      deliveryTimeRemaining: Math.max(0, SLA_HOURS.DELIVERY - deliveryElapsed),
    };
  }

  /**
   * Get pharmacy performance report
   * Spec: Phase 15 Chunk 6 — Avg times, rejection rate, breach count
   */
  async getPharmacyPerformanceReport(
    pharmacyId: string,
    dateRange: { start: Date; end: Date },
  ): Promise<PerformanceReport> {
    const orders = await this.prisma.pharmacyOrder.findMany({
      where: {
        pharmacyId,
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      },
    });

    if (orders.length === 0) {
      return {
        pharmacyId,
        totalOrders: 0,
        avgAcceptanceHours: 0,
        avgPreparationHours: 0,
        rejectionRate: 0,
        breachCount: 0,
      };
    }

    // Calculate averages
    let totalAcceptanceHours = 0;
    let acceptanceCount = 0;
    let totalPreparationHours = 0;
    let preparationCount = 0;
    let rejectedCount = 0;
    let breachCount = 0;

    for (const order of orders) {
      // Acceptance time: assignedAt -> acceptedAt
      if (order.assignedAt && order.acceptedAt) {
        const hours = (new Date(order.acceptedAt).getTime() - new Date(order.assignedAt).getTime()) / (1000 * 60 * 60);
        totalAcceptanceHours += hours;
        acceptanceCount++;
      }

      // Preparation time: acceptedAt -> readyForPickupAt
      if (order.acceptedAt && order.readyForPickupAt) {
        const hours = (new Date(order.readyForPickupAt).getTime() - new Date(order.acceptedAt).getTime()) / (1000 * 60 * 60);
        totalPreparationHours += hours;
        preparationCount++;
      }

      if (order.status === 'PHARMACY_REJECTED') {
        rejectedCount++;
      }

      // Count breaches
      if (order.slaBreaches) {
        const breaches: any[] = JSON.parse(order.slaBreaches as string);
        breachCount += breaches.length;
      }
    }

    return {
      pharmacyId,
      totalOrders: orders.length,
      avgAcceptanceHours: acceptanceCount > 0 ? totalAcceptanceHours / acceptanceCount : 0,
      avgPreparationHours: preparationCount > 0 ? totalPreparationHours / preparationCount : 0,
      rejectionRate: orders.length > 0 ? rejectedCount / orders.length : 0,
      breachCount,
    };
  }
}
