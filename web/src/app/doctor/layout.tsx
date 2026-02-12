'use client';

import { AuthGuard } from '@/components/auth-guard';
import { DoctorSidebar } from './components/sidebar';

export default function DoctorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthGuard allowedRoles={['DOCTOR']}>
            <div className="min-h-screen bg-background">
                <DoctorSidebar />
                <main className="lg:pl-64">
                    <div className="min-h-screen">{children}</div>
                </main>
            </div>
        </AuthGuard>
    );
}
