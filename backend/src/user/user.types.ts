import { ObjectType, InputType, Field, Float, registerEnumType, GraphQLISODateTime } from '@nestjs/graphql';
import { IsOptional, IsString, IsEmail, IsEnum, IsNumber, IsBoolean, IsArray } from 'class-validator';
import { Gender } from '@prisma/client';
import GraphQLJSON from 'graphql-type-json';

// Register Gender enum for GraphQL
registerEnumType(Gender, {
    name: 'Gender',
    description: 'User gender',
});

@ObjectType()
export class HealthProfileType {
    @Field(() => String)
    id: string;

    @Field(() => String)
    condition: string;

    @Field(() => GraphQLJSON)
    responses: Record<string, unknown>;

    @Field(() => GraphQLISODateTime)
    createdAt: Date;

    @Field(() => GraphQLISODateTime)
    updatedAt: Date;
}

@ObjectType()
export class PatientProfileType {
    @Field(() => String)
    id: string;

    @Field(() => String, { nullable: true })
    fullName: string | null;

    @Field(() => GraphQLISODateTime, { nullable: true })
    dateOfBirth: Date | null;

    @Field(() => Gender, { nullable: true })
    gender: Gender | null;

    @Field(() => Float, { nullable: true })
    height: number | null;

    @Field(() => Float, { nullable: true })
    weight: number | null;

    @Field(() => String, { nullable: true })
    addressLine1: string | null;

    @Field(() => String, { nullable: true })
    addressLine2: string | null;

    @Field(() => String, { nullable: true })
    city: string | null;

    @Field(() => String, { nullable: true })
    state: string | null;

    @Field(() => String, { nullable: true })
    pincode: string | null;

    // Onboarding fields
    @Field(() => [String])
    healthGoals: string[];

    @Field(() => Boolean)
    onboardingComplete: boolean;

    @Field(() => Boolean)
    telehealthConsent: boolean;

    @Field(() => GraphQLISODateTime, { nullable: true })
    telehealthConsentDate: Date | null;

    @Field(() => [HealthProfileType], { nullable: true })
    healthProfiles?: HealthProfileType[];
}

@ObjectType()
export class UserProfileType {
    @Field(() => String)
    id: string;

    @Field(() => String)
    phone: string;

    @Field(() => String, { nullable: true })
    email: string | null;

    @Field(() => String, { nullable: true })
    name: string | null;

    @Field(() => String)
    role: string;

    @Field(() => Boolean)
    isVerified: boolean;

    @Field(() => GraphQLISODateTime)
    createdAt: Date;

    @Field(() => PatientProfileType, { nullable: true })
    patientProfile: PatientProfileType | null;

    @Field(() => Boolean)
    isProfileComplete: boolean;
}

@InputType()
export class UpdateProfileInput {
    @Field(() => String, { nullable: true })
    @IsOptional()
    @IsString()
    name?: string;

    @Field(() => String, { nullable: true })
    @IsOptional()
    @IsEmail()
    email?: string;

    @Field(() => String, { nullable: true })
    @IsOptional()
    @IsString()
    dateOfBirth?: string; // ISO date string

    @Field(() => Gender, { nullable: true })
    @IsOptional()
    @IsEnum(Gender)
    gender?: Gender;

    @Field(() => Float, { nullable: true })
    @IsOptional()
    @IsNumber()
    height?: number;

    @Field(() => Float, { nullable: true })
    @IsOptional()
    @IsNumber()
    weight?: number;

    @Field(() => String, { nullable: true })
    @IsOptional()
    @IsString()
    addressLine1?: string;

    @Field(() => String, { nullable: true })
    @IsOptional()
    @IsString()
    addressLine2?: string;

    @Field(() => String, { nullable: true })
    @IsOptional()
    @IsString()
    city?: string;

    @Field(() => String, { nullable: true })
    @IsOptional()
    @IsString()
    state?: string;

    @Field(() => String, { nullable: true })
    @IsOptional()
    @IsString()
    pincode?: string;
}

@ObjectType()
export class ProfileUpdateResponse {
    @Field(() => Boolean)
    success: boolean;

    @Field(() => String)
    message: string;

    @Field(() => UserProfileType, { nullable: true })
    user?: UserProfileType;
}

// Onboarding input - for Step 3 (Location) which saves all onboarding data
@InputType()
export class UpdateOnboardingInput {
    // Health goals from Step 1
    @Field(() => [String])
    @IsArray()
    healthGoals: string[];

    // Basic info from Step 2
    @Field(() => String)
    @IsString()
    fullName: string;

    @Field(() => String)
    @IsString()
    dateOfBirth: string; // ISO date string, validated for 18+ in service

    @Field(() => Gender)
    @IsEnum(Gender)
    gender: Gender;

    // Location from Step 3
    @Field(() => String)
    @IsString()
    pincode: string;

    @Field(() => String)
    @IsString()
    state: string;

    @Field(() => String)
    @IsString()
    city: string;

    // Consent
    @Field(() => Boolean)
    @IsBoolean()
    telehealthConsent: boolean;
}

@ObjectType()
export class OnboardingResponse {
    @Field(() => Boolean)
    success: boolean;

    @Field(() => String)
    message: string;

    @Field(() => PatientProfileType, { nullable: true })
    patientProfile?: PatientProfileType;
}

// Health profile input - for Step 4 (Health Snapshot)
@InputType()
export class UpsertHealthProfileInput {
    @Field(() => String)
    @IsString()
    condition: string; // "HAIR_LOSS", "SEXUAL_HEALTH", "WEIGHT_MANAGEMENT", "PCOS"

    @Field(() => GraphQLJSON)
    responses: Record<string, unknown>;
}

@ObjectType()
export class HealthProfileResponse {
    @Field(() => Boolean)
    success: boolean;

    @Field(() => String)
    message: string;

    @Field(() => HealthProfileType, { nullable: true })
    healthProfile?: HealthProfileType;
}

// Pincode lookup response
@ObjectType()
export class PincodeLookupResponse {
    @Field(() => Boolean)
    found: boolean;

    @Field(() => String, { nullable: true })
    city?: string;

    @Field(() => String, { nullable: true })
    state?: string;
}
