import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, PatientProfile, Gender } from '@prisma/client';

export interface UpdateProfileInput {
    name?: string;
    email?: string;
    dateOfBirth?: Date;
    gender?: Gender;
    height?: number;
    weight?: number;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    pincode?: string;
}

@Injectable()
export class UserService {
    constructor(private readonly prisma: PrismaService) { }

    async findById(id: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { id },
        });
    }

    async findByPhone(phone: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { phone },
        });
    }

    async getUserWithProfile(userId: string) {
        return this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                patientProfile: true,
            },
        });
    }

    async updateProfile(userId: string, input: UpdateProfileInput) {
        const { name, email, dateOfBirth, gender, height, weight, ...addressData } = input;

        // Update user fields
        const user = await this.prisma.user.update({
            where: { id: userId },
            data: {
                ...(name !== undefined && { name }),
                ...(email !== undefined && { email }),
            },
        });

        // Build create data object without undefined values
        const createData: Record<string, unknown> = { userId };
        if (dateOfBirth) createData.dateOfBirth = dateOfBirth;
        if (gender) createData.gender = gender;
        if (height !== undefined) createData.height = height;
        if (weight !== undefined) createData.weight = weight;
        Object.entries(addressData).forEach(([key, value]) => {
            if (value !== undefined) createData[key] = value;
        });

        // Build update data object without undefined values
        const updateData: Record<string, unknown> = {};
        if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
        if (gender !== undefined) updateData.gender = gender;
        if (height !== undefined) updateData.height = height;
        if (weight !== undefined) updateData.weight = weight;
        Object.entries(addressData).forEach(([key, value]) => {
            if (value !== undefined) updateData[key] = value;
        });

        // Upsert patient profile
        const patientProfile = await this.prisma.patientProfile.upsert({
            where: { userId },
            create: createData as Parameters<typeof this.prisma.patientProfile.create>[0]['data'],
            update: updateData,
        });

        return {
            ...user,
            patientProfile,
        };
    }

    async getPatientProfile(userId: string): Promise<PatientProfile | null> {
        return this.prisma.patientProfile.findUnique({
            where: { userId },
        });
    }

    async isProfileComplete(userId: string): Promise<boolean> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { name: true },
        });

        const profile = await this.prisma.patientProfile.findUnique({
            where: { userId },
            select: {
                gender: true,
                addressLine1: true,
                city: true,
                state: true,
                pincode: true,
            },
        });

        if (!profile || !user?.name) return false;

        return !!(
            user.name &&
            profile.gender &&
            profile.addressLine1 &&
            profile.city &&
            profile.state &&
            profile.pincode
        );
    }
}
