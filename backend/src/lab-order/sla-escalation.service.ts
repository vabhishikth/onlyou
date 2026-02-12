import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LabOrderStatus } from './lab-order.service';

// Spec: master spec Section 7.4 (SLA Escalation)

export enum SlaBreachType {
  PATIENT_BOOKING = 'PATIENT_BOOKING',
  PHLEBOTOMIST_ASSIGNMENT = 'PHLEBOTOMIST_ASSIGNMENT',
  LAB_RECEIPT = 'LAB_RECEIPT',
  LAB_RESULTS = 'LAB_RESULTS',
  DOCTOR_REVIEW = 'DOCTOR_REVIEW',
}

export interface SlaThresholds {
  patientBookingFirstReminder: number; // hours
  patientBookingSecondReminder: number; // hours
  patientBookingExpiry: number; // hours
  phlebotomistAssignment: number; // hours
  labReceipt: number; // hours
  labResultsWarning: number; // hours
  labResultsCritical: number; // hours
  doctorReviewReminder: number; // hours
  doctorReviewReassign: number; // hours
}

export interface SlaBreach {
  id: string;
  breachType: SlaBreachType;
  breachLevel?: string;
  escalationLevel?: string;
  hoursOverdue: number;
  [key: string]: any;
}

export interface MarkEscalatedInput {
  labOrderId: string;
  reason: string;
  coordinatorId?: string;
}

export interface MarkReminderSentInput {
  labOrderId: string;
  reminderType: string;
}

export interface AllBreaches {
  bookingBreaches: SlaBreach[];
  assignmentBreaches: SlaBreach[];
  receiptBreaches: SlaBreach[];
  resultsBreaches: SlaBreach[];
  reviewBreaches: SlaBreach[];
  totalBreaches: number;
}

export interface BreachSummary {
  bookingBreachCount: number;
  assignmentBreachCount: number;
  receiptBreachCount: number;
  resultsBreachCount: number;
  reviewBreachCount: number;
  totalBreachCount: number;
  criticalBreachCount: number;
}

export interface OrderSlaStatus {
  isBreached: boolean;
  breachType?: SlaBreachType;
  hoursOverdue?: number;
  escalationLevel?: string;
}

// Default thresholds per spec Section 7.4
const DEFAULT_THRESHOLDS: SlaThresholds = {
  patientBookingFirstReminder: 3 * 24, // 3 days
  patientBookingSecondReminder: 7 * 24, // 7 days
  patientBookingExpiry: 14 * 24, // 14 days
  phlebotomistAssignment: 2, // 2 hours
  labReceipt: 4, // 4 hours
  labResultsWarning: 48, // 48 hours
  labResultsCritical: 72, // 72 hours
  doctorReviewReminder: 24, // 24 hours
  doctorReviewReassign: 48, // 48 hours
};

@Injectable()
export class SlaEscalationService {
  private thresholds: SlaThresholds = DEFAULT_THRESHOLDS;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get current SLA thresholds
   */
  getThresholds(): SlaThresholds {
    return { ...this.thresholds };
  }

  /**
   * Calculate hours since a timestamp
   */
  private hoursSince(timestamp: Date): number {
    const now = new Date();
    return (now.getTime() - new Date(timestamp).getTime()) / (1000 * 60 * 60);
  }

  /**
   * Get orders where patient hasn't booked for 3+ days
   * Spec: Section 7.4 — Patient doesn't book slot
   */
  async getOverduePatientBookings(): Promise<SlaBreach[]> {
    const thresholdDate = new Date();
    thresholdDate.setHours(thresholdDate.getHours() - this.thresholds.patientBookingFirstReminder);

    const orders = await this.prisma.labOrder.findMany({
      where: {
        status: LabOrderStatus.ORDERED,
        orderedAt: { lt: thresholdDate },
      },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
      },
    });

    return orders.map((order) => {
      const hoursOverdue = this.hoursSince(order.orderedAt) - this.thresholds.patientBookingFirstReminder;
      const totalHours = this.hoursSince(order.orderedAt);

      let breachLevel: string;
      if (totalHours >= this.thresholds.patientBookingExpiry) {
        breachLevel = 'EXPIRED';
      } else if (totalHours >= this.thresholds.patientBookingSecondReminder) {
        breachLevel = 'SECOND_REMINDER';
      } else {
        breachLevel = 'FIRST_REMINDER';
      }

      return {
        ...order,
        breachType: SlaBreachType.PATIENT_BOOKING,
        breachLevel,
        hoursOverdue: Math.max(0, hoursOverdue),
      };
    });
  }

  /**
   * Get SLOT_BOOKED orders without phlebotomist for 2+ hours
   * Spec: Section 7.4 — Coordinator doesn't assign phlebotomist
   */
  async getOverduePhlebotomistAssignments(): Promise<SlaBreach[]> {
    const thresholdDate = new Date();
    thresholdDate.setHours(thresholdDate.getHours() - this.thresholds.phlebotomistAssignment);

    const orders = await this.prisma.labOrder.findMany({
      where: {
        status: LabOrderStatus.SLOT_BOOKED,
        phlebotomistId: null,
        slotBookedAt: { lt: thresholdDate },
      },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
      },
    });

    return orders.map((order) => {
      const hoursOverdue = this.hoursSince(order.slotBookedAt!) - this.thresholds.phlebotomistAssignment;

      return {
        ...order,
        breachType: SlaBreachType.PHLEBOTOMIST_ASSIGNMENT,
        hoursOverdue: Math.max(0, hoursOverdue),
      };
    });
  }

  /**
   * Get DELIVERED_TO_LAB orders not received for 4+ hours
   * Spec: Section 7.4 — Lab doesn't mark received
   */
  async getOverdueLabReceipts(): Promise<SlaBreach[]> {
    const thresholdDate = new Date();
    thresholdDate.setHours(thresholdDate.getHours() - this.thresholds.labReceipt);

    const orders = await this.prisma.labOrder.findMany({
      where: {
        status: LabOrderStatus.DELIVERED_TO_LAB,
        deliveredToLabAt: { lt: thresholdDate },
      },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        diagnosticCentre: { select: { id: true, name: true, phone: true } },
      },
    });

    return orders.map((order) => {
      const hoursOverdue = this.hoursSince(order.deliveredToLabAt!) - this.thresholds.labReceipt;

      return {
        ...order,
        breachType: SlaBreachType.LAB_RECEIPT,
        hoursOverdue: Math.max(0, hoursOverdue),
      };
    });
  }

  /**
   * Get SAMPLE_RECEIVED or PROCESSING orders overdue for 48+ hours
   * Spec: Section 7.4 — Lab doesn't upload results
   */
  async getOverdueLabResults(): Promise<SlaBreach[]> {
    const thresholdDate = new Date();
    thresholdDate.setHours(thresholdDate.getHours() - this.thresholds.labResultsWarning);

    const orders = await this.prisma.labOrder.findMany({
      where: {
        status: { in: [LabOrderStatus.SAMPLE_RECEIVED, LabOrderStatus.PROCESSING] },
        sampleReceivedAt: { lt: thresholdDate },
      },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        diagnosticCentre: { select: { id: true, name: true, phone: true } },
      },
    });

    return orders.map((order) => {
      const totalHours = this.hoursSince(order.sampleReceivedAt!);
      const hoursOverdue = totalHours - this.thresholds.labResultsWarning;

      let escalationLevel: string;
      if (totalHours >= this.thresholds.labResultsCritical) {
        escalationLevel = 'CRITICAL';
      } else {
        escalationLevel = 'WARNING';
      }

      return {
        ...order,
        breachType: SlaBreachType.LAB_RESULTS,
        escalationLevel,
        hoursOverdue: Math.max(0, hoursOverdue),
      };
    });
  }

  /**
   * Get RESULTS_READY orders not reviewed for 24+ hours
   * Spec: Section 7.4 — Doctor doesn't review results
   */
  async getOverdueDoctorReviews(): Promise<SlaBreach[]> {
    const thresholdDate = new Date();
    thresholdDate.setHours(thresholdDate.getHours() - this.thresholds.doctorReviewReminder);

    const orders = await this.prisma.labOrder.findMany({
      where: {
        status: { in: [LabOrderStatus.RESULTS_READY, LabOrderStatus.RESULTS_UPLOADED] },
        resultsUploadedAt: { lt: thresholdDate },
      },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
      },
    });

    return orders.map((order) => {
      const totalHours = this.hoursSince(order.resultsUploadedAt!);
      const hoursOverdue = totalHours - this.thresholds.doctorReviewReminder;

      let escalationLevel: string;
      if (totalHours >= this.thresholds.doctorReviewReassign) {
        escalationLevel = 'REASSIGN';
      } else {
        escalationLevel = 'REMINDER';
      }

      return {
        ...order,
        breachType: SlaBreachType.DOCTOR_REVIEW,
        escalationLevel,
        hoursOverdue: Math.max(0, hoursOverdue),
      };
    });
  }

  /**
   * Get all breaches combined
   */
  async getAllBreaches(): Promise<AllBreaches> {
    const [
      bookingBreaches,
      assignmentBreaches,
      receiptBreaches,
      resultsBreaches,
      reviewBreaches,
    ] = await Promise.all([
      this.getOverduePatientBookings(),
      this.getOverduePhlebotomistAssignments(),
      this.getOverdueLabReceipts(),
      this.getOverdueLabResults(),
      this.getOverdueDoctorReviews(),
    ]);

    return {
      bookingBreaches,
      assignmentBreaches,
      receiptBreaches,
      resultsBreaches,
      reviewBreaches,
      totalBreaches:
        bookingBreaches.length +
        assignmentBreaches.length +
        receiptBreaches.length +
        resultsBreaches.length +
        reviewBreaches.length,
    };
  }

  /**
   * Expire stale ORDERED orders older than 14 days
   */
  async expireStaleOrders(): Promise<{ expiredCount: number; expiredOrderIds: string[] }> {
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() - this.thresholds.patientBookingExpiry);

    const staleOrders = await this.prisma.labOrder.findMany({
      where: {
        status: LabOrderStatus.ORDERED,
        orderedAt: { lt: expiryDate },
      },
      select: { id: true },
    });

    const expiredOrderIds = staleOrders.map((o) => o.id);

    if (expiredOrderIds.length > 0) {
      await this.prisma.labOrder.updateMany({
        where: { id: { in: expiredOrderIds } },
        data: {
          status: LabOrderStatus.EXPIRED,
          expiredAt: new Date(),
        },
      });
    }

    return {
      expiredCount: expiredOrderIds.length,
      expiredOrderIds,
    };
  }

  /**
   * Get breach summary for dashboard
   */
  async getBreachSummary(): Promise<BreachSummary> {
    const allBreaches = await this.getAllBreaches();

    // Count critical breaches (14d booking, 72h results, 48h review)
    const criticalBookings = allBreaches.bookingBreaches.filter(
      (b) => b.breachLevel === 'EXPIRED'
    ).length;
    const criticalResults = allBreaches.resultsBreaches.filter(
      (b) => b.escalationLevel === 'CRITICAL'
    ).length;
    const criticalReviews = allBreaches.reviewBreaches.filter(
      (b) => b.escalationLevel === 'REASSIGN'
    ).length;

    return {
      bookingBreachCount: allBreaches.bookingBreaches.length,
      assignmentBreachCount: allBreaches.assignmentBreaches.length,
      receiptBreachCount: allBreaches.receiptBreaches.length,
      resultsBreachCount: allBreaches.resultsBreaches.length,
      reviewBreachCount: allBreaches.reviewBreaches.length,
      totalBreachCount: allBreaches.totalBreaches,
      criticalBreachCount: criticalBookings + criticalResults + criticalReviews,
    };
  }

  /**
   * Check SLA status for a specific order
   */
  async checkOrderSlaStatus(labOrderId: string): Promise<OrderSlaStatus> {
    // Check each breach type
    const [
      bookingBreaches,
      assignmentBreaches,
      receiptBreaches,
      resultsBreaches,
      reviewBreaches,
    ] = await Promise.all([
      this.getOverduePatientBookings(),
      this.getOverduePhlebotomistAssignments(),
      this.getOverdueLabReceipts(),
      this.getOverdueLabResults(),
      this.getOverdueDoctorReviews(),
    ]);

    const allBreaches = [
      ...bookingBreaches,
      ...assignmentBreaches,
      ...receiptBreaches,
      ...resultsBreaches,
      ...reviewBreaches,
    ];

    const breach = allBreaches.find((b) => b.id === labOrderId);

    if (!breach) {
      return { isBreached: false };
    }

    return {
      isBreached: true,
      breachType: breach.breachType,
      hoursOverdue: breach.hoursOverdue,
      escalationLevel: breach.escalationLevel || breach.breachLevel,
    };
  }

  /**
   * Mark order as escalated
   */
  async markEscalated(input: MarkEscalatedInput): Promise<any> {
    const data: any = {
      slaEscalatedAt: new Date(),
      slaEscalationReason: input.reason,
    };

    if (input.coordinatorId) {
      data.slaEscalatedBy = input.coordinatorId;
    }

    return this.prisma.labOrder.update({
      where: { id: input.labOrderId },
      data,
    });
  }

  /**
   * Get orders requiring notification
   */
  async getOrdersRequiringNotification(notificationType: string): Promise<any[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let whereClause: any = {};

    switch (notificationType) {
      case 'PATIENT_BOOKING_REMINDER':
        const reminderThreshold = new Date();
        reminderThreshold.setHours(
          reminderThreshold.getHours() - this.thresholds.patientBookingFirstReminder
        );

        whereClause = {
          status: LabOrderStatus.ORDERED,
          orderedAt: { lt: reminderThreshold },
          OR: [
            { lastReminderSentAt: null },
            { lastReminderSentAt: { lt: today } },
          ],
        };
        break;

      default:
        whereClause = { id: 'none' }; // Return empty for unknown types
    }

    return this.prisma.labOrder.findMany({
      where: whereClause,
      include: {
        patient: { select: { id: true, name: true, phone: true } },
      },
    });
  }

  /**
   * Mark reminder as sent
   */
  async markReminderSent(input: MarkReminderSentInput): Promise<any> {
    return this.prisma.labOrder.update({
      where: { id: input.labOrderId },
      data: {
        lastReminderSentAt: new Date(),
        lastReminderType: input.reminderType,
      },
    });
  }
}
