import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationService } from './notification.service';
import { SlaEscalationService } from '../lab-order/sla-escalation.service';
import { PrismaService } from '../prisma/prisma.service';

// Spec: master spec Section 7.4 (SLA Escalation) + Section 11 (Notifications)

// 14 days in hours
const EXPIRY_THRESHOLD_HOURS = 14 * 24; // 336 hours
// 72 hours threshold for critical lab results
const LAB_CRITICAL_HOURS = 72;

@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly slaService: SlaEscalationService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Every day at 9am IST — check for patients who haven't booked 3+ days after ordering
   */
  @Cron('0 9 * * *')
  async checkBookingReminders(): Promise<void> {
    this.logger.log('Running booking reminder check...');

    const overdueBookings = await this.slaService.getOverduePatientBookings();

    for (const order of overdueBookings) {
      try {
        await this.notificationService.notifyBookingReminder3Day(order.id);
        await this.slaService.markReminderSent({
          labOrderId: order.id,
          reminderType: 'BOOKING_REMINDER_3DAY',
        });
      } catch (error) {
        this.logger.error(`Failed to send booking reminder for ${order.id}: ${error.message}`);
      }
    }

    this.logger.log(`Booking reminder check complete. Processed ${overdueBookings.length} orders.`);
  }

  /**
   * Every day at 9am IST — check for orders 14+ days old, send final reminder + expire
   */
  @Cron('0 9 * * *')
  async checkBookingExpiry(): Promise<void> {
    this.logger.log('Running booking expiry check...');

    const allOverdue = await this.slaService.getOverduePatientBookings();

    // Filter to only 14+ day overdue orders
    const expiringOrders = allOverdue.filter(
      (order) => order.hoursOverdue >= EXPIRY_THRESHOLD_HOURS,
    );

    for (const order of expiringOrders) {
      try {
        await this.notificationService.notifyBookingReminder14Day(order.id);
      } catch (error) {
        this.logger.error(`Failed to send 14-day reminder for ${order.id}: ${error.message}`);
      }
    }

    // Expire stale orders
    const result = await this.slaService.expireStaleOrders();
    if (result.expiredCount > 0) {
      this.logger.log(`Expired ${result.expiredCount} stale orders: ${result.expiredOrderIds.join(', ')}`);
    }

    this.logger.log(`Booking expiry check complete. Notified ${expiringOrders.length}, expired ${result.expiredCount}.`);
  }

  /**
   * Every 2 hours — check for overdue lab results (48hr and 72hr tiers)
   */
  @Cron('0 */2 * * *')
  async checkLabOverdue(): Promise<void> {
    this.logger.log('Running lab overdue check...');

    const overdueResults = await this.slaService.getOverdueLabResults();

    for (const order of overdueResults) {
      try {
        if (order.hoursOverdue >= LAB_CRITICAL_HOURS) {
          await this.notificationService.notifyLabOverdue72hr(order.id);
        } else {
          await this.notificationService.notifyLabOverdue48hr(order.id);
        }
      } catch (error) {
        this.logger.error(`Failed to send lab overdue notification for ${order.id}: ${error.message}`);
      }
    }

    this.logger.log(`Lab overdue check complete. Processed ${overdueResults.length} orders.`);
  }

  /**
   * Every 30 minutes — check for upcoming collection appointments and send reminders
   */
  @Cron('*/30 * * * *')
  async checkCollectionReminders(): Promise<void> {
    this.logger.log('Running collection reminder check...');

    const now = new Date();
    const thirtyMinutesLater = new Date(now.getTime() + 30 * 60 * 1000);

    const upcomingSlots = await this.prisma.labSlot.findMany({
      where: {
        scheduledDate: {
          gte: now,
          lte: thirtyMinutesLater,
        },
      },
      include: {
        labOrder: { select: { id: true } },
      },
    });

    for (const slot of upcomingSlots) {
      try {
        if (slot.labOrder?.id) {
          await this.notificationService.notifyCollectionReminder(slot.labOrder.id);
        }
      } catch (error) {
        this.logger.error(`Failed to send collection reminder for slot ${slot.id}: ${error.message}`);
      }
    }

    this.logger.log(`Collection reminder check complete. Processed ${upcomingSlots.length} slots.`);
  }

  /**
   * Every day at midnight — check for subscriptions nearing period end and prompt reorder
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkMonthlyReorders(): Promise<void> {
    this.logger.log('Running monthly reorder check...');

    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        currentPeriodEnd: {
          lte: threeDaysFromNow,
          gte: new Date(),
        },
      },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true },
        },
      },
    });

    for (const sub of subscriptions) {
      try {
        const latestOrder = sub.orders[0];
        if (latestOrder) {
          await this.notificationService.notifyMonthlyReorder(latestOrder.id);
        }
      } catch (error) {
        this.logger.error(`Failed to send reorder notification for sub ${sub.id}: ${error.message}`);
      }
    }

    this.logger.log(`Monthly reorder check complete. Processed ${subscriptions.length} subscriptions.`);
  }
}
