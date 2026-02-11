import { ObjectType, InputType, Field, Float, registerEnumType, GraphQLISODateTime } from '@nestjs/graphql';
import { IsOptional, IsString, IsEmail, IsEnum, IsNumber } from 'class-validator';
import { Gender } from '@prisma/client';

// Register Gender enum for GraphQL
registerEnumType(Gender, {
    name: 'Gender',
    description: 'User gender',
});

@ObjectType()
export class PatientProfileType {
    @Field(() => String)
    id: string;

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
