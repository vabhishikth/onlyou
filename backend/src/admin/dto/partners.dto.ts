import { ObjectType, Field, Int, Float, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsArray } from 'class-validator';

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
    @IsNotEmpty()
    name: string;

    @Field()
    @IsNotEmpty()
    address: string;

    @Field()
    @IsNotEmpty()
    city: string;

    @Field()
    @IsNotEmpty()
    state: string;

    @Field()
    @IsNotEmpty()
    pincode: string;

    @Field()
    @IsNotEmpty()
    phone: string;

    @Field(() => String, { nullable: true })
    @IsOptional()
    email?: string;

    @Field(() => String, { nullable: true })
    @IsOptional()
    contactPerson?: string;

    @Field(() => [String])
    @IsNotEmpty()
    @IsArray()
    testsOffered: string[];

    @Field(() => Int, { nullable: true })
    @IsOptional()
    avgTurnaroundHours?: number;
}

@InputType()
export class UpdateDiagnosticCentreInput {
    @Field()
    @IsNotEmpty()
    id: string;

    @Field(() => String, { nullable: true })
    @IsOptional()
    name?: string;

    @Field(() => String, { nullable: true })
    @IsOptional()
    address?: string;

    @Field(() => String, { nullable: true })
    @IsOptional()
    phone?: string;

    @Field(() => String, { nullable: true })
    @IsOptional()
    email?: string;

    @Field(() => String, { nullable: true })
    @IsOptional()
    contactPerson?: string;

    @Field(() => [String], { nullable: true })
    @IsOptional()
    @IsArray()
    testsOffered?: string[];

    @Field(() => Int, { nullable: true })
    @IsOptional()
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
    @IsNotEmpty()
    name: string;

    @Field()
    @IsNotEmpty()
    phone: string;

    @Field(() => String, { nullable: true })
    @IsOptional()
    email?: string;

    @Field(() => String, { nullable: true })
    @IsOptional()
    certification?: string;

    @Field(() => [String])
    @IsNotEmpty()
    @IsArray()
    availableDays: string[];

    @Field(() => String, { nullable: true })
    @IsOptional()
    availableTimeStart?: string;

    @Field(() => String, { nullable: true })
    @IsOptional()
    availableTimeEnd?: string;

    @Field(() => Int, { nullable: true })
    @IsOptional()
    maxDailyCollections?: number;

    @Field()
    @IsNotEmpty()
    currentCity: string;

    @Field(() => [String])
    @IsNotEmpty()
    @IsArray()
    serviceableAreas: string[];
}

@InputType()
export class UpdatePhlebotomistInput {
    @Field()
    @IsNotEmpty()
    id: string;

    @Field(() => String, { nullable: true })
    @IsOptional()
    name?: string;

    @Field(() => String, { nullable: true })
    @IsOptional()
    phone?: string;

    @Field(() => String, { nullable: true })
    @IsOptional()
    email?: string;

    @Field(() => String, { nullable: true })
    @IsOptional()
    certification?: string;

    @Field(() => [String], { nullable: true })
    @IsOptional()
    @IsArray()
    availableDays?: string[];

    @Field(() => String, { nullable: true })
    @IsOptional()
    availableTimeStart?: string;

    @Field(() => String, { nullable: true })
    @IsOptional()
    availableTimeEnd?: string;

    @Field(() => Int, { nullable: true })
    @IsOptional()
    maxDailyCollections?: number;

    @Field(() => [String], { nullable: true })
    @IsOptional()
    @IsArray()
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
    @IsNotEmpty()
    name: string;

    @Field()
    @IsNotEmpty()
    address: string;

    @Field()
    @IsNotEmpty()
    city: string;

    @Field()
    @IsNotEmpty()
    state: string;

    @Field()
    @IsNotEmpty()
    pincode: string;

    @Field()
    @IsNotEmpty()
    phone: string;

    @Field(() => String, { nullable: true })
    @IsOptional()
    email?: string;

    @Field(() => String, { nullable: true })
    @IsOptional()
    contactPerson?: string;

    @Field()
    @IsNotEmpty()
    drugLicenseNumber: string;

    @Field(() => String, { nullable: true })
    @IsOptional()
    gstNumber?: string;

    @Field(() => [String])
    @IsNotEmpty()
    @IsArray()
    serviceableAreas: string[];

    @Field(() => Int, { nullable: true })
    @IsOptional()
    avgPreparationMinutes?: number;
}

@InputType()
export class UpdatePharmacyInput {
    @Field()
    @IsNotEmpty()
    id: string;

    @Field(() => String, { nullable: true })
    @IsOptional()
    name?: string;

    @Field(() => String, { nullable: true })
    @IsOptional()
    address?: string;

    @Field(() => String, { nullable: true })
    @IsOptional()
    phone?: string;

    @Field(() => String, { nullable: true })
    @IsOptional()
    email?: string;

    @Field(() => String, { nullable: true })
    @IsOptional()
    contactPerson?: string;

    @Field(() => [String], { nullable: true })
    @IsOptional()
    @IsArray()
    serviceableAreas?: string[];

    @Field(() => Int, { nullable: true })
    @IsOptional()
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
