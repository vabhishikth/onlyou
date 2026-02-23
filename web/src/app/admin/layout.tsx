'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    TestTube2,
    Truck,
    Users,
    Building2,
    AlertTriangle,
    Stethoscope,
    Menu,
    X,
    LogOut,
    Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';

// Spec: master spec Section 15 — Admin Dashboard (admin.onlyou.life)
// Role: ADMIN only — Coordinator's command center

const NAV_ITEMS = [
    {
        href: '/admin',
        label: 'Dashboard',
        icon: LayoutDashboard,
    },
    {
        href: '/admin/lab-orders',
        label: 'Lab Orders',
        icon: TestTube2,
    },
    {
        href: '/admin/deliveries',
        label: 'Deliveries',
        icon: Truck,
    },
    {
        href: '/admin/partners',
        label: 'Partners',
        icon: Building2,
    },
    {
        href: '/admin/escalations',
        label: 'SLA Escalations',
        icon: AlertTriangle,
    },
    {
        href: '/admin/patients',
        label: 'Patients',
        icon: Users,
    },
    {
        href: '/admin/doctors',
        label: 'Doctors',
        icon: Stethoscope,
    },
];

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const { user } = useAuth();
    const adminName = user?.name || 'Admin';

    return (
        <div className="min-h-screen bg-background">
            {/* Mobile header */}
            <header className="lg:hidden sticky top-0 z-40 bg-card border-b border-border px-4 py-3">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 hover:bg-muted rounded-lg"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <Link href="/admin" className="font-semibold text-primary">
                        Onlyou Admin
                    </Link>
                    <button className="p-2 hover:bg-muted rounded-lg relative">
                        <Bell className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-50 bg-black/50"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    'fixed top-0 left-0 z-50 h-full w-64 bg-card border-r border-border',
                    'transform transition-transform duration-200 ease-in-out',
                    'lg:translate-x-0',
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="p-4 border-b border-border flex items-center justify-between">
                        <Link href="/admin" className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                                <span className="text-white font-bold text-sm">O</span>
                            </div>
                            <span className="font-semibold text-foreground">Onlyou Admin</span>
                        </Link>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="lg:hidden p-1 hover:bg-muted rounded"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                        {NAV_ITEMS.map((item) => {
                            const isActive =
                                pathname === item.href ||
                                (item.href !== '/admin' && pathname.startsWith(item.href));

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={cn(
                                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                                        isActive
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    )}
                                >
                                    <item.icon className="w-5 h-5" />
                                    {item.label}
                                    {item.href === '/admin/escalations' && (
                                        <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-red-100 text-red-600 rounded-full">
                                            !
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User section */}
                    <div className="p-4 border-t border-border">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-primary font-medium text-sm">
                                    {adminName.charAt(0)}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                    {adminName}
                                </p>
                                <p className="text-xs text-muted-foreground">Coordinator</p>
                            </div>
                            <button className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground">
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main className="lg:pl-64">{children}</main>
        </div>
    );
}
