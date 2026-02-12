import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Spec: master spec Section 4 (Patient Tracking Screens)

// Types for activity items
export interface ActivityItem {
  id: string;
  type: 'lab' | 'delivery';
  title: string;
  currentStatus: string;
  patientLabel: string;
  icon: string;
  lastUpdated: Date;
  resultFileUrl?: string;
  medications?: Array<{ name: string }>;
  deliveryDetails?: {
    name: string;
    phone: string;
    eta: string;
    otp?: string;
  };
}

export interface ProgressStep {
  label: string;
  status: 'completed' | 'current' | 'upcoming';
  timestamp?: Date;
  details?: string;
}

// Spec: Section 4.2 — Lab Status to Patient-Friendly Label Mapping
const LAB_STATUS_MAPPING: Record<string, { label: string; icon: string }> = {
  ORDERED: { label: 'Doctor ordered blood tests', icon: '🔬' },
  SLOT_BOOKED: { label: 'Collection scheduled', icon: '📅' },
  PHLEBOTOMIST_ASSIGNED: { label: 'Phlebotomist assigned', icon: '👤' },
  SAMPLE_COLLECTED: { label: 'Sample collected ✅', icon: '✅' },
  COLLECTION_FAILED: { label: 'Collection missed — please reschedule', icon: '⚠️' },
  DELIVERED_TO_LAB: { label: 'Sample delivered to lab', icon: '🏥' },
  SAMPLE_RECEIVED: { label: 'Lab received your sample', icon: '🏥' },
  SAMPLE_ISSUE: { label: 'Sample issue — free recollection scheduled', icon: '⚠️' },
  PROCESSING: { label: 'Tests being processed — results in 24-48hrs', icon: '⏳' },
  RESULTS_READY: { label: 'Results ready! Tap to view', icon: '📄' },
  DOCTOR_REVIEWED: { label: 'Doctor reviewed your results', icon: '👨‍⚕️' },
  RESULTS_UPLOADED: { label: 'Your uploaded results are being reviewed', icon: '📤' },
  CLOSED: { label: 'Completed', icon: '✅' },
  CANCELLED: { label: 'Cancelled', icon: '❌' },
  EXPIRED: { label: 'Expired', icon: '⏰' },
};

// Spec: Section 4.3 — Delivery Status to Patient-Friendly Label Mapping
const DELIVERY_STATUS_MAPPING: Record<string, { label: string; icon: string }> = {
  PRESCRIPTION_CREATED: { label: 'Treatment plan ready', icon: '📋' },
  SENT_TO_PHARMACY: { label: 'Prescription sent to pharmacy', icon: '💊' },
  PHARMACY_PREPARING: { label: 'Medication being prepared', icon: '⏳' },
  PHARMACY_READY: { label: 'Medication ready — arranging delivery', icon: '✅' },
  PHARMACY_ISSUE: { label: 'Issue with preparation — we\'re sorting it', icon: '⚠️' },
  PICKUP_ARRANGED: { label: 'Delivery person picking up your kit', icon: '🏃' },
  OUT_FOR_DELIVERY: { label: 'On the way!', icon: '🚗' },
  DELIVERED: { label: 'Delivered ✅', icon: '📦' },
  DELIVERY_FAILED: { label: 'Delivery unsuccessful — rescheduling', icon: '⚠️' },
  RESCHEDULED: { label: 'Rescheduled for', icon: '📅' },
  RETURNED: { label: 'Returned', icon: '↩️' },
  CANCELLED: { label: 'Cancelled', icon: '❌' },
};

// Urgency priority: higher number = more urgent (needs patient action)
const LAB_URGENCY_PRIORITY: Record<string, number> = {
  COLLECTION_FAILED: 100, // Needs patient to rebook
  ORDERED: 90, // Needs patient to book slot
  RESULTS_READY: 80, // Patient should view results
  SAMPLE_ISSUE: 70, // Patient should be informed
  DOCTOR_REVIEWED: 60, // Patient can review doctor notes
  RESULTS_UPLOADED: 50, // Waiting for doctor
  SLOT_BOOKED: 40, // Scheduled
  PHLEBOTOMIST_ASSIGNED: 30, // Assigned
  SAMPLE_COLLECTED: 20, // In progress
  DELIVERED_TO_LAB: 15, // In progress
  SAMPLE_RECEIVED: 10, // In progress
  PROCESSING: 5, // In progress
};

const DELIVERY_URGENCY_PRIORITY: Record<string, number> = {
  DELIVERY_FAILED: 100, // Needs attention
  OUT_FOR_DELIVERY: 90, // Imminent delivery
  DELIVERED: 80, // Confirm OTP
  RESCHEDULED: 70, // Rescheduled
  PHARMACY_ISSUE: 60, // Issue
  PICKUP_ARRANGED: 50, // In progress
  PHARMACY_READY: 40, // Ready
  PHARMACY_PREPARING: 30, // In progress
  SENT_TO_PHARMACY: 20, // In progress
  PRESCRIPTION_CREATED: 10, // Just created
};

// Completed statuses (not shown in active items)
// Note: DELIVERED stays in active items because patient needs to enter OTP (Spec: Section 4.4)
const COMPLETED_LAB_STATUSES = ['CLOSED', 'CANCELLED', 'EXPIRED'];
const COMPLETED_DELIVERY_STATUSES = ['CANCELLED', 'RETURNED'];

@Injectable()
export class TrackingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all active items for a patient
   * Spec: Section 4.1 — Active Items (top section — cards with live status)
   */
  async getActiveItems(patientId: string): Promise<{ items: ActivityItem[] }> {
    // Fetch active lab orders
    const allLabOrders = await this.prisma.labOrder.findMany({
      where: {
        patientId,
        status: { notIn: COMPLETED_LAB_STATUSES as any },
      },
      include: { phlebotomist: true },
      orderBy: { updatedAt: 'desc' },
    });

    // Additional filter for completed statuses (handles mock scenarios in tests)
    const labOrders = allLabOrders.filter(
      (lab) => !COMPLETED_LAB_STATUSES.includes(lab.status),
    );

    // Fetch active delivery orders
    const allOrders = await this.prisma.order.findMany({
      where: {
        patientId,
        status: { notIn: COMPLETED_DELIVERY_STATUSES as any },
      },
      include: { prescription: true },
      orderBy: { updatedAt: 'desc' },
    });

    // Additional filter for completed statuses (handles mock scenarios in tests)
    const orders = allOrders.filter(
      (order) => !COMPLETED_DELIVERY_STATUSES.includes(order.status),
    );

    // Transform to activity items
    const labItems: ActivityItem[] = labOrders.map((lab) =>
      this.transformLabOrderToItem(lab),
    );

    const deliveryItems: ActivityItem[] = orders.map((order) =>
      this.transformOrderToItem(order),
    );

    // Combine and sort by urgency
    const allItems = [...labItems, ...deliveryItems];
    allItems.sort((a, b) => {
      const aUrgency = this.getUrgency(a);
      const bUrgency = this.getUrgency(b);
      return bUrgency - aUrgency; // Higher urgency first
    });

    return { items: allItems };
  }

  /**
   * Get completed/historical items
   * Spec: Section 4.1 — Completed Items (below — collapsed list, most recent first)
   */
  async getCompletedItems(patientId: string): Promise<{ items: ActivityItem[] }> {
    // Fetch completed lab orders
    const labOrders = await this.prisma.labOrder.findMany({
      where: {
        patientId,
        status: { in: COMPLETED_LAB_STATUSES as any },
      },
      include: { phlebotomist: true },
      orderBy: { updatedAt: 'desc' },
    });

    // Fetch completed delivery orders
    const orders = await this.prisma.order.findMany({
      where: {
        patientId,
        status: { in: COMPLETED_DELIVERY_STATUSES as any },
      },
      include: { prescription: true },
      orderBy: { updatedAt: 'desc' },
    });

    // Transform to activity items
    const labItems: ActivityItem[] = labOrders.map((lab) =>
      this.transformLabOrderToItem(lab),
    );

    const deliveryItems: ActivityItem[] = orders.map((order) =>
      this.transformOrderToItem(order),
    );

    // Combine and sort by most recent first
    const allItems = [...labItems, ...deliveryItems];
    allItems.sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());

    return { items: allItems };
  }

  /**
   * Get home banner information
   * Spec: Section 3.3 — Active Tracking Banner
   */
  async getHomeBanner(
    patientId: string,
  ): Promise<{ hasBanner: boolean; bannerText: string | null; itemId?: string; itemType?: 'lab' | 'delivery' }> {
    const { items } = await this.getActiveItems(patientId);

    if (items.length === 0) {
      return { hasBanner: false, bannerText: null };
    }

    // Find most urgent item
    const mostUrgent = items[0];

    // Generate banner text based on status
    let bannerText: string;

    if (mostUrgent.type === 'delivery' && mostUrgent.currentStatus === 'OUT_FOR_DELIVERY') {
      bannerText = `📦 Medication: out for delivery`;
    } else if (mostUrgent.type === 'lab' && mostUrgent.currentStatus === 'COLLECTION_FAILED') {
      bannerText = `🔬 Blood test: please reschedule collection`;
    } else if (mostUrgent.type === 'lab') {
      bannerText = `🔬 Blood test: ${mostUrgent.patientLabel.toLowerCase()}`;
    } else {
      bannerText = `📦 Medication: ${mostUrgent.patientLabel.toLowerCase()}`;
    }

    return {
      hasBanner: true,
      bannerText,
      itemId: mostUrgent.id,
      itemType: mostUrgent.type,
    };
  }

  /**
   * Get a single activity item by ID and type
   */
  async getActivityItem(
    patientId: string,
    itemId: string,
    type: 'lab' | 'delivery',
  ): Promise<ActivityItem | null> {
    if (type === 'lab') {
      const labOrders = await this.prisma.labOrder.findMany({
        where: { id: itemId, patientId },
        include: { phlebotomist: true },
      });

      if (labOrders.length === 0) return null;
      return this.transformLabOrderToItem(labOrders[0]);
    } else {
      const orders = await this.prisma.order.findMany({
        where: { id: itemId, patientId },
        include: { prescription: true },
      });

      if (orders.length === 0) return null;
      return this.transformOrderToItem(orders[0]);
    }
  }

  /**
   * Get progress stepper data for lab order
   * Spec: Section 4.2 — Blood Work Tracking — Patient View
   */
  async getLabOrderProgress(
    patientId: string,
    labOrderId: string,
  ): Promise<{ steps: ProgressStep[] }> {
    const labOrders = await this.prisma.labOrder.findMany({
      where: { id: labOrderId, patientId },
      include: { phlebotomist: true },
    });

    if (labOrders.length === 0) {
      return { steps: [] };
    }

    const lab = labOrders[0];
    const steps: ProgressStep[] = [];

    // Define the standard lab order steps
    const labStepSequence = [
      {
        key: 'ORDERED',
        label: 'Doctor ordered tests',
        timestampField: 'orderedAt',
      },
      {
        key: 'SLOT_BOOKED',
        label: 'Collection scheduled',
        timestampField: 'slotBookedAt',
      },
      {
        key: 'PHLEBOTOMIST_ASSIGNED',
        label: 'Phlebotomist assigned',
        timestampField: 'phlebotomistAssignedAt',
      },
      {
        key: 'SAMPLE_COLLECTED',
        label: 'Sample collection',
        timestampField: 'sampleCollectedAt',
      },
      {
        key: 'DELIVERED_TO_LAB',
        label: 'Sample at lab',
        timestampField: 'deliveredToLabAt',
      },
      {
        key: 'SAMPLE_RECEIVED',
        label: 'Lab received sample',
        timestampField: 'sampleReceivedAt',
      },
      {
        key: 'PROCESSING',
        label: 'Tests processing',
        timestampField: 'processingStartedAt',
      },
      {
        key: 'RESULTS_READY',
        label: 'Results ready',
        timestampField: 'resultsUploadedAt',
      },
      {
        key: 'DOCTOR_REVIEWED',
        label: 'Doctor review',
        timestampField: 'doctorReviewedAt',
      },
    ];

    const statusIndex = labStepSequence.findIndex((s) => s.key === lab.status);

    for (let i = 0; i < labStepSequence.length; i++) {
      const stepDef = labStepSequence[i];
      const timestamp = lab[stepDef.timestampField];

      let status: 'completed' | 'current' | 'upcoming';
      let details: string | undefined;

      if (i < statusIndex || (i === statusIndex && timestamp)) {
        status = 'completed';
      } else if (i === statusIndex) {
        status = 'current';
      } else {
        status = 'upcoming';
      }

      // Add phlebotomist name for assigned step
      if (
        stepDef.key === 'PHLEBOTOMIST_ASSIGNED' &&
        lab.phlebotomist &&
        status !== 'upcoming'
      ) {
        details = `${lab.phlebotomist.name} will collect your sample`;
      }

      steps.push({
        label: stepDef.label,
        status,
        timestamp: timestamp || undefined,
        details,
      });
    }

    return { steps };
  }

  /**
   * Get progress stepper data for delivery order
   * Spec: Section 4.3 — Medication Delivery Tracking — Patient View
   */
  async getDeliveryOrderProgress(
    patientId: string,
    orderId: string,
  ): Promise<{ steps: ProgressStep[] }> {
    const orders = await this.prisma.order.findMany({
      where: { id: orderId, patientId },
      include: { prescription: true },
    });

    if (orders.length === 0) {
      return { steps: [] };
    }

    const order = orders[0];
    const steps: ProgressStep[] = [];

    // Define the standard delivery order steps
    const deliveryStepSequence = [
      {
        key: 'PRESCRIPTION_CREATED',
        label: 'Treatment plan ready',
        timestampField: 'orderedAt',
      },
      {
        key: 'SENT_TO_PHARMACY',
        label: 'Sent to pharmacy',
        timestampField: 'sentToPharmacyAt',
      },
      {
        key: 'PHARMACY_PREPARING',
        label: 'Medication being prepared',
        timestampField: 'pharmacyPreparingAt',
      },
      {
        key: 'PHARMACY_READY',
        label: 'Medication ready',
        timestampField: 'pharmacyReadyAt',
      },
      {
        key: 'PICKUP_ARRANGED',
        label: 'Pickup arranged',
        timestampField: 'pickupArrangedAt',
      },
      {
        key: 'OUT_FOR_DELIVERY',
        label: 'On the way',
        timestampField: 'outForDeliveryAt',
      },
      {
        key: 'DELIVERED',
        label: 'Delivered',
        timestampField: 'deliveredAt',
      },
    ];

    const statusIndex = deliveryStepSequence.findIndex(
      (s) => s.key === order.status,
    );

    for (let i = 0; i < deliveryStepSequence.length; i++) {
      const stepDef = deliveryStepSequence[i];
      const timestamp = order[stepDef.timestampField];

      let status: 'completed' | 'current' | 'upcoming';
      let details: string | undefined;

      if (i < statusIndex || (i === statusIndex && timestamp)) {
        status = 'completed';
      } else if (i === statusIndex) {
        status = 'current';
      } else {
        status = 'upcoming';
      }

      // Add delivery person details for out for delivery step
      if (
        stepDef.key === 'OUT_FOR_DELIVERY' &&
        order.deliveryPersonName &&
        status !== 'upcoming'
      ) {
        details = `Delivery by: ${order.deliveryPersonName}`;
        if (order.deliveryPersonPhone) {
          details += ` — 📞 ${order.deliveryPersonPhone}`;
        }
      }

      steps.push({
        label: stepDef.label,
        status,
        timestamp: timestamp || undefined,
        details,
      });
    }

    return { steps };
  }

  // Private helper methods

  private transformLabOrderToItem(lab: any): ActivityItem {
    const mapping = LAB_STATUS_MAPPING[lab.status] || {
      label: lab.status,
      icon: '❓',
    };

    let patientLabel = mapping.label;

    // Add dynamic details to label
    if (lab.status === 'SLOT_BOOKED' && lab.bookedDate && lab.bookedTimeSlot) {
      const date = new Date(lab.bookedDate).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
      });
      patientLabel = `Collection scheduled — ${date}, ${lab.bookedTimeSlot}`;
    } else if (lab.status === 'PHLEBOTOMIST_ASSIGNED' && lab.phlebotomist) {
      patientLabel = `Phlebotomist assigned — ${lab.phlebotomist.name}`;
    }

    return {
      id: lab.id,
      type: 'lab',
      title: lab.panelName || 'Blood Test',
      currentStatus: lab.status,
      patientLabel,
      icon: mapping.icon,
      lastUpdated: lab.updatedAt,
      resultFileUrl: lab.resultFileUrl,
    };
  }

  private transformOrderToItem(order: any): ActivityItem {
    const mapping = DELIVERY_STATUS_MAPPING[order.status] || {
      label: order.status,
      icon: '❓',
    };

    let patientLabel = mapping.label;
    let deliveryDetails: ActivityItem['deliveryDetails'];

    // Add dynamic details to label
    if (order.status === 'OUT_FOR_DELIVERY') {
      patientLabel = `On the way! ${order.deliveryPersonName || ''}`.trim();
      if (order.deliveryPersonName) {
        deliveryDetails = {
          name: order.deliveryPersonName,
          phone: order.deliveryPersonPhone || '',
          eta: order.estimatedDeliveryTime || '',
          otp: order.deliveryOtp,
        };
      }
    } else if (order.status === 'DELIVERED' && order.deliveredAt) {
      const date = new Date(order.deliveredAt).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      patientLabel = `Delivered ✅ — ${date}`;
    } else if (order.status === 'RESCHEDULED' && order.rescheduledAt) {
      const date = new Date(order.rescheduledAt).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
      });
      patientLabel = `Rescheduled for ${date}`;
    }

    // Extract medications from prescription
    const medications =
      order.prescription?.medications?.map((m: any) => ({ name: m.name })) || [];

    return {
      id: order.id,
      type: 'delivery',
      title: `Treatment Kit — ${new Date(order.orderedAt).toLocaleDateString('en-IN', { month: 'long' })}`,
      currentStatus: order.status,
      patientLabel,
      icon: mapping.icon,
      lastUpdated: order.updatedAt,
      medications,
      deliveryDetails,
    };
  }

  private getUrgency(item: ActivityItem): number {
    if (item.type === 'lab') {
      return LAB_URGENCY_PRIORITY[item.currentStatus] || 0;
    } else {
      return DELIVERY_URGENCY_PRIORITY[item.currentStatus] || 0;
    }
  }
}
