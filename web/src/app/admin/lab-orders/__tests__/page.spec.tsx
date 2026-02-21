/**
 * Admin Lab Orders Page Tests
 * PR 27 Task 2: Lab orders + deliveries tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import LabOrdersPage from '../page';
import { ADMIN_LAB_ORDERS } from '@/graphql/admin';

jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockLabOrders = [
    {
        id: 'lo-1',
        patient: { id: 'p-1', name: 'Rahul Sharma', phone: '+919876543210' },
        vertical: 'HAIR_LOSS',
        testPanel: ['TSH', 'CBC', 'Ferritin'],
        panelName: 'Hair Loss Basic Panel',
        status: 'SLOT_BOOKED',
        phlebotomist: null,
        lab: null,
        bookedDate: '2026-02-22',
        bookedTimeSlot: '8:00 - 10:00 AM',
        collectionAddress: '123 Main St, Andheri West',
        collectionCity: 'Mumbai',
        collectionPincode: '400058',
        slaInfo: { status: 'ON_TIME', reason: null, hoursOverdue: null },
        orderedAt: '2026-02-20T10:00:00Z',
        timeline: [
            { status: 'ORDERED', timestamp: '2026-02-20T10:00:00Z', details: null },
            { status: 'SLOT_BOOKED', timestamp: '2026-02-20T12:00:00Z', details: 'Morning slot' },
        ],
    },
    {
        id: 'lo-2',
        patient: { id: 'p-2', name: 'Priya Patel', phone: '+919876000000' },
        vertical: 'PCOS',
        testPanel: ['Testosterone', 'LH', 'FSH', 'DHEA-S'],
        panelName: 'PCOS Hormone Panel',
        status: 'SAMPLE_COLLECTED',
        phlebotomist: { id: 'ph-1', name: 'Amit Singh', phone: '+919800000000' },
        lab: { id: 'lab-1', name: 'SRL Diagnostics', phone: '+919811111111' },
        bookedDate: '2026-02-21',
        bookedTimeSlot: '7:00 - 9:00 AM',
        collectionAddress: '456 Park Road, Bandra',
        collectionCity: 'Mumbai',
        collectionPincode: '400050',
        slaInfo: { status: 'BREACHED', reason: 'Sample not delivered to lab within 4h', hoursOverdue: 2 },
        orderedAt: '2026-02-19T08:00:00Z',
        timeline: [
            { status: 'ORDERED', timestamp: '2026-02-19T08:00:00Z', details: null },
            { status: 'SLOT_BOOKED', timestamp: '2026-02-19T09:00:00Z', details: null },
            { status: 'PHLEBOTOMIST_ASSIGNED', timestamp: '2026-02-20T14:00:00Z', details: 'Amit Singh' },
            { status: 'SAMPLE_COLLECTED', timestamp: '2026-02-21T08:30:00Z', details: '3 tubes' },
        ],
    },
];

const labOrdersMock: MockedResponse = {
    request: {
        query: ADMIN_LAB_ORDERS,
        variables: {
            filter: {
                statuses: undefined,
                vertical: undefined,
                search: undefined,
            },
        },
    },
    result: {
        data: {
            adminLabOrders: {
                labOrders: mockLabOrders,
                total: 2,
                page: 1,
                pageSize: 50,
            },
        },
    },
};

const emptyLabOrdersMock: MockedResponse = {
    request: {
        query: ADMIN_LAB_ORDERS,
        variables: {
            filter: {
                statuses: undefined,
                vertical: undefined,
                search: undefined,
            },
        },
    },
    result: {
        data: {
            adminLabOrders: {
                labOrders: [],
                total: 0,
                page: 1,
                pageSize: 50,
            },
        },
    },
};

function renderWithProvider(mocks: MockedResponse[] = []) {
    return render(
        <MockedProvider mocks={mocks} addTypename={false}>
            <LabOrdersPage />
        </MockedProvider>
    );
}

describe('LabOrdersPage', () => {
    it('should render page header', async () => {
        renderWithProvider([labOrdersMock]);

        await waitFor(() => {
            expect(screen.getByText('Lab Orders')).toBeDefined();
        });
    });

    it('should display lab order cards with patient names', async () => {
        renderWithProvider([labOrdersMock]);

        await waitFor(() => {
            expect(screen.getByText('Rahul Sharma')).toBeDefined();
            expect(screen.getByText('Priya Patel')).toBeDefined();
        });
    });

    it('should show panel name on lab order cards', async () => {
        renderWithProvider([labOrdersMock]);

        await waitFor(() => {
            expect(screen.getByText('Hair Loss Basic Panel')).toBeDefined();
            expect(screen.getByText('PCOS Hormone Panel')).toBeDefined();
        });
    });

    it('should show status badges on lab order cards', async () => {
        renderWithProvider([labOrdersMock]);

        await waitFor(() => {
            expect(screen.getByText('Slot Booked')).toBeDefined();
            expect(screen.getByText('Collected')).toBeDefined();
        });
    });

    it('should show SLA breach indicator when breached', async () => {
        renderWithProvider([labOrdersMock]);

        await waitFor(() => {
            expect(screen.getByText('2h overdue')).toBeDefined();
        });
    });

    it('should show vertical badge on cards', async () => {
        renderWithProvider([labOrdersMock]);

        await waitFor(() => {
            expect(screen.getByText('Hair Loss')).toBeDefined();
            expect(screen.getByText('PCOS')).toBeDefined();
        });
    });

    it('should have search input', async () => {
        renderWithProvider([labOrdersMock]);

        const searchInput = screen.getByPlaceholderText(/search/i);
        expect(searchInput).toBeDefined();
    });

    it('should have filter toggle button', async () => {
        renderWithProvider([labOrdersMock]);

        const filterButton = screen.getByText(/filter/i);
        expect(filterButton).toBeDefined();
    });
});
