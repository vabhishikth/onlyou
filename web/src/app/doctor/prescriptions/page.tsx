'use client';

import { motion } from 'framer-motion';
import { Pill } from 'lucide-react';

// Spec: master spec Section 5.4 — Prescriptions List

export default function PrescriptionsPage() {
    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                    Prescriptions
                </h1>
                <p className="text-muted-foreground mt-1">
                    View and manage patient prescriptions.
                </p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="card-premium p-12 text-center"
            >
                <Pill className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-foreground mb-2">
                    Prescriptions List
                </h2>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                    All prescriptions created through case reviews will appear here.
                    Use the case queue to create new prescriptions.
                </p>
            </motion.div>
        </div>
    );
}
