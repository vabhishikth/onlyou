'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { gql } from '@apollo/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    User,
    Calendar,
    MapPin,
    Phone,
    AlertTriangle,
    CheckCircle,
    XCircle,
    MessageSquare,
    Image as ImageIcon,
    FileText,
    Send,
    Pill,
    ChevronDown,
    ChevronUp,
    Clock,
    Flag,
    FlaskConical,
    Activity,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import {
    CASE_DETAIL,
    CaseDetailResponse,
    VERTICAL_CONFIG,
    ATTENTION_LEVEL_CONFIG,
    HealthVertical,
} from '@/graphql/dashboard';
import { ConditionSpecificPanel, QuickActions } from '@/components/doctor/condition-panels';

// Spec: master spec Section 5.2 — Case Review

// Mutation to update consultation status
const UPDATE_CONSULTATION_STATUS = gql`
    mutation UpdateConsultationStatus(
        $consultationId: String!
        $status: String!
        $doctorNotes: String
        $rejectionReason: String
    ) {
        updateConsultationStatus(
            consultationId: $consultationId
            status: $status
            doctorNotes: $doctorNotes
            rejectionReason: $rejectionReason
        ) {
            id
            status
        }
    }
`;

// Send message mutation
const SEND_MESSAGE = gql`
    mutation SendMessage($consultationId: String!, $content: String!) {
        sendMessage(consultationId: $consultationId, content: $content) {
            id
            content
            senderId
            createdAt
        }
    }
`;

type TabType = 'overview' | 'questionnaire' | 'photos' | 'messages' | 'prescription';

export default function CaseDetailPage() {
    const params = useParams();
    const consultationId = params.id as string;
    const { user: currentUser } = useAuth();

    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [messageInput, setMessageInput] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    const { data, loading, error, refetch } = useQuery<CaseDetailResponse>(CASE_DETAIL, {
        variables: { consultationId },
        fetchPolicy: 'cache-and-network',
    });

    const [updateStatus, { loading: updating }] = useMutation(UPDATE_CONSULTATION_STATUS, {
        onCompleted: () => refetch(),
    });

    const [sendMessage, { loading: sending }] = useMutation(SEND_MESSAGE, {
        onCompleted: () => {
            setMessageInput('');
            refetch();
        },
    });

    const handleStartReview = async () => {
        await updateStatus({
            variables: {
                consultationId,
                status: 'DOCTOR_REVIEWING',
            },
        });
    };

    const handleNeedsInfo = async () => {
        await updateStatus({
            variables: {
                consultationId,
                status: 'NEEDS_INFO',
            },
        });
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) return;
        await updateStatus({
            variables: {
                consultationId,
                status: 'REJECTED',
                rejectionReason: rejectReason,
            },
        });
        setShowRejectModal(false);
        setRejectReason('');
    };

    const handleSendMessage = async () => {
        if (!messageInput.trim()) return;
        await sendMessage({
            variables: {
                consultationId,
                content: messageInput,
            },
        });
    };

    if (loading && !data) {
        return (
            <div className="p-6 lg:p-8">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 w-48 bg-muted rounded" />
                    <div className="h-64 bg-muted rounded-xl" />
                    <div className="h-96 bg-muted rounded-xl" />
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="p-6 lg:p-8">
                <div className="card-premium p-8 text-center">
                    <p className="text-error">Failed to load case details.</p>
                    <p className="text-muted-foreground text-sm mt-2">
                        {error?.message || 'Unknown error'}
                    </p>
                    <Link href="/doctor/queue">
                        <Button variant="outline" className="mt-4">
                            Back to Queue
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    const { consultation, patient, questionnaire, aiAssessment, photos, messages, prescription, labOrders } =
        data.caseDetail;

    const verticalConfig = VERTICAL_CONFIG[consultation.vertical as HealthVertical];
    const attentionConfig = aiAssessment?.riskLevel
        ? ATTENTION_LEVEL_CONFIG[aiAssessment.riskLevel]
        : null;

    const tabs: { id: TabType; label: string; icon: React.ReactNode; count?: number }[] = [
        { id: 'overview', label: 'Overview', icon: <FileText className="w-4 h-4" /> },
        { id: 'questionnaire', label: 'Questionnaire', icon: <FileText className="w-4 h-4" /> },
        { id: 'photos', label: 'Photos', icon: <ImageIcon className="w-4 h-4" />, count: photos.length },
        { id: 'messages', label: 'Messages', icon: <MessageSquare className="w-4 h-4" />, count: messages.length },
        { id: 'prescription', label: 'Prescription', icon: <Pill className="w-4 h-4" /> },
    ];

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-card border-b border-border">
                <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link
                                href="/doctor/queue"
                                className="p-2 hover:bg-muted rounded-lg transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-lg lg:text-xl font-semibold text-foreground">
                                        {patient.name || 'Patient'}
                                    </h1>
                                    <span
                                        className={cn(
                                            'px-2 py-0.5 rounded-lg text-xs font-medium',
                                            verticalConfig.bgColor,
                                            verticalConfig.color
                                        )}
                                    >
                                        {verticalConfig.label}
                                    </span>
                                    {attentionConfig && aiAssessment?.riskLevel !== 'LOW' && (
                                        <span
                                            className={cn(
                                                'px-2 py-0.5 rounded-lg text-xs font-medium',
                                                attentionConfig.bgColor,
                                                attentionConfig.color
                                            )}
                                        >
                                            {attentionConfig.label} Priority
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Case #{consultation.id.slice(-8)} • Submitted{' '}
                                    {formatDistanceToNow(new Date(consultation.createdAt), {
                                        addSuffix: true,
                                    })}
                                </p>
                            </div>
                        </div>

                        {/* Action buttons */}
                        {consultation.status === 'AI_REVIEWED' && (
                            <div className="hidden lg:flex items-center gap-2">
                                <Button onClick={handleStartReview} disabled={updating}>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Start Review
                                </Button>
                            </div>
                        )}
                        {consultation.status === 'DOCTOR_REVIEWING' && (
                            <div className="hidden lg:flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    onClick={handleNeedsInfo}
                                    disabled={updating}
                                >
                                    <MessageSquare className="w-4 h-4 mr-2" />
                                    Request Info
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setShowRejectModal(true)}
                                    disabled={updating}
                                    className="text-error border-error/30 hover:bg-error/10"
                                >
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Reject
                                </Button>
                                <Link href={`/doctor/case/${consultationId}/prescribe`}>
                                    <Button disabled={updating}>
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Create Prescription
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 mt-4 overflow-x-auto pb-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                                    activeTab === tab.id
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:bg-muted'
                                )}
                            >
                                {tab.icon}
                                {tab.label}
                                {tab.count !== undefined && tab.count > 0 && (
                                    <span
                                        className={cn(
                                            'px-1.5 py-0.5 rounded-full text-xs',
                                            activeTab === tab.id
                                                ? 'bg-white/20'
                                                : 'bg-muted-foreground/20'
                                        )}
                                    >
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
                <AnimatePresence mode="wait">
                    {activeTab === 'overview' && (
                        <OverviewTab
                            key="overview"
                            patient={patient}
                            consultation={consultation}
                            aiAssessment={aiAssessment}
                            questionnaire={questionnaire}
                            consultationId={consultationId}
                            labOrders={labOrders}
                            prescription={prescription}
                            messageCount={messages.length}
                        />
                    )}
                    {activeTab === 'questionnaire' && (
                        <QuestionnaireTab key="questionnaire" questionnaire={questionnaire} />
                    )}
                    {activeTab === 'photos' && <PhotosTab key="photos" photos={photos} />}
                    {activeTab === 'messages' && (
                        <MessagesTab
                            key="messages"
                            messages={messages}
                            messageInput={messageInput}
                            setMessageInput={setMessageInput}
                            onSend={handleSendMessage}
                            sending={sending}
                            currentUserId={currentUser?.id}
                        />
                    )}
                    {activeTab === 'prescription' && (
                        <PrescriptionTab
                            key="prescription"
                            prescription={prescription}
                            consultationId={consultationId}
                        />
                    )}
                </AnimatePresence>
            </main>

            {/* Mobile action bar */}
            {consultation.status === 'AI_REVIEWED' && (
                <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 z-30">
                    <Button className="w-full" onClick={handleStartReview} disabled={updating}>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Start Review
                    </Button>
                </div>
            )}
            {consultation.status === 'DOCTOR_REVIEWING' && (
                <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 z-30">
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleNeedsInfo}
                            disabled={updating}
                            className="flex-1"
                        >
                            Request Info
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowRejectModal(true)}
                            disabled={updating}
                            className="text-error border-error/30"
                        >
                            Reject
                        </Button>
                        <Link href={`/doctor/case/${consultationId}/prescribe`} className="flex-1">
                            <Button size="sm" className="w-full" disabled={updating}>
                                Prescribe
                            </Button>
                        </Link>
                    </div>
                </div>
            )}

            {/* Reject modal */}
            <AnimatePresence>
                {showRejectModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                        onClick={() => setShowRejectModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            className="bg-card rounded-2xl p-6 max-w-md w-full shadow-xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-lg font-semibold text-foreground mb-2">
                                Reject Case
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Please provide a reason for rejection. This will be shared with
                                the patient.
                            </p>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Enter rejection reason..."
                                className="w-full h-32 px-4 py-3 rounded-xl border border-border bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                            <div className="flex gap-2 mt-4">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setShowRejectModal(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="flex-1 bg-error hover:bg-error/90"
                                    onClick={handleReject}
                                    disabled={!rejectReason.trim() || updating}
                                >
                                    Confirm Reject
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Overview Tab
function OverviewTab({
    patient,
    consultation,
    aiAssessment,
    questionnaire,
    consultationId,
    labOrders,
    prescription,
    messageCount,
}: {
    patient: CaseDetailResponse['caseDetail']['patient'];
    consultation: CaseDetailResponse['caseDetail']['consultation'];
    aiAssessment: CaseDetailResponse['caseDetail']['aiAssessment'];
    questionnaire: CaseDetailResponse['caseDetail']['questionnaire'];
    consultationId: string;
    labOrders: CaseDetailResponse['caseDetail']['labOrders'];
    prescription: CaseDetailResponse['caseDetail']['prescription'];
    messageCount: number;
}) {
    const [aiExpanded, setAiExpanded] = useState(true);

    // Parse questionnaire responses for condition-specific panel
    const responses = questionnaire?.responses
        ? (typeof questionnaire.responses === 'string'
            ? JSON.parse(questionnaire.responses)
            : questionnaire.responses)
        : {};

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
            {/* Patient info */}
            <div className="card-premium p-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Patient Information
                </h3>
                <div className="space-y-4">
                    <div>
                        <p className="text-lg font-semibold text-foreground">
                            {patient.name || 'Unknown'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {[patient.age && `${patient.age} years old`, patient.sex]
                                .filter(Boolean)
                                .join(' • ')}
                        </p>
                    </div>
                    {patient.city && (
                        <div className="flex items-center gap-2 text-sm">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span className="text-foreground">{patient.city}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span className="text-foreground">{patient.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-foreground">
                            Submitted {format(new Date(consultation.createdAt), 'MMM d, yyyy')}
                        </span>
                    </div>
                </div>
            </div>

            {/* AI Assessment */}
            <div className="lg:col-span-2">
                <div className="card-premium overflow-hidden">
                    <button
                        onClick={() => setAiExpanded(!aiExpanded)}
                        className="w-full p-6 flex items-center justify-between hover:bg-muted/50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-primary/10">
                                <Flag className="w-5 h-5 text-primary" />
                            </div>
                            <div className="text-left">
                                <h3 className="font-semibold text-foreground">
                                    AI Pre-Assessment
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    {aiAssessment
                                        ? `${aiAssessment.riskLevel} priority • ${aiAssessment.flags.length} flags`
                                        : 'Not available'}
                                </p>
                            </div>
                        </div>
                        {aiExpanded ? (
                            <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                    </button>

                    <AnimatePresence>
                        {aiExpanded && aiAssessment && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="p-6 pt-0 space-y-4">
                                    {/* Summary */}
                                    <div>
                                        <h4 className="text-sm font-medium text-muted-foreground mb-2">
                                            Summary
                                        </h4>
                                        <p className="text-foreground">{aiAssessment.summary}</p>
                                    </div>

                                    {/* Flags */}
                                    {aiAssessment.flags.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-medium text-muted-foreground mb-2">
                                                Key Flags
                                            </h4>
                                            <div className="space-y-2">
                                                {aiAssessment.flags.map((flag, i) => (
                                                    <div
                                                        key={i}
                                                        className="flex items-start gap-2 p-3 rounded-xl bg-warning/10"
                                                    >
                                                        <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                                                        <span className="text-sm text-foreground">
                                                            {flag}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Condition-specific panel */}
            <div className="lg:col-span-2">
                <ConditionSpecificPanel
                    vertical={consultation.vertical as HealthVertical}
                    responses={responses}
                />
            </div>

            {/* Quick Actions */}
            <div className="lg:col-span-1">
                <QuickActions
                    consultationId={consultationId}
                    vertical={consultation.vertical as HealthVertical}
                    status={consultation.status}
                />
            </div>

            {/* Case Progress */}
            <div className="lg:col-span-3">
                <div className="card-premium p-6">
                    <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        Case Progress
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Blood Work */}
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                            <FlaskConical className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-foreground">Blood Work</p>
                                {labOrders.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">No orders yet</p>
                                ) : (
                                    labOrders.map((lo) => (
                                        <div key={lo.id} className="mt-1">
                                            <p className="text-xs text-foreground">{lo.panelName || 'Custom Panel'}</p>
                                            <span className={cn(
                                                'inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium',
                                                lo.status === 'ORDERED' && 'bg-warm/10 text-warm',
                                                lo.status === 'RESULTS_UPLOADED' && 'bg-success/10 text-success',
                                                lo.status === 'DOCTOR_REVIEWED' && 'bg-primary/10 text-primary',
                                                !['ORDERED', 'RESULTS_UPLOADED', 'DOCTOR_REVIEWED'].includes(lo.status) && 'bg-accent/10 text-accent',
                                            )}>
                                                {lo.status.replace(/_/g, ' ')}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Prescription */}
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                            <Pill className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-foreground">Prescription</p>
                                {prescription ? (
                                    <p className="text-xs text-success">Prescribed</p>
                                ) : (
                                    <p className="text-xs text-muted-foreground">Not prescribed</p>
                                )}
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                            <MessageSquare className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-foreground">Messages</p>
                                <p className="text-xs text-muted-foreground">
                                    {messageCount === 0 ? 'No messages' : `${messageCount} message${messageCount !== 1 ? 's' : ''}`}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Status timeline */}
            <div className="lg:col-span-3">
                <div className="card-premium p-6">
                    <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Status
                    </h3>
                    <div className="flex items-center gap-4">
                        <StatusStep
                            label="Submitted"
                            completed={true}
                            active={consultation.status === 'PENDING_ASSESSMENT'}
                        />
                        <StatusLine completed={consultation.status !== 'PENDING_ASSESSMENT'} />
                        <StatusStep
                            label="AI Reviewed"
                            completed={['AI_REVIEWED', 'DOCTOR_REVIEWING', 'APPROVED', 'REJECTED', 'NEEDS_INFO'].includes(consultation.status)}
                            active={consultation.status === 'AI_REVIEWED'}
                        />
                        <StatusLine completed={['DOCTOR_REVIEWING', 'APPROVED', 'REJECTED', 'NEEDS_INFO'].includes(consultation.status)} />
                        <StatusStep
                            label="Doctor Review"
                            completed={['APPROVED', 'REJECTED'].includes(consultation.status)}
                            active={['DOCTOR_REVIEWING', 'NEEDS_INFO'].includes(consultation.status)}
                        />
                        <StatusLine completed={['APPROVED', 'REJECTED'].includes(consultation.status)} />
                        <StatusStep
                            label={consultation.status === 'REJECTED' ? 'Rejected' : 'Approved'}
                            completed={['APPROVED', 'REJECTED'].includes(consultation.status)}
                            active={false}
                            error={consultation.status === 'REJECTED'}
                        />
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function StatusStep({
    label,
    completed,
    active,
    error = false,
}: {
    label: string;
    completed: boolean;
    active: boolean;
    error?: boolean;
}) {
    return (
        <div className="flex flex-col items-center gap-2">
            <div
                className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center',
                    error
                        ? 'bg-error text-white'
                        : completed
                        ? 'bg-primary text-white'
                        : active
                        ? 'bg-primary/20 text-primary border-2 border-primary'
                        : 'bg-muted text-muted-foreground'
                )}
            >
                {error ? (
                    <XCircle className="w-4 h-4" />
                ) : completed ? (
                    <CheckCircle className="w-4 h-4" />
                ) : (
                    <span className="text-xs font-medium">•</span>
                )}
            </div>
            <span className={cn('text-xs font-medium', active ? 'text-primary' : 'text-muted-foreground')}>
                {label}
            </span>
        </div>
    );
}

function StatusLine({ completed }: { completed: boolean }) {
    return (
        <div
            className={cn(
                'flex-1 h-0.5 rounded-full',
                completed ? 'bg-primary' : 'bg-border'
            )}
        />
    );
}

// Questionnaire Tab
function QuestionnaireTab({
    questionnaire,
}: {
    questionnaire: CaseDetailResponse['caseDetail']['questionnaire'];
}) {
    const responses = questionnaire.responses as Record<string, unknown>;
    const template = questionnaire.template as { questions?: Array<{ id: string; text: string; type: string }> };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="card-premium p-6"
        >
            <h3 className="font-semibold text-foreground mb-6">Questionnaire Responses</h3>

            <div className="space-y-6">
                {template.questions?.map((question, index) => {
                    const answer = responses[question.id];
                    return (
                        <div key={question.id} className="border-b border-border pb-4 last:border-0">
                            <p className="text-sm text-muted-foreground mb-1">
                                Question {index + 1}
                            </p>
                            <p className="font-medium text-foreground mb-2">{question.text}</p>
                            <p className="text-foreground bg-muted px-4 py-3 rounded-xl">
                                {typeof answer === 'string'
                                    ? answer
                                    : typeof answer === 'boolean'
                                    ? answer
                                        ? 'Yes'
                                        : 'No'
                                    : Array.isArray(answer)
                                    ? (answer as string[]).join(', ')
                                    : JSON.stringify(answer)}
                            </p>
                        </div>
                    );
                }) || (
                    <p className="text-muted-foreground">No questionnaire data available.</p>
                )}
            </div>
        </motion.div>
    );
}

// Photos Tab
function PhotosTab({ photos }: { photos: CaseDetailResponse['caseDetail']['photos'] }) {
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
        >
            {photos.length === 0 ? (
                <div className="card-premium p-8 text-center">
                    <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No photos uploaded for this case.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {photos.map((photo) => (
                        <button
                            key={photo.id}
                            onClick={() => setSelectedPhoto(photo.url)}
                            className="aspect-square rounded-xl overflow-hidden bg-muted hover:ring-2 hover:ring-primary transition-all"
                        >
                            <img
                                src={photo.url}
                                alt={photo.type}
                                className="w-full h-full object-cover"
                            />
                        </button>
                    ))}
                </div>
            )}

            {/* Photo lightbox */}
            <AnimatePresence>
                {selectedPhoto && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
                        onClick={() => setSelectedPhoto(null)}
                    >
                        <motion.img
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            src={selectedPhoto}
                            alt="Photo"
                            className="max-w-full max-h-full rounded-xl"
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// Messages Tab
function MessagesTab({
    messages,
    messageInput,
    setMessageInput,
    onSend,
    sending,
    currentUserId,
}: {
    messages: CaseDetailResponse['caseDetail']['messages'];
    messageInput: string;
    setMessageInput: (value: string) => void;
    onSend: () => void;
    sending: boolean;
    currentUserId?: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="card-premium flex flex-col"
            style={{ height: 'calc(100vh - 300px)', minHeight: '400px' }}
        >
            {/* Messages list */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                        No messages yet. Start the conversation.
                    </p>
                ) : (
                    messages.map((message) => {
                        const isOwnMessage = currentUserId ? message.senderId === currentUserId : false;
                        return (
                        <div
                            key={message.id}
                            className={cn(
                                'max-w-[80%] p-4 rounded-xl',
                                isOwnMessage
                                    ? 'ml-auto bg-primary text-primary-foreground'
                                    : 'bg-muted text-foreground'
                            )}
                        >
                            <p>{message.content}</p>
                            <p
                                className={cn(
                                    'text-xs mt-2',
                                    isOwnMessage
                                        ? 'text-primary-foreground/70'
                                        : 'text-muted-foreground'
                                )}
                            >
                                {formatDistanceToNow(new Date(message.createdAt), {
                                    addSuffix: true,
                                })}
                            </p>
                        </div>
                        );
                    })
                )}
            </div>

            {/* Message input */}
            <div className="p-4 border-t border-border">
                <div className="flex gap-2">
                    <Input
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        placeholder="Type a message..."
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && onSend()}
                        disabled={sending}
                    />
                    <Button onClick={onSend} disabled={!messageInput.trim() || sending}>
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </motion.div>
    );
}

// Prescription Tab
function PrescriptionTab({
    prescription,
    consultationId,
}: {
    prescription: CaseDetailResponse['caseDetail']['prescription'];
    consultationId: string;
}) {
    if (!prescription) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="card-premium p-8 text-center"
            >
                <Pill className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                    No prescription created yet.
                </p>
                <Link href={`/doctor/case/${consultationId}/prescribe`}>
                    <Button>
                        <Pill className="w-4 h-4 mr-2" />
                        Create Prescription
                    </Button>
                </Link>
            </motion.div>
        );
    }

    const medications = (prescription.medications as unknown) as Array<{
        name: string;
        dosage: string;
        frequency: string;
        duration: string;
    }>;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="card-premium p-6"
        >
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-foreground">Prescription</h3>
                {prescription.pdfUrl && (
                    <a
                        href={prescription.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                    >
                        Download PDF
                    </a>
                )}
            </div>

            <div className="space-y-4">
                {medications.map((med, i) => (
                    <div key={i} className="p-4 bg-muted rounded-xl">
                        <p className="font-medium text-foreground">{med.name}</p>
                        <p className="text-sm text-muted-foreground">
                            {med.dosage} • {med.frequency} • {med.duration}
                        </p>
                    </div>
                ))}
            </div>

            {prescription.instructions && (
                <div className="mt-6">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                        Instructions
                    </h4>
                    <p className="text-foreground">{prescription.instructions}</p>
                </div>
            )}

            <div className="mt-6 flex items-center gap-4 text-sm text-muted-foreground">
                <span>Issued: {format(new Date(prescription.issuedAt), 'MMM d, yyyy')}</span>
                <span>Valid until: {format(new Date(prescription.validUntil), 'MMM d, yyyy')}</span>
            </div>
        </motion.div>
    );
}
