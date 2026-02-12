'use client';

import { AlertTriangle, RefreshCw, WifiOff, ServerOff, Ban } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

export type ErrorType = 'generic' | 'network' | 'server' | 'forbidden' | 'not-found';

interface ErrorStateProps {
    title?: string;
    message?: string;
    type?: ErrorType;
    onRetry?: () => void;
    className?: string;
    compact?: boolean;
}

const errorConfig: Record<ErrorType, { icon: React.ReactNode; title: string; message: string }> = {
    generic: {
        icon: <AlertTriangle className="w-12 h-12 text-error" />,
        title: 'Something went wrong',
        message: 'An unexpected error occurred. Please try again.',
    },
    network: {
        icon: <WifiOff className="w-12 h-12 text-warning" />,
        title: 'No internet connection',
        message: 'Please check your connection and try again.',
    },
    server: {
        icon: <ServerOff className="w-12 h-12 text-error" />,
        title: 'Server unavailable',
        message: 'Our servers are temporarily unavailable. Please try again later.',
    },
    forbidden: {
        icon: <Ban className="w-12 h-12 text-error" />,
        title: 'Access denied',
        message: 'You do not have permission to view this content.',
    },
    'not-found': {
        icon: <AlertTriangle className="w-12 h-12 text-muted-foreground" />,
        title: 'Not found',
        message: 'The requested resource could not be found.',
    },
};

export function ErrorState({
    title,
    message,
    type = 'generic',
    onRetry,
    className,
    compact = false,
}: ErrorStateProps) {
    const config = errorConfig[type];

    if (compact) {
        return (
            <div
                className={cn(
                    'flex items-center gap-3 p-4 bg-error/5 border border-error/20 rounded-xl',
                    className
                )}
            >
                <AlertTriangle className="w-5 h-5 text-error shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground font-medium">
                        {title || config.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                        {message || config.message}
                    </p>
                </div>
                {onRetry && (
                    <Button variant="ghost" size="sm" onClick={onRetry}>
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                )}
            </div>
        );
    }

    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center py-12 px-4 text-center',
                className
            )}
        >
            <div className="mb-4">{config.icon}</div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
                {title || config.title}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
                {message || config.message}
            </p>
            {onRetry && (
                <Button variant="outline" onClick={onRetry}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                </Button>
            )}
        </div>
    );
}

// Inline error for form fields
export function InlineError({ message }: { message: string }) {
    return (
        <p className="text-sm text-error mt-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {message}
        </p>
    );
}

// Error boundary fallback
export function ErrorBoundaryFallback({
    error,
    resetErrorBoundary,
}: {
    error: Error;
    resetErrorBoundary: () => void;
}) {
    return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
            <ErrorState
                title="Something went wrong"
                message={error.message || 'An unexpected error occurred'}
                onRetry={resetErrorBoundary}
            />
        </div>
    );
}
