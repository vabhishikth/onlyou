'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { motion } from 'framer-motion';
import { Search, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Input } from '@/components/ui';
import {
    DOCTOR_CONVERSATIONS,
    DoctorConversationsResponse,
} from '@/graphql/messaging';
import Link from 'next/link';

// Spec: master spec Section 5.5 — Doctor Messaging

const VERTICAL_LABELS: Record<string, string> = {
    HAIR_LOSS: 'Hair Loss',
    SEXUAL_HEALTH: 'Sexual Health',
    PCOS: 'PCOS',
    WEIGHT_MANAGEMENT: 'Weight',
};

export default function MessagesPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [showUnreadOnly, setShowUnreadOnly] = useState(false);

    const { data, loading } = useQuery<DoctorConversationsResponse>(
        DOCTOR_CONVERSATIONS,
        {
            fetchPolicy: 'cache-and-network',
        }
    );

    const conversations = data?.doctorConversations || [];

    const filtered = useMemo(() => {
        let items = conversations;

        if (showUnreadOnly) {
            items = items.filter((c) => c.unreadCount > 0);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            items = items.filter((c) =>
                (c.patientName || '').toLowerCase().includes(q)
            );
        }

        return items;
    }, [conversations, showUnreadOnly, searchQuery]);

    const truncateMessage = (msg: string | undefined, maxLen = 60): string => {
        if (!msg) return '';
        return msg.length > maxLen ? msg.slice(0, maxLen) + '...' : msg;
    };

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-2xl lg:text-3xl font-serif font-bold text-foreground">
                    Messages
                </h1>
                <p className="text-muted-foreground mt-1">
                    Patient conversations and follow-ups.
                </p>
            </motion.div>

            {/* Search and filters */}
            <div className="mb-6 space-y-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by patient name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowUnreadOnly(false)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            !showUnreadOnly
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setShowUnreadOnly(true)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            showUnreadOnly
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                    >
                        Unread
                    </button>
                </div>
            </div>

            {/* Loading state */}
            {loading && (
                <div data-testid="messages-loading" className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="card-premium p-5 animate-pulse">
                            <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                            <div className="h-3 bg-muted rounded w-2/3" />
                        </div>
                    ))}
                </div>
            )}

            {/* Empty state */}
            {!loading && filtered.length === 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card-premium p-12 text-center"
                >
                    <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h2 className="text-lg font-semibold text-foreground mb-2">
                        No Messages
                    </h2>
                    <p className="text-muted-foreground text-sm max-w-md mx-auto">
                        Patient messages and consultation chats will appear here.
                    </p>
                </motion.div>
            )}

            {/* Conversation cards */}
            {!loading && filtered.length > 0 && (
                <div className="space-y-3">
                    {filtered.map((conv) => (
                        <Link
                            key={conv.consultationId}
                            href={`/doctor/case/${conv.consultationId}`}
                        >
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="card-premium p-5 hover:shadow-md transition-shadow cursor-pointer"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`font-semibold truncate ${
                                                conv.unreadCount > 0 ? 'text-foreground' : 'text-muted-foreground'
                                            }`}>
                                                {conv.patientName || 'Unknown Patient'}
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                                                {VERTICAL_LABELS[conv.vertical] || conv.vertical}
                                            </span>
                                        </div>
                                        <p
                                            data-testid={`message-preview-${conv.consultationId}`}
                                            className={`text-sm truncate ${
                                                conv.unreadCount > 0 ? 'text-foreground' : 'text-muted-foreground'
                                            }`}
                                        >
                                            {conv.lastMessageIsFromDoctor && (
                                                <span className="text-muted-foreground">You: </span>
                                            )}
                                            {truncateMessage(conv.lastMessageContent)}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 ml-3 flex-shrink-0">
                                        {conv.lastMessageAt && (
                                            <span data-testid="message-time" className="text-xs text-muted-foreground">
                                                {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                                            </span>
                                        )}
                                        {conv.unreadCount > 0 && (
                                            <span
                                                data-testid="unread-badge"
                                                className="bg-primary text-primary-foreground text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center"
                                            >
                                                {conv.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
