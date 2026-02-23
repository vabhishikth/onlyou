import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationEventType, NotificationChannel, UserRole } from '@prisma/client';

// Spec: master spec Section 11 (Notification System)

export interface NotificationPayload {
  recipientId: string;
  recipientRole: string;
  channel: string;
  eventType: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  labOrderId?: string;
  orderId?: string;
  consultationId?: string;
  subscriptionId?: string;
}

export interface MultiChannelPayload {
  recipientId: string;
  recipientRole: string;
  channels: string[];
  eventType: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  labOrderId?: string;
  orderId?: string;
  consultationId?: string;
  subscriptionId?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  channel?: string;
  eventType?: string;
}

// Critical event types that cannot be disabled
const CRITICAL_EVENT_TYPES = [
  'LAB_CRITICAL_VALUES',
  'LAB_SAMPLE_ISSUE',
  'LAB_COLLECTION_FAILED',
  'DELIVERY_PHARMACY_ISSUE',
  'DELIVERY_FAILED',
];

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Send a single notification
   * Spec: Section 11 — respects user preferences, applies discreet mode
   */
  async sendNotification(payload: NotificationPayload): Promise<any> {
    // Get user preferences
    const preference = await this.prisma.notificationPreference.findUnique({
      where: { userId: payload.recipientId },
    });

    // Check if channel is enabled (critical alerts bypass this)
    const isCritical = CRITICAL_EVENT_TYPES.includes(payload.eventType);
    const channelEnabled = this.isChannelEnabled(preference, payload.channel);

    // Apply discreet mode if enabled
    let title = payload.title;
    let body = payload.body;
    let isDiscreet = false;

    if (preference?.discreetMode) {
      title = 'Onlyou';
      body = 'You have an update';
      isDiscreet = true;
    }

    // Create notification record
    const notification = await this.prisma.notification.create({
      data: {
        recipientId: payload.recipientId,
        recipientRole: payload.recipientRole as UserRole,
        channel: payload.channel as NotificationChannel,
        eventType: payload.eventType as NotificationEventType,
        title,
        body,
        data: payload.data,
        isDiscreet,
        labOrderId: payload.labOrderId,
        orderId: payload.orderId,
        consultationId: payload.consultationId,
        subscriptionId: payload.subscriptionId,
        status: channelEnabled || isCritical ? 'SENT' : 'PENDING',
        sentAt: channelEnabled || isCritical ? new Date() : null,
      },
    });

    // In a real implementation, we'd send to FCM/MSG91/Email here
    // For now, we just mark as sent
    this.logger.debug(`Notification created: ${payload.eventType} → ${payload.recipientId} via ${payload.channel}`);

    return notification;
  }

  /**
   * Send notification to multiple channels
   */
  async sendMultiChannelNotification(payload: MultiChannelPayload): Promise<any[]> {
    const results = [];

    for (const channel of payload.channels) {
      const result = await this.sendNotification({
        ...payload,
        channel,
      });
      results.push(result);
    }

    return results;
  }

  // ============================================
  // BLOOD WORK NOTIFICATIONS (Spec: Section 11)
  // ============================================

  /**
   * Notify when doctor orders blood tests
   * Spec: Patient (Push + in-app), Coordinator (Dashboard)
   */
  async notifyLabTestsOrdered(labOrderId: string): Promise<any> {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: labOrderId },
      include: { patient: true },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    const result: any = {};

    // Notify patient
    result.patient = await this.sendNotification({
      recipientId: labOrder.patientId,
      recipientRole: 'PATIENT',
      channel: 'PUSH',
      eventType: 'LAB_TESTS_ORDERED',
      title: 'Blood Tests Ordered',
      body: `Your doctor has ordered blood tests: ${labOrder.panelName || labOrder.testPanel.join(', ')}`,
      labOrderId,
    });

    // Notify coordinators (ADMIN role)
    const coordinators = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
    });

    if (coordinators.length > 0) {
      result.coordinator = await this.sendNotification({
        recipientId: coordinators[0].id,
        recipientRole: 'ADMIN',
        channel: 'IN_APP',
        eventType: 'LAB_TESTS_ORDERED',
        title: 'New Lab Order',
        body: `New lab order created for patient`,
        labOrderId,
      });
    }

    return result;
  }

  /**
   * Notify when slot is booked
   * Spec: Patient (Confirmation), Coordinator (Dashboard)
   */
  async notifyLabSlotBooked(labOrderId: string): Promise<any> {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: labOrderId },
      include: { patient: true },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    const result: any = {};

    // Notify patient
    result.patient = await this.sendNotification({
      recipientId: labOrder.patientId,
      recipientRole: 'PATIENT',
      channel: 'PUSH',
      eventType: 'LAB_SLOT_BOOKED',
      title: 'Collection Scheduled',
      body: `Your blood sample collection is scheduled for ${labOrder.bookedDate?.toLocaleDateString()} at ${labOrder.bookedTimeSlot}`,
      labOrderId,
    });

    return result;
  }

  /**
   * Notify when phlebotomist is assigned
   * Spec: Patient ("Confirmed, [name]"), Coordinator (✅), Phlebotomist (Assignment)
   */
  async notifyPhlebotomistAssigned(labOrderId: string): Promise<any> {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: labOrderId },
      include: { patient: true, phlebotomist: true },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    const result: any = {};

    // Notify patient with phlebotomist name
    result.patient = await this.sendNotification({
      recipientId: labOrder.patientId,
      recipientRole: 'PATIENT',
      channel: 'PUSH',
      eventType: 'LAB_PHLEBOTOMIST_ASSIGNED',
      title: 'Phlebotomist Assigned',
      body: `Confirmed! ${labOrder.phlebotomist?.name || 'Your phlebotomist'} will collect your sample`,
      labOrderId,
    });

    // Notify phlebotomist
    const phlebotomists = await this.prisma.user.findMany({
      where: { role: 'PHLEBOTOMIST' },
    });

    if (phlebotomists.length > 0) {
      result.phlebotomist = await this.sendNotification({
        recipientId: phlebotomists[0].id,
        recipientRole: 'PHLEBOTOMIST',
        channel: 'PUSH',
        eventType: 'LAB_PHLEBOTOMIST_ASSIGNED',
        title: 'New Assignment',
        body: `You have a new collection assignment for ${labOrder.bookedDate?.toLocaleDateString()} at ${labOrder.bookedTimeSlot}`,
        labOrderId,
      });
    }

    return result;
  }

  /**
   * Send 30-minute reminder before collection
   * Spec: Patient (Reminder), Phlebotomist (Reminder)
   */
  async notifyCollectionReminder(labOrderId: string): Promise<any> {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: labOrderId },
      include: { patient: true, phlebotomist: true },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    const result: any = {};

    // Notify patient
    result.patient = await this.sendNotification({
      recipientId: labOrder.patientId,
      recipientRole: 'PATIENT',
      channel: 'PUSH',
      eventType: 'LAB_COLLECTION_REMINDER',
      title: 'Collection Reminder',
      body: `Your blood sample collection is in 30 minutes`,
      labOrderId,
    });

    // Notify phlebotomist
    const phlebotomists = await this.prisma.user.findMany({
      where: { role: 'PHLEBOTOMIST' },
    });

    if (phlebotomists.length > 0) {
      result.phlebotomist = await this.sendNotification({
        recipientId: phlebotomists[0].id,
        recipientRole: 'PHLEBOTOMIST',
        channel: 'PUSH',
        eventType: 'LAB_COLLECTION_REMINDER',
        title: 'Collection Reminder',
        body: `Collection appointment in 30 minutes at ${labOrder.collectionAddress}`,
        labOrderId,
      });
    }

    return result;
  }

  /**
   * Notify when phlebotomist is running late
   * Spec: Patient ("New ETA: [time]"), Coordinator (✅)
   */
  async notifyRunningLate(labOrderId: string): Promise<any> {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: labOrderId },
      include: { patient: true },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    const result: any = {};

    // Notify patient with new ETA
    result.patient = await this.sendNotification({
      recipientId: labOrder.patientId,
      recipientRole: 'PATIENT',
      channel: 'PUSH',
      eventType: 'LAB_RUNNING_LATE',
      title: 'Phlebotomist Running Late',
      body: `Your phlebotomist is running late. New ETA: ${labOrder.estimatedArrivalTime || 'TBD'}`,
      labOrderId,
    });

    return result;
  }

  /**
   * Notify when sample is collected
   * Spec: Patient ("Collected ✅"), Coordinator (✅), Lab ("Incoming")
   */
  async notifySampleCollected(labOrderId: string): Promise<any> {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: labOrderId },
      include: { patient: true },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    const result: any = {};

    // Notify patient
    result.patient = await this.sendNotification({
      recipientId: labOrder.patientId,
      recipientRole: 'PATIENT',
      channel: 'PUSH',
      eventType: 'LAB_SAMPLE_COLLECTED',
      title: 'Sample Collected',
      body: 'Your blood sample has been collected ✅',
      labOrderId,
    });

    // Notify lab
    const labUsers = await this.prisma.user.findMany({
      where: { role: 'LAB' },
    });

    if (labUsers.length > 0) {
      result.lab = await this.sendNotification({
        recipientId: labUsers[0].id,
        recipientRole: 'LAB',
        channel: 'IN_APP',
        eventType: 'LAB_SAMPLE_COLLECTED',
        title: 'Incoming Sample',
        body: `Sample collected for patient. Expected soon.`,
        labOrderId,
      });
    }

    return result;
  }

  /**
   * Notify when collection fails
   * Spec: Patient ("Reschedule"), Coordinator (URGENT)
   */
  async notifyCollectionFailed(labOrderId: string): Promise<any> {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: labOrderId },
      include: { patient: true },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    const result: any = {};

    // Notify patient
    result.patient = await this.sendNotification({
      recipientId: labOrder.patientId,
      recipientRole: 'PATIENT',
      channel: 'PUSH',
      eventType: 'LAB_COLLECTION_FAILED',
      title: 'Collection Missed',
      body: 'Your sample collection could not be completed. Please reschedule.',
      labOrderId,
    });

    // Notify coordinators (URGENT)
    const coordinators = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
    });

    if (coordinators.length > 0) {
      result.coordinator = await this.sendNotification({
        recipientId: coordinators[0].id,
        recipientRole: 'ADMIN',
        channel: 'IN_APP',
        eventType: 'LAB_COLLECTION_FAILED',
        title: 'URGENT: Collection Failed',
        body: `Sample collection failed. Reason: ${labOrder.collectionFailedReason || 'Unknown'}`,
        labOrderId,
      });
    }

    return result;
  }

  /**
   * Notify when sample is received by lab
   * Spec: Patient ("Being processed"), Coordinator (✅)
   */
  async notifySampleReceived(labOrderId: string): Promise<any> {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: labOrderId },
      include: { patient: true },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    const result: any = {};

    // Notify patient
    result.patient = await this.sendNotification({
      recipientId: labOrder.patientId,
      recipientRole: 'PATIENT',
      channel: 'PUSH',
      eventType: 'LAB_SAMPLE_RECEIVED',
      title: 'Sample Received',
      body: 'Your sample has been received by the lab and is being processed',
      labOrderId,
    });

    return result;
  }

  /**
   * Notify when there's a sample issue
   * Spec: Patient ("Recollection"), Coordinator (URGENT)
   */
  async notifySampleIssue(labOrderId: string): Promise<any> {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: labOrderId },
      include: { patient: true },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    const result: any = {};

    // Notify patient
    result.patient = await this.sendNotification({
      recipientId: labOrder.patientId,
      recipientRole: 'PATIENT',
      channel: 'PUSH',
      eventType: 'LAB_SAMPLE_ISSUE',
      title: 'Sample Issue',
      body: 'There was an issue with your sample. A free recollection will be scheduled.',
      labOrderId,
    });

    // Notify coordinators (URGENT)
    const coordinators = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
    });

    if (coordinators.length > 0) {
      result.coordinator = await this.sendNotification({
        recipientId: coordinators[0].id,
        recipientRole: 'ADMIN',
        channel: 'IN_APP',
        eventType: 'LAB_SAMPLE_ISSUE',
        title: 'URGENT: Sample Issue',
        body: `Sample issue reported. Reason: ${labOrder.sampleIssueReason || 'Unknown'}`,
        labOrderId,
      });
    }

    return result;
  }

  /**
   * Notify when results are ready
   * Spec: Patient (Push + WhatsApp + Email (PDF)), Coordinator (✅), Doctor ("Results ready" 🟣)
   */
  async notifyResultsReady(labOrderId: string): Promise<any> {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: labOrderId },
      include: { patient: true },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    const result: any = {};

    // Notify patient on multiple channels
    result.patient = await this.sendMultiChannelNotification({
      recipientId: labOrder.patientId,
      recipientRole: 'PATIENT',
      channels: ['PUSH', 'WHATSAPP', 'EMAIL'],
      eventType: 'LAB_RESULTS_READY',
      title: 'Lab Results Ready',
      body: 'Your lab results are ready! View them in the app.',
      labOrderId,
    });

    // Notify doctor
    if (labOrder.doctorId) {
      const doctor = await this.prisma.user.findUnique({
        where: { id: labOrder.doctorId },
      });

      if (doctor) {
        result.doctor = await this.sendNotification({
          recipientId: doctor.id,
          recipientRole: 'DOCTOR',
          channel: 'IN_APP',
          eventType: 'LAB_RESULTS_READY',
          title: 'Results Ready 🟣',
          body: `Lab results ready for review`,
          labOrderId,
        });
      }
    }

    return result;
  }

  /**
   * Notify when results have critical values
   * Spec: Patient ("Urgent — doctor notified"), Coordinator (URGENT), Doctor (URGENT 🔴)
   */
  async notifyCriticalValues(labOrderId: string): Promise<any> {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: labOrderId },
      include: { patient: true },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    const result: any = {};

    // Notify patient (critical alert - bypasses preferences)
    result.patient = await this.sendNotification({
      recipientId: labOrder.patientId,
      recipientRole: 'PATIENT',
      channel: 'PUSH',
      eventType: 'LAB_CRITICAL_VALUES',
      title: 'Urgent: Critical Lab Values',
      body: 'Your lab results show critical values. Your doctor has been notified.',
      labOrderId,
    });

    // Notify doctor (URGENT)
    if (labOrder.doctorId) {
      const doctor = await this.prisma.user.findUnique({
        where: { id: labOrder.doctorId },
      });

      if (doctor) {
        result.doctor = await this.sendNotification({
          recipientId: doctor.id,
          recipientRole: 'DOCTOR',
          channel: 'PUSH',
          eventType: 'LAB_CRITICAL_VALUES',
          title: 'URGENT: Critical Lab Values 🔴',
          body: `Patient has critical lab values requiring immediate attention`,
          labOrderId,
        });
      }
    }

    // Notify coordinators (URGENT)
    const coordinators = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
    });

    if (coordinators.length > 0) {
      result.coordinator = await this.sendNotification({
        recipientId: coordinators[0].id,
        recipientRole: 'ADMIN',
        channel: 'IN_APP',
        eventType: 'LAB_CRITICAL_VALUES',
        title: 'URGENT: Critical Values Detected',
        body: `Critical lab values detected. Doctor has been notified.`,
        labOrderId,
      });
    }

    return result;
  }

  /**
   * Notify when doctor reviews results
   * Spec: Patient ("Doctor reviewed")
   */
  async notifyDoctorReviewed(labOrderId: string): Promise<any> {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: labOrderId },
      include: { patient: true },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    const result: any = {};

    // Notify patient
    result.patient = await this.sendNotification({
      recipientId: labOrder.patientId,
      recipientRole: 'PATIENT',
      channel: 'PUSH',
      eventType: 'LAB_DOCTOR_REVIEWED',
      title: 'Doctor Reviewed Results',
      body: 'Your doctor has reviewed your lab results',
      labOrderId,
    });

    return result;
  }

  // SLA Notifications

  /**
   * 3-day reminder if patient hasn't booked slot
   * Spec: Patient (Reminder)
   */
  async notifyBookingReminder3Day(labOrderId: string): Promise<any> {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: labOrderId },
      include: { patient: true },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    const result: any = {};

    // Notify patient
    result.patient = await this.sendNotification({
      recipientId: labOrder.patientId,
      recipientRole: 'PATIENT',
      channel: 'PUSH',
      eventType: 'LAB_BOOKING_REMINDER_3DAY',
      title: 'Book Your Blood Test',
      body: 'Your doctor ordered blood tests 3 days ago. Book a collection slot now.',
      labOrderId,
    });

    return result;
  }

  /**
   * 14-day final reminder if patient hasn't booked slot
   * Spec: Patient (Final reminder), Coordinator (Alert: expired)
   */
  async notifyBookingReminder14Day(labOrderId: string): Promise<any> {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: labOrderId },
      include: { patient: true },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    const result: any = {};

    // Notify patient
    result.patient = await this.sendNotification({
      recipientId: labOrder.patientId,
      recipientRole: 'PATIENT',
      channel: 'PUSH',
      eventType: 'LAB_BOOKING_REMINDER_14DAY',
      title: 'Final Reminder: Blood Test',
      body: 'Your blood test order will expire soon. Book now to avoid reordering.',
      labOrderId,
    });

    // Notify coordinators
    const coordinators = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
    });

    if (coordinators.length > 0) {
      result.coordinator = await this.sendNotification({
        recipientId: coordinators[0].id,
        recipientRole: 'ADMIN',
        channel: 'IN_APP',
        eventType: 'LAB_BOOKING_REMINDER_14DAY',
        title: 'Lab Order Expiring',
        body: `Lab order about to expire - patient hasn't booked slot`,
        labOrderId,
      });
    }

    return result;
  }

  /**
   * 48-hour lab overdue notification
   * Spec: Patient ("Taking longer"), Coordinator (Alert)
   */
  async notifyLabOverdue48hr(labOrderId: string): Promise<any> {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: labOrderId },
      include: { patient: true },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    const result: any = {};

    // Notify patient
    result.patient = await this.sendNotification({
      recipientId: labOrder.patientId,
      recipientRole: 'PATIENT',
      channel: 'PUSH',
      eventType: 'LAB_OVERDUE_48HR',
      title: 'Lab Results Update',
      body: 'Your lab results are taking a bit longer than expected. We\'re on it.',
      labOrderId,
    });

    return result;
  }

  /**
   * 72-hour lab overdue escalation
   * Spec: Patient ("Following up"), Coordinator (Escalation)
   */
  async notifyLabOverdue72hr(labOrderId: string): Promise<any> {
    const labOrder = await this.prisma.labOrder.findUnique({
      where: { id: labOrderId },
      include: { patient: true },
    });

    if (!labOrder) {
      throw new NotFoundException('Lab order not found');
    }

    const result: any = {};

    // Notify patient
    result.patient = await this.sendNotification({
      recipientId: labOrder.patientId,
      recipientRole: 'PATIENT',
      channel: 'PUSH',
      eventType: 'LAB_OVERDUE_72HR',
      title: 'Lab Results Update',
      body: 'We\'re actively following up on your lab results. Thank you for your patience.',
      labOrderId,
    });

    // Notify coordinators (Escalation)
    const coordinators = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
    });

    if (coordinators.length > 0) {
      result.coordinator = await this.sendNotification({
        recipientId: coordinators[0].id,
        recipientRole: 'ADMIN',
        channel: 'IN_APP',
        eventType: 'LAB_OVERDUE_72HR',
        title: 'Escalation: Lab Results Overdue',
        body: `Lab results overdue by 72+ hours. Follow up with lab partner.`,
        labOrderId,
      });
    }

    return result;
  }

  // ============================================
  // DELIVERY NOTIFICATIONS (Spec: Section 11)
  // ============================================

  /**
   * Notify when prescription is created
   * Spec: Patient ("Being prepared"), Coordinator (New order), Pharmacy (Prescription received)
   */
  async notifyPrescriptionCreated(orderId: string): Promise<any> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { patient: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const result: any = {};

    // Notify patient
    result.patient = await this.sendNotification({
      recipientId: order.patientId,
      recipientRole: 'PATIENT',
      channel: 'PUSH',
      eventType: 'DELIVERY_PRESCRIPTION_CREATED',
      title: 'Order Being Prepared',
      body: 'Your prescription is being prepared for delivery.',
      orderId,
    });

    // Notify coordinators
    const coordinators = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
    });

    if (coordinators.length > 0) {
      result.coordinator = await this.sendNotification({
        recipientId: coordinators[0].id,
        recipientRole: 'ADMIN',
        channel: 'IN_APP',
        eventType: 'DELIVERY_PRESCRIPTION_CREATED',
        title: 'New Order',
        body: `New prescription order created`,
        orderId,
      });
    }

    // Notify pharmacy
    const pharmacyUsers = await this.prisma.user.findMany({
      where: { role: 'PHARMACY' },
    });

    if (pharmacyUsers.length > 0) {
      result.pharmacy = await this.sendNotification({
        recipientId: pharmacyUsers[0].id,
        recipientRole: 'PHARMACY',
        channel: 'IN_APP',
        eventType: 'DELIVERY_PRESCRIPTION_CREATED',
        title: 'Prescription Received',
        body: `New prescription received for fulfillment`,
        orderId,
      });
    }

    return result;
  }

  /**
   * Notify when pharmacy is ready
   * Spec: Coordinator ("Ready for pickup")
   */
  async notifyPharmacyReady(orderId: string): Promise<any> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { patient: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const result: any = {};

    // Notify coordinators
    const coordinators = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
    });

    if (coordinators.length > 0) {
      result.coordinator = await this.sendNotification({
        recipientId: coordinators[0].id,
        recipientRole: 'ADMIN',
        channel: 'IN_APP',
        eventType: 'DELIVERY_PHARMACY_READY',
        title: 'Pharmacy Ready',
        body: `Order ready for pickup from pharmacy`,
        orderId,
      });
    }

    return result;
  }

  /**
   * Notify when there's a pharmacy issue
   * Spec: Patient ("Slight delay"), Coordinator (URGENT)
   */
  async notifyPharmacyIssue(orderId: string): Promise<any> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { patient: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const result: any = {};

    // Notify patient
    result.patient = await this.sendNotification({
      recipientId: order.patientId,
      recipientRole: 'PATIENT',
      channel: 'PUSH',
      eventType: 'DELIVERY_PHARMACY_ISSUE',
      title: 'Slight Delay',
      body: 'Your order is experiencing a slight delay. We\'re working on it.',
      orderId,
    });

    // Notify coordinators (URGENT)
    const coordinators = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
    });

    if (coordinators.length > 0) {
      result.coordinator = await this.sendNotification({
        recipientId: coordinators[0].id,
        recipientRole: 'ADMIN',
        channel: 'IN_APP',
        eventType: 'DELIVERY_PHARMACY_ISSUE',
        title: 'URGENT: Pharmacy Issue',
        body: `Pharmacy issue reported: ${order.pharmacyIssueReason || 'Unknown'}`,
        orderId,
      });
    }

    return result;
  }

  /**
   * Notify when order is out for delivery
   * Spec: Patient ([Name], [Phone], ETA, OTP), Coordinator (✅)
   */
  async notifyOutForDelivery(orderId: string): Promise<any> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { patient: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const result: any = {};

    // Notify patient with delivery details
    result.patient = await this.sendNotification({
      recipientId: order.patientId,
      recipientRole: 'PATIENT',
      channel: 'PUSH',
      eventType: 'DELIVERY_OUT_FOR_DELIVERY',
      title: 'Out for Delivery',
      body: `Your order is out for delivery! ${order.deliveryPersonName || 'Driver'} (${order.deliveryPersonPhone || 'N/A'}) will arrive by ${order.estimatedDeliveryTime || 'soon'}. OTP: ${order.deliveryOtp || 'N/A'}`,
      orderId,
    });

    return result;
  }

  /**
   * Notify when order is delivered
   * Spec: Patient ("Delivered ✅"), Coordinator (✅)
   */
  async notifyDelivered(orderId: string): Promise<any> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { patient: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const result: any = {};

    // Notify patient
    result.patient = await this.sendNotification({
      recipientId: order.patientId,
      recipientRole: 'PATIENT',
      channel: 'PUSH',
      eventType: 'DELIVERY_DELIVERED',
      title: 'Order Delivered',
      body: 'Your order has been delivered ✅',
      orderId,
    });

    return result;
  }

  /**
   * Notify when delivery fails
   * Spec: Patient ("Rescheduling"), Coordinator (Alert)
   */
  async notifyDeliveryFailed(orderId: string): Promise<any> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { patient: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const result: any = {};

    // Notify patient
    result.patient = await this.sendNotification({
      recipientId: order.patientId,
      recipientRole: 'PATIENT',
      channel: 'PUSH',
      eventType: 'DELIVERY_FAILED',
      title: 'Delivery Rescheduling',
      body: 'We couldn\'t complete your delivery. We\'re rescheduling automatically.',
      orderId,
    });

    // Notify coordinators
    const coordinators = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
    });

    if (coordinators.length > 0) {
      result.coordinator = await this.sendNotification({
        recipientId: coordinators[0].id,
        recipientRole: 'ADMIN',
        channel: 'IN_APP',
        eventType: 'DELIVERY_FAILED',
        title: 'Delivery Failed',
        body: `Delivery failed: ${order.deliveryFailedReason || 'Unknown'}`,
        orderId,
      });
    }

    return result;
  }

  /**
   * Notify for monthly reorder
   * Spec: Patient ("Next kit being prepared"), Coordinator (New order)
   */
  async notifyMonthlyReorder(orderId: string): Promise<any> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { patient: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const result: any = {};

    // Notify patient
    result.patient = await this.sendNotification({
      recipientId: order.patientId,
      recipientRole: 'PATIENT',
      channel: 'PUSH',
      eventType: 'DELIVERY_MONTHLY_REORDER',
      title: 'Monthly Reorder',
      body: 'Your next kit is being prepared for delivery.',
      orderId,
    });

    // Notify coordinators
    const coordinators = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
    });

    if (coordinators.length > 0) {
      result.coordinator = await this.sendNotification({
        recipientId: coordinators[0].id,
        recipientRole: 'ADMIN',
        channel: 'IN_APP',
        eventType: 'DELIVERY_MONTHLY_REORDER',
        title: 'New Reorder',
        body: `Monthly reorder created`,
        orderId,
      });
    }

    return result;
  }

  // ============================================
  // IN-APP NOTIFICATIONS
  // ============================================

  /**
   * Get unread in-app notifications for a user
   */
  async getUnreadNotifications(userId: string): Promise<any[]> {
    return this.prisma.notification.findMany({
      where: {
        recipientId: userId,
        channel: 'IN_APP',
        status: { in: ['SENT', 'DELIVERED'] },
        readAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get count of unread notifications
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        recipientId: userId,
        channel: 'IN_APP',
        status: { in: ['SENT', 'DELIVERED'] },
        readAt: null,
      },
    });
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(userId: string, notificationId: string): Promise<any> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.recipientId !== userId) {
      throw new BadRequestException('Not authorized to mark this notification');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: 'READ',
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: {
        recipientId: userId,
        channel: 'IN_APP',
        readAt: null,
      },
      data: {
        status: 'READ',
        readAt: new Date(),
      },
    });

    return { count: result.count };
  }

  // ============================================
  // NOTIFICATION HISTORY
  // ============================================

  /**
   * Get paginated notification history
   */
  async getNotificationHistory(
    userId: string,
    options: PaginationOptions,
  ): Promise<{ notifications: any[]; total: number; page: number; limit: number }> {
    const where: any = { recipientId: userId };

    if (options.channel) {
      where.channel = options.channel;
    }

    if (options.eventType) {
      where.eventType = options.eventType;
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      notifications,
      total,
      page: options.page,
      limit: options.limit,
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private isChannelEnabled(preference: any | null, channel: string): boolean {
    if (!preference) {
      return true; // Default: all channels enabled
    }

    switch (channel) {
      case 'PUSH':
        return preference.pushEnabled;
      case 'WHATSAPP':
        return preference.whatsappEnabled;
      case 'SMS':
        return preference.smsEnabled;
      case 'EMAIL':
        return preference.emailEnabled;
      case 'IN_APP':
        return true; // In-app is always enabled
      default:
        return true;
    }
  }
}
