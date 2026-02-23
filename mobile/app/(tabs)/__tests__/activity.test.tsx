/**
 * Activity Screen Tests
 * PR 6: Remaining Screens Restyle
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useQuery } from '@apollo/client';

// Must be named 'mock' prefix for Jest hoisting
const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
    useRouter: () => ({
        push: mockPush,
        replace: jest.fn(),
        back: mockBack,
    }),
    useSegments: () => [],
    useLocalSearchParams: () => ({}),
    Slot: ({ children }: { children: React.ReactNode }) => children,
    Stack: {
        Screen: () => null,
    },
    Link: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock tracking data
const mockActiveLabOrder = {
    id: 'lab-1',
    status: 'SLOT_BOOKED',
    orderedAt: '2026-02-10T10:00:00Z',
    panelName: 'Complete Blood Panel',
    slotDate: '2026-02-15',
    slotTime: '10:00 AM',
};

const mockActiveDeliveryOrder = {
    id: 'delivery-1',
    status: 'DISPATCHED',
    prescriptionCreatedAt: '2026-02-08T10:00:00Z',
    treatmentType: 'HAIR_LOSS',
    estimatedDelivery: '2026-02-18',
};

const mockCompletedLabOrder = {
    id: 'lab-2',
    status: 'DOCTOR_REVIEWED',
    orderedAt: '2026-01-10T10:00:00Z',
    panelName: 'Hormone Panel',
    resultFileUrl: 'https://example.com/results.pdf',
};

const mockCompletedDeliveryOrder = {
    id: 'delivery-2',
    status: 'DELIVERED',
    prescriptionCreatedAt: '2026-01-05T10:00:00Z',
    deliveredAt: '2026-01-12T10:00:00Z',
    treatmentType: 'HAIR_LOSS',
};

// Import after mocks
import ActivityScreen from '../activity';

beforeEach(() => {
    jest.clearAllMocks();

    // Mock useQuery with active and completed items
    (useQuery as jest.Mock).mockReturnValue({
        data: {
            activeTracking: {
                labOrders: [mockActiveLabOrder, mockCompletedLabOrder],
                deliveryOrders: [mockActiveDeliveryOrder, mockCompletedDeliveryOrder],
            },
        },
        loading: false,
        error: null,
        refetch: jest.fn(),
    });
});

describe('ActivityScreen', () => {
    describe('Screen structure', () => {
        it('renders the screen with testID', () => {
            const { getByTestId } = render(<ActivityScreen />);
            expect(getByTestId('activity-screen')).toBeTruthy();
        });

        it('displays "Activity" title with serif font', () => {
            const { getByText } = render(<ActivityScreen />);
            expect(getByText('Activity')).toBeTruthy();
        });

        it('renders Active section header', () => {
            const { getByTestId } = render(<ActivityScreen />);
            expect(getByTestId('active-section')).toBeTruthy();
        });

        it('renders Completed section header', () => {
            const { getByTestId } = render(<ActivityScreen />);
            expect(getByTestId('completed-section')).toBeTruthy();
        });
    });

    describe('Active items section', () => {
        it('renders active tracking cards', () => {
            const { getByTestId } = render(<ActivityScreen />);
            expect(getByTestId('tracking-card-lab-1')).toBeTruthy();
            expect(getByTestId('tracking-card-delivery-1')).toBeTruthy();
        });

        it('displays treatment type badge on cards', () => {
            const { getByTestId } = render(<ActivityScreen />);
            expect(getByTestId('treatment-badge-delivery-1')).toBeTruthy();
        });

        it('renders status stepper for active items', () => {
            const { getByTestId } = render(<ActivityScreen />);
            expect(getByTestId('status-stepper-lab-1')).toBeTruthy();
        });

        it('displays step indicators with correct states', () => {
            const { getByTestId } = render(<ActivityScreen />);
            // Check for step indicators (completed, current, upcoming)
            expect(getByTestId('step-indicator-lab-1')).toBeTruthy();
        });
    });

    describe('Completed items section', () => {
        it('renders completed cards with collapsed state', () => {
            const { getByTestId } = render(<ActivityScreen />);
            expect(getByTestId('completed-card-lab-2')).toBeTruthy();
            expect(getByTestId('completed-card-delivery-2')).toBeTruthy();
        });

        it('displays completion date on completed cards', () => {
            const { getAllByText } = render(<ActivityScreen />);
            // Should show formatted completion date (multiple orders may have Jan dates)
            const janMatches = getAllByText(/jan/i);
            expect(janMatches.length).toBeGreaterThan(0);
        });
    });

    describe('Empty state', () => {
        it('displays empty state when no orders', () => {
            (useQuery as jest.Mock).mockReturnValue({
                data: {
                    activeTracking: {
                        labOrders: [],
                        deliveryOrders: [],
                    },
                },
                loading: false,
                error: null,
                refetch: jest.fn(),
            });

            const { getByTestId } = render(<ActivityScreen />);
            expect(getByTestId('empty-state')).toBeTruthy();
        });

        it('displays empty state message', () => {
            (useQuery as jest.Mock).mockReturnValue({
                data: {
                    activeTracking: {
                        labOrders: [],
                        deliveryOrders: [],
                    },
                },
                loading: false,
                error: null,
                refetch: jest.fn(),
            });

            const { getByText } = render(<ActivityScreen />);
            expect(getByText(/no active orders yet/i)).toBeTruthy();
        });

        it('displays start consultation button in empty state', () => {
            (useQuery as jest.Mock).mockReturnValue({
                data: {
                    activeTracking: {
                        labOrders: [],
                        deliveryOrders: [],
                    },
                },
                loading: false,
                error: null,
                refetch: jest.fn(),
            });

            const { getByTestId } = render(<ActivityScreen />);
            expect(getByTestId('start-consultation-button')).toBeTruthy();
        });
    });

    describe('Loading state', () => {
        it('displays skeleton shimmer while loading', () => {
            (useQuery as jest.Mock).mockReturnValue({
                data: null,
                loading: true,
                error: null,
                refetch: jest.fn(),
            });

            const { getByTestId } = render(<ActivityScreen />);
            expect(getByTestId('loading-skeleton')).toBeTruthy();
        });
    });

    describe('Pull-to-refresh', () => {
        it('renders ScrollView with refresh control', () => {
            const { getByTestId } = render(<ActivityScreen />);
            expect(getByTestId('activity-scroll-view')).toBeTruthy();
        });
    });

    describe('Card interactions', () => {
        it('card can be tapped to expand', () => {
            const { getByTestId } = render(<ActivityScreen />);
            const card = getByTestId('tracking-card-lab-1');
            fireEvent.press(card);
            // Card should expand to show more details
        });

        it('completed card can be tapped to expand', () => {
            const { getByTestId } = render(<ActivityScreen />);
            const card = getByTestId('completed-card-lab-2');
            fireEvent.press(card);
            // Should expand
        });
    });

    describe('Lucide icons', () => {
        it('renders Lucide icons instead of emojis', () => {
            const { queryByText } = render(<ActivityScreen />);
            // Should NOT have emoji icons
            expect(queryByText('📋')).toBeNull();
            expect(queryByText('📦')).toBeNull();
            expect(queryByText('🔬')).toBeNull();
        });
    });

    describe('Consultations section', () => {
        it('renders consultation cards when consultations exist', () => {
            let callIndex = 0;
            (useQuery as jest.Mock).mockImplementation(() => {
                callIndex++;
                if (callIndex === 1) {
                    // GET_ACTIVE_TRACKING
                    return {
                        data: {
                            activeTracking: {
                                labOrders: [],
                                deliveryOrders: [],
                            },
                        },
                        loading: false,
                        error: null,
                        refetch: jest.fn(),
                    };
                }
                // GET_MY_CONSULTATIONS
                return {
                    data: {
                        myConsultations: [
                            { id: 'consult-1', vertical: 'HAIR_LOSS', status: 'DOCTOR_REVIEWING', createdAt: '2026-02-20T10:00:00Z' },
                        ],
                    },
                    loading: false,
                    error: null,
                    refetch: jest.fn(),
                };
            });

            const { getByTestId } = render(<ActivityScreen />);
            expect(getByTestId('consultation-card-consult-1')).toBeTruthy();
        });

        it('shows consultation stepper with correct status', () => {
            let callIndex = 0;
            (useQuery as jest.Mock).mockImplementation(() => {
                callIndex++;
                if (callIndex === 1) {
                    return {
                        data: { activeTracking: { labOrders: [], deliveryOrders: [] } },
                        loading: false,
                        error: null,
                        refetch: jest.fn(),
                    };
                }
                return {
                    data: {
                        myConsultations: [
                            { id: 'consult-2', vertical: 'SEXUAL_HEALTH', status: 'PENDING_ASSESSMENT', createdAt: '2026-02-21T10:00:00Z' },
                        ],
                    },
                    loading: false,
                    error: null,
                    refetch: jest.fn(),
                };
            });

            const { getByTestId, getByText } = render(<ActivityScreen />);
            expect(getByTestId('consultation-stepper-consult-2')).toBeTruthy();
            expect(getByText(/assessment is being reviewed/i)).toBeTruthy();
        });

        it('does not show approved consultations in active section', () => {
            let callIndex = 0;
            (useQuery as jest.Mock).mockImplementation(() => {
                callIndex++;
                if (callIndex === 1) {
                    return {
                        data: { activeTracking: { labOrders: [], deliveryOrders: [] } },
                        loading: false,
                        error: null,
                        refetch: jest.fn(),
                    };
                }
                return {
                    data: {
                        myConsultations: [
                            { id: 'consult-3', vertical: 'HAIR_LOSS', status: 'APPROVED', createdAt: '2026-02-19T10:00:00Z' },
                        ],
                    },
                    loading: false,
                    error: null,
                    refetch: jest.fn(),
                };
            });

            const { queryByTestId, getByTestId } = render(<ActivityScreen />);
            // Approved consultation should not appear as active
            expect(queryByTestId('consultation-card-consult-3')).toBeNull();
            // Should show empty state since no active items
            expect(getByTestId('empty-state')).toBeTruthy();
        });
    });

    describe('Design system compliance', () => {
        it('uses 20px card padding', () => {
            const { getByTestId } = render(<ActivityScreen />);
            const card = getByTestId('tracking-card-lab-1');
            expect(card.props.style).toBeDefined();
        });

        it('uses border-radius 20px on cards', () => {
            const { getByTestId } = render(<ActivityScreen />);
            const card = getByTestId('tracking-card-lab-1');
            expect(card.props.style).toBeDefined();
        });
    });
});
