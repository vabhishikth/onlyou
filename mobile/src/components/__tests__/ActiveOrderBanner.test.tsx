/**
 * ActiveOrderBanner Component Tests
 * PR 4: Home Dashboard Restyle - Premium active order tracking banner
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ActiveOrderBanner from '../ActiveOrderBanner';

// Get mocked router
const mockRouter = require('expo-router').useRouter();

beforeEach(() => {
    jest.clearAllMocks();
});

describe('ActiveOrderBanner', () => {
    const labOrderProps = {
        labOrders: [{
            id: '1',
            status: 'SAMPLE_COLLECTED',
            orderedAt: new Date().toISOString(),
        }],
        deliveryOrders: [],
    };

    const deliveryOrderProps = {
        labOrders: [],
        deliveryOrders: [{
            id: '1',
            status: 'OUT_FOR_DELIVERY',
            prescriptionCreatedAt: new Date().toISOString(),
            estimatedDeliveryTime: '30 mins',
        }],
    };

    describe('when no active orders', () => {
        it('returns null when labOrders and deliveryOrders are empty', () => {
            const { queryByTestId } = render(
                <ActiveOrderBanner labOrders={[]} deliveryOrders={[]} />
            );
            expect(queryByTestId('active-order-banner')).toBeNull();
        });

        it('returns null when all orders are completed', () => {
            const { queryByTestId } = render(
                <ActiveOrderBanner
                    labOrders={[{
                        id: '1',
                        status: 'CLOSED',
                        orderedAt: new Date().toISOString(),
                    }]}
                    deliveryOrders={[{
                        id: '1',
                        status: 'DELIVERED',
                        prescriptionCreatedAt: new Date().toISOString(),
                    }]}
                />
            );
            expect(queryByTestId('active-order-banner')).toBeNull();
        });
    });

    describe('lab order banner', () => {
        it('renders when there is an active lab order', () => {
            const { getByTestId } = render(<ActiveOrderBanner {...labOrderProps} />);
            expect(getByTestId('active-order-banner')).toBeTruthy();
        });

        it('displays "Blood Test" title', () => {
            const { getByText } = render(<ActiveOrderBanner {...labOrderProps} />);
            expect(getByText('Blood Test')).toBeTruthy();
        });

        it('displays the status label', () => {
            const { getByText } = render(<ActiveOrderBanner {...labOrderProps} />);
            expect(getByText(/Sample Collected/i)).toBeTruthy();
        });

        it('navigates to activity when pressed', () => {
            const { getByTestId } = render(<ActiveOrderBanner {...labOrderProps} />);
            fireEvent.press(getByTestId('active-order-banner'));
            expect(mockRouter.push).toHaveBeenCalledWith('/activity');
        });

        it('shows lab icon', () => {
            const { getByTestId } = render(<ActiveOrderBanner {...labOrderProps} />);
            expect(getByTestId('order-icon')).toBeTruthy();
        });
    });

    describe('delivery order banner', () => {
        it('renders when there is an active delivery order', () => {
            const { getByTestId } = render(<ActiveOrderBanner {...deliveryOrderProps} />);
            expect(getByTestId('active-order-banner')).toBeTruthy();
        });

        it('displays "Medication Delivery" title', () => {
            const { getByText } = render(<ActiveOrderBanner {...deliveryOrderProps} />);
            expect(getByText('Medication Delivery')).toBeTruthy();
        });

        it('displays the status label', () => {
            const { getByText } = render(<ActiveOrderBanner {...deliveryOrderProps} />);
            expect(getByText(/Out for Delivery/i)).toBeTruthy();
        });

        it('shows ETA when available for OUT_FOR_DELIVERY status', () => {
            const { getByText } = render(<ActiveOrderBanner {...deliveryOrderProps} />);
            expect(getByText(/30 mins/)).toBeTruthy();
        });

        it('navigates to activity when pressed', () => {
            const { getByTestId } = render(<ActiveOrderBanner {...deliveryOrderProps} />);
            fireEvent.press(getByTestId('active-order-banner'));
            expect(mockRouter.push).toHaveBeenCalledWith('/activity');
        });

        it('shows delivery icon', () => {
            const { getByTestId } = render(<ActiveOrderBanner {...deliveryOrderProps} />);
            expect(getByTestId('order-icon')).toBeTruthy();
        });
    });

    describe('priority logic', () => {
        it('prioritizes lab order when it is more recent', () => {
            const recentLabOrder = {
                id: '1',
                status: 'SAMPLE_COLLECTED',
                orderedAt: new Date().toISOString(),
            };
            const olderDeliveryOrder = {
                id: '2',
                status: 'OUT_FOR_DELIVERY',
                prescriptionCreatedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            };

            const { getByText } = render(
                <ActiveOrderBanner
                    labOrders={[recentLabOrder]}
                    deliveryOrders={[olderDeliveryOrder]}
                />
            );
            expect(getByText('Blood Test')).toBeTruthy();
        });

        it('prioritizes delivery order when it is more recent', () => {
            const olderLabOrder = {
                id: '1',
                status: 'SAMPLE_COLLECTED',
                orderedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            };
            const recentDeliveryOrder = {
                id: '2',
                status: 'OUT_FOR_DELIVERY',
                prescriptionCreatedAt: new Date().toISOString(),
            };

            const { getByText } = render(
                <ActiveOrderBanner
                    labOrders={[olderLabOrder]}
                    deliveryOrders={[recentDeliveryOrder]}
                />
            );
            expect(getByText('Medication Delivery')).toBeTruthy();
        });
    });

    describe('lab order statuses', () => {
        const testStatuses = [
            { status: 'ORDERED', label: /Ordered/i },
            { status: 'SLOT_BOOKED', label: /Slot Booked/i },
            { status: 'PHLEBOTOMIST_ASSIGNED', label: /Assigned/i },
            { status: 'SAMPLE_COLLECTED', label: /Collected/i },
            { status: 'PROCESSING', label: /Processing/i },
            { status: 'RESULTS_READY', label: /Ready/i },
        ];

        testStatuses.forEach(({ status, label }) => {
            it(`displays correct label for ${status}`, () => {
                const props = {
                    labOrders: [{
                        id: '1',
                        status,
                        orderedAt: new Date().toISOString(),
                    }],
                    deliveryOrders: [],
                };
                const { getByText } = render(<ActiveOrderBanner {...props} />);
                expect(getByText(label)).toBeTruthy();
            });
        });
    });

    describe('delivery order statuses', () => {
        const testStatuses = [
            { status: 'PRESCRIPTION_CREATED', label: /Prescription Created/i },
            { status: 'PHARMACY_PREPARING', label: /Preparing/i },
            { status: 'OUT_FOR_DELIVERY', label: /Out for Delivery/i },
        ];

        testStatuses.forEach(({ status, label }) => {
            it(`displays correct label for ${status}`, () => {
                const props = {
                    labOrders: [],
                    deliveryOrders: [{
                        id: '1',
                        status,
                        prescriptionCreatedAt: new Date().toISOString(),
                    }],
                };
                const { getByText } = render(<ActiveOrderBanner {...props} />);
                expect(getByText(label)).toBeTruthy();
            });
        });
    });
});
