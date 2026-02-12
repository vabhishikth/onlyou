'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OTPInput } from '@/components/ui/otp-input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';

type Step = 'phone' | 'otp';

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnUrl = searchParams.get('returnUrl') || '/doctor';

    const { requestOTP, verifyOTP, requestingOTP, verifyingOTP, isAuthenticated } = useAuth();

    const [step, setStep] = useState<Step>('phone');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [rememberDevice, setRememberDevice] = useState(true);
    const [error, setError] = useState('');
    const [countdown, setCountdown] = useState(0);

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            router.push(returnUrl);
        }
    }, [isAuthenticated, router, returnUrl]);

    // Countdown timer for resend OTP
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [countdown]);

    const handlePhoneSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validate phone
        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length !== 10) {
            setError('Please enter a valid 10-digit mobile number');
            return;
        }

        try {
            const result = await requestOTP('+91' + cleanPhone);
            if (result?.success) {
                setStep('otp');
                setCountdown(30);
            } else {
                setError(result?.message || 'Failed to send OTP');
            }
        } catch {
            setError('Something went wrong. Please try again.');
        }
    };

    const handleOTPSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (otp.length !== 6) {
            setError('Please enter the complete 6-digit OTP');
            return;
        }

        try {
            const user = await verifyOTP('+91' + phone.replace(/\D/g, ''), otp, rememberDevice);
            if (user) {
                router.push(returnUrl);
            } else {
                setError('Invalid OTP. Please try again.');
            }
        } catch {
            setError('Invalid OTP or expired. Please try again.');
        }
    };

    const handleResendOTP = async () => {
        if (countdown > 0) return;

        setError('');
        setOtp('');

        try {
            const result = await requestOTP('+91' + phone.replace(/\D/g, ''));
            if (result?.success) {
                setCountdown(30);
            } else {
                setError(result?.message || 'Failed to resend OTP');
            }
        } catch {
            setError('Something went wrong. Please try again.');
        }
    };

    const handleBack = () => {
        setStep('phone');
        setOtp('');
        setError('');
    };

    return (
        <div className="card-premium p-8 sm:p-10">
            {/* Logo */}
            <div className="text-center mb-8">
                <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3 }}
                >
                    <h1 className="text-3xl font-bold text-primary">onlyou</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Doctor Portal
                    </p>
                </motion.div>
            </div>

            <AnimatePresence mode="wait">
                {step === 'phone' ? (
                    <motion.form
                        key="phone"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        onSubmit={handlePhoneSubmit}
                        className="space-y-6"
                    >
                        <div className="text-center space-y-2">
                            <h2 className="text-xl font-semibold text-foreground">
                                Welcome back
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Enter your mobile number to sign in
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Mobile Number</Label>
                            <div className="flex">
                                <div className="flex items-center justify-center h-11 px-3 rounded-l-xl border border-r-0 border-input bg-muted text-muted-foreground text-sm font-medium">
                                    +91
                                </div>
                                <Input
                                    id="phone"
                                    type="tel"
                                    inputMode="numeric"
                                    placeholder="9876543210"
                                    value={phone}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                                        setPhone(value);
                                        setError('');
                                    }}
                                    className="rounded-l-none"
                                    autoComplete="tel"
                                    error={error && step === 'phone' ? error : undefined}
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            size="lg"
                            className="w-full"
                            loading={requestingOTP}
                            disabled={phone.length !== 10}
                        >
                            Get OTP
                        </Button>
                    </motion.form>
                ) : (
                    <motion.form
                        key="otp"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                        onSubmit={handleOTPSubmit}
                        className="space-y-6"
                    >
                        <div className="text-center space-y-2">
                            <h2 className="text-xl font-semibold text-foreground">
                                Verify OTP
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Enter the 6-digit code sent to{' '}
                                <span className="font-medium text-foreground">
                                    +91 {phone}
                                </span>
                            </p>
                        </div>

                        <div className="flex justify-center">
                            <OTPInput
                                value={otp}
                                onChange={(value) => {
                                    setOtp(value);
                                    setError('');
                                }}
                                disabled={verifyingOTP}
                                error={error && step === 'otp' ? error : undefined}
                            />
                        </div>

                        {/* Remember device */}
                        <div className="flex items-center justify-between py-2">
                            <Label
                                htmlFor="remember"
                                className="text-sm text-muted-foreground cursor-pointer"
                            >
                                Remember this device
                            </Label>
                            <Switch
                                id="remember"
                                checked={rememberDevice}
                                onCheckedChange={setRememberDevice}
                            />
                        </div>

                        <Button
                            type="submit"
                            size="lg"
                            className="w-full"
                            loading={verifyingOTP}
                            disabled={otp.length !== 6}
                        >
                            Verify & Sign In
                        </Button>

                        {/* Resend & back */}
                        <div className="flex items-center justify-between text-sm">
                            <button
                                type="button"
                                onClick={handleBack}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Change number
                            </button>
                            <button
                                type="button"
                                onClick={handleResendOTP}
                                disabled={countdown > 0 || requestingOTP}
                                className={
                                    countdown > 0
                                        ? 'text-muted-foreground'
                                        : 'text-primary hover:text-primary-600 font-medium transition-colors'
                                }
                            >
                                {countdown > 0
                                    ? `Resend in ${countdown}s`
                                    : 'Resend OTP'}
                            </button>
                        </div>
                    </motion.form>
                )}
            </AnimatePresence>
        </div>
    );
}

function LoginFormFallback() {
    return (
        <div className="card-premium p-8 sm:p-10">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-primary">onlyou</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Doctor Portal
                </p>
            </div>
            <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-background to-accent-50 p-4">
            {/* Background decorative elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-100 rounded-full blur-3xl opacity-50" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent-100 rounded-full blur-3xl opacity-50" />
            </div>

            {/* Login card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="relative w-full max-w-md"
            >
                <Suspense fallback={<LoginFormFallback />}>
                    <LoginForm />
                </Suspense>

                {/* Footer */}
                <p className="text-center text-xs text-muted-foreground mt-6">
                    By signing in, you agree to our{' '}
                    <a href="#" className="underline hover:text-foreground">
                        Terms of Service
                    </a>{' '}
                    and{' '}
                    <a href="#" className="underline hover:text-foreground">
                        Privacy Policy
                    </a>
                </p>
            </motion.div>
        </div>
    );
}
