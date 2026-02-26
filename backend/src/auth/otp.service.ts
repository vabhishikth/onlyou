import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

interface OtpSendResponse {
    success: boolean;
    message: string;
    requestId?: string;
}

interface OtpVerifyResponse {
    success: boolean;
    message: string;
}

// Spec: Section 14 (Security) — OTP storage in Prisma (critical path)
// WHY: OTP/auth is on the critical login path. Redis is optional infrastructure
// that may be unavailable in local dev (no Docker/WSL) or cloud environments
// without a Redis addon. Storing OTPs in PostgreSQL via Prisma ensures login
// ALWAYS works. Redis is still used for rate limiting (non-critical — if Redis
// is down, rate limiting is skipped but login still succeeds).

@Injectable()
export class OtpService {
    private readonly logger = new Logger(OtpService.name);
    private readonly authKey: string;
    private readonly templateId: string;

    constructor(
        private readonly config: ConfigService,
        private readonly prisma: PrismaService,
        private readonly redis: RedisService,
    ) {
        this.authKey = this.config.get<string>('MSG91_AUTH_KEY') || '';
        this.templateId = this.config.get<string>('MSG91_TEMPLATE_ID') || '';
    }

    /**
     * Send OTP to Indian phone number via MSG91
     */
    async sendOtp(phone: string): Promise<OtpSendResponse> {
        // Validate phone format (+91XXXXXXXXXX)
        if (!phone.match(/^\+91[6-9]\d{9}$/)) {
            return { success: false, message: 'Invalid Indian phone number' };
        }

        // Rate limiting check (max 5 per hour) using Redis — non-critical
        // If Redis is down, rate limiting is skipped but OTP still works
        const rateKey = `otp_rate:${phone}`;
        const rateCount = await this.redis.incr(rateKey);
        if (rateCount > 0) {
            await this.redis.expire(rateKey, 3600); // 1-hour TTL
        }
        if (rateCount > 5) {
            return { success: false, message: 'Too many OTP requests. Please try again later.' };
        }

        // Spec: Section 14 (Security) — use cryptographic randomness for OTP
        const otp = randomInt(100000, 999999).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // Store OTP in Prisma (upsert — one active OTP per phone)
        try {
            await this.prisma.otpToken.upsert({
                where: { phone },
                update: {
                    otp,
                    attempts: rateCount > 0 ? rateCount : 1,
                    expiresAt,
                },
                create: {
                    phone,
                    otp,
                    attempts: rateCount > 0 ? rateCount : 1,
                    expiresAt,
                },
            });
        } catch (err) {
            this.logger.error(`Failed to store OTP in DB for ${phone}: ${(err as Error).message}`);
            return { success: false, message: 'SMS service temporarily unavailable. Please try again.' };
        }

        // Development mode: Always succeed and log OTP
        if (this.config.get('NODE_ENV') !== 'production') {
            this.logger.log(`\n========================================`);
            this.logger.log(`OTP for ${phone}: ${otp}`);
            this.logger.log(`========================================\n`);
            return { success: true, message: 'OTP sent successfully', requestId: 'dev-mode' };
        }

        // Production: Send via MSG91 API
        try {
            const mobileNumber = phone.replace('+91', ''); // MSG91 wants number without country code

            const response = await fetch(
                `https://api.msg91.com/api/v5/otp?template_id=${this.templateId}&mobile=91${mobileNumber}&authkey=${this.authKey}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            const data = await response.json() as { type?: string; request_id?: string };

            if (data.type === 'success') {
                return { success: true, message: 'OTP sent successfully', requestId: data.request_id || 'unknown' };
            } else {
                this.logger.error('MSG91 error:', data);
                return { success: false, message: 'Failed to send OTP' };
            }
        } catch (error) {
            this.logger.error('MSG91 API error:', error);
            return { success: false, message: 'SMS service temporarily unavailable' };
        }
    }

    /**
     * Verify OTP
     */
    async verifyOtp(phone: string, otp: string): Promise<OtpVerifyResponse> {
        // Look up OTP from database
        const stored = await this.prisma.otpToken.findUnique({
            where: { phone },
        });

        if (!stored) {
            return { success: false, message: 'OTP expired or not requested' };
        }

        if (stored.expiresAt < new Date()) {
            await this.prisma.otpToken.delete({ where: { phone } });
            return { success: false, message: 'OTP expired. Please request a new one.' };
        }

        // Development mode: Accept any 6-digit OTP or the stored one
        if (this.config.get('NODE_ENV') !== 'production') {
            if (otp === stored.otp || otp === '123456') {
                await this.prisma.otpToken.delete({ where: { phone } });
                return { success: true, message: 'OTP verified successfully' };
            }
        }

        if (stored.otp !== otp) {
            return { success: false, message: 'Invalid OTP' };
        }

        // Clear OTP after successful verification
        await this.prisma.otpToken.delete({ where: { phone } });
        return { success: true, message: 'OTP verified successfully' };
    }
}
