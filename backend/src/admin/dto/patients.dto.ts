import { ObjectType, Field, Int, InputType } from '@nestjs/graphql';

// Spec: master spec Section 3.2 — Patient Profiles

@ObjectType()
export class AdminPatientSummary {
    @Field()
    id: string;

    @Field()
    phone: string;

    @Field(() => String, { nullable: true })
    name: string | null;

    @Field(() => String, { nullable: true })
    email: string | null;

    @Field(() => Date, { nullable: true })
    dateOfBirth: Date | null;

    @Field(() => String, { nullable: true })
    gender: string | null;

    @Field(() => String, { nullable: true })
    city: string | null;

    @Field(() => String, { nullable: true })
    state: string | null;

    @Field()
    createdAt: Date;

    @Field(() => Int)
    activeConsultations: number;

    @Field(() => Int)
    pendingLabOrders: number;

    @Field(() => Int)
    pendingDeliveries: number;

    @Field(() => Date, { nullable: true })
    lastActivityAt: Date | null;
}

@ObjectType()
export class AdminPatientsResponse {
    @Field(() => [AdminPatientSummary])
    patients: AdminPatientSummary[];

    @Field(() => Int)
    total: number;

    @Field(() => Int)
    page: number;

    @Field(() => Int)
    pageSize: number;
}

@InputType()
export class AdminPatientsFilterInput {
    @Field(() => String, { nullable: true })
    search?: string;

    @Field(() => String, { nullable: true })
    vertical?: string;

    @Field(() => Int, { nullable: true })
    page?: number;

    @Field(() => Int, { nullable: true })
    pageSize?: number;
}

// Detail view types

@ObjectType()
export class PatientConsultationSummary {
    @Field()
    id: string;

    @Field()
    vertical: string;

    @Field()
    status: string;

    @Field()
    createdAt: Date;

    @Field(() => String, { nullable: true })
    doctorName: string | null;
}

@ObjectType()
export class PatientLabOrderSummary {
    @Field()
    id: string;

    @Field()
    status: string;

    @Field(() => Date, { nullable: true })
    bookedDate: Date | null;

    @Field(() => String, { nullable: true })
    panelName: string | null;

    @Field()
    createdAt: Date;
}

@ObjectType()
export class PatientOrderSummary {
    @Field()
    id: string;

    @Field()
    status: string;

    @Field(() => Int)
    totalAmountPaise: number;

    @Field()
    createdAt: Date;
}

@ObjectType()
export class PatientNote {
    @Field()
    id: string;

    @Field()
    content: string;

    @Field()
    createdBy: string;

    @Field()
    createdAt: Date;
}

@ObjectType()
export class AdminPatientDetail {
    @Field()
    id: string;

    @Field()
    phone: string;

    @Field(() => String, { nullable: true })
    name: string | null;

    @Field(() => String, { nullable: true })
    email: string | null;

    @Field(() => Date, { nullable: true })
    dateOfBirth: Date | null;

    @Field(() => String, { nullable: true })
    gender: string | null;

    @Field(() => String, { nullable: true })
    address: string | null;

    @Field(() => String, { nullable: true })
    city: string | null;

    @Field(() => String, { nullable: true })
    state: string | null;

    @Field(() => String, { nullable: true })
    pincode: string | null;

    @Field()
    createdAt: Date;

    @Field(() => [PatientConsultationSummary])
    consultations: PatientConsultationSummary[];

    @Field(() => [PatientLabOrderSummary])
    labOrders: PatientLabOrderSummary[];

    @Field(() => [PatientOrderSummary])
    orders: PatientOrderSummary[];

    @Field(() => [PatientNote])
    notes: PatientNote[];
}
