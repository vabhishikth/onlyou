'use client';

import { motion } from 'framer-motion';
import { TestTube } from 'lucide-react';

// Spec: master spec Section 7 — Blood Work & Diagnostics

export default function LabOrdersPage() {
    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-2xl lg:text-3xl font-serif font-bold text-foreground">
                    Lab Orders
                </h1>
                <p className="text-muted-foreground mt-1">
                    Track blood work and diagnostic orders.
                </p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="card-premium p-12 text-center"
            >
                <TestTube className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-foreground mb-2">
                    Lab Orders List
                </h2>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                    All lab orders and blood work requests will appear here.
                    Use the case queue to order new blood work for patients.
                </p>
            </motion.div>
        </div>
    );
}
