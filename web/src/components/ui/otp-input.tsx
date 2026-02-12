'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface OTPInputProps {
    length?: number;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    error?: string | undefined;
    autoFocus?: boolean;
}

export function OTPInput({
    length = 6,
    value,
    onChange,
    disabled = false,
    error,
    autoFocus = true,
}: OTPInputProps) {
    const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

    // Split value into individual digits
    const digits = value.split('').slice(0, length);

    // Pad with empty strings if needed
    while (digits.length < length) {
        digits.push('');
    }

    const focusInput = (index: number) => {
        const input = inputRefs.current[index];
        if (input) {
            input.focus();
            input.select();
        }
    };

    const handleChange = (index: number, digit: string) => {
        // Only allow digits
        if (digit && !/^\d$/.test(digit)) return;

        // Update value
        const newDigits = [...digits];
        newDigits[index] = digit;
        const newValue = newDigits.join('');
        onChange(newValue);

        // Auto-advance to next input
        if (digit && index < length - 1) {
            focusInput(index + 1);
        }
    };

    const handleKeyDown = (
        index: number,
        e: React.KeyboardEvent<HTMLInputElement>
    ) => {
        if (e.key === 'Backspace') {
            if (!digits[index] && index > 0) {
                // Move to previous input on backspace if current is empty
                focusInput(index - 1);
            } else {
                // Clear current input
                handleChange(index, '');
            }
        } else if (e.key === 'ArrowLeft' && index > 0) {
            e.preventDefault();
            focusInput(index - 1);
        } else if (e.key === 'ArrowRight' && index < length - 1) {
            e.preventDefault();
            focusInput(index + 1);
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text');
        const pastedDigits = pastedData.replace(/\D/g, '').slice(0, length);

        if (pastedDigits) {
            onChange(pastedDigits);
            // Focus the last filled input or the next empty one
            const targetIndex = Math.min(pastedDigits.length, length - 1);
            focusInput(targetIndex);
        }
    };

    // Auto-focus first input
    React.useEffect(() => {
        if (autoFocus && !disabled) {
            focusInput(0);
        }
    }, [autoFocus, disabled]);

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="flex gap-2 sm:gap-3">
                {digits.map((digit, index) => (
                    <input
                        key={index}
                        ref={(el) => {
                            inputRefs.current[index] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        pattern="\d*"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        onPaste={handlePaste}
                        onFocus={(e) => e.target.select()}
                        disabled={disabled}
                        className={cn(
                            'h-12 w-10 sm:h-14 sm:w-12 rounded-xl border-2 bg-background text-center text-xl font-semibold',
                            'transition-all duration-200',
                            'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
                            'disabled:cursor-not-allowed disabled:opacity-50',
                            error
                                ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
                                : 'border-input',
                            digit && 'border-primary/50 bg-primary/5'
                        )}
                        aria-label={`Digit ${index + 1}`}
                    />
                ))}
            </div>
            {error && (
                <p className="text-sm text-destructive">{error}</p>
            )}
        </div>
    );
}
