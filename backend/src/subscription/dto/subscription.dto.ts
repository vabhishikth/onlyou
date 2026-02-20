import { Field, ObjectType, InputType, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional } from 'class-validator';

// Spec: master spec Section 12 (Payment & Subscription)

// ============================================
// OUTPUT TYPES
// ============================================

@ObjectType()
export class SubscriptionPlanType {
  @Field(() => String)
  id: string;

  @Field(() => String)
  vertical: string;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => Int)
  priceInPaise: number;

  @Field(() => Int)
  durationMonths: number;

  @Field(() => [String])
  features: string[];

  @Field(() => Boolean)
  isActive: boolean;
}

@ObjectType()
export class SubscriptionType {
  @Field(() => String)
  id: string;

  @Field(() => String)
  userId: string;

  @Field(() => String)
  planId: string;

  @Field(() => String)
  status: string;

  @Field(() => Date)
  currentPeriodStart: Date;

  @Field(() => Date)
  currentPeriodEnd: Date;

  @Field(() => Date, { nullable: true })
  cancelledAt?: Date;

  @Field(() => Date, { nullable: true })
  activeUntil?: Date;

  @Field(() => SubscriptionPlanType, { nullable: true })
  plan?: SubscriptionPlanType;
}

@ObjectType()
export class SubscriptionMutationResponse {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String)
  message: string;
}

// ============================================
// INPUT TYPES
// ============================================

@InputType()
export class CancelSubscriptionInput {
  @Field(() => String)
  @IsNotEmpty()
  subscriptionId: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  reason?: string;
}
