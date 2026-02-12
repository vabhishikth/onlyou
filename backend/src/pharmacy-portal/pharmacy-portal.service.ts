import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Spec: master spec Section 8.1 — Pharmacy Portal (pharmacy.onlyou.life)
// Three tabs: New Orders | Preparing | Ready for Pickup

// Order statuses relevant to pharmacy
export enum PharmacyOrderStatus {
    SENT_TO_PHARMACY = 'SENT_TO_PHARMACY',
    PHARMACY_PREPARING = 'PHARMACY_PREPARING',
    PHARMACY_READY = 'PHARMACY_READY',
    PHARMACY_ISSUE = 'PHARMACY_ISSUE',
    PICKUP_ARRANGED = 'PICKUP_ARRANGED',
    OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
}

export interface PharmacyInfo {
    id: string;
    name: string;
    address: string;
    city: string;
    isActive: boolean;
}

export interface PharmacyOrderSummary {
    id: string;
    orderId: string; // Display ID
    patientArea: string; // Anonymized — no full name
    medications: MedicationItem[];
    prescriptionUrl: string | null;
    status: string;
    createdAt: Date;
    deliveryPersonName: string | null;
    deliveryPersonPhone: string | null;
}

export interface MedicationItem {
    name: string;
    dosage: string;
    quantity: number;
}

export interface TodaySummary {
    newOrders: number;
    preparing: number;
    ready: number;
}

@Injectable()
export class PharmacyPortalService {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * Get pharmacy info for the logged-in pharmacy
     */
    async getPharmacyInfo(pharmacyId: string): Promise<PharmacyInfo> {
        const pharmacy = await this.prisma.partnerPharmacy.findUnique({
            where: { id: pharmacyId },
        });

        if (!pharmacy) {
            throw new NotFoundException('Pharmacy not found');
        }

        return {
            id: pharmacy.id,
            name: pharmacy.name,
            address: pharmacy.address,
            city: pharmacy.city,
            isActive: pharmacy.isActive,
        };
    }

    /**
     * Get today's summary stats
     */
    async getTodaySummary(pharmacyId: string): Promise<TodaySummary> {
        // Count new orders (SENT_TO_PHARMACY)
        const newOrders = await this.prisma.order.count({
            where: {
                pharmacyId,
                status: PharmacyOrderStatus.SENT_TO_PHARMACY,
            },
        });

        // Count preparing (PHARMACY_PREPARING)
        const preparing = await this.prisma.order.count({
            where: {
                pharmacyId,
                status: PharmacyOrderStatus.PHARMACY_PREPARING,
            },
        });

        // Count ready (PHARMACY_READY, PICKUP_ARRANGED)
        const ready = await this.prisma.order.count({
            where: {
                pharmacyId,
                status: {
                    in: [PharmacyOrderStatus.PHARMACY_READY, PharmacyOrderStatus.PICKUP_ARRANGED],
                },
            },
        });

        return { newOrders, preparing, ready };
    }

    /**
     * Get new orders (SENT_TO_PHARMACY)
     */
    async getNewOrders(pharmacyId: string): Promise<PharmacyOrderSummary[]> {
        const orders = await this.prisma.order.findMany({
            where: {
                pharmacyId,
                status: PharmacyOrderStatus.SENT_TO_PHARMACY,
            },
            include: {
                patient: {
                    select: {
                        address: true,
                        city: true,
                    },
                },
                prescription: {
                    select: {
                        pdfUrl: true,
                        medications: true,
                    },
                },
            },
            orderBy: { createdAt: 'asc' }, // Oldest first
        });

        return orders.map((order) => this.mapToOrderSummary(order));
    }

    /**
     * Get preparing orders (PHARMACY_PREPARING)
     */
    async getPreparingOrders(pharmacyId: string): Promise<PharmacyOrderSummary[]> {
        const orders = await this.prisma.order.findMany({
            where: {
                pharmacyId,
                status: PharmacyOrderStatus.PHARMACY_PREPARING,
            },
            include: {
                patient: {
                    select: {
                        address: true,
                        city: true,
                    },
                },
                prescription: {
                    select: {
                        pdfUrl: true,
                        medications: true,
                    },
                },
            },
            orderBy: { pharmacyPreparingAt: 'asc' },
        });

        return orders.map((order) => this.mapToOrderSummary(order));
    }

    /**
     * Get ready orders (PHARMACY_READY, PICKUP_ARRANGED)
     */
    async getReadyOrders(pharmacyId: string): Promise<PharmacyOrderSummary[]> {
        const orders = await this.prisma.order.findMany({
            where: {
                pharmacyId,
                status: {
                    in: [PharmacyOrderStatus.PHARMACY_READY, PharmacyOrderStatus.PICKUP_ARRANGED],
                },
            },
            include: {
                patient: {
                    select: {
                        address: true,
                        city: true,
                    },
                },
                prescription: {
                    select: {
                        pdfUrl: true,
                        medications: true,
                    },
                },
            },
            orderBy: { pharmacyReadyAt: 'asc' },
        });

        return orders.map((order) => this.mapToOrderSummary(order));
    }

    /**
     * Start preparing order
     * Spec: Section 8.2 Step 3 — Pharmacy Preparing
     */
    async startPreparing(
        pharmacyId: string,
        orderId: string,
    ): Promise<PharmacyOrderSummary> {
        const order = await this.getOrder(orderId, pharmacyId);

        if (order.status !== PharmacyOrderStatus.SENT_TO_PHARMACY) {
            throw new BadRequestException(
                `Cannot start preparing: order is in ${order.status} status`,
            );
        }

        const updated = await this.prisma.order.update({
            where: { id: orderId },
            data: {
                status: PharmacyOrderStatus.PHARMACY_PREPARING,
                pharmacyPreparingAt: new Date(),
            },
            include: {
                patient: { select: { address: true, city: true } },
                prescription: { select: { pdfUrl: true, medications: true } },
            },
        });

        return this.mapToOrderSummary(updated);
    }

    /**
     * Mark order as ready for pickup
     * Spec: Section 8.2 Step 3b — Pharmacy Ready
     */
    async markReady(
        pharmacyId: string,
        orderId: string,
    ): Promise<PharmacyOrderSummary> {
        const order = await this.getOrder(orderId, pharmacyId);

        if (order.status !== PharmacyOrderStatus.PHARMACY_PREPARING) {
            throw new BadRequestException(
                `Cannot mark as ready: order is in ${order.status} status`,
            );
        }

        const updated = await this.prisma.order.update({
            where: { id: orderId },
            data: {
                status: PharmacyOrderStatus.PHARMACY_READY,
                pharmacyReadyAt: new Date(),
            },
            include: {
                patient: { select: { address: true, city: true } },
                prescription: { select: { pdfUrl: true, medications: true } },
            },
        });

        // TODO: Notify coordinator that order is ready

        return this.mapToOrderSummary(updated);
    }

    /**
     * Report stock issue
     * Spec: Section 8.2 — Stock Issue
     */
    async reportStockIssue(
        pharmacyId: string,
        orderId: string,
        missingMedications: string[],
    ): Promise<{ success: boolean; message: string }> {
        const order = await this.getOrder(orderId, pharmacyId);

        const validStatuses = [
            PharmacyOrderStatus.SENT_TO_PHARMACY,
            PharmacyOrderStatus.PHARMACY_PREPARING,
        ];

        if (!validStatuses.includes(order.status as PharmacyOrderStatus)) {
            throw new BadRequestException(
                `Cannot report stock issue: order is in ${order.status} status`,
            );
        }

        if (!missingMedications || missingMedications.length === 0) {
            throw new BadRequestException('Missing medications list is required');
        }

        // Update order to PHARMACY_ISSUE
        await this.prisma.order.update({
            where: { id: orderId },
            data: {
                status: PharmacyOrderStatus.PHARMACY_ISSUE,
                pharmacyIssueAt: new Date(),
                pharmacyIssueReason: `Stock unavailable: ${missingMedications.join(', ')}`,
            },
        });

        // TODO: Notify coordinator

        return {
            success: true,
            message: 'Stock issue reported. Coordinator will reassign.',
        };
    }

    /**
     * Helper: Get order with permission check
     */
    private async getOrder(orderId: string, pharmacyId: string): Promise<any> {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        if (order.pharmacyId !== pharmacyId) {
            throw new ForbiddenException('You do not have access to this order');
        }

        return order;
    }

    /**
     * Helper: Map order to summary
     */
    private mapToOrderSummary(order: any): PharmacyOrderSummary {
        // Parse medications from prescription
        let medications: MedicationItem[] = [];
        if (order.prescription?.medications) {
            const meds = order.prescription.medications;
            if (Array.isArray(meds)) {
                medications = meds.map((med: any) => ({
                    name: med.name || med.medication || 'Unknown',
                    dosage: med.dosage || med.dose || '',
                    quantity: med.quantity || med.qty || 1,
                }));
            }
        }

        // Get patient area (anonymized)
        const patientArea = order.patient?.city || 'Unknown area';

        return {
            id: order.id,
            orderId: order.id.slice(-8).toUpperCase(), // Last 8 chars for display
            patientArea,
            medications,
            prescriptionUrl: order.prescription?.pdfUrl || null,
            status: order.status,
            createdAt: order.createdAt,
            deliveryPersonName: order.deliveryPersonName,
            deliveryPersonPhone: order.deliveryPersonPhone,
        };
    }
}
