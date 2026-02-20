import { Field, ObjectType, InputType, Int, registerEnumType } from '@nestjs/graphql';
import { OrderStatus } from '@prisma/client';
import { IsNotEmpty, IsNumber, Min, Max } from 'class-validator';

// Spec: master spec Section 8 (Medication Delivery)

// Register OrderStatus enum for GraphQL
registerEnumType(OrderStatus, {
  name: 'OrderStatus',
  description: 'Order delivery status values',
});

// ============================================
// OUTPUT TYPES
// ============================================

@ObjectType()
export class OrderType {
  @Field(() => String)
  id: string;

  @Field(() => String)
  orderNumber: string;

  @Field(() => String)
  patientId: string;

  @Field(() => String)
  prescriptionId: string;

  @Field(() => String, { nullable: true })
  consultationId?: string;

  @Field(() => OrderStatus)
  status: OrderStatus;

  // Pharmacy info
  @Field(() => String, { nullable: true })
  pharmacyPartnerId?: string;

  @Field(() => String, { nullable: true })
  pharmacyPartnerName?: string;

  @Field(() => String, { nullable: true })
  pharmacyAddress?: string;

  // Delivery info
  @Field(() => String, { nullable: true })
  deliveryPersonName?: string;

  @Field(() => String, { nullable: true })
  deliveryPersonPhone?: string;

  @Field(() => String, { nullable: true })
  deliveryMethod?: string;

  @Field(() => String)
  deliveryAddress: string;

  @Field(() => String)
  deliveryCity: string;

  @Field(() => String)
  deliveryPincode: string;

  @Field(() => String, { nullable: true })
  estimatedDeliveryTime?: string;

  @Field(() => String, { nullable: true })
  deliveryOtp?: string;

  // Financials (paise)
  @Field(() => Int)
  medicationCost: number;

  @Field(() => Int)
  deliveryCost: number;

  @Field(() => Int)
  totalAmount: number;

  // Reorder
  @Field(() => Boolean, { nullable: true })
  isReorder?: boolean;

  @Field(() => String, { nullable: true })
  parentOrderId?: string;

  // Timestamps
  @Field(() => Date)
  orderedAt: Date;

  @Field(() => Date, { nullable: true })
  sentToPharmacyAt?: Date;

  @Field(() => Date, { nullable: true })
  pharmacyReadyAt?: Date;

  @Field(() => Date, { nullable: true })
  deliveredAt?: Date;

  @Field(() => Date, { nullable: true })
  cancelledAt?: Date;

  @Field(() => String, { nullable: true })
  cancellationReason?: string;

  @Field(() => String, { nullable: true })
  deliveryFailedReason?: string;

  @Field(() => String, { nullable: true })
  pharmacyIssueReason?: string;

  @Field(() => Int, { nullable: true })
  deliveryRating?: number;

  // Patient info (from join)
  @Field(() => String, { nullable: true })
  patientName?: string;

  @Field(() => String, { nullable: true })
  patientPhone?: string;
}

@ObjectType()
export class OrderMutationResponse {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String)
  message: string;

  @Field(() => OrderType, { nullable: true })
  order?: OrderType;
}

// ============================================
// INPUT TYPES
// ============================================

@InputType()
export class CreateOrderInput {
  @Field(() => String)
  @IsNotEmpty()
  prescriptionId: string;

  @Field(() => String)
  @IsNotEmpty()
  deliveryAddress: string;

  @Field(() => String)
  @IsNotEmpty()
  deliveryCity: string;

  @Field(() => String)
  @IsNotEmpty()
  deliveryPincode: string;

  @Field(() => Int)
  @IsNumber()
  @Min(0)
  medicationCost: number;

  @Field(() => Int)
  @IsNumber()
  @Min(0)
  deliveryCost: number;
}

@InputType()
export class SendToPharmacyInput {
  @Field(() => String)
  @IsNotEmpty()
  orderId: string;

  @Field(() => String)
  @IsNotEmpty()
  pharmacyId: string;
}

@InputType()
export class ArrangePickupInput {
  @Field(() => String)
  @IsNotEmpty()
  orderId: string;

  @Field(() => String)
  @IsNotEmpty()
  deliveryPersonName: string;

  @Field(() => String)
  @IsNotEmpty()
  deliveryPersonPhone: string;

  @Field(() => String)
  @IsNotEmpty()
  deliveryMethod: string;

  @Field(() => String)
  @IsNotEmpty()
  estimatedDeliveryTime: string;
}

@InputType()
export class ConfirmDeliveryInput {
  @Field(() => String)
  @IsNotEmpty()
  orderId: string;

  @Field(() => String)
  @IsNotEmpty()
  otp: string;
}

@InputType()
export class MarkDeliveryFailedInput {
  @Field(() => String)
  @IsNotEmpty()
  orderId: string;

  @Field(() => String)
  @IsNotEmpty()
  reason: string;
}

@InputType()
export class RescheduleDeliveryInput {
  @Field(() => String)
  @IsNotEmpty()
  orderId: string;

  @Field(() => String)
  @IsNotEmpty()
  newDeliveryDate: string;
}

@InputType()
export class CancelOrderInput {
  @Field(() => String)
  @IsNotEmpty()
  orderId: string;

  @Field(() => String)
  @IsNotEmpty()
  reason: string;
}

@InputType()
export class RateDeliveryInput {
  @Field(() => String)
  @IsNotEmpty()
  orderId: string;

  @Field(() => Int)
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;
}
