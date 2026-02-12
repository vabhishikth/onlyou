'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ShieldX, ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export default function UnauthorizedPage() {
    const { logout, user } = useAuth();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-background to-accent-50 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="card-premium p-8 sm:p-12 max-w-md w-full text-center"
            >
                <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-6">
                    <ShieldX className="w-8 h-8 text-error" />
                </div>

                <h1 className="text-2xl font-bold text-foreground mb-2">
                    Access Denied
                </h1>

                <p className="text-muted-foreground mb-6">
                    You don't have permission to access this page.
                    {user?.role && (
                        <>
                            {' '}
                            Your current role is{' '}
                            <span className="font-medium text-foreground">
                                {user.role.toLowerCase()}
                            </span>
                            .
                        </>
                    )}
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                    <Link href="/" className="flex-1">
                        <Button variant="outline" className="w-full">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Go Home
                        </Button>
                    </Link>
                    <Button
                        variant="ghost"
                        onClick={() => logout()}
                        className="flex-1"
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                    </Button>
                </div>
            </motion.div>
        </div>
    );
}
