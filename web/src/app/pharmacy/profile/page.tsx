'use client';

import { useQuery } from '@apollo/client';
import {
    Pill,
    MapPin,
    Loader2,
    LogOut,
    Phone,
    Mail,
} from 'lucide-react';
import { PHARMACY_INFO, PharmacyInfoResponse } from '@/graphql/pharmacy-portal';

// Spec: master spec Section 8.1 — Pharmacy Portal
// Profile tab: pharmacy info and logout

export default function PharmacyProfilePage() {
    const { data, loading } = useQuery<PharmacyInfoResponse>(PHARMACY_INFO);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            </div>
        );
    }

    const pharmacy = data?.pharmacyInfo;

    return (
        <div className="p-4 max-w-lg mx-auto">
            {/* Pharmacy info card */}
            <div className="card-premium p-6 mb-6">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center">
                        <Pill className="w-8 h-8 text-green-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-foreground">
                            {pharmacy?.name || 'Pharmacy Portal'}
                        </h2>
                        <div className="flex items-center gap-1 text-muted-foreground mt-1">
                            <MapPin className="w-4 h-4" />
                            <span className="text-sm">{pharmacy?.city || 'Unknown'}</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        <MapPin className="w-5 h-5 text-muted-foreground" />
                        <div>
                            <p className="text-xs text-muted-foreground">Address</p>
                            <p className="text-sm text-foreground">{pharmacy?.address || '-'}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        <div
                            className={`w-3 h-3 rounded-full ${pharmacy?.isActive ? 'bg-green-500' : 'bg-red-500'}`}
                        />
                        <div>
                            <p className="text-xs text-muted-foreground">Status</p>
                            <p className="text-sm font-medium text-foreground">
                                {pharmacy?.isActive ? 'Active' : 'Inactive'}
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
                        <Phone className="w-5 h-5 text-green-600" />
                        <div>
                            <p className="text-sm font-medium text-foreground">Call Support</p>
                            <p className="text-xs text-muted-foreground">+91 98765 43210</p>
                        </div>
                    </a>
                    <a
                        href="mailto:pharmacy-support@onlyou.life"
                        className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                    >
                        <Mail className="w-5 h-5 text-green-600" />
                        <div>
                            <p className="text-sm font-medium text-foreground">Email Support</p>
                            <p className="text-xs text-muted-foreground">pharmacy-support@onlyou.life</p>
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
