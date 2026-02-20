import {
    ObjectType,
    Field,
    Int,
    InputType,
} from '@nestjs/graphql';
import { HealthVertical, LabOrderStatus } from '@prisma/client';

// Note: LabOrderStatus is registered in lab-order.dto.ts, HealthVertical is registered in intake module

// Spec: master spec Section 7 — Blood Work & Diagnostics

@ObjectType()
export class AdminLabOrderPatient {
    @Field(() => String)
    id: string;

    @Field(() => String, { nullable: true })
    name: string | null;

    @Field(() => String, { nullable: true })
    phone: string | null;
}

@ObjectType()
export class AdminLabOrderPhlebotomist {
    @Field(() => String)
    id: string;

    @Field(() => String)
    name: string;

    @Field(() => String)
    phone: string;
}

@ObjectType()
export class AdminLabOrderLab {
    @Field(() => String)
    id: string;

    @Field(() => String)
    name: string;

    @Field(() => String, { nullable: true })
    phone: string | null;
}

@ObjectType()
export class AdminLabOrderSLA {
    @Field(() => String)
    status: string; // ON_TIME, APPROACHING, BREACHED

    @Field(() => String, { nullable: true })
    reason: string | null;

    @Field(() => Int, { nullable: true })
    hoursOverdue: number | null;
}

@ObjectType()
export class AdminLabOrderTimelineEvent {
    @Field(() => String)
    status: string;

    @Field(() => Date)
    timestamp: Date;

    @Field(() => String, { nullable: true })
    details: string | null;
}

@ObjectType()
export class AdminLabOrder {
    @Field(() => String)
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

    @Field(() => String)
    collectionAddress: string;

    @Field(() => String)
    collectionCity: string;

    @Field(() => String)
    collectionPincode: string;

    @Field(() => AdminLabOrderSLA)
    slaInfo: AdminLabOrderSLA;

    @Field(() => Date)
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
    @Field(() => String)
    id: string;

    @Field(() => String)
    name: string;

    @Field(() => String)
    phone: string;

    @Field(() => Int)
    todayAssignments: number;

    @Field(() => Int)
    maxDailyCollections: number;

    @Field(() => Boolean)
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
    @Field(() => String)
    id: string;

    @Field(() => String)
    name: string;

    @Field(() => String)
    address: string;

    @Field(() => String)
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
    @Field(() => String)
    labOrderId: string;

    @Field(() => String)
    phlebotomistId: string;
}

@InputType()
export class AssignLabInput {
    @Field(() => String)
    labOrderId: string;

    @Field(() => String)
    labId: string;
}

@InputType()
export class BulkAssignPhlebotomistInput {
    @Field(() => [String])
    labOrderIds: string[];

    @Field(() => String)
    phlebotomistId: string;
}

@InputType()
export class OverrideLabOrderStatusInput {
    @Field(() => String)
    labOrderId: string;

    @Field(() => LabOrderStatus)
    newStatus: LabOrderStatus;

    @Field(() => String)
    reason: string;
}

@ObjectType()
export class AdminLabOrderMutationResponse {
    @Field(() => Boolean)
    success: boolean;

    @Field(() => String)
    message: string;

    @Field(() => AdminLabOrder, { nullable: true })
    labOrder?: AdminLabOrder;
}

@ObjectType()
export class BulkAssignmentResponse {
    @Field(() => Boolean)
    success: boolean;

    @Field(() => String)
    message: string;

    @Field(() => Int)
    updatedCount: number;

    @Field(() => [String])
    failedIds: string[];
}
