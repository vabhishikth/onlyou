import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';
import {
    UserProfileType,
    UpdateProfileInput,
    ProfileUpdateResponse
} from './user.types';

@Resolver()
export class UserResolver {
    constructor(private readonly userService: UserService) { }

    @Query(() => UserProfileType, { nullable: true })
    @UseGuards(JwtAuthGuard)
    async me(@CurrentUser() user: User): Promise<UserProfileType | null> {
        const userData = await this.userService.getUserWithProfile(user.id);
        if (!userData) return null;

        return {
            id: userData.id,
            phone: userData.phone,
            email: userData.email,
            name: userData.name,
            role: userData.role,
            isVerified: userData.isVerified,
            createdAt: userData.createdAt,
            patientProfile: userData.patientProfile ? {
                id: userData.patientProfile.id,
                dateOfBirth: userData.patientProfile.dateOfBirth,
                gender: userData.patientProfile.gender,
                height: userData.patientProfile.height,
                weight: userData.patientProfile.weight,
                addressLine1: userData.patientProfile.addressLine1,
                addressLine2: userData.patientProfile.addressLine2,
                city: userData.patientProfile.city,
                state: userData.patientProfile.state,
                pincode: userData.patientProfile.pincode,
            } : null,
            isProfileComplete: await this.userService.isProfileComplete(user.id),
        };
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
                    patientProfile: updatedUser.patientProfile ? {
                        id: updatedUser.patientProfile.id,
                        dateOfBirth: updatedUser.patientProfile.dateOfBirth,
                        gender: updatedUser.patientProfile.gender,
                        height: updatedUser.patientProfile.height,
                        weight: updatedUser.patientProfile.weight,
                        addressLine1: updatedUser.patientProfile.addressLine1,
                        addressLine2: updatedUser.patientProfile.addressLine2,
                        city: updatedUser.patientProfile.city,
                        state: updatedUser.patientProfile.state,
                        pincode: updatedUser.patientProfile.pincode,
                    } : null,
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
}
