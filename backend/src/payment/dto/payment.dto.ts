import { Field, ObjectType, InputType, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';
import GraphQLJSON from 'graphql-type-json';

// Spec: master spec Section 12 (Payment & Subscription)

// ============================================
// OUTPUT TYPES
// ============================================

@ObjectType()
export class PaymentType {
  @Field(() => String)
  id: string;

  @Field(() => String)
  userId: string;

  @Field(() => Int)
  amountPaise: number;

  @Field(() => String)
  status: string;

  @Field(() => String, { nullable: true })
  razorpayOrderId?: string;

  @Field(() => String, { nullable: true })
  razorpayPaymentId?: string;

  @Field(() => String, { nullable: true })
  method?: string;

  @Field(() => String, { nullable: true })
  failureReason?: string;

  @Field(() => Date)
  createdAt: Date;
}

@ObjectType()
export class PaymentOrderResponse {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String)
  message: string;

  @Field(() => String, { nullable: true })
  paymentId?: string;

  @Field(() => String, { nullable: true })
  razorpayOrderId?: string;

  @Field(() => Int, { nullable: true })
  amountPaise?: number;

  @Field(() => String, { nullable: true })
  currency?: string;
}

@ObjectType()
export class PaymentMutationResponse {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String)
  message: string;
}

@ObjectType()
export class PricingValidationResponse {
  @Field(() => Boolean)
  valid: boolean;

  @Field(() => Int, { nullable: true })
  expectedPrice?: number;
}

// ============================================
// INPUT TYPES
// ============================================

@InputType()
export class CreatePaymentOrderInput {
  @Field(() => Int)
  @IsNumber()
  @Min(100)
  amountPaise: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  currency?: string;

  @Field(() => String)
  @IsNotEmpty()
  purpose: string;

  @Field(() => String)
  @IsNotEmpty()
  vertical: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  planId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  intakeResponseId?: string;
}

@InputType()
export class VerifyPaymentInput {
  @Field(() => String)
  @IsNotEmpty()
  razorpayOrderId: string;

  @Field(() => String)
  @IsNotEmpty()
  razorpayPaymentId: string;

  @Field(() => String)
  @IsNotEmpty()
  razorpaySignature: string;
}

@InputType()
export class WebhookInput {
  @Field(() => String)
  @IsNotEmpty()
  event: string;

  @Field(() => GraphQLJSON)
  payload: any;

  @Field(() => String)
  @IsNotEmpty()
  webhookSignature: string;
}
