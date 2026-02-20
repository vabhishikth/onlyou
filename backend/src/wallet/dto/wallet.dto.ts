import { Field, ObjectType, InputType, Int, Float, registerEnumType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';

// Spec: master spec Section 10 (Refund & Wallet)

// ============================================
// OUTPUT TYPES
// ============================================

@ObjectType()
export class WalletBalanceType {
  @Field(() => Int)
  balancePaise: number;

  @Field(() => Float)
  balanceRupees: number;
}

@ObjectType()
export class WalletTransactionType {
  @Field(() => String)
  id: string;

  @Field(() => String)
  walletId: string;

  @Field(() => String)
  type: string;

  @Field(() => String, { nullable: true })
  creditType?: string;

  @Field(() => Int)
  amountPaise: number;

  @Field(() => Int)
  balanceAfter: number;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  referenceId?: string;

  @Field(() => String, { nullable: true })
  referenceType?: string;

  @Field(() => Date, { nullable: true })
  expiresAt?: Date;

  @Field(() => Date)
  createdAt: Date;
}

@ObjectType()
export class RefundType {
  @Field(() => String)
  id: string;

  @Field(() => String)
  userId: string;

  @Field(() => String)
  paymentId: string;

  @Field(() => String, { nullable: true })
  orderId?: string;

  @Field(() => String, { nullable: true })
  consultationId?: string;

  @Field(() => String)
  trigger: string;

  @Field(() => String)
  method: string;

  @Field(() => Int)
  amountPaise: number;

  @Field(() => String)
  status: string;

  @Field(() => String, { nullable: true })
  razorpayRefundId?: string;

  @Field(() => Date, { nullable: true })
  processedAt?: Date;

  @Field(() => Date)
  createdAt: Date;
}

@ObjectType()
export class CheckoutResultType {
  @Field(() => Int)
  walletAmountUsed: number;

  @Field(() => Int)
  remainingAmountPaise: number;

  @Field(() => Boolean)
  walletFullyCovered: boolean;
}

@ObjectType()
export class WalletMutationResponse {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String)
  message: string;
}

@ObjectType()
export class RefundMutationResponse {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String)
  message: string;

  @Field(() => RefundType, { nullable: true })
  refund?: RefundType;
}

// ============================================
// INPUT TYPES
// ============================================

@InputType()
export class CreditWalletInput {
  @Field(() => String)
  @IsNotEmpty()
  userId: string;

  @Field(() => Int)
  @IsNumber()
  @Min(1)
  amountPaise: number;

  @Field(() => String)
  @IsNotEmpty()
  creditType: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  description?: string;
}

@InputType()
export class ApplyWalletAtCheckoutInput {
  @Field(() => String)
  @IsNotEmpty()
  userId: string;

  @Field(() => Int)
  @IsNumber()
  @Min(0)
  totalAmountPaise: number;

  @Field(() => Boolean)
  useWallet: boolean;
}

@InputType()
export class InitiateRefundInput {
  @Field(() => String)
  @IsNotEmpty()
  userId: string;

  @Field(() => String)
  @IsNotEmpty()
  paymentId: string;

  @Field(() => String)
  @IsNotEmpty()
  trigger: string;

  @Field(() => String)
  @IsNotEmpty()
  method: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  orderId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  consultationId?: string;
}
