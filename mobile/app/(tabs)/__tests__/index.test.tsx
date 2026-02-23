/**
 * Home Screen Tests
 * PR 4: Home Dashboard Restyle
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useQuery } from '@apollo/client';
import HomeScreen from '../index';

// Get mocked router
const mockRouter = require('expo-router').useRouter();

// Mock useQuery to control data
const mockRefetch = jest.fn();

beforeEach(() => {
    jest.clearAllMocks();
    (useQuery as jest.Mock).mockImplementation(() => ({
        data: null,
        loading: false,
        error: null,
        refetch: mockRefetch,
    }));
});

describe('HomeScreen', () => {
    it('renders the screen', () => {
        const { getByTestId } = render(<HomeScreen />);
        expect(getByTestId('home-screen')).toBeTruthy();
    });

    it('displays personalized greeting with user name', () => {
        const { getByText } = render(<HomeScreen />);
        // Should show personalized greeting with user's first name
        expect(getByText(/Test/)).toBeTruthy();
    });

    it('displays the main heading', () => {
        const { getByText } = render(<HomeScreen />);
        expect(getByText('What can we help with?')).toBeTruthy();
    });

    describe('Treatment Cards', () => {
        it('renders all 4 treatment verticals', () => {
            const { getByTestId } = render(<HomeScreen />);
            expect(getByTestId('treatment-card-HAIR_LOSS')).toBeTruthy();
            expect(getByTestId('treatment-card-SEXUAL_HEALTH')).toBeTruthy();
            expect(getByTestId('treatment-card-PCOS')).toBeTruthy();
            expect(getByTestId('treatment-card-WEIGHT_MANAGEMENT')).toBeTruthy();
        });

        it('displays treatment names', () => {
            const { getByText } = render(<HomeScreen />);
            expect(getByText('Hair Loss')).toBeTruthy();
            expect(getByText('Sexual Health')).toBeTruthy();
            expect(getByText('PCOS')).toBeTruthy();
            expect(getByText('Weight Management')).toBeTruthy();
        });

        it('navigates to intake flow when card is pressed', () => {
            const { getByTestId } = render(<HomeScreen />);

            fireEvent.press(getByTestId('treatment-card-HAIR_LOSS'));
            expect(mockRouter.push).toHaveBeenCalledWith('/intake/hair-loss');
        });

        it('displays pricing for each treatment', () => {
            const { getByText } = render(<HomeScreen />);
            // Should show starting prices (converted from paise to rupees)
            expect(getByText(/₹999/)).toBeTruthy();
            expect(getByText(/₹799/)).toBeTruthy();
            expect(getByText(/₹1,199/)).toBeTruthy();
            expect(getByText(/₹2,499/)).toBeTruthy();
        });
    });

    describe('Active Order Banner', () => {
        it('does not render when there are no active orders', () => {
            const { queryByTestId } = render(<HomeScreen />);
            expect(queryByTestId('active-order-banner')).toBeNull();
        });

        it('renders lab order banner when there is an active lab order', () => {
            (useQuery as jest.Mock).mockImplementation((query) => {
                if (query === require('@/graphql/tracking').GET_ACTIVE_TRACKING) {
                    return {
                        data: {
                            activeTracking: {
                                labOrders: [{
                                    id: '1',
                                    status: 'SAMPLE_COLLECTED',
                                    orderedAt: new Date().toISOString(),
                                }],
                                deliveryOrders: [],
                            },
                        },
                        loading: false,
                        error: null,
                        refetch: mockRefetch,
                    };
                }
                return { data: null, loading: false, error: null, refetch: mockRefetch };
            });

            const { getByTestId, getByText } = render(<HomeScreen />);
            expect(getByTestId('active-order-banner')).toBeTruthy();
            expect(getByText('Blood Test')).toBeTruthy();
        });

        it('renders delivery order banner when there is an active delivery', () => {
            (useQuery as jest.Mock).mockImplementation((query) => {
                if (query === require('@/graphql/tracking').GET_ACTIVE_TRACKING) {
                    return {
                        data: {
                            activeTracking: {
                                labOrders: [],
                                deliveryOrders: [{
                                    id: '1',
                                    status: 'OUT_FOR_DELIVERY',
                                    prescriptionCreatedAt: new Date().toISOString(),
                                }],
                            },
                        },
                        loading: false,
                        error: null,
                        refetch: mockRefetch,
                    };
                }
                return { data: null, loading: false, error: null, refetch: mockRefetch };
            });

            const { getByTestId, getByText } = render(<HomeScreen />);
            expect(getByTestId('active-order-banner')).toBeTruthy();
            expect(getByText('Medication Delivery')).toBeTruthy();
        });

        it('navigates to activity when banner is pressed', () => {
            (useQuery as jest.Mock).mockImplementation((query) => {
                if (query === require('@/graphql/tracking').GET_ACTIVE_TRACKING) {
                    return {
                        data: {
                            activeTracking: {
                                labOrders: [{
                                    id: '1',
                                    status: 'SAMPLE_COLLECTED',
                                    orderedAt: new Date().toISOString(),
                                }],
                                deliveryOrders: [],
                            },
                        },
                        loading: false,
                        error: null,
                        refetch: mockRefetch,
                    };
                }
                return { data: null, loading: false, error: null, refetch: mockRefetch };
            });

            const { getByTestId } = render(<HomeScreen />);
            fireEvent.press(getByTestId('active-order-banner'));
            expect(mockRouter.push).toHaveBeenCalledWith('/activity');
        });
    });

    describe('Why Onlyou Section', () => {
        it('renders the why section', () => {
            const { getByTestId } = render(<HomeScreen />);
            expect(getByTestId('why-onlyou-section')).toBeTruthy();
        });

        it('displays all 4 feature items', () => {
            const { getByText } = render(<HomeScreen />);
            expect(getByText('Expert Doctors')).toBeTruthy();
            expect(getByText('100% Private')).toBeTruthy();
            expect(getByText('Doorstep Delivery')).toBeTruthy();
            expect(getByText('24/7 Support')).toBeTruthy();
        });
    });

    describe('Pull to Refresh', () => {
        it('calls refetch on pull to refresh', async () => {
            const { getByTestId } = render(<HomeScreen />);
            const scrollView = getByTestId('home-scroll-view');

            // Simulate refresh control
            const refreshControl = scrollView.props.refreshControl;
            await refreshControl.props.onRefresh();

            expect(mockRefetch).toHaveBeenCalled();
        });
    });

    describe('Loading State', () => {
        it('shows default verticals while loading (fallback behavior)', () => {
            (useQuery as jest.Mock).mockImplementation(() => ({
                data: null,
                loading: true,
                error: null,
                refetch: mockRefetch,
            }));

            // Default verticals should show while loading
            const { getByTestId, getByText } = render(<HomeScreen />);
            expect(getByTestId('treatment-card-HAIR_LOSS')).toBeTruthy();
            expect(getByText('Hair Loss')).toBeTruthy();
        });
    });
});
