'use client';

import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

// Spec: master spec Section 15 — PWA Setup
// Offline fallback page shown when network is unavailable

export default function OfflinePage() {
    const [isOnline, setIsOnline] = useState(false);

    useEffect(() => {
        setIsOnline(navigator.onLine);

        const handleOnline = () => {
            setIsOnline(true);
            // Redirect back when online
            window.location.reload();
        };

        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="text-center max-w-md">
                <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
                    <WifiOff className="w-10 h-10 text-amber-600" />
                </div>

                <h1 className="text-2xl font-bold text-foreground mb-2">
                    You&apos;re Offline
                </h1>

                <p className="text-muted-foreground mb-6">
                    Please check your internet connection. Cached data is shown below.
                    Updates will sync automatically when you&apos;re back online.
                </p>

                <div className="space-y-3">
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full py-3 bg-primary text-white rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-primary/90"
                    >
                        <RefreshCw className="w-5 h-5" />
                        Try Again
                    </button>

                    <button
                        onClick={() => window.history.back()}
                        className="w-full py-3 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80"
                    >
                        Go Back
                    </button>
                </div>

                {isOnline && (
                    <p className="mt-4 text-sm text-green-600">
                        Connection restored! Reloading...
                    </p>
                )}
            </div>
        </div>
    );
}
