import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, PatientProfile, DoctorProfile, LabProfile, PhlebotomistProfile, PharmacyProfile, Gender } from '@prisma/client';

export interface AgeValidationResult {
    valid: boolean;
    message?: string;
}

export interface PincodeLookupResult {
    city: string;
    state: string;
}

// Indian pincode to city/state mapping — major cities
// Spec: master spec Section 3.2 — Pincode auto-fill
const PINCODE_DATA: Record<string, PincodeLookupResult> = {
    // Mumbai
    '400001': { city: 'Mumbai', state: 'Maharashtra' },
    '400002': { city: 'Mumbai', state: 'Maharashtra' },
    '400003': { city: 'Mumbai', state: 'Maharashtra' },
    // Delhi
    '110001': { city: 'New Delhi', state: 'Delhi' },
    '110002': { city: 'New Delhi', state: 'Delhi' },
    '110003': { city: 'New Delhi', state: 'Delhi' },
    // Bangalore
    '560001': { city: 'Bangalore', state: 'Karnataka' },
    '560002': { city: 'Bangalore', state: 'Karnataka' },
    '560003': { city: 'Bangalore', state: 'Karnataka' },
    // Chennai
    '600001': { city: 'Chennai', state: 'Tamil Nadu' },
    '600002': { city: 'Chennai', state: 'Tamil Nadu' },
    '600003': { city: 'Chennai', state: 'Tamil Nadu' },
    // Kolkata
    '700001': { city: 'Kolkata', state: 'West Bengal' },
    '700002': { city: 'Kolkata', state: 'West Bengal' },
    '700003': { city: 'Kolkata', state: 'West Bengal' },
    // Hyderabad
    '500001': { city: 'Hyderabad', state: 'Telangana' },
    // Pune
    '411001': { city: 'Pune', state: 'Maharashtra' },
    // Ahmedabad
    '380001': { city: 'Ahmedabad', state: 'Gujarat' },
    // Jaipur
    '302001': { city: 'Jaipur', state: 'Rajasthan' },
    // Lucknow
    '226001': { city: 'Lucknow', state: 'Uttar Pradesh' },
};

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

export interface CreateDoctorProfileInput {
    registrationNo: string;
    specialization: string;
    qualifications: string[];
    yearsOfExperience: number;
    bio?: string;
    consultationFee?: number;
}

export interface CreateLabProfileInput {
    labName: string;
    licenseNumber: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
}

export interface CreatePhlebotomistProfileInput {
    employeeId: string;
    assignedRegion: string;
}

export interface CreatePharmacyProfileInput {
    pharmacyName: string;
    licenseNumber: string;
    gstNumber?: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
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

    // Spec: master spec Section 13 — Create lab profile
    async createLabProfile(userId: string, input: CreateLabProfileInput): Promise<LabProfile> {
        return this.prisma.labProfile.create({
            data: {
                userId,
                ...input,
            },
        });
    }

    // Spec: master spec Section 13 — Create phlebotomist profile
    async createPhlebotomistProfile(userId: string, input: CreatePhlebotomistProfileInput): Promise<PhlebotomistProfile> {
        return this.prisma.phlebotomistProfile.create({
            data: {
                userId,
                ...input,
            },
        });
    }

    // Spec: master spec Section 13 — Create pharmacy profile
    async createPharmacyProfile(userId: string, input: CreatePharmacyProfileInput): Promise<PharmacyProfile> {
        return this.prisma.pharmacyProfile.create({
            data: {
                userId,
                ...input,
            },
        });
    }

    // Spec: master spec Section 3.2 — NMC registration number validation
    // Format: XX/NNNNN/YYYY (state code / number / year)
    validateNmcRegistration(registrationNo: string): boolean {
        if (!registrationNo) return false;
        // Pattern: 2 uppercase letters / 5 digits / 4 digit year
        const pattern = /^[A-Z]{2}\/\d{5}\/\d{4}$/;
        return pattern.test(registrationNo);
    }

    // Spec: master spec Section 3.2 — Create doctor profile
    async createDoctorProfile(userId: string, input: CreateDoctorProfileInput): Promise<DoctorProfile> {
        if (!input.specialization || input.specialization.trim() === '') {
            throw new BadRequestException('Specialization is required');
        }

        return this.prisma.doctorProfile.create({
            data: {
                userId,
                registrationNo: input.registrationNo,
                specialization: input.specialization,
                qualifications: input.qualifications,
                yearsOfExperience: input.yearsOfExperience,
                ...(input.bio && { bio: input.bio }),
                ...(input.consultationFee && { consultationFee: input.consultationFee }),
            },
        });
    }

    // Spec: master spec Section 3.2 — Pincode validation (6 digits)
    validatePincode(pincode: string): boolean {
        return /^\d{6}$/.test(pincode);
    }

    // Spec: master spec Section 3.2 — Pincode auto-fill city/state
    lookupPincode(pincode: string): PincodeLookupResult | null {
        if (!this.validatePincode(pincode)) {
            return null;
        }
        return PINCODE_DATA[pincode] || null;
    }

    // Spec: master spec Section 3.2 — User must be at least 18 years old
    validateAge(dateOfBirth: Date): AgeValidationResult {
        const today = new Date();
        const birthDate = new Date(dateOfBirth);

        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        // Adjust age if birthday hasn't occurred yet this year
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        if (age < 18) {
            return { valid: false, message: 'User must be at least 18 years old' };
        }

        return { valid: true };
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
