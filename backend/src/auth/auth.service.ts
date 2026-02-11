import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { OtpService } from './otp.service';
import { User, UserRole } from '@prisma/client';
import { randomBytes } from 'crypto';

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

export interface AuthResponse {
    success: boolean;
    message: string;
    user?: User;
    tokens?: AuthTokens;
}

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwt: JwtService,
        private readonly config: ConfigService,
        private readonly otp: OtpService,
    ) { }

    /**
     * Request OTP for phone authentication
     */
    async requestOtp(phone: string): Promise<{ success: boolean; message: string }> {
        const result = await this.otp.sendOtp(phone);
        return result;
    }

    /**
     * Verify OTP and authenticate user
     */
    async verifyOtpAndLogin(phone: string, otp: string): Promise<AuthResponse> {
        // Verify OTP
        const otpResult = await this.otp.verifyOtp(phone, otp);
        if (!otpResult.success) {
            return { success: false, message: otpResult.message };
        }

        // Find or create user
        let user = await this.prisma.user.findUnique({ where: { phone } });

        if (!user) {
            user = await this.prisma.user.create({
                data: {
                    phone,
                    role: UserRole.PATIENT,
                    isVerified: true,
                },
            });

            // Create empty patient profile
            await this.prisma.patientProfile.create({
                data: { userId: user.id },
            });
        } else if (!user.isVerified) {
            // Mark existing user as verified
            user = await this.prisma.user.update({
                where: { id: user.id },
                data: { isVerified: true },
            });
        }

        // Generate tokens
        const tokens = await this.generateTokens(user);

        return {
            success: true,
            message: 'Login successful',
            user,
            tokens,
        };
    }

    /**
     * Generate access and refresh tokens
     */
    async generateTokens(user: User): Promise<AuthTokens> {
        const payload = { sub: user.id, phone: user.phone, role: user.role };

        const secret = this.config.get<string>('JWT_ACCESS_SECRET');
        if (!secret) {
            throw new Error('JWT_ACCESS_SECRET is not configured');
        }

        const accessToken = this.jwt.sign(payload, {
            secret,
            expiresIn: '1h', // 1 hour (increased from 15m for better UX)
        });

        const refreshToken = randomBytes(64).toString('hex');
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

        // Store refresh token
        await this.prisma.refreshToken.create({
            data: {
                userId: user.id,
                token: refreshToken,
                expiresAt,
            },
        });

        return { accessToken, refreshToken };
    }

    /**
     * Refresh access token using refresh token
     */
    async refreshAccessToken(refreshToken: string): Promise<AuthResponse> {
        const stored = await this.prisma.refreshToken.findUnique({
            where: { token: refreshToken },
            include: { user: true },
        });

        if (!stored || stored.expiresAt < new Date()) {
            if (stored) {
                await this.prisma.refreshToken.delete({ where: { id: stored.id } });
            }
            throw new UnauthorizedException('Invalid or expired refresh token');
        }

        const tokens = await this.generateTokens(stored.user);

        // Delete old refresh token
        await this.prisma.refreshToken.delete({ where: { id: stored.id } });

        return {
            success: true,
            message: 'Token refreshed',
            user: stored.user,
            tokens,
        };
    }

    /**
     * Logout - invalidate refresh token
     */
    async logout(userId: string, refreshToken?: string): Promise<{ success: boolean }> {
        if (refreshToken) {
            await this.prisma.refreshToken.deleteMany({
                where: { userId, token: refreshToken },
            });
        } else {
            // Logout from all devices
            await this.prisma.refreshToken.deleteMany({ where: { userId } });
        }

        return { success: true };
    }

    /**
     * Get user by ID
     */
    async getUserById(id: string): Promise<User | null> {
        return this.prisma.user.findUnique({ where: { id } });
    }
}
