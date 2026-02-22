import { ObjectType, Field, Int, ID } from '@nestjs/graphql';
import { HealthVertical } from '@prisma/client';

// Spec: Phase 12 — Doctor List Item Output

@ObjectType()
export class DoctorListItem {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  phone: string;

  @Field({ nullable: true })
  email?: string;

  @Field(() => [String])
  specializations: string[];

  @Field(() => [HealthVertical])
  verticals: HealthVertical[];

  @Field(() => Int)
  activeCases: number;

  @Field(() => Int)
  dailyCaseLimit: number;

  @Field()
  isAvailable: boolean;

  @Field()
  isActive: boolean;

  @Field()
  seniorDoctor: boolean;

  @Field(() => Int)
  consultationFee: number;

  @Field({ nullable: true })
  lastAssignedAt?: Date;
}
