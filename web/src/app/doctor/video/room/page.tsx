'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@apollo/client';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Clock, FileText } from 'lucide-react';
import { COMPLETE_VIDEO_SESSION } from '@/graphql/doctor-video';

// Spec: Phase 14 — Doctor in-call room page
// Shows during active video call with patient

const CALL_TYPES = [
    { value: 'VIDEO', label: 'Video Call' },
    { value: 'AUDIO_ONLY', label: 'Audio Only' },
    { value: 'PHONE_FALLBACK', label: 'Phone Fallback' },
];

interface ActiveSession {
    id: string;
    patientName: string;
    consultationId: string;
}

export default function DoctorVideoRoomPage() {
    const router = useRouter();
    const [session, setSession] = useState<ActiveSession | null>(null);
    const [callDuration, setCallDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [showCompleteForm, setShowCompleteForm] = useState(false);
    const [notes, setNotes] = useState('');
    const [callType, setCallType] = useState('VIDEO');

    // Load session info from sessionStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = sessionStorage.getItem('activeVideoSession');
            if (stored) {
                setSession(JSON.parse(stored));
            } else {
                router.push('/doctor/video/sessions');
            }
        }
    }, [router]);

    // Call duration timer
    useEffect(() => {
        const timer = setInterval(() => {
            setCallDuration((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const [completeSession, { loading: completing }] = useMutation(COMPLETE_VIDEO_SESSION, {
        onCompleted: () => {
            if (typeof window !== 'undefined') {
                sessionStorage.removeItem('activeVideoSession');
            }
            router.push('/doctor/video/sessions');
        },
        onError: (error) => {
            alert(`Error: ${error.message}`);
        },
    });

    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleEndCall = () => {
        setShowCompleteForm(true);
    };

    const handleComplete = () => {
        if (!session) return;
        completeSession({
            variables: { videoSessionId: session.id, notes, callType },
        });
    };

    const handleLeaveWithoutCompleting = () => {
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem('activeVideoSession');
        }
        router.push('/doctor/video/sessions');
    };

    if (!session) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-black">
                <div className="animate-pulse text-white">Loading...</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-black">
            {/* Video area */}
            <div className="flex-1 flex items-center justify-center relative">
                {/* Patient video placeholder */}
                <div className="text-center">
                    <div className="w-24 h-24 rounded-full bg-neutral-800 flex items-center justify-center mx-auto mb-4">
                        <span className="text-4xl">👤</span>
                    </div>
                    <p className="text-white text-lg font-medium">{session.patientName}</p>
                    <p className="text-neutral-400 text-sm mt-1">Video consultation in progress</p>
                </div>

                {/* Self-view PiP */}
                <div className="absolute top-4 right-4 w-28 h-36 bg-neutral-800 rounded-xl flex items-center justify-center border border-neutral-700">
                    <span className="text-neutral-500 text-xs">You</span>
                </div>

                {/* Duration badge */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 bg-black/60 rounded-full">
                    <Clock className="w-3.5 h-3.5 text-red-400" />
                    <span className="text-white text-sm font-mono">{formatDuration(callDuration)}</span>
                </div>
            </div>

            {/* Complete session form overlay */}
            {showCompleteForm && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                        <h2 className="text-lg font-semibold text-foreground mb-4">Complete Session</h2>

                        <textarea
                            placeholder="Session notes — key observations, diagnosis, plan..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm resize-none h-28 mb-3"
                        />

                        <div className="mb-4">
                            <label className="text-xs text-neutral-500 mb-1 block">Call Type</label>
                            <select
                                value={callType}
                                onChange={(e) => setCallType(e.target.value)}
                                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white"
                            >
                                {CALL_TYPES.map((ct) => (
                                    <option key={ct.value} value={ct.value}>{ct.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleComplete}
                                disabled={completing}
                                className="flex-1 py-2 bg-success text-white rounded-lg text-sm font-medium hover:bg-success/90 disabled:opacity-50"
                            >
                                {completing ? 'Saving...' : 'Save & Complete'}
                            </button>
                            <button
                                onClick={() => setShowCompleteForm(false)}
                                className="px-4 py-2 text-sm text-neutral-500 hover:text-foreground"
                            >
                                Back to Call
                            </button>
                        </div>

                        <button
                            onClick={handleLeaveWithoutCompleting}
                            className="w-full mt-3 py-2 text-xs text-neutral-400 hover:text-neutral-600"
                        >
                            Leave without completing (can complete later)
                        </button>
                    </div>
                </div>
            )}

            {/* Call controls */}
            <div className="flex items-center justify-center gap-4 py-6 pb-8 bg-gradient-to-t from-black/80 to-transparent">
                <button
                    onClick={() => setIsMuted(!isMuted)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                        isMuted ? 'bg-red-500/30' : 'bg-white/20'
                    }`}
                >
                    {isMuted ? (
                        <MicOff className="w-5 h-5 text-white" />
                    ) : (
                        <Mic className="w-5 h-5 text-white" />
                    )}
                </button>

                <button
                    onClick={() => setIsVideoOff(!isVideoOff)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                        isVideoOff ? 'bg-red-500/30' : 'bg-white/20'
                    }`}
                >
                    {isVideoOff ? (
                        <VideoOff className="w-5 h-5 text-white" />
                    ) : (
                        <Video className="w-5 h-5 text-white" />
                    )}
                </button>

                <button
                    onClick={() => setShowCompleteForm(true)}
                    className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center"
                    title="Session Notes"
                >
                    <FileText className="w-5 h-5 text-white" />
                </button>

                <button
                    onClick={handleEndCall}
                    className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors"
                >
                    <PhoneOff className="w-6 h-6 text-white" />
                </button>
            </div>
        </div>
    );
}
