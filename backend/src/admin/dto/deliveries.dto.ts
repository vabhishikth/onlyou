import {
    ObjectType,
    Field,
    Int,
    InputType,
    registerEnumType,
} from '@nestjs/graphql';
import { OrderStatus } from '@prisma/client';

// Re-register enum for GraphQL
registerEnumType(OrderStatus, {
    name: 'OrderStatus',
    description: 'Order/delivery status',
});

// Spec: master spec Section 8 — Medication Fulfillment & Local Delivery

@ObjectType()
export class AdminDeliveryPatient {
    @Field()
    id: string;

    @Field(() => String, { nullable: true })
    name: string | null;

    @Field(() => String, { nullable: true })
    phone: string | null;
}

@ObjectType()
export class AdminDeliveryMedication {
    @Field()
    name: string;

    @Field()
    dosage: string;

    @Field()
    frequency: string;
}

@ObjectType()
export class AdminDeliveryPharmacy {
    @Field()
    id: string;

    @Field()
    name: string;

    @Field(() => String, { nullable: true })
    address: string | null;

    @Field(() => String, { nullable: true })
    phone: string | null;
}

@ObjectType()
export class AdminDelivery {
    @Field()
    id: string;

    @Field(() => AdminDeliveryPatient)
    patient: AdminDeliveryPatient;

    @Field(() => [AdminDeliveryMedication])
    medications: AdminDeliveryMedication[];

    @Field(() => OrderStatus)
    status: OrderStatus;

    @Field(() => AdminDeliveryPharmacy, { nullable: true })
    pharmacy: AdminDeliveryPharmacy | null;

    @Field(() => String, { nullable: true })
    deliveryPersonName: string | null;

    @Field(() => String, { nullable: true })
    deliveryPersonPhone: string | null;

    @Field(() => String, { nullable: true })
    deliveryMethod: string | null;

    @Field(() => String, { nullable: true })
    estimatedDeliveryTime: string | null;

    @Field(() => String, { nullable: true })
    deliveryOtp: string | null;

    @Field()
    deliveryAddress: string;

    @Field()
    deliveryCity: string;

    @Field()
    deliveryPincode: string;

    @Field(() => Int)
    totalAmountPaise: number;

    @Field()
    isReorder: boolean;

    @Field()
    orderedAt: Date;

    @Field(() => Date, { nullable: true })
    sentToPharmacyAt: Date | null;

    @Field(() => Date, { nullable: true })
    pharmacyReadyAt: Date | null;

    @Field(() => Date, { nullable: true })
    outForDeliveryAt: Date | null;

    @Field(() => Date, { nullable: true })
    deliveredAt: Date | null;

    @Field(() => String, { nullable: true })
    pharmacyIssueReason: string | null;

    @Field(() => String, { nullable: true })
    deliveryFailedReason: string | null;
}

@ObjectType()
export class AdminDeliveriesResponse {
    @Field(() => [AdminDelivery])
    deliveries: AdminDelivery[];

    @Field(() => Int)
    total: number;

    @Field(() => Int)
    page: number;

    @Field(() => Int)
    pageSize: number;
}

@InputType()
export class AdminDeliveriesFilterInput {
    @Field(() => [OrderStatus], { nullable: true })
    statuses?: OrderStatus[];

    @Field(() => String, { nullable: true })
    pharmacyId?: string;

    @Field(() => Date, { nullable: true })
    dateFrom?: Date;

    @Field(() => Date, { nullable: true })
    dateTo?: Date;

    @Field(() => Boolean, { nullable: true })
    isReorder?: boolean;

    @Field(() => String, { nullable: true })
    search?: string;

    @Field(() => Int, { nullable: true })
    page?: number;

    @Field(() => Int, { nullable: true })
    pageSize?: number;
}

// Available pharmacies
@ObjectType()
export class AvailablePharmacy {
    @Field()
    id: string;

    @Field()
    name: string;

    @Field()
    address: string;

    @Field()
    city: string;

    @Field()
    phone: string;

    @Field(() => [String])
    serviceableAreas: string[];

    @Field(() => Int)
    avgPreparationMinutes: number;
}

@ObjectType()
export class AvailablePharmaciesResponse {
    @Field(() => [AvailablePharmacy])
    pharmacies: AvailablePharmacy[];
}

// Mutations
@InputType()
export class SendToPharmacyInput {
    @Field()
    orderId: string;

    @Field()
    pharmacyId: string;
}

@InputType()
export class ArrangeDeliveryInput {
    @Field()
    orderId: string;

    @Field()
    deliveryPersonName: string;

    @Field()
    deliveryPersonPhone: string;

    @Field()
    deliveryMethod: string;

    @Field(() => String, { nullable: true })
    estimatedDeliveryTime?: string;
}

@InputType()
export class MarkPharmacyStatusInput {
    @Field()
    orderId: string;

    @Field(() => OrderStatus)
    status: OrderStatus;

    @Field(() => String, { nullable: true })
    issueReason?: string;
}

@InputType()
export class MarkDeliveryStatusInput {
    @Field()
    orderId: string;

    @Field(() => OrderStatus)
    status: OrderStatus;

    @Field(() => String, { nullable: true })
    failedReason?: string;
}

@ObjectType()
export class DeliveryMutationResponse {
    @Field()
    success: boolean;

    @Field()
    message: string;

    @Field(() => AdminDelivery, { nullable: true })
    delivery?: AdminDelivery;
}

@ObjectType()
export class GenerateDeliveryOtpResponse {
    @Field()
    success: boolean;

    @Field()
    message: string;

    @Field(() => String, { nullable: true })
    otp?: string;
}
