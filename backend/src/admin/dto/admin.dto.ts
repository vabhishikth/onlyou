import { ObjectType, Field, Int, registerEnumType } from '@nestjs/graphql';

// Spec: master spec Section 7.4 — SLA Escalation

export enum SLAStatus {
    ON_TIME = 'ON_TIME',
    APPROACHING = 'APPROACHING',
    BREACHED = 'BREACHED',
}

registerEnumType(SLAStatus, {
    name: 'SLAStatus',
    description: 'SLA compliance status',
});

@ObjectType()
export class LabCollectionStats {
    @Field(() => Int)
    scheduled: number;

    @Field(() => Int)
    completed: number;

    @Field(() => Int)
    failed: number;
}

@ObjectType()
export class DeliveryStats {
    @Field(() => Int)
    pending: number;

    @Field(() => Int)
    outForDelivery: number;

    @Field(() => Int)
    delivered: number;

    @Field(() => Int)
    failed: number;
}

@ObjectType()
export class AdminDashboardStats {
    @Field(() => LabCollectionStats)
    labCollections: LabCollectionStats;

    @Field(() => DeliveryStats)
    deliveries: DeliveryStats;

    @Field(() => Int)
    openCases: number;

    @Field(() => Int)
    slaBreaches: number;

    @Field(() => Int)
    activePatients: number;

    @Field(() => Int)
    revenueThisMonthPaise: number;
}

@ObjectType()
export class SLAInfo {
    @Field(() => SLAStatus)
    status: SLAStatus;

    @Field(() => String, { nullable: true })
    reason: string | null;

    @Field(() => Int, { nullable: true })
    hoursOverdue: number | null;

    @Field(() => Date, { nullable: true })
    deadlineAt: Date | null;
}

@ObjectType()
export class SLAEscalation {
    @Field()
    id: string;

    @Field()
    type: string; // LAB_ORDER or DELIVERY

    @Field()
    resourceId: string;

    @Field(() => SLAInfo)
    slaInfo: SLAInfo;

    @Field(() => String, { nullable: true })
    patientName: string | null;

    @Field(() => String, { nullable: true })
    vertical: string | null;

    @Field()
    responsibleParty: string;

    @Field(() => String, { nullable: true })
    responsibleContact: string | null;

    @Field()
    createdAt: Date;
}
