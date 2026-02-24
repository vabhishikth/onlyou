'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Clock, AlertTriangle, CheckCircle, XCircle, PhoneCall } from 'lucide-react';
import {
    DOCTOR_VIDEO_SESSIONS,
    MARK_NO_SHOW,
    COMPLETE_VIDEO_SESSION,
    MARK_AWAITING_LABS,
    JOIN_VIDEO_SESSION,
    GIVE_RECORDING_CONSENT,
} from '@/graphql/doctor-video';
import type {
    DoctorVideoSession,
    DoctorVideoSessionsResponse,
} from '@/graphql/doctor-video';

// Spec: Phase 13 — Doctor video session management (no-show, complete, awaiting labs)

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
    SCHEDULED: { label: 'Scheduled', color: 'text-accent', bgColor: 'bg-accent/10' },
    IN_PROGRESS: { label: 'In Progress', color: 'text-success', bgColor: 'bg-success/10' },
    COMPLETED: { label: 'Completed', color: 'text-neutral-500', bgColor: 'bg-neutral-100' },
    NO_SHOW: { label: 'No Show', color: 'text-destructive', bgColor: 'bg-destructive/10' },
    CANCELLED: { label: 'Cancelled', color: 'text-neutral-400', bgColor: 'bg-neutral-50' },
};

const CALL_TYPES = [
    { value: 'VIDEO', label: 'Video Call' },
    { value: 'AUDIO_ONLY', label: 'Audio Only' },
    { value: 'PHONE_FALLBACK', label: 'Phone Fallback' },
];

export default function VideoSessionsPage() {
    const [completingId, setCompletingId] = useState<string | null>(null);
    const [notes, setNotes] = useState('');
    const [callType, setCallType] = useState('VIDEO');

    const { data, loading, refetch } = useQuery<DoctorVideoSessionsResponse>(
        DOCTOR_VIDEO_SESSIONS,
        { pollInterval: 30000 }
    );

    const [markNoShow] = useMutation(MARK_NO_SHOW, {
        onCompleted: () => refetch(),
    });

    const [completeSession] = useMutation(COMPLETE_VIDEO_SESSION, {
        onCompleted: () => {
            setCompletingId(null);
            setNotes('');
            setCallType('VIDEO');
            refetch();
        },
    });

    const [markAwaitingLabs] = useMutation(MARK_AWAITING_LABS, {
        onCompleted: () => refetch(),
    });

    const [giveConsent] = useMutation(GIVE_RECORDING_CONSENT, {
        onCompleted: () => refetch(),
    });

    const [joinSession, { loading: joining }] = useMutation(JOIN_VIDEO_SESSION, {
        onCompleted: (result) => {
            const { roomId } = result.joinVideoSession;
            // For now, show connection info — full 100ms web UI will come later
            alert(`Connected! Room: ${roomId}\n\nVideo call is active. Use the mobile app or 100ms dashboard to join.`);
            refetch();
        },
        onError: (error) => {
            if (error.message.includes('Recording consent')) {
                // Auto-give consent for doctor and retry
                alert('Recording consent is required. Granting consent...');
            } else {
                alert(`Error: ${error.message}`);
            }
        },
    });

    const handleJoin = async (session: DoctorVideoSession) => {
        if (!session.recordingConsentGiven) {
            await giveConsent({ variables: { videoSessionId: session.id } });
            // After consent, join
            joinSession({ variables: { videoSessionId: session.id } });
        } else {
            joinSession({ variables: { videoSessionId: session.id } });
        }
    };

    const sessions = data?.doctorVideoSessions || [];

    const isGracePeriodPassed = (scheduledStart: string) => {
        const start = new Date(scheduledStart);
        const graceEnd = new Date(start.getTime() + 5 * 60 * 1000);
        return new Date() >= graceEnd;
    };

    const formatTime = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const handleComplete = (sessionId: string) => {
        completeSession({
            variables: { videoSessionId: sessionId, notes, callType },
        });
    };

    if (loading) {
        return (
            <div data-testid="sessions-loading" className="p-6 space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
                ))}
            </div>
        );
    }

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-serif font-bold text-foreground">
                    Video Sessions
                </h1>
                <p className="text-sm text-neutral-500 mt-1">
                    Manage today&apos;s and upcoming video consultations
                </p>
            </div>

            {sessions.length === 0 ? (
                <div className="text-center py-16">
                    <Video className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                    <p className="text-neutral-500">No video sessions</p>
                    <p className="text-sm text-neutral-400 mt-1">
                        Sessions will appear here when patients book consultations
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {sessions.map((session) => {
                        const statusConfig = STATUS_CONFIG[session.status] || STATUS_CONFIG.SCHEDULED;
                        const showNoShow =
                            session.status === 'SCHEDULED' &&
                            isGracePeriodPassed(session.scheduledStartTime);
                        const showComplete = session.status === 'IN_PROGRESS';
                        const isCompleting = completingId === session.id;

                        return (
                            <motion.div
                                key={session.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white border border-border rounded-xl p-4"
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="text-sm font-semibold text-foreground">
                                            {session.patientName}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Clock className="w-3.5 h-3.5 text-neutral-400" />
                                            <span className="text-xs text-neutral-500">
                                                {formatTime(session.scheduledStartTime)} — {formatTime(session.scheduledEndTime)}
                                            </span>
                                        </div>
                                    </div>
                                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusConfig.color} ${statusConfig.bgColor}`}>
                                        {statusConfig.label}
                                    </span>
                                </div>

                                {/* Action buttons */}
                                <div className="flex gap-2 mt-3">
                                    {session.status === 'SCHEDULED' && (
                                        <button
                                            data-testid={`join-${session.id}`}
                                            onClick={() => handleJoin(session)}
                                            disabled={joining}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-success rounded-lg hover:bg-success/90 transition-colors disabled:opacity-50"
                                        >
                                            <PhoneCall className="w-3.5 h-3.5" />
                                            Join Call
                                        </button>
                                    )}
                                    {showNoShow && (
                                        <button
                                            data-testid={`no-show-${session.id}`}
                                            onClick={() => markNoShow({ variables: { videoSessionId: session.id } })}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-destructive bg-destructive/10 rounded-lg hover:bg-destructive/20 transition-colors"
                                        >
                                            <XCircle className="w-3.5 h-3.5" />
                                            Mark No-Show
                                        </button>
                                    )}
                                    {showComplete && !isCompleting && (
                                        <button
                                            data-testid={`complete-${session.id}`}
                                            onClick={() => setCompletingId(session.id)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-success bg-success/10 rounded-lg hover:bg-success/20 transition-colors"
                                        >
                                            <CheckCircle className="w-3.5 h-3.5" />
                                            Complete Session
                                        </button>
                                    )}
                                    {showComplete && (
                                        <button
                                            data-testid={`awaiting-labs-${session.id}`}
                                            onClick={() =>
                                                markAwaitingLabs({
                                                    variables: {
                                                        videoSessionId: session.id,
                                                        labNotes: 'Blood work required before prescription',
                                                    },
                                                })
                                            }
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-warning bg-warning/10 rounded-lg hover:bg-warning/20 transition-colors"
                                        >
                                            <AlertTriangle className="w-3.5 h-3.5" />
                                            Awaiting Labs
                                        </button>
                                    )}
                                </div>

                                {/* Complete session form */}
                                <AnimatePresence>
                                    {isCompleting && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="mt-3 pt-3 border-t border-border"
                                        >
                                            <textarea
                                                data-testid="session-notes-input"
                                                placeholder="Session notes..."
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                className="w-full px-3 py-2 border border-border rounded-lg text-sm resize-none h-20"
                                            />
                                            <div className="flex items-center gap-3 mt-2">
                                                <select
                                                    data-testid="call-type-select"
                                                    value={callType}
                                                    onChange={(e) => setCallType(e.target.value)}
                                                    className="px-3 py-2 border border-border rounded-lg text-sm bg-white"
                                                >
                                                    {CALL_TYPES.map((ct) => (
                                                        <option key={ct.value} value={ct.value}>
                                                            {ct.label}
                                                        </option>
                                                    ))}
                                                </select>
                                                <button
                                                    onClick={() => handleComplete(session.id)}
                                                    className="px-4 py-2 bg-success text-white rounded-lg text-sm font-medium hover:bg-success/90 transition-colors"
                                                >
                                                    Save & Complete
                                                </button>
                                                <button
                                                    onClick={() => setCompletingId(null)}
                                                    className="px-3 py-2 text-sm text-neutral-500 hover:text-foreground transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
