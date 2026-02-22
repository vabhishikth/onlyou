import { InputType, Field, Int } from '@nestjs/graphql';
import { HealthVertical } from '@prisma/client';

// Spec: Phase 12 — Doctor Update Input

@InputType()
export class UpdateDoctorInput {
  @Field(() => [String], { nullable: true })
  specializations?: string[];

  @Field(() => [HealthVertical], { nullable: true })
  verticals?: HealthVertical[];

  @Field(() => Int, { nullable: true })
  dailyCaseLimit?: number;

  @Field(() => Int, { nullable: true })
  consultationFee?: number;

  @Field({ nullable: true })
  seniorDoctor?: boolean;

  @Field({ nullable: true })
  bio?: string;

  @Field(() => [String], { nullable: true })
  qualifications?: string[];

  @Field(() => Int, { nullable: true })
  yearsOfExperience?: number;
}
