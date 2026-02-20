'use client';

import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';

// Spec: master spec Section 5.4 — Prescription Templates

export default function TemplatesPage() {
    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-2xl lg:text-3xl font-serif font-bold text-foreground">
                    Templates
                </h1>
                <p className="text-muted-foreground mt-1">
                    Manage prescription and message templates.
                </p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="card-premium p-12 text-center"
            >
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-foreground mb-2">
                    Template Library
                </h2>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                    Prescription templates and canned responses for quick access.
                    Templates are auto-suggested when creating prescriptions.
                </p>
            </motion.div>
        </div>
    );
}
