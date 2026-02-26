'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@apollo/client';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Clock, FileText, ChevronRight, ChevronLeft, Image as ImageIcon, AlertTriangle, X, WifiOff } from 'lucide-react';
import { COMPLETE_VIDEO_SESSION } from '@/graphql/doctor-video';
import { CASE_DETAIL } from '@/graphql/dashboard';
import {
    useHMSActions,
    useHMSStore,
    selectIsConnectedToRoom,
    selectPeers,
    selectIsLocalAudioEnabled,
    selectIsLocalVideoEnabled,
    selectVideoTrackByPeerID,
    HMSRoomProvider,
} from '@100mslive/react-sdk';

// Spec: Phase 14 — Doctor in-call room page with real 100ms video

const CALL_TYPES = [
    { value: 'VIDEO', label: 'Video Call' },
    { value: 'AUDIO_ONLY', label: 'Audio Only' },
    { value: 'PHONE_FALLBACK', label: 'Phone Fallback' },
];

interface ActiveSession {
    id: string;
    patientName: string;
    consultationId: string;
    hmsToken?: string;
    roomId?: string;
}

// Inner component that uses HMS hooks (must be inside HMSRoomProvider)
function VideoRoomInner() {
    const router = useRouter();
    const [session, setSession] = useState<ActiveSession | null>(null);
    const [callDuration, setCallDuration] = useState(0);
    const [showCompleteForm, setShowCompleteForm] = useState(false);
    const [notes, setNotes] = useState('');
    const [callType, setCallType] = useState('VIDEO');
    const [panelOpen, setPanelOpen] = useState(true);
    const [activeTab, setActiveTab] = useState<'questionnaire' | 'photos' | 'ai'>('questionnaire');
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    const [patientDisconnected, setPatientDisconnected] = useState(false);
    const [hadRemotePeer, setHadRemotePeer] = useState(false);
    const joinedRef = useRef(false);

    // 100ms hooks
    const hmsActions = useHMSActions();
    const isConnected = useHMSStore(selectIsConnectedToRoom);
    const peers = useHMSStore(selectPeers);
    const isAudioEnabled = useHMSStore(selectIsLocalAudioEnabled);
    const isVideoEnabled = useHMSStore(selectIsLocalVideoEnabled);
    const isMuted = !isAudioEnabled;
    const isVideoOff = !isVideoEnabled;

    // Find remote peer (patient)
    const remotePeer = peers.find((p) => !p.isLocal);
    const remoteVideoTrack = useHMSStore(selectVideoTrackByPeerID(remotePeer?.id));

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

    // Join HMS room when session has token
    useEffect(() => {
        if (session?.hmsToken && !joinedRef.current) {
            joinedRef.current = true;
            hmsActions.join({
                authToken: session.hmsToken,
                userName: 'Doctor',
                settings: { isAudioMuted: false, isVideoMuted: false },
            }).catch((err) => {
                console.error('HMS join error:', err);
            });
        }
    }, [session?.hmsToken, hmsActions]);

    // Leave HMS on unmount
    useEffect(() => {
        return () => {
            if (isConnected) {
                hmsActions.leave();
            }
        };
    }, [isConnected, hmsActions]);

    // Fetch case detail for questionnaire, photos, AI assessment
    const { data: caseData } = useQuery(CASE_DETAIL, {
        variables: { consultationId: session?.consultationId },
        skip: !session?.consultationId,
    });

    const caseDetail = caseData?.caseDetail;

    // Call duration timer
    useEffect(() => {
        let timer: ReturnType<typeof setInterval>;
        if (isConnected) {
            timer = setInterval(() => {
                setCallDuration((prev) => prev + 1);
            }, 1000);
        }
        return () => { if (timer) clearInterval(timer); };
    }, [isConnected]);

    // Spec: Task 3.1 — Patient disconnect detection
    useEffect(() => {
        if (isConnected && remotePeer) {
            setHadRemotePeer(true);
            setPatientDisconnected(false);
        } else if (isConnected && !remotePeer && hadRemotePeer) {
            setPatientDisconnected(true);
        }
    }, [isConnected, remotePeer, hadRemotePeer]);

    // Spec: Task 3.1 — Confirm before leaving (beforeunload)
    useEffect(() => {
        if (!isConnected) return;
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [isConnected]);

    // Max duration warning thresholds (seconds)
    const MAX_DURATION_WARNING = 40 * 60; // 40 minutes
    const MAX_DURATION_LIMIT = 45 * 60;   // 45 minutes

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

    const handleComplete = async () => {
        if (!session) return;
        await hmsActions.leave().catch(() => {});
        completeSession({
            variables: { videoSessionId: session.id, notes, callType },
        });
    };

    const handleLeaveWithoutCompleting = async () => {
        await hmsActions.leave().catch(() => {});
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem('activeVideoSession');
        }
        router.push('/doctor/video/sessions');
    };

    const toggleAudio = () => hmsActions.setLocalAudioEnabled(!isAudioEnabled);
    const toggleVideo = () => hmsActions.setLocalVideoEnabled(!isVideoEnabled);

    // Parse questionnaire responses
    const renderQuestionnaire = () => {
        if (!caseDetail?.questionnaire) {
            return <p className="text-neutral-400 text-sm">No questionnaire data available.</p>;
        }
        const { responses, template } = caseDetail.questionnaire;
        if (!responses || !template) {
            return <p className="text-neutral-400 text-sm">No questionnaire data available.</p>;
        }

        const sections = (template as any)?.sections || [];
        return (
            <div className="space-y-4">
                {sections.map((section: any, si: number) => (
                    <div key={si}>
                        <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                            {section.title}
                        </h4>
                        <div className="space-y-2">
                            {(section.questions || []).map((q: any) => {
                                const answer = (responses as Record<string, unknown>)[q.id];
                                if (!answer) return null;
                                const displayAnswer = Array.isArray(answer)
                                    ? answer.join(', ')
                                    : typeof answer === 'object'
                                        ? JSON.stringify(answer)
                                        : String(answer);
                                return (
                                    <div key={q.id} className="bg-white/5 rounded-lg px-3 py-2">
                                        <p className="text-xs text-neutral-400">{q.text || q.label || q.id}</p>
                                        <p className="text-sm text-white mt-0.5">{displayAnswer}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderPhotos = () => {
        const photos = caseDetail?.photos || [];
        if (photos.length === 0) {
            return <p className="text-neutral-400 text-sm">No photos uploaded.</p>;
        }
        return (
            <div className="grid grid-cols-2 gap-2">
                {photos.map((photo: any) => (
                    <button
                        key={photo.id}
                        onClick={() => setLightboxUrl(photo.url)}
                        className="relative rounded-lg overflow-hidden bg-neutral-800 aspect-square group"
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={photo.url}
                            alt={photo.type}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                            <span className="text-xs text-white">{photo.type}</span>
                        </div>
                    </button>
                ))}
            </div>
        );
    };

    const renderAiAssessment = () => {
        if (!caseDetail?.aiAssessment) {
            return <p className="text-neutral-400 text-sm">No AI assessment available.</p>;
        }
        const { summary, riskLevel, flags } = caseDetail.aiAssessment;
        return (
            <div className="space-y-3">
                {riskLevel && (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                        riskLevel === 'HIGH' ? 'bg-red-500/20' :
                        riskLevel === 'MEDIUM' ? 'bg-amber-500/20' : 'bg-emerald-500/20'
                    }`}>
                        <AlertTriangle className={`w-4 h-4 ${
                            riskLevel === 'HIGH' ? 'text-red-400' :
                            riskLevel === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400'
                        }`} />
                        <span className="text-sm text-white font-medium">Risk: {riskLevel}</span>
                    </div>
                )}
                {summary && (
                    <div className="bg-white/5 rounded-lg p-3">
                        <p className="text-xs text-neutral-400 mb-1">Summary</p>
                        <p className="text-sm text-white whitespace-pre-wrap">{summary}</p>
                    </div>
                )}
                {flags && flags.length > 0 && (
                    <div>
                        <p className="text-xs text-neutral-400 mb-1">Flags</p>
                        <div className="flex flex-wrap gap-1">
                            {flags.map((flag: string, i: number) => (
                                <span key={i} className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded text-xs">
                                    {flag}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    if (!session) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-black">
                <div className="animate-pulse text-white">Loading...</div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-black">
            {/* Main video area */}
            <div className={`flex-1 flex flex-col transition-all duration-300 ${panelOpen ? 'mr-80' : ''}`}>
                {/* Spec: Task 3.1 — Patient disconnected banner */}
                {patientDisconnected && (
                    <div className="bg-amber-500/90 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
                        <WifiOff className="w-4 h-4" />
                        Patient disconnected — waiting for reconnection...
                    </div>
                )}

                {/* Spec: Task 3.1 — Max duration warning */}
                {callDuration >= MAX_DURATION_WARNING && callDuration < MAX_DURATION_LIMIT && (
                    <div className="bg-amber-500/90 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Call has exceeded 40 minutes — please wrap up soon
                    </div>
                )}

                {/* Video area */}
                <div className="flex-1 flex items-center justify-center relative">
                    {/* Patient video — real or placeholder */}
                    {remotePeer && remoteVideoTrack?.enabled ? (
                        <video
                            ref={(el) => {
                                if (el && remoteVideoTrack?.id) {
                                    hmsActions.attachVideo(remoteVideoTrack.id, el);
                                }
                            }}
                            autoPlay
                            muted
                            playsInline
                            className="w-full h-full object-cover rounded-2xl"
                        />
                    ) : (
                        <div className="text-center">
                            <div className="w-24 h-24 rounded-full bg-neutral-800 flex items-center justify-center mx-auto mb-4">
                                <span className="text-4xl text-neutral-500">&#128100;</span>
                            </div>
                            <p className="text-white text-lg font-medium">{session.patientName}</p>
                            <p className="text-neutral-400 text-sm mt-1">
                                {!isConnected ? 'Connecting...' : remotePeer ? 'Camera off' : 'Waiting for patient...'}
                            </p>
                        </div>
                    )}

                    {/* Self-view PiP — real video */}
                    <div className="absolute top-4 right-4 w-32 h-40 bg-neutral-800 rounded-xl overflow-hidden border border-neutral-700">
                        {isVideoEnabled ? (
                            <video
                                ref={(el) => {
                                    if (el) {
                                        const localPeer = peers.find((p) => p.isLocal);
                                        if (localPeer) {
                                            const localTrack = localPeer.videoTrack;
                                            if (localTrack) {
                                                hmsActions.attachVideo(localTrack, el);
                                            }
                                        }
                                    }
                                }}
                                autoPlay
                                muted
                                playsInline
                                className="w-full h-full object-cover mirror"
                                style={{ transform: 'scaleX(-1)' }}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <span className="text-neutral-500 text-xs">Camera off</span>
                            </div>
                        )}
                    </div>

                    {/* Duration badge */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 bg-black/60 rounded-full">
                        <Clock className="w-3.5 h-3.5 text-red-400" />
                        <span className="text-white text-sm font-mono">{formatDuration(callDuration)}</span>
                    </div>

                    {/* Panel toggle */}
                    <button
                        onClick={() => setPanelOpen(!panelOpen)}
                        className="absolute top-1/2 -translate-y-1/2 right-0 w-6 h-12 bg-white/10 rounded-l-lg flex items-center justify-center hover:bg-white/20 transition-colors"
                    >
                        {panelOpen ? <ChevronRight className="w-4 h-4 text-white" /> : <ChevronLeft className="w-4 h-4 text-white" />}
                    </button>
                </div>

                {/* Call controls */}
                <div className="flex items-center justify-center gap-4 py-6 pb-8 bg-gradient-to-t from-black/80 to-transparent">
                    <button
                        onClick={toggleAudio}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                            isMuted ? 'bg-red-500/30' : 'bg-white/20'
                        }`}
                    >
                        {isMuted ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
                    </button>

                    <button
                        onClick={toggleVideo}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                            isVideoOff ? 'bg-red-500/30' : 'bg-white/20'
                        }`}
                    >
                        {isVideoOff ? <VideoOff className="w-5 h-5 text-white" /> : <Video className="w-5 h-5 text-white" />}
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

            {/* Case info side panel */}
            {panelOpen && (
                <div className="fixed right-0 top-0 bottom-0 w-80 bg-neutral-900 border-l border-neutral-800 flex flex-col z-20">
                    {/* Panel header */}
                    <div className="px-4 py-3 border-b border-neutral-800">
                        <h2 className="text-sm font-semibold text-white">Case Information</h2>
                        <p className="text-xs text-neutral-400 mt-0.5">{session.patientName}</p>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-neutral-800">
                        <button
                            onClick={() => setActiveTab('questionnaire')}
                            className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                                activeTab === 'questionnaire'
                                    ? 'text-white border-b-2 border-accent'
                                    : 'text-neutral-400 hover:text-neutral-200'
                            }`}
                        >
                            Responses
                        </button>
                        <button
                            onClick={() => setActiveTab('photos')}
                            className={`flex-1 px-3 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                                activeTab === 'photos'
                                    ? 'text-white border-b-2 border-accent'
                                    : 'text-neutral-400 hover:text-neutral-200'
                            }`}
                        >
                            <ImageIcon className="w-3 h-3" />
                            Photos
                        </button>
                        <button
                            onClick={() => setActiveTab('ai')}
                            className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                                activeTab === 'ai'
                                    ? 'text-white border-b-2 border-accent'
                                    : 'text-neutral-400 hover:text-neutral-200'
                            }`}
                        >
                            AI Assessment
                        </button>
                    </div>

                    {/* Tab content */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {activeTab === 'questionnaire' && renderQuestionnaire()}
                        {activeTab === 'photos' && renderPhotos()}
                        {activeTab === 'ai' && renderAiAssessment()}
                    </div>
                </div>
            )}

            {/* Complete session form overlay */}
            {showCompleteForm && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-30 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                        <h2 className="text-lg font-semibold text-foreground mb-4">Complete Session</h2>

                        <textarea
                            placeholder="Session notes &#8212; key observations, diagnosis, plan..."
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

            {/* Photo lightbox */}
            {lightboxUrl && (
                <div
                    className="fixed inset-0 bg-black/90 flex items-center justify-center z-40 p-4"
                    onClick={() => setLightboxUrl(null)}
                >
                    <button
                        onClick={() => setLightboxUrl(null)}
                        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={lightboxUrl}
                        alt="Patient photo"
                        className="max-w-full max-h-[80vh] rounded-lg object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
}

// Wrap in HMSRoomProvider for 100ms SDK context
export default function DoctorVideoRoomPage() {
    return (
        <HMSRoomProvider>
            <VideoRoomInner />
        </HMSRoomProvider>
    );
}
