import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';
import {
    UserProfileType,
    UpdateProfileInput,
    ProfileUpdateResponse,
    UpdateOnboardingInput,
    OnboardingResponse,
    UpsertHealthProfileInput,
    HealthProfileResponse,
    PincodeLookupResponse,
    PatientProfileType,
} from './user.types';

// Helper to map patient profile to GraphQL type
function mapPatientProfile(profile: {
    id: string;
    fullName: string | null;
    dateOfBirth: Date | null;
    gender: 'MALE' | 'FEMALE' | 'OTHER' | null;
    height: number | null;
    weight: number | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
    healthGoals: string[];
    onboardingComplete: boolean;
    telehealthConsent: boolean;
    telehealthConsentDate: Date | null;
    healthProfiles?: Array<{
        id: string;
        condition: string;
        responses: unknown;
        createdAt: Date;
        updatedAt: Date;
    }>;
}): PatientProfileType {
    return {
        id: profile.id,
        fullName: profile.fullName,
        dateOfBirth: profile.dateOfBirth,
        gender: profile.gender,
        height: profile.height,
        weight: profile.weight,
        addressLine1: profile.addressLine1,
        addressLine2: profile.addressLine2,
        city: profile.city,
        state: profile.state,
        pincode: profile.pincode,
        healthGoals: profile.healthGoals,
        onboardingComplete: profile.onboardingComplete,
        telehealthConsent: profile.telehealthConsent,
        telehealthConsentDate: profile.telehealthConsentDate,
        healthProfiles: profile.healthProfiles?.map(hp => ({
            id: hp.id,
            condition: hp.condition,
            responses: hp.responses as Record<string, unknown>,
            createdAt: hp.createdAt,
            updatedAt: hp.updatedAt,
        })),
    };
}

@Resolver()
export class UserResolver {
    constructor(private readonly userService: UserService) { }

    @Query(() => UserProfileType, { nullable: true })
    @UseGuards(JwtAuthGuard)
    async me(@CurrentUser() user: User): Promise<UserProfileType | null> {
        const userData = await this.userService.getPatientProfileWithHealthProfiles(user.id);
        const userBasic = await this.userService.findById(user.id);
        if (!userBasic) return null;

        return {
            id: userBasic.id,
            phone: userBasic.phone,
            email: userBasic.email,
            name: userBasic.name,
            role: userBasic.role,
            isVerified: userBasic.isVerified,
            createdAt: userBasic.createdAt,
            patientProfile: userData ? mapPatientProfile(userData) : null,
            isProfileComplete: await this.userService.isProfileComplete(user.id),
        };
    }

    @Query(() => PincodeLookupResponse)
    lookupPincode(@Args('pincode') pincode: string): PincodeLookupResponse {
        const result = this.userService.lookupPincode(pincode);
        if (result) {
            return {
                found: true,
                city: result.city,
                state: result.state,
            };
        }
        return { found: false };
    }

    @Mutation(() => ProfileUpdateResponse)
    @UseGuards(JwtAuthGuard)
    async updateProfile(
        @CurrentUser() user: User,
        @Args('input') input: UpdateProfileInput
    ): Promise<ProfileUpdateResponse> {
        try {
            // Build profile update input without undefined values
            const profileInput: Parameters<typeof this.userService.updateProfile>[1] = {};
            if (input.name) profileInput.name = input.name;
            if (input.email) profileInput.email = input.email;
            if (input.dateOfBirth) profileInput.dateOfBirth = new Date(input.dateOfBirth);
            if (input.gender) profileInput.gender = input.gender;
            if (input.height !== undefined && input.height !== null) profileInput.height = input.height;
            if (input.weight !== undefined && input.weight !== null) profileInput.weight = input.weight;
            if (input.addressLine1) profileInput.addressLine1 = input.addressLine1;
            if (input.addressLine2) profileInput.addressLine2 = input.addressLine2;
            if (input.city) profileInput.city = input.city;
            if (input.state) profileInput.state = input.state;
            if (input.pincode) profileInput.pincode = input.pincode;

            const updatedUser = await this.userService.updateProfile(user.id, profileInput);
            const isComplete = await this.userService.isProfileComplete(user.id);
            const profileWithHealthProfiles = await this.userService.getPatientProfileWithHealthProfiles(user.id);

            return {
                success: true,
                message: 'Profile updated successfully',
                user: {
                    id: updatedUser.id,
                    phone: updatedUser.phone,
                    email: updatedUser.email,
                    name: updatedUser.name,
                    role: updatedUser.role,
                    isVerified: updatedUser.isVerified,
                    createdAt: updatedUser.createdAt,
                    patientProfile: profileWithHealthProfiles ? mapPatientProfile(profileWithHealthProfiles) : null,
                    isProfileComplete: isComplete,
                },
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to update profile',
            };
        }
    }

    // Onboarding mutation - saves data from Steps 1-3 (health goals, basic info, location, consent)
    @Mutation(() => OnboardingResponse)
    @UseGuards(JwtAuthGuard)
    async updateOnboarding(
        @CurrentUser() user: User,
        @Args('input') input: UpdateOnboardingInput
    ): Promise<OnboardingResponse> {
        try {
            const patientProfile = await this.userService.updateOnboarding(user.id, {
                healthGoals: input.healthGoals,
                fullName: input.fullName,
                dateOfBirth: new Date(input.dateOfBirth),
                gender: input.gender,
                pincode: input.pincode,
                state: input.state,
                city: input.city,
                telehealthConsent: input.telehealthConsent,
            });

            return {
                success: true,
                message: 'Onboarding data saved successfully',
                patientProfile: mapPatientProfile(patientProfile),
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to save onboarding data',
            };
        }
    }

    // Health profile mutation - saves health snapshot data for a condition (Step 4)
    @Mutation(() => HealthProfileResponse)
    @UseGuards(JwtAuthGuard)
    async upsertHealthProfile(
        @CurrentUser() user: User,
        @Args('input') input: UpsertHealthProfileInput
    ): Promise<HealthProfileResponse> {
        try {
            const healthProfile = await this.userService.upsertHealthProfile(user.id, {
                condition: input.condition,
                responses: input.responses,
            });

            return {
                success: true,
                message: 'Health profile saved successfully',
                healthProfile: {
                    id: healthProfile.id,
                    condition: healthProfile.condition,
                    responses: healthProfile.responses as Record<string, unknown>,
                    createdAt: healthProfile.createdAt,
                    updatedAt: healthProfile.updatedAt,
                },
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to save health profile',
            };
        }
    }

    // Complete onboarding - called after all health snapshots are saved
    @Mutation(() => OnboardingResponse)
    @UseGuards(JwtAuthGuard)
    async completeOnboarding(@CurrentUser() user: User): Promise<OnboardingResponse> {
        try {
            const patientProfile = await this.userService.completeOnboarding(user.id);

            return {
                success: true,
                message: 'Onboarding completed successfully',
                patientProfile: mapPatientProfile(patientProfile),
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to complete onboarding',
            };
        }
    }
}
