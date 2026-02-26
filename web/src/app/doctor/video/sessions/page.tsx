'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Clock, AlertTriangle, CheckCircle, XCircle, PhoneCall, User } from 'lucide-react';
import {
    DOCTOR_VIDEO_SESSIONS,
    MARK_NO_SHOW,
    COMPLETE_VIDEO_SESSION,
    MARK_AWAITING_LABS,
    JOIN_VIDEO_SESSION,
} from '@/graphql/doctor-video';
import type {
    DoctorVideoSession,
    DoctorVideoSessionsResponse,
} from '@/graphql/doctor-video';

// Spec: Phase 13 — Doctor video session management (no-show, complete, awaiting labs)

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; pulse?: boolean }> = {
    SCHEDULED: { label: 'Scheduled', color: 'text-accent', bgColor: 'bg-accent/10' },
    WAITING_FOR_PATIENT: { label: 'Patient Joining...', color: 'text-amber-600', bgColor: 'bg-amber-50' },
    WAITING_FOR_DOCTOR: { label: 'Patient is waiting!', color: 'text-emerald-600', bgColor: 'bg-emerald-50', pulse: true },
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

// Join window: allow joining 2 minutes before scheduled time
const JOIN_WINDOW_MS = 2 * 60 * 1000;

function useCountdown(scheduledStart: string) {
    const [secondsLeft, setSecondsLeft] = useState<number>(() => {
        const diff = new Date(scheduledStart).getTime() - Date.now();
        return Math.floor(diff / 1000);
    });

    useEffect(() => {
        const timer = setInterval(() => {
            const diff = new Date(scheduledStart).getTime() - Date.now();
            setSecondsLeft(Math.floor(diff / 1000));
        }, 1000);
        return () => clearInterval(timer);
    }, [scheduledStart]);

    return secondsLeft;
}

function formatCountdown(seconds: number): string {
    if (seconds <= 0) return 'Now';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m >= 60) {
        const h = Math.floor(m / 60);
        const rm = m % 60;
        return `${h}h ${rm}m`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function SessionCard({
    session,
    onJoin,
    onNoShow,
    onComplete,
    onAwaitingLabs,
    joining,
    completingId,
    setCompletingId,
    notes,
    setNotes,
    callType,
    setCallType,
    handleComplete,
}: {
    session: DoctorVideoSession;
    onJoin: (s: DoctorVideoSession) => void;
    onNoShow: (id: string) => void;
    onComplete: (id: string) => void;
    onAwaitingLabs: (id: string) => void;
    joining: boolean;
    completingId: string | null;
    setCompletingId: (id: string | null) => void;
    notes: string;
    setNotes: (n: string) => void;
    callType: string;
    setCallType: (t: string) => void;
    handleComplete: (id: string) => void;
}) {
    const secondsLeft = useCountdown(session.scheduledStartTime);
    const statusConfig = STATUS_CONFIG[session.status] || STATUS_CONFIG.SCHEDULED;
    const canJoin = secondsLeft <= JOIN_WINDOW_MS / 1000;
    const isPatientWaiting = session.status === 'WAITING_FOR_PATIENT' || session.status === 'WAITING_FOR_DOCTOR';
    const isGracePassed = secondsLeft <= -5 * 60;
    const showNoShow = session.status === 'SCHEDULED' && isGracePassed;
    const showComplete = session.status === 'IN_PROGRESS';
    const isCompleting = completingId === session.id;

    const formatTime = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

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
                        {session.status === 'SCHEDULED' && secondsLeft > 0 && (
                            <span className={`text-xs font-medium ${canJoin ? 'text-emerald-600' : 'text-neutral-400'}`}>
                                ({formatCountdown(secondsLeft)})
                            </span>
                        )}
                    </div>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusConfig.color} ${statusConfig.bgColor} ${statusConfig.pulse ? 'animate-pulse' : ''}`}>
                    {statusConfig.label}
                </span>
            </div>

            {/* Patient waiting indicator */}
            {isPatientWaiting && (
                <div className="flex items-center gap-2 mt-2 px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-200">
                    <User className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                    <span className="text-xs font-medium text-emerald-700">
                        Patient is in the waiting room
                    </span>
                </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 mt-3">
                {(session.status === 'SCHEDULED' || isPatientWaiting) && (
                    <button
                        data-testid={`join-${session.id}`}
                        onClick={() => onJoin(session)}
                        disabled={joining || (!canJoin && !isPatientWaiting)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${
                            canJoin || isPatientWaiting
                                ? 'text-white bg-success hover:bg-success/90'
                                : 'text-neutral-400 bg-neutral-100 cursor-not-allowed'
                        }`}
                    >
                        <PhoneCall className="w-3.5 h-3.5" />
                        {isPatientWaiting ? 'Join Now' : canJoin ? 'Join Call' : 'Not Yet'}
                    </button>
                )}
                {showNoShow && (
                    <button
                        data-testid={`no-show-${session.id}`}
                        onClick={() => onNoShow(session.id)}
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
                        onClick={() => onAwaitingLabs(session.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-warning bg-warning/10 rounded-lg hover:bg-warning/20 transition-colors"
                    >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Awaiting Labs
                    </button>
                )}
            </div>

            {/* Consent warning */}
            {(session.status === 'SCHEDULED' || isPatientWaiting) && !session.recordingConsentGiven && (
                <p className="text-xs text-amber-600 mt-2">
                    Waiting for patient to give recording consent
                </p>
            )}

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
}

// Spec: Task 3.2 — Helper to check if a date is today
function isToday(isoString: string): boolean {
    const d = new Date(isoString);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate();
}

export default function VideoSessionsPage() {
    const router = useRouter();
    const [completingId, setCompletingId] = useState<string | null>(null);
    const [notes, setNotes] = useState('');
    const [callType, setCallType] = useState('VIDEO');
    const [showAllUpcoming, setShowAllUpcoming] = useState(false);

    const { data, loading, refetch } = useQuery<DoctorVideoSessionsResponse>(
        DOCTOR_VIDEO_SESSIONS,
        { pollInterval: 5000 }
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

    const [joinSession, { loading: joining }] = useMutation(JOIN_VIDEO_SESSION, {
        onCompleted: (result) => {
            refetch();
            // Store HMS token for the room page to use
            if (typeof window !== 'undefined') {
                const existing = sessionStorage.getItem('activeVideoSession');
                if (existing) {
                    const parsed = JSON.parse(existing);
                    parsed.hmsToken = result.joinVideoSession.token;
                    parsed.roomId = result.joinVideoSession.roomId;
                    sessionStorage.setItem('activeVideoSession', JSON.stringify(parsed));
                }
            }
            router.push(`/doctor/video/room?joined=true`);
        },
        onError: (error) => {
            alert(`Error: ${error.message}`);
        },
    });

    const handleJoin = async (session: DoctorVideoSession) => {
        if (!session.recordingConsentGiven) {
            alert('Waiting for the patient to give recording consent before you can join.');
            return;
        }
        // Store session ID for the room page
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('activeVideoSession', JSON.stringify({
                id: session.id,
                patientName: session.patientName,
                consultationId: session.consultationId,
            }));
        }
        joinSession({ variables: { videoSessionId: session.id } });
    };

    const allSessions = data?.doctorVideoSessions || [];

    // Spec: Task 3.2 — Filter: today's sessions by default, all upcoming on toggle
    const sessions = showAllUpcoming
        ? allSessions
        : allSessions.filter((s) => isToday(s.scheduledStartTime));

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
                {/* Spec: Task 3.2 — Today / All Upcoming toggle */}
                <div className="flex gap-2 mt-3">
                    <button
                        onClick={() => setShowAllUpcoming(false)}
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                            !showAllUpcoming
                                ? 'bg-accent text-white'
                                : 'bg-neutral-100 text-neutral-500 hover:text-neutral-700'
                        }`}
                    >
                        Today
                    </button>
                    <button
                        onClick={() => setShowAllUpcoming(true)}
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                            showAllUpcoming
                                ? 'bg-accent text-white'
                                : 'bg-neutral-100 text-neutral-500 hover:text-neutral-700'
                        }`}
                    >
                        All Upcoming
                    </button>
                </div>
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
                    {sessions.map((session) => (
                        <SessionCard
                            key={session.id}
                            session={session}
                            onJoin={handleJoin}
                            onNoShow={(id) => markNoShow({ variables: { videoSessionId: id } })}
                            onComplete={(id) => setCompletingId(id)}
                            onAwaitingLabs={(id) => markAwaitingLabs({ variables: { videoSessionId: id, labNotes: 'Blood work required before prescription' } })}
                            joining={joining}
                            completingId={completingId}
                            setCompletingId={setCompletingId}
                            notes={notes}
                            setNotes={setNotes}
                            callType={callType}
                            setCallType={setCallType}
                            handleComplete={handleComplete}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
