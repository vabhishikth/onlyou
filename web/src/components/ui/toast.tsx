'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

interface ToastContextValue {
    toasts: Toast[];
    toast: (options: Omit<Toast, 'id'>) => void;
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
    dismiss: (id: string) => void;
    dismissAll: () => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const toastIcons: Record<ToastType, ReactNode> = {
    success: <CheckCircle className="w-5 h-5 text-success" />,
    error: <AlertCircle className="w-5 h-5 text-error" />,
    warning: <AlertTriangle className="w-5 h-5 text-warning" />,
    info: <Info className="w-5 h-5 text-primary" />,
};

const toastStyles: Record<ToastType, string> = {
    success: 'border-success/20 bg-success/5',
    error: 'border-error/20 bg-error/5',
    warning: 'border-warning/20 bg-warning/5',
    info: 'border-primary/20 bg-primary/5',
};

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const dismiss = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const dismissAll = useCallback(() => {
        setToasts([]);
    }, []);

    const toast = useCallback(
        (options: Omit<Toast, 'id'>) => {
            const id = Math.random().toString(36).substring(2);
            const newToast: Toast = { ...options, id };

            setToasts((prev) => [...prev, newToast]);

            // Auto dismiss
            const duration = options.duration ?? 4000;
            if (duration > 0) {
                setTimeout(() => {
                    dismiss(id);
                }, duration);
            }
        },
        [dismiss]
    );

    const success = useCallback(
        (title: string, message?: string) => {
            toast({ type: 'success', title, message });
        },
        [toast]
    );

    const error = useCallback(
        (title: string, message?: string) => {
            toast({ type: 'error', title, message, duration: 6000 });
        },
        [toast]
    );

    const warning = useCallback(
        (title: string, message?: string) => {
            toast({ type: 'warning', title, message });
        },
        [toast]
    );

    const info = useCallback(
        (title: string, message?: string) => {
            toast({ type: 'info', title, message });
        },
        [toast]
    );

    return (
        <ToastContext.Provider
            value={{ toasts, toast, success, error, warning, info, dismiss, dismissAll }}
        >
            {children}
            <ToastContainer toasts={toasts} onDismiss={dismiss} />
        </ToastContext.Provider>
    );
}

function ToastContainer({
    toasts,
    onDismiss,
}: {
    toasts: Toast[];
    onDismiss: (id: string) => void;
}) {
    return (
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
            <AnimatePresence mode="popLayout">
                {toasts.map((toast) => (
                    <motion.div
                        key={toast.id}
                        layout
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 100, scale: 0.95 }}
                        transition={{ type: 'spring', duration: 0.3 }}
                        className={cn(
                            'pointer-events-auto bg-white border rounded-xl p-4 shadow-soft-lg',
                            toastStyles[toast.type]
                        )}
                    >
                        <div className="flex items-start gap-3">
                            <div className="shrink-0 mt-0.5">
                                {toastIcons[toast.type]}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground">
                                    {toast.title}
                                </p>
                                {toast.message && (
                                    <p className="text-sm text-muted-foreground mt-0.5">
                                        {toast.message}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => onDismiss(toast.id)}
                                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}
