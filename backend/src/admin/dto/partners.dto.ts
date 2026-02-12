import { ObjectType, Field, Int, Float, InputType } from '@nestjs/graphql';

// Spec: master spec Section 7.5 — Partner Models

// =============================================
// DIAGNOSTIC CENTRES
// =============================================

@ObjectType()
export class DiagnosticCentre {
    @Field()
    id: string;

    @Field()
    name: string;

    @Field()
    address: string;

    @Field()
    city: string;

    @Field()
    state: string;

    @Field()
    pincode: string;

    @Field()
    phone: string;

    @Field(() => String, { nullable: true })
    email: string | null;

    @Field(() => String, { nullable: true })
    contactPerson: string | null;

    @Field(() => [String])
    testsOffered: string[];

    @Field(() => Int)
    avgTurnaroundHours: number;

    @Field(() => Float, { nullable: true })
    rating: number | null;

    @Field()
    isActive: boolean;

    @Field()
    createdAt: Date;
}

@ObjectType()
export class DiagnosticCentresResponse {
    @Field(() => [DiagnosticCentre])
    centres: DiagnosticCentre[];

    @Field(() => Int)
    total: number;
}

@InputType()
export class CreateDiagnosticCentreInput {
    @Field()
    name: string;

    @Field()
    address: string;

    @Field()
    city: string;

    @Field()
    state: string;

    @Field()
    pincode: string;

    @Field()
    phone: string;

    @Field(() => String, { nullable: true })
    email?: string;

    @Field(() => String, { nullable: true })
    contactPerson?: string;

    @Field(() => [String])
    testsOffered: string[];

    @Field(() => Int, { nullable: true })
    avgTurnaroundHours?: number;
}

@InputType()
export class UpdateDiagnosticCentreInput {
    @Field()
    id: string;

    @Field(() => String, { nullable: true })
    name?: string;

    @Field(() => String, { nullable: true })
    address?: string;

    @Field(() => String, { nullable: true })
    phone?: string;

    @Field(() => String, { nullable: true })
    email?: string;

    @Field(() => String, { nullable: true })
    contactPerson?: string;

    @Field(() => [String], { nullable: true })
    testsOffered?: string[];

    @Field(() => Int, { nullable: true })
    avgTurnaroundHours?: number;
}

// =============================================
// PHLEBOTOMISTS
// =============================================

@ObjectType()
export class PhlebotomistDetails {
    @Field()
    id: string;

    @Field()
    name: string;

    @Field()
    phone: string;

    @Field(() => String, { nullable: true })
    email: string | null;

    @Field(() => String, { nullable: true })
    certification: string | null;

    @Field(() => [String])
    availableDays: string[];

    @Field(() => String, { nullable: true })
    availableTimeStart: string | null;

    @Field(() => String, { nullable: true })
    availableTimeEnd: string | null;

    @Field(() => Int)
    maxDailyCollections: number;

    @Field()
    currentCity: string;

    @Field(() => [String])
    serviceableAreas: string[];

    @Field(() => Int)
    completedCollections: number;

    @Field(() => Int)
    failedCollections: number;

    @Field(() => Float, { nullable: true })
    rating: number | null;

    @Field()
    isActive: boolean;

    @Field()
    createdAt: Date;

    // Today's assignments count (computed)
    @Field(() => Int)
    todayAssignments: number;
}

@ObjectType()
export class PhlebotomistsResponse {
    @Field(() => [PhlebotomistDetails])
    phlebotomists: PhlebotomistDetails[];

    @Field(() => Int)
    total: number;
}

@InputType()
export class CreatePhlebotomistInput {
    @Field()
    name: string;

    @Field()
    phone: string;

    @Field(() => String, { nullable: true })
    email?: string;

    @Field(() => String, { nullable: true })
    certification?: string;

    @Field(() => [String])
    availableDays: string[];

    @Field(() => String, { nullable: true })
    availableTimeStart?: string;

    @Field(() => String, { nullable: true })
    availableTimeEnd?: string;

    @Field(() => Int, { nullable: true })
    maxDailyCollections?: number;

    @Field()
    currentCity: string;

    @Field(() => [String])
    serviceableAreas: string[];
}

@InputType()
export class UpdatePhlebotomistInput {
    @Field()
    id: string;

    @Field(() => String, { nullable: true })
    name?: string;

    @Field(() => String, { nullable: true })
    phone?: string;

    @Field(() => String, { nullable: true })
    email?: string;

    @Field(() => String, { nullable: true })
    certification?: string;

    @Field(() => [String], { nullable: true })
    availableDays?: string[];

    @Field(() => String, { nullable: true })
    availableTimeStart?: string;

    @Field(() => String, { nullable: true })
    availableTimeEnd?: string;

    @Field(() => Int, { nullable: true })
    maxDailyCollections?: number;

    @Field(() => [String], { nullable: true })
    serviceableAreas?: string[];
}

// =============================================
// PHARMACIES
// =============================================

@ObjectType()
export class PharmacyDetails {
    @Field()
    id: string;

    @Field()
    name: string;

    @Field()
    address: string;

    @Field()
    city: string;

    @Field()
    state: string;

    @Field()
    pincode: string;

    @Field()
    phone: string;

    @Field(() => String, { nullable: true })
    email: string | null;

    @Field(() => String, { nullable: true })
    contactPerson: string | null;

    @Field()
    drugLicenseNumber: string;

    @Field(() => String, { nullable: true })
    gstNumber: string | null;

    @Field(() => [String])
    serviceableAreas: string[];

    @Field(() => Int)
    avgPreparationMinutes: number;

    @Field(() => Float, { nullable: true })
    rating: number | null;

    @Field()
    isActive: boolean;

    @Field()
    createdAt: Date;
}

@ObjectType()
export class PharmaciesResponse {
    @Field(() => [PharmacyDetails])
    pharmacies: PharmacyDetails[];

    @Field(() => Int)
    total: number;
}

@InputType()
export class CreatePharmacyInput {
    @Field()
    name: string;

    @Field()
    address: string;

    @Field()
    city: string;

    @Field()
    state: string;

    @Field()
    pincode: string;

    @Field()
    phone: string;

    @Field(() => String, { nullable: true })
    email?: string;

    @Field(() => String, { nullable: true })
    contactPerson?: string;

    @Field()
    drugLicenseNumber: string;

    @Field(() => String, { nullable: true })
    gstNumber?: string;

    @Field(() => [String])
    serviceableAreas: string[];

    @Field(() => Int, { nullable: true })
    avgPreparationMinutes?: number;
}

@InputType()
export class UpdatePharmacyInput {
    @Field()
    id: string;

    @Field(() => String, { nullable: true })
    name?: string;

    @Field(() => String, { nullable: true })
    address?: string;

    @Field(() => String, { nullable: true })
    phone?: string;

    @Field(() => String, { nullable: true })
    email?: string;

    @Field(() => String, { nullable: true })
    contactPerson?: string;

    @Field(() => [String], { nullable: true })
    serviceableAreas?: string[];

    @Field(() => Int, { nullable: true })
    avgPreparationMinutes?: number;
}

// =============================================
// COMMON RESPONSES
// =============================================

@ObjectType()
export class PartnerMutationResponse {
    @Field()
    success: boolean;

    @Field()
    message: string;
}
