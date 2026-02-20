'use client';

import { motion } from 'framer-motion';
import { MessageSquare } from 'lucide-react';

// Spec: master spec Section 5.5 — Doctor Messaging

export default function MessagesPage() {
    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                    Messages
                </h1>
                <p className="text-muted-foreground mt-1">
                    Patient conversations and follow-ups.
                </p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="card-premium p-12 text-center"
            >
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-foreground mb-2">
                    Message Center
                </h2>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                    Patient messages and consultation chats will appear here.
                    You can also message patients from within their case detail view.
                </p>
            </motion.div>
        </div>
    );
}
