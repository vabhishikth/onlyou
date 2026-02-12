import { ObjectType, Field, Int, InputType } from '@nestjs/graphql';

// Spec: master spec Section 8.1 — Pharmacy Portal (pharmacy.onlyou.life)

@ObjectType()
export class PharmacyInfo {
    @Field()
    id: string;

    @Field()
    name: string;

    @Field()
    address: string;

    @Field()
    city: string;

    @Field()
    isActive: boolean;
}

@ObjectType()
export class PharmacyTodaySummary {
    @Field(() => Int)
    newOrders: number;

    @Field(() => Int)
    preparing: number;

    @Field(() => Int)
    ready: number;
}

@ObjectType()
export class MedicationItem {
    @Field()
    name: string;

    @Field()
    dosage: string;

    @Field(() => Int)
    quantity: number;
}

@ObjectType()
export class PharmacyOrderSummary {
    @Field()
    id: string;

    @Field()
    orderId: string;

    @Field()
    patientArea: string;

    @Field(() => [MedicationItem])
    medications: MedicationItem[];

    @Field(() => String, { nullable: true })
    prescriptionUrl: string | null;

    @Field()
    status: string;

    @Field()
    createdAt: Date;

    @Field(() => String, { nullable: true })
    deliveryPersonName: string | null;

    @Field(() => String, { nullable: true })
    deliveryPersonPhone: string | null;
}

@InputType()
export class ReportStockIssueInput {
    @Field()
    orderId: string;

    @Field(() => [String])
    missingMedications: string[];
}

@ObjectType()
export class PharmacyMutationResponse {
    @Field()
    success: boolean;

    @Field()
    message: string;
}
