'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    CheckCircle,
    TestTube2,
    Plus,
    Loader2,
    AlertTriangle,
    Clock,
    FileText,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CASE_DETAIL, CaseDetailResponse, VERTICAL_CONFIG, HealthVertical } from '@/graphql/dashboard';
import {
    AVAILABLE_TEST_PANELS,
    LAB_ORDERS_BY_CONSULTATION,
    CREATE_LAB_ORDER,
    AvailableTestPanelsResponse,
    LabOrdersByConsultationResponse,
    CreateLabOrderResponse,
    TestPanel,
    LabOrder,
    LAB_ORDER_STATUS_CONFIG,
} from '@/graphql/lab-order';

// Spec: master spec Section 7 — Blood Work Ordering

export default function BloodWorkPage() {
    const params = useParams();
    const consultationId = params.id as string;

    const [selectedPanel, setSelectedPanel] = useState<TestPanel | null>(null);
    const [customTests, setCustomTests] = useState<string[]>([]);
    const [doctorNotes, setDoctorNotes] = useState('');
    const [showCustom, setShowCustom] = useState(false);

    // Fetch case data
    const { data: caseData, loading: caseLoading } = useQuery<CaseDetailResponse>(CASE_DETAIL, {
        variables: { consultationId },
    });

    const vertical = caseData?.caseDetail?.consultation?.vertical as HealthVertical | undefined;

    // Fetch available panels
    const { data: panelsData, loading: panelsLoading } = useQuery<AvailableTestPanelsResponse>(
        AVAILABLE_TEST_PANELS,
        {
            variables: { vertical },
            skip: !vertical,
        }
    );

    // Fetch existing lab orders
    const { data: ordersData, refetch: refetchOrders } = useQuery<LabOrdersByConsultationResponse>(
        LAB_ORDERS_BY_CONSULTATION,
        {
            variables: { consultationId },
        }
    );

    // Create lab order mutation
    const [createLabOrder, { loading: creating }] = useMutation<CreateLabOrderResponse>(
        CREATE_LAB_ORDER,
        {
            onCompleted: (data) => {
                if (data?.createLabOrder?.success) {
                    refetchOrders();
                    setSelectedPanel(null);
                    setCustomTests([]);
                    setDoctorNotes('');
                    setShowCustom(false);
                }
            },
        }
    );

    const panels = panelsData?.availableTestPanels?.panels || [];
    const existingOrders = ordersData?.labOrdersByConsultation || [];
    const verticalConfig = vertical ? VERTICAL_CONFIG[vertical] : null;

    // Get all available tests from panels for custom selection
    const allTests = Array.from(
        new Set(panels.flatMap((p) => p.tests))
    ).sort();

    const handleSubmit = async () => {
        const testPanel = showCustom && customTests.length > 0
            ? customTests
            : selectedPanel?.tests || [];

        if (testPanel.length === 0) return;

        await createLabOrder({
            variables: {
                input: {
                    consultationId,
                    testPanel,
                    panelName: showCustom ? 'Custom Panel' : selectedPanel?.name,
                    doctorNotes: doctorNotes || undefined,
                },
            },
        });
    };

    const toggleCustomTest = (test: string) => {
        setCustomTests((prev) =>
            prev.includes(test)
                ? prev.filter((t) => t !== test)
                : [...prev, test]
        );
    };

    if (caseLoading || panelsLoading) {
        return (
            <div className="p-6 lg:p-8 flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-24">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-card border-b border-border">
                <div className="max-w-4xl mx-auto px-4 lg:px-8 py-4">
                    <div className="flex items-center gap-4">
                        <Link
                            href={`/doctor/case/${consultationId}`}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-lg lg:text-xl font-semibold text-foreground">
                                Order Blood Work
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {caseData?.caseDetail?.patient?.name} • {verticalConfig?.label}
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 lg:px-8 py-6 space-y-6">
                {/* Existing orders */}
                {existingOrders.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="card-premium p-6"
                    >
                        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                            <Clock className="w-5 h-5" />
                            Existing Lab Orders
                        </h3>
                        <div className="space-y-3">
                            {existingOrders.map((order) => (
                                <ExistingOrderCard key={order.id} order={order} />
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Panel selection */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="card-premium p-6"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-foreground flex items-center gap-2">
                            <TestTube2 className="w-5 h-5" />
                            Select Test Panel
                        </h3>
                        <button
                            onClick={() => {
                                setShowCustom(!showCustom);
                                setSelectedPanel(null);
                            }}
                            className="text-sm text-primary hover:underline"
                        >
                            {showCustom ? 'Use preset panel' : 'Custom selection'}
                        </button>
                    </div>

                    <AnimatePresence mode="wait">
                        {!showCustom ? (
                            <motion.div
                                key="panels"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="space-y-3"
                            >
                                {panels.map((panel) => (
                                    <button
                                        key={panel.name}
                                        onClick={() => setSelectedPanel(panel)}
                                        className={cn(
                                            'w-full p-4 rounded-xl border-2 text-left transition-all',
                                            selectedPanel?.name === panel.name
                                                ? 'border-primary bg-primary/5'
                                                : 'border-border hover:border-primary/40'
                                        )}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-medium text-foreground">
                                                {panel.name}
                                            </span>
                                            {selectedPanel?.name === panel.name && (
                                                <CheckCircle className="w-5 h-5 text-primary" />
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-2">
                                            {panel.description}
                                        </p>
                                        <div className="flex flex-wrap gap-1">
                                            {panel.tests.map((test) => (
                                                <span
                                                    key={test}
                                                    className="px-2 py-0.5 text-xs bg-muted rounded-lg"
                                                >
                                                    {test.replace(/_/g, ' ')}
                                                </span>
                                            ))}
                                        </div>
                                    </button>
                                ))}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="custom"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <p className="text-sm text-muted-foreground mb-3">
                                    Select individual tests:
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {allTests.map((test) => (
                                        <button
                                            key={test}
                                            onClick={() => toggleCustomTest(test)}
                                            className={cn(
                                                'px-3 py-1.5 text-sm rounded-lg border transition-all',
                                                customTests.includes(test)
                                                    ? 'border-primary bg-primary/10 text-primary'
                                                    : 'border-border hover:border-primary/40'
                                            )}
                                        >
                                            {test.replace(/_/g, ' ')}
                                            {customTests.includes(test) && (
                                                <CheckCircle className="w-3 h-3 ml-1 inline" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                                {customTests.length > 0 && (
                                    <p className="mt-3 text-sm text-muted-foreground">
                                        {customTests.length} test(s) selected
                                    </p>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Doctor notes */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="card-premium p-6"
                >
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Notes for Patient
                    </h3>
                    <textarea
                        value={doctorNotes}
                        onChange={(e) => setDoctorNotes(e.target.value)}
                        placeholder="Add any special instructions for the patient (fasting requirements, timing, etc.)..."
                        className="w-full h-24 px-4 py-3 rounded-xl border border-border bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                </motion.div>
            </main>

            {/* Bottom action bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 z-30">
                <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
                    <div className="hidden sm:block">
                        {(selectedPanel || customTests.length > 0) ? (
                            <span className="text-sm text-success flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" />
                                Ready to order
                            </span>
                        ) : (
                            <span className="text-sm text-muted-foreground">
                                Select a test panel to continue
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Link href={`/doctor/case/${consultationId}`} className="flex-1 sm:flex-none">
                            <Button variant="outline" className="w-full">
                                Cancel
                            </Button>
                        </Link>
                        <Button
                            onClick={handleSubmit}
                            disabled={
                                (!selectedPanel && customTests.length === 0) ||
                                creating
                            }
                            className="flex-1 sm:flex-none"
                        >
                            {creating ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create Lab Order
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Existing order card component
function ExistingOrderCard({ order }: { order: LabOrder }) {
    const statusConfig = LAB_ORDER_STATUS_CONFIG[order.status];

    return (
        <div className="p-4 bg-muted rounded-xl">
            <div className="flex items-start justify-between mb-2">
                <div>
                    <p className="font-medium text-foreground">
                        {order.panelName || 'Lab Order'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {format(new Date(order.orderedAt), 'MMM d, yyyy')}
                    </p>
                </div>
                <span
                    className={cn(
                        'px-2 py-0.5 text-xs text-white rounded-lg',
                        statusConfig.color
                    )}
                >
                    {statusConfig.label}
                </span>
            </div>
            <div className="flex flex-wrap gap-1">
                {order.testPanel.map((test) => (
                    <span
                        key={test}
                        className="px-2 py-0.5 text-xs bg-background rounded-lg"
                    >
                        {test.replace(/_/g, ' ')}
                    </span>
                ))}
            </div>
            {order.criticalValues && (
                <div className="mt-2 flex items-center gap-1 text-xs text-error">
                    <AlertTriangle className="w-3 h-3" />
                    Critical values detected
                </div>
            )}
            {order.resultFileUrl && (
                <a
                    href={order.resultFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 text-sm text-primary hover:underline inline-flex items-center gap-1"
                >
                    <FileText className="w-3 h-3" />
                    View Results
                </a>
            )}
        </div>
    );
}
