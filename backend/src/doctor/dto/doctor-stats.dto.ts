import { ObjectType, Field, Int, Float } from '@nestjs/graphql';

// Spec: Phase 12 — Doctor Stats Output

@ObjectType()
export class DoctorStats {
  @Field(() => Int)
  activeCases: number;

  @Field(() => Int)
  completedToday: number;

  @Field(() => Int)
  dailyCaseLimit: number;

  @Field(() => Float, { nullable: true })
  avgResponseTimeHours?: number;

  @Field()
  isAvailable: boolean;

  @Field()
  seniorDoctor: boolean;
}
