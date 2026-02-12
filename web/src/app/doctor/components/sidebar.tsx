'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    Home,
    Users,
    FileText,
    MessageSquare,
    Settings,
    LogOut,
    Menu,
    X,
    Pill,
    TestTube,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';

const navItems = [
    { href: '/doctor', icon: Home, label: 'Dashboard' },
    { href: '/doctor/queue', icon: Users, label: 'Case Queue' },
    { href: '/doctor/prescriptions', icon: Pill, label: 'Prescriptions' },
    { href: '/doctor/lab-orders', icon: TestTube, label: 'Lab Orders' },
    { href: '/doctor/messages', icon: MessageSquare, label: 'Messages' },
    { href: '/doctor/templates', icon: FileText, label: 'Templates' },
];

export function DoctorSidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
    };

    return (
        <>
            {/* Mobile header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-40 flex items-center px-4">
                <button
                    onClick={() => setMobileOpen(true)}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                    <Menu className="w-6 h-6" />
                </button>
                <h1 className="ml-3 text-lg font-semibold text-primary">onlyou</h1>
            </div>

            {/* Mobile sidebar backdrop */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    'fixed top-0 left-0 h-full w-64 bg-card border-r border-border z-50 transition-transform duration-300',
                    'lg:translate-x-0',
                    mobileOpen ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                {/* Logo */}
                <div className="h-16 flex items-center justify-between px-6 border-b border-border">
                    <Link href="/doctor" className="flex items-center gap-2">
                        <span className="text-xl font-bold text-primary">onlyou</span>
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                            Doctor
                        </span>
                    </Link>
                    <button
                        onClick={() => setMobileOpen(false)}
                        className="lg:hidden p-1 hover:bg-muted rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="p-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive =
                            pathname === item.href ||
                            (item.href !== '/doctor' && pathname.startsWith(item.href));

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMobileOpen(false)}
                                className={cn(
                                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                                    isActive
                                        ? 'bg-primary text-primary-foreground shadow-soft'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                )}
                            >
                                <item.icon className="w-5 h-5" />
                                {item.label}
                                {isActive && (
                                    <motion.div
                                        layoutId="activeNav"
                                        className="absolute inset-0 bg-primary rounded-xl -z-10"
                                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                    />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* User section */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-semibold text-primary">
                                {user?.name?.[0]?.toUpperCase() || 'D'}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                                {user?.name || 'Doctor'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                                {user?.email || user?.phone}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Link href="/doctor/settings" className="flex-1">
                            <Button variant="ghost" size="sm" className="w-full justify-start">
                                <Settings className="w-4 h-4 mr-2" />
                                Settings
                            </Button>
                        </Link>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleLogout}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                            <LogOut className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Mobile spacer */}
            <div className="lg:hidden h-16" />
        </>
    );
}
