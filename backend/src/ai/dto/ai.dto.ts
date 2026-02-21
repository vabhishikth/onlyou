import { Field, ObjectType, InputType } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';
import { GraphQLJSON } from 'graphql-type-json';

// Spec: master spec Section 6 (AI Pre-Assessment)

// ============================================
// OUTPUT TYPES
// ============================================

@ObjectType()
export class AIPreAssessmentType {
  @Field(() => String)
  id: string;

  @Field(() => String)
  consultationId: string;

  @Field(() => String)
  summary: string;

  @Field(() => String)
  riskLevel: string;

  @Field(() => String, { nullable: true })
  recommendedPlan: string | null;

  @Field(() => [String])
  flags: string[];

  @Field(() => GraphQLJSON)
  rawResponse: any;

  @Field(() => String)
  modelVersion: string;

  @Field(() => Date)
  createdAt: Date;
}

@ObjectType()
export class AIAssessmentResultType {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String)
  message: string;
}

// ============================================
// INPUT TYPES
// ============================================

@InputType()
export class RunAssessmentInput {
  @Field(() => String)
  @IsNotEmpty()
  consultationId: string;
}
