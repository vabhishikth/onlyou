import { InputType, Field, Int, registerEnumType } from '@nestjs/graphql';
import { HealthVertical } from '@prisma/client';

// Spec: Phase 12 — Doctor Onboarding Input

@InputType()
export class CreateDoctorInput {
  @Field()
  name: string;

  @Field()
  phone: string;

  @Field()
  email: string;

  @Field()
  registrationNo: string;

  @Field(() => [String])
  specializations: string[];

  @Field(() => [HealthVertical])
  verticals: HealthVertical[];

  @Field(() => [String])
  qualifications: string[];

  @Field(() => Int)
  yearsOfExperience: number;

  @Field(() => Int, { defaultValue: 15 })
  dailyCaseLimit: number;

  @Field(() => Int)
  consultationFee: number;

  @Field({ nullable: true })
  bio?: string;

  @Field({ defaultValue: false })
  seniorDoctor?: boolean;
}
