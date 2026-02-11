import { z } from 'zod';

// Indian phone number validation (+91 followed by 10 digits)
export const phoneSchema = z
    .string()
    .regex(/^\+91[6-9]\d{9}$/, 'Invalid Indian phone number. Format: +91XXXXXXXXXX');

// Indian pincode validation (6 digits)
export const pincodeSchema = z
    .string()
    .regex(/^[1-9][0-9]{5}$/, 'Invalid pincode. Must be 6 digits');

// OTP validation (6 digits)
export const otpSchema = z
    .string()
    .regex(/^\d{6}$/, 'OTP must be 6 digits');

// Email validation (optional for India)
export const emailSchema = z
    .string()
    .email('Invalid email address')
    .optional();

// Name validation
export const nameSchema = z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces');

// Address validation
export const addressSchema = z.object({
    line1: z.string().min(5, 'Address line 1 is required').max(200),
    line2: z.string().max(200).optional(),
    city: z.string().min(2, 'City is required').max(100),
    state: z.string().min(2, 'State is required').max(100),
    pincode: pincodeSchema,
    country: z.literal('IN'),
});

// User registration schema
export const registerUserSchema = z.object({
    phone: phoneSchema,
    name: nameSchema.optional(),
});

// OTP verification schema
export const verifyOtpSchema = z.object({
    phone: phoneSchema,
    otp: otpSchema,
});

// Patient profile update schema
export const updatePatientProfileSchema = z.object({
    name: nameSchema.optional(),
    email: emailSchema,
    dateOfBirth: z.coerce.date().optional(),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
    height: z.number().min(50).max(300).optional(), // cm
    weight: z.number().min(10).max(500).optional(), // kg
    address: addressSchema.optional(),
});

// Export types inferred from schemas
export type Phone = z.infer<typeof phoneSchema>;
export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type UpdatePatientProfileInput = z.infer<typeof updatePatientProfileSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
