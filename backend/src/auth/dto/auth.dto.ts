import { InputType, Field, ObjectType } from '@nestjs/graphql';
import { IsString, Length, Matches } from 'class-validator';

// ============================================
// INPUT TYPES
// ============================================

@InputType()
export class RequestOtpInput {
    @Field()
    @IsString()
    @Matches(/^\+91[6-9]\d{9}$/, { message: 'Invalid Indian phone number. Format: +91XXXXXXXXXX' })
    phone: string;
}

@InputType()
export class VerifyOtpInput {
    @Field()
    @IsString()
    @Matches(/^\+91[6-9]\d{9}$/, { message: 'Invalid Indian phone number' })
    phone: string;

    @Field()
    @IsString()
    @Length(6, 6, { message: 'OTP must be 6 digits' })
    otp: string;
}

@InputType()
export class RefreshTokenInput {
    @Field()
    @IsString()
    refreshToken: string;
}

// ============================================
// OUTPUT TYPES
// ============================================

@ObjectType()
export class RequestOtpResponse {
    @Field()
    success: boolean;

    @Field()
    message: string;
}

@ObjectType()
export class UserType {
    @Field()
    id: string;

    @Field()
    phone: string;

    @Field(() => String, { nullable: true })
    email?: string | null;

    @Field(() => String, { nullable: true })
    name?: string | null;

    @Field()
    role: string;

    @Field()
    isVerified: boolean;

    @Field()
    isProfileComplete: boolean;

    @Field()
    createdAt: Date;
}

@ObjectType()
export class AuthResponse {
    @Field()
    success: boolean;

    @Field()
    message: string;

    @Field(() => UserType, { nullable: true })
    user?: UserType;

    @Field(() => String, { nullable: true })
    accessToken?: string;

    @Field(() => String, { nullable: true })
    refreshToken?: string;
}
