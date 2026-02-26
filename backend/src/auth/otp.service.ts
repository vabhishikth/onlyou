import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt } from 'crypto';

interface OtpSendResponse {
    success: boolean;
    message: string;
    requestId?: string;
}

interface OtpVerifyResponse {
    success: boolean;
    message: string;
}

@Injectable()
export class OtpService {
    private readonly logger = new Logger(OtpService.name);
    private readonly authKey: string;
    private readonly templateId: string;

    // In-memory OTP store for development (use Redis in production)
    private otpStore = new Map<string, { otp: string; attempts: number; expiresAt: number }>();

    constructor(private readonly config: ConfigService) {
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

        // Rate limiting check (max 5 per hour)
        const existing = this.otpStore.get(phone);
        if (existing && existing.attempts >= 5 && existing.expiresAt > Date.now()) {
            return { success: false, message: 'Too many OTP requests. Please try again later.' };
        }

        // Spec: Section 14 (Security) — use cryptographic randomness for OTP
        const otp = randomInt(100000, 999999).toString();
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

        // Store OTP
        this.otpStore.set(phone, {
            otp,
            attempts: (existing?.attempts || 0) + 1,
            expiresAt,
        });

        // Development mode: Always succeed and log OTP
        if (this.config.get('NODE_ENV') !== 'production') {
            this.logger.log(`\n========================================`);
            this.logger.log(`📱 OTP for ${phone}: ${otp}`);
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
        const stored = this.otpStore.get(phone);

        if (!stored) {
            return { success: false, message: 'OTP expired or not requested' };
        }

        if (stored.expiresAt < Date.now()) {
            this.otpStore.delete(phone);
            return { success: false, message: 'OTP expired. Please request a new one.' };
        }

        // Development mode: Accept any 6-digit OTP or the stored one
        if (this.config.get('NODE_ENV') === 'development') {
            if (otp === stored.otp || otp === '123456') {
                this.otpStore.delete(phone);
                return { success: true, message: 'OTP verified successfully' };
            }
        }

        if (stored.otp !== otp) {
            return { success: false, message: 'Invalid OTP' };
        }

        // Clear OTP after successful verification
        this.otpStore.delete(phone);
        return { success: true, message: 'OTP verified successfully' };
    }
}
