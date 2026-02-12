import {
    ObjectType,
    Field,
    Int,
    InputType,
    registerEnumType,
} from '@nestjs/graphql';
import { LabOrderStatus, HealthVertical } from '@prisma/client';

// Re-register enums for GraphQL
registerEnumType(LabOrderStatus, {
    name: 'LabOrderStatus',
    description: 'Lab order status',
});

registerEnumType(HealthVertical, {
    name: 'HealthVertical',
    description: 'Health vertical/condition',
});

// Spec: master spec Section 7 — Blood Work & Diagnostics

@ObjectType()
export class AdminLabOrderPatient {
    @Field()
    id: string;

    @Field(() => String, { nullable: true })
    name: string | null;

    @Field(() => String, { nullable: true })
    phone: string | null;
}

@ObjectType()
export class AdminLabOrderPhlebotomist {
    @Field()
    id: string;

    @Field()
    name: string;

    @Field()
    phone: string;
}

@ObjectType()
export class AdminLabOrderLab {
    @Field()
    id: string;

    @Field()
    name: string;

    @Field(() => String, { nullable: true })
    phone: string | null;
}

@ObjectType()
export class AdminLabOrderSLA {
    @Field()
    status: string; // ON_TIME, APPROACHING, BREACHED

    @Field(() => String, { nullable: true })
    reason: string | null;

    @Field(() => Int, { nullable: true })
    hoursOverdue: number | null;
}

@ObjectType()
export class AdminLabOrderTimelineEvent {
    @Field()
    status: string;

    @Field()
    timestamp: Date;

    @Field(() => String, { nullable: true })
    details: string | null;
}

@ObjectType()
export class AdminLabOrder {
    @Field()
    id: string;

    @Field(() => AdminLabOrderPatient)
    patient: AdminLabOrderPatient;

    @Field(() => HealthVertical, { nullable: true })
    vertical: HealthVertical | null;

    @Field(() => [String])
    testPanel: string[];

    @Field(() => String, { nullable: true })
    panelName: string | null;

    @Field(() => LabOrderStatus)
    status: LabOrderStatus;

    @Field(() => AdminLabOrderPhlebotomist, { nullable: true })
    phlebotomist: AdminLabOrderPhlebotomist | null;

    @Field(() => AdminLabOrderLab, { nullable: true })
    lab: AdminLabOrderLab | null;

    @Field(() => Date, { nullable: true })
    bookedDate: Date | null;

    @Field(() => String, { nullable: true })
    bookedTimeSlot: string | null;

    @Field()
    collectionAddress: string;

    @Field()
    collectionCity: string;

    @Field()
    collectionPincode: string;

    @Field(() => AdminLabOrderSLA)
    slaInfo: AdminLabOrderSLA;

    @Field()
    orderedAt: Date;

    @Field(() => [AdminLabOrderTimelineEvent])
    timeline: AdminLabOrderTimelineEvent[];
}

@ObjectType()
export class AdminLabOrdersResponse {
    @Field(() => [AdminLabOrder])
    labOrders: AdminLabOrder[];

    @Field(() => Int)
    total: number;

    @Field(() => Int)
    page: number;

    @Field(() => Int)
    pageSize: number;
}

@InputType()
export class AdminLabOrdersFilterInput {
    @Field(() => [LabOrderStatus], { nullable: true })
    statuses?: LabOrderStatus[];

    @Field(() => Date, { nullable: true })
    dateFrom?: Date;

    @Field(() => Date, { nullable: true })
    dateTo?: Date;

    @Field(() => String, { nullable: true })
    phlebotomistId?: string;

    @Field(() => String, { nullable: true })
    labId?: string;

    @Field(() => HealthVertical, { nullable: true })
    vertical?: HealthVertical;

    @Field(() => String, { nullable: true })
    search?: string; // Patient name or phone

    @Field(() => Int, { nullable: true })
    page?: number;

    @Field(() => Int, { nullable: true })
    pageSize?: number;
}

// Available phlebotomists for assignment
@ObjectType()
export class AvailablePhlebotomist {
    @Field()
    id: string;

    @Field()
    name: string;

    @Field()
    phone: string;

    @Field(() => Int)
    todayAssignments: number;

    @Field(() => Int)
    maxDailyCollections: number;

    @Field()
    isAvailable: boolean;
}

@ObjectType()
export class AvailablePhlebotomistsResponse {
    @Field(() => [AvailablePhlebotomist])
    phlebotomists: AvailablePhlebotomist[];
}

// Available labs for assignment
@ObjectType()
export class AvailableLab {
    @Field()
    id: string;

    @Field()
    name: string;

    @Field()
    address: string;

    @Field()
    city: string;

    @Field(() => Int)
    avgTurnaroundHours: number;

    @Field(() => [String])
    testsOffered: string[];
}

@ObjectType()
export class AvailableLabsResponse {
    @Field(() => [AvailableLab])
    labs: AvailableLab[];
}

// Assignment mutation inputs
@InputType()
export class AssignPhlebotomistInput {
    @Field()
    labOrderId: string;

    @Field()
    phlebotomistId: string;
}

@InputType()
export class AssignLabInput {
    @Field()
    labOrderId: string;

    @Field()
    labId: string;
}

@InputType()
export class BulkAssignPhlebotomistInput {
    @Field(() => [String])
    labOrderIds: string[];

    @Field()
    phlebotomistId: string;
}

@InputType()
export class OverrideLabOrderStatusInput {
    @Field()
    labOrderId: string;

    @Field(() => LabOrderStatus)
    newStatus: LabOrderStatus;

    @Field()
    reason: string;
}

@ObjectType()
export class AdminLabOrderMutationResponse {
    @Field()
    success: boolean;

    @Field()
    message: string;

    @Field(() => AdminLabOrder, { nullable: true })
    labOrder?: AdminLabOrder;
}

@ObjectType()
export class BulkAssignmentResponse {
    @Field()
    success: boolean;

    @Field()
    message: string;

    @Field(() => Int)
    updatedCount: number;

    @Field(() => [String])
    failedIds: string[];
}
