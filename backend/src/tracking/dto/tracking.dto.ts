import { Field, ObjectType, InputType, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, Min, Max, IsNumber } from 'class-validator';

// Spec: master spec Section 4 (Patient Tracking Screens)

// ============================================
// Response Types — match mobile's graphql/tracking.ts query shapes
// ============================================

@ObjectType()
export class TrackingLabOrderType {
  @Field(() => String)
  id: string;

  @Field(() => String)
  status: string;

  @Field(() => [String])
  testPanel: string[];

  @Field(() => String, { nullable: true })
  panelName?: string | null;

  @Field(() => String, { nullable: true })
  bookedDate?: string | null;

  @Field(() => String, { nullable: true })
  bookedTimeSlot?: string | null;

  @Field(() => String, { nullable: true })
  collectionAddress?: string | null;

  @Field(() => String, { nullable: true })
  phlebotomistName?: string | null;

  @Field(() => String, { nullable: true })
  phlebotomistPhone?: string | null;

  @Field(() => String, { nullable: true })
  resultFileUrl?: string | null;

  @Field(() => String, { nullable: true })
  abnormalFlags?: string | null;

  @Field(() => Boolean)
  criticalValues: boolean;

  @Field(() => Date)
  orderedAt: Date;

  @Field(() => Date, { nullable: true })
  slotBookedAt?: Date | null;

  @Field(() => Date, { nullable: true })
  phlebotomistAssignedAt?: Date | null;

  @Field(() => Date, { nullable: true })
  sampleCollectedAt?: Date | null;

  @Field(() => Date, { nullable: true })
  collectionFailedAt?: Date | null;

  @Field(() => String, { nullable: true })
  collectionFailedReason?: string | null;

  @Field(() => Date, { nullable: true })
  deliveredToLabAt?: Date | null;

  @Field(() => Date, { nullable: true })
  sampleReceivedAt?: Date | null;

  @Field(() => Date, { nullable: true })
  processingStartedAt?: Date | null;

  @Field(() => Date, { nullable: true })
  resultsUploadedAt?: Date | null;

  @Field(() => Date, { nullable: true })
  doctorReviewedAt?: Date | null;

  @Field(() => String, { nullable: true })
  doctorNote?: string | null;
}

@ObjectType()
export class TrackingDeliveryOrderType {
  @Field(() => String)
  id: string;

  @Field(() => String)
  status: string;

  @Field(() => String, { nullable: true })
  prescriptionId?: string | null;

  @Field(() => String, { nullable: true })
  deliveryPersonName?: string | null;

  @Field(() => String, { nullable: true })
  deliveryPersonPhone?: string | null;

  @Field(() => String, { nullable: true })
  estimatedDeliveryTime?: string | null;

  @Field(() => String, { nullable: true })
  deliveryOtp?: string | null;

  @Field(() => Date, { nullable: true })
  prescriptionCreatedAt?: Date | null;

  @Field(() => Date, { nullable: true })
  sentToPharmacyAt?: Date | null;

  @Field(() => Date, { nullable: true })
  pharmacyPreparingAt?: Date | null;

  @Field(() => Date, { nullable: true })
  pharmacyReadyAt?: Date | null;

  @Field(() => Date, { nullable: true })
  pickupArrangedAt?: Date | null;

  @Field(() => Date, { nullable: true })
  outForDeliveryAt?: Date | null;

  @Field(() => Date, { nullable: true })
  deliveredAt?: Date | null;

  @Field(() => Date, { nullable: true })
  deliveryFailedAt?: Date | null;

  @Field(() => Date, { nullable: true })
  rescheduledAt?: Date | null;
}

@ObjectType()
export class ActiveTrackingResponse {
  @Field(() => [TrackingLabOrderType])
  labOrders: TrackingLabOrderType[];

  @Field(() => [TrackingDeliveryOrderType])
  deliveryOrders: TrackingDeliveryOrderType[];
}

// ============================================
// Progress Step Types — for stepper UI
// ============================================

@ObjectType()
export class ProgressStepType {
  @Field(() => String)
  label: string;

  @Field(() => String)
  status: string;

  @Field(() => Date, { nullable: true })
  timestamp?: Date | null;

  @Field(() => String, { nullable: true })
  details?: string | null;
}

@ObjectType()
export class ProgressResponse {
  @Field(() => [ProgressStepType])
  steps: ProgressStepType[];
}

// ============================================
// Home Banner
// ============================================

@ObjectType()
export class HomeBannerResponse {
  @Field(() => Boolean)
  hasBanner: boolean;

  @Field(() => String, { nullable: true })
  bannerText?: string | null;

  @Field(() => String, { nullable: true })
  itemId?: string | null;

  @Field(() => String, { nullable: true })
  itemType?: string | null;
}

// ============================================
// Mutation Inputs
// ============================================

@InputType()
export class BookSlotInput {
  @Field(() => String)
  @IsNotEmpty()
  labOrderId: string;

  @Field(() => String)
  @IsNotEmpty()
  slotId: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  collectionAddress?: string;
}

@InputType()
export class RescheduleLabInput {
  @Field(() => String)
  @IsNotEmpty()
  labOrderId: string;

  @Field(() => String)
  @IsNotEmpty()
  newSlotId: string;
}

@InputType()
export class CancelLabInput {
  @Field(() => String)
  @IsNotEmpty()
  labOrderId: string;

  @Field(() => String)
  @IsNotEmpty()
  reason: string;
}

@InputType()
export class ConfirmDeliveryOTPInput {
  @Field(() => String)
  @IsNotEmpty()
  orderId: string;

  @Field(() => String)
  @IsNotEmpty()
  otp: string;
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

// ============================================
// Mutation Responses
// ============================================

@ObjectType()
export class TrackingMutationResponse {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String)
  message: string;
}

@ObjectType()
export class ConfirmOTPResponse {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => Boolean)
  verified: boolean;

  @Field(() => String, { nullable: true })
  message?: string | null;
}
