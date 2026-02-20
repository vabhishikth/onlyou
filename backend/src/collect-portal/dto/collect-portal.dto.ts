import { ObjectType, Field, Int, InputType } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';

// Spec: master spec Section 7.2 — Collection Portal (collect.onlyou.life)
// THE SIMPLEST PORTAL. Used on the road, one hand, between collections.

@ObjectType()
export class PhlebotomistInfo {
    @Field()
    id: string;

    @Field()
    name: string;

    @Field()
    phone: string;

    @Field()
    currentCity: string;

    @Field()
    isActive: boolean;
}

@ObjectType()
export class CollectTodaySummary {
    @Field(() => Int)
    total: number;

    @Field(() => Int)
    completed: number;

    @Field(() => Int)
    pending: number;

    @Field(() => Int)
    failed: number;
}

@ObjectType()
export class TodayAssignment {
    @Field()
    id: string;

    @Field()
    patientFirstName: string;

    @Field()
    patientPhone: string;

    @Field()
    patientArea: string;

    @Field()
    fullAddress: string;

    @Field()
    timeWindow: string;

    @Field()
    panelName: string;

    @Field(() => [String])
    testsOrdered: string[];

    @Field()
    status: string;

    @Field(() => Int, { nullable: true })
    tubeCount: number | null;

    @Field(() => Date, { nullable: true })
    collectedAt: Date | null;

    @Field(() => String, { nullable: true })
    notes: string | null;
}

@ObjectType()
export class NearbyLab {
    @Field()
    id: string;

    @Field()
    name: string;

    @Field()
    address: string;

    @Field()
    city: string;

    @Field()
    phone: string;
}

@InputType()
export class MarkCollectedInput {
    @Field()
    @IsNotEmpty()
    labOrderId: string;

    @Field(() => Int)
    @IsNotEmpty()
    tubeCount: number;
}

@InputType()
export class MarkUnavailableInput {
    @Field()
    @IsNotEmpty()
    labOrderId: string;

    @Field()
    @IsNotEmpty()
    reason: string;
}

@InputType()
export class ReportLateInput {
    @Field()
    @IsNotEmpty()
    labOrderId: string;

    @Field()
    @IsNotEmpty()
    newEta: string;
}

@InputType()
export class DeliverToLabInput {
    @Field()
    @IsNotEmpty()
    labOrderId: string;

    @Field()
    @IsNotEmpty()
    labId: string;
}

@ObjectType()
export class CollectMutationResponse {
    @Field()
    success: boolean;

    @Field()
    message: string;
}
