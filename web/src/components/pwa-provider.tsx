'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { X, Download } from 'lucide-react';

// Spec: master spec Section 15 — PWA Setup
// Handles service worker registration and "Add to Home Screen" prompt

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [showInstallPrompt, setShowInstallPrompt] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Register service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('/sw.js')
                .then((registration) => {
                    console.log('[PWA] Service Worker registered:', registration.scope);

                    // Check for updates
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        if (newWorker) {
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    // New version available
                                    console.log('[PWA] New version available');
                                }
                            });
                        }
                    });
                })
                .catch((error) => {
                    console.error('[PWA] Service Worker registration failed:', error);
                });
        }

        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
        }

        // Listen for install prompt
        const handleBeforeInstall = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);

            // Show prompt after second visit (check localStorage)
            const visitCount = parseInt(localStorage.getItem('visitCount') || '0', 10) + 1;
            localStorage.setItem('visitCount', visitCount.toString());

            if (visitCount >= 2 && !isInstalled) {
                setShowInstallPrompt(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstall);

        // Listen for app installed
        const handleAppInstalled = () => {
            setIsInstalled(true);
            setShowInstallPrompt(false);
            setDeferredPrompt(null);
            console.log('[PWA] App installed');
        };

        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, [isInstalled]);

    // Update manifest link based on current portal
    useEffect(() => {
        const manifestLink = document.querySelector('link[rel="manifest"]');

        let manifestUrl = '/manifest.json';
        if (pathname.startsWith('/lab')) {
            manifestUrl = '/manifest-lab.json';
        } else if (pathname.startsWith('/collect')) {
            manifestUrl = '/manifest-collect.json';
        } else if (pathname.startsWith('/pharmacy')) {
            manifestUrl = '/manifest-pharmacy.json';
        }

        if (manifestLink) {
            manifestLink.setAttribute('href', manifestUrl);
        }
    }, [pathname]);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();

        const { outcome } = await deferredPrompt.userChoice;
        console.log('[PWA] Install prompt outcome:', outcome);

        setDeferredPrompt(null);
        setShowInstallPrompt(false);
    };

    const dismissPrompt = () => {
        setShowInstallPrompt(false);
        // Don't show again for this session
        sessionStorage.setItem('installPromptDismissed', 'true');
    };

    // Get portal-specific branding
    const getPortalInfo = () => {
        if (pathname.startsWith('/lab')) {
            return { name: 'Onlyou Lab Portal', color: 'bg-blue-600' };
        }
        if (pathname.startsWith('/collect')) {
            return { name: 'Onlyou Collection', color: 'bg-teal-600' };
        }
        if (pathname.startsWith('/pharmacy')) {
            return { name: 'Onlyou Pharmacy', color: 'bg-green-600' };
        }
        return { name: 'Onlyou', color: 'bg-primary' };
    };

    const portalInfo = getPortalInfo();

    return (
        <>
            {children}

            {/* Install Prompt Banner */}
            {showInstallPrompt && !isInstalled && (
                <div className="fixed bottom-20 left-4 right-4 z-50 max-w-lg mx-auto animate-in slide-in-from-bottom">
                    <div className="bg-card rounded-2xl shadow-xl border border-border p-4">
                        <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 rounded-xl ${portalInfo.color} flex items-center justify-center flex-shrink-0`}>
                                <Download className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-foreground">
                                    Install {portalInfo.name}
                                </h3>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    Add to home screen for quick access
                                </p>
                            </div>
                            <button
                                onClick={dismissPrompt}
                                className="p-1 hover:bg-muted rounded"
                            >
                                <X className="w-5 h-5 text-muted-foreground" />
                            </button>
                        </div>

                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={dismissPrompt}
                                className="flex-1 py-2.5 bg-muted text-foreground rounded-lg font-medium text-sm"
                            >
                                Not Now
                            </button>
                            <button
                                onClick={handleInstall}
                                className={`flex-1 py-2.5 ${portalInfo.color} text-white rounded-lg font-medium text-sm`}
                            >
                                Install
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
