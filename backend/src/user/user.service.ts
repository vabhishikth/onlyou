import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, PatientProfile, DoctorProfile, LabProfile, PhlebotomistProfile, PharmacyProfile, Gender, HealthProfile, Prisma } from '@prisma/client';

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

// Onboarding input (saves all data from Steps 1-3)
export interface UpdateOnboardingInput {
    healthGoals: string[];
    fullName: string;
    dateOfBirth: Date;
    gender: Gender;
    pincode: string;
    state: string;
    city: string;
    telehealthConsent: boolean;
}

// Health profile input (Step 4)
export interface UpsertHealthProfileInput {
    condition: string;
    responses: Prisma.InputJsonValue;
}

// Patient profile with health profiles
export type PatientProfileWithHealthProfiles = PatientProfile & {
    healthProfiles: HealthProfile[];
};

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

    // ============================================
    // ONBOARDING METHODS
    // ============================================

    // Update onboarding data (Steps 1-3: health goals, basic info, location, consent)
    async updateOnboarding(userId: string, input: UpdateOnboardingInput): Promise<PatientProfileWithHealthProfiles> {
        // Validate age
        const ageValidation = this.validateAge(input.dateOfBirth);
        if (!ageValidation.valid) {
            throw new BadRequestException(ageValidation.message);
        }

        // Validate pincode format
        if (!this.validatePincode(input.pincode)) {
            throw new BadRequestException('Invalid pincode format. Must be 6 digits.');
        }

        // Update user name
        await this.prisma.user.update({
            where: { id: userId },
            data: { name: input.fullName },
        });

        // Upsert patient profile with onboarding data
        const patientProfile = await this.prisma.patientProfile.upsert({
            where: { userId },
            create: {
                userId,
                fullName: input.fullName,
                dateOfBirth: input.dateOfBirth,
                gender: input.gender,
                pincode: input.pincode,
                state: input.state,
                city: input.city,
                healthGoals: input.healthGoals,
                telehealthConsent: input.telehealthConsent,
                telehealthConsentDate: input.telehealthConsent ? new Date() : null,
            },
            update: {
                fullName: input.fullName,
                dateOfBirth: input.dateOfBirth,
                gender: input.gender,
                pincode: input.pincode,
                state: input.state,
                city: input.city,
                healthGoals: input.healthGoals,
                telehealthConsent: input.telehealthConsent,
                telehealthConsentDate: input.telehealthConsent ? new Date() : null,
            },
            include: {
                healthProfiles: true,
            },
        });

        return patientProfile;
    }

    // Upsert health profile (Step 4: health snapshot for a specific condition)
    async upsertHealthProfile(userId: string, input: UpsertHealthProfileInput): Promise<HealthProfile> {
        // First ensure patient profile exists
        let patientProfile = await this.prisma.patientProfile.findUnique({
            where: { userId },
        });

        if (!patientProfile) {
            patientProfile = await this.prisma.patientProfile.create({
                data: { userId },
            });
        }

        // Upsert health profile for this condition
        const healthProfile = await this.prisma.healthProfile.upsert({
            where: {
                patientProfileId_condition: {
                    patientProfileId: patientProfile.id,
                    condition: input.condition,
                },
            },
            create: {
                patientProfileId: patientProfile.id,
                condition: input.condition,
                responses: input.responses,
            },
            update: {
                responses: input.responses,
            },
        });

        return healthProfile;
    }

    // Complete onboarding (called after all health snapshots are saved)
    async completeOnboarding(userId: string): Promise<PatientProfileWithHealthProfiles> {
        const patientProfile = await this.prisma.patientProfile.update({
            where: { userId },
            data: { onboardingComplete: true },
            include: { healthProfiles: true },
        });

        return patientProfile;
    }

    // Get patient profile with health profiles
    async getPatientProfileWithHealthProfiles(userId: string): Promise<PatientProfileWithHealthProfiles | null> {
        return this.prisma.patientProfile.findUnique({
            where: { userId },
            include: { healthProfiles: true },
        });
    }

    // Check if onboarding is complete
    async isOnboardingComplete(userId: string): Promise<boolean> {
        const profile = await this.prisma.patientProfile.findUnique({
            where: { userId },
            select: { onboardingComplete: true },
        });

        return profile?.onboardingComplete ?? false;
    }
}
