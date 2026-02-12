'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import type { User } from '@/graphql/auth';

interface AuthGuardProps {
    children: React.ReactNode;
    allowedRoles: User['role'][];
    fallbackPath?: string;
}

export function AuthGuard({
    children,
    allowedRoles,
    fallbackPath = '/login',
}: AuthGuardProps) {
    const router = useRouter();
    const { user, isLoading, isAuthenticated } = useAuth();

    useEffect(() => {
        if (!isLoading) {
            if (!isAuthenticated) {
                // Not logged in - redirect to login
                const returnUrl = typeof window !== 'undefined' ? window.location.pathname : '';
                router.push(`${fallbackPath}?returnUrl=${encodeURIComponent(returnUrl)}`);
            } else if (user && !allowedRoles.includes(user.role)) {
                // Logged in but wrong role - redirect to unauthorized
                router.push('/unauthorized');
            }
        }
    }, [isLoading, isAuthenticated, user, allowedRoles, router, fallbackPath]);

    // Show loading state
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    // Not authenticated or wrong role
    if (!isAuthenticated || (user && !allowedRoles.includes(user.role))) {
        return null;
    }

    // Authorized - render children
    return <>{children}</>;
}
