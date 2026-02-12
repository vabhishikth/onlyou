'use client';

import { useQuery } from '@apollo/client';
import {
    FlaskConical,
    MapPin,
    Loader2,
    LogOut,
    Phone,
    Mail,
    User,
} from 'lucide-react';
import { LAB_INFO, LabInfoResponse } from '@/graphql/lab-portal';

// Spec: master spec Section 7.1 — Lab Portal
// Profile tab: lab info and logout

export default function LabProfilePage() {
    const { data, loading } = useQuery<LabInfoResponse>(LAB_INFO);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    const lab = data?.labInfo;

    return (
        <div className="p-4 max-w-lg mx-auto">
            {/* Lab info card */}
            <div className="card-premium p-6 mb-6">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center">
                        <FlaskConical className="w-8 h-8 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-foreground">
                            {lab?.name || 'Lab Portal'}
                        </h2>
                        <div className="flex items-center gap-1 text-muted-foreground mt-1">
                            <MapPin className="w-4 h-4" />
                            <span className="text-sm">{lab?.city || 'Unknown'}</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        <User className="w-5 h-5 text-muted-foreground" />
                        <div>
                            <p className="text-xs text-muted-foreground">Lab ID</p>
                            <p className="text-sm font-mono text-foreground">{lab?.id || '-'}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        <div
                            className={`w-3 h-3 rounded-full ${lab?.isActive ? 'bg-green-500' : 'bg-red-500'}`}
                        />
                        <div>
                            <p className="text-xs text-muted-foreground">Status</p>
                            <p className="text-sm font-medium text-foreground">
                                {lab?.isActive ? 'Active' : 'Inactive'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Support section */}
            <div className="card-premium p-4 mb-6">
                <h3 className="font-semibold text-foreground mb-4">Need Help?</h3>
                <div className="space-y-3">
                    <a
                        href="tel:+919876543210"
                        className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                    >
                        <Phone className="w-5 h-5 text-blue-600" />
                        <div>
                            <p className="text-sm font-medium text-foreground">Call Support</p>
                            <p className="text-xs text-muted-foreground">+91 98765 43210</p>
                        </div>
                    </a>
                    <a
                        href="mailto:lab-support@onlyou.life"
                        className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                    >
                        <Mail className="w-5 h-5 text-blue-600" />
                        <div>
                            <p className="text-sm font-medium text-foreground">Email Support</p>
                            <p className="text-xs text-muted-foreground">lab-support@onlyou.life</p>
                        </div>
                    </a>
                </div>
            </div>

            {/* Logout button */}
            <button className="w-full h-12 bg-red-50 text-red-600 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors">
                <LogOut className="w-5 h-5" />
                Logout
            </button>
        </div>
    );
}
