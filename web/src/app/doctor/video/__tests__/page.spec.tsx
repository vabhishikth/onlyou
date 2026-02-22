import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import VideoAvailabilityPage from '../page';
import { MY_AVAILABILITY, SET_MY_AVAILABILITY } from '@/graphql/doctor-video';

// Spec: Phase 13 — Doctor video availability management

jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('next/link', () => {
    return ({ children, href, ...props }: any) => (
        <a href={href} {...props}>{children}</a>
    );
});

const mockAvailability = [
    {
        id: 'slot-1',
        doctorId: 'doc-1',
        dayOfWeek: 'MONDAY',
        startTime: '09:00',
        endTime: '12:00',
        slotDurationMinutes: 15,
        isActive: true,
    },
    {
        id: 'slot-2',
        doctorId: 'doc-1',
        dayOfWeek: 'WEDNESDAY',
        startTime: '14:00',
        endTime: '17:00',
        slotDurationMinutes: 15,
        isActive: true,
    },
    {
        id: 'slot-3',
        doctorId: 'doc-1',
        dayOfWeek: 'FRIDAY',
        startTime: '18:00',
        endTime: '20:00',
        slotDurationMinutes: 15,
        isActive: true,
    },
];

const availabilityMock: MockedResponse = {
    request: {
        query: MY_AVAILABILITY,
    },
    result: {
        data: { myAvailability: mockAvailability },
    },
};

const emptyAvailabilityMock: MockedResponse = {
    request: {
        query: MY_AVAILABILITY,
    },
    result: {
        data: { myAvailability: [] },
    },
};

const setAvailabilityMock: MockedResponse = {
    request: {
        query: SET_MY_AVAILABILITY,
        variables: {
            slots: [
                { dayOfWeek: 'TUESDAY', startTime: '10:00', endTime: '13:00' },
            ],
        },
    },
    result: {
        data: {
            setMyAvailability: [
                {
                    id: 'slot-new',
                    doctorId: 'doc-1',
                    dayOfWeek: 'TUESDAY',
                    startTime: '10:00',
                    endTime: '13:00',
                    slotDurationMinutes: 15,
                    isActive: true,
                },
            ],
        },
    },
};

function renderWithProvider(mocks: MockedResponse[] = []) {
    return render(
        <MockedProvider mocks={mocks} addTypename={false}>
            <VideoAvailabilityPage />
        </MockedProvider>
    );
}

describe('VideoAvailabilityPage', () => {
    it('should render loading state', () => {
        renderWithProvider([availabilityMock]);
        expect(screen.getByTestId('availability-loading')).toBeDefined();
    });

    it('should render availability slots grouped by day', async () => {
        renderWithProvider([availabilityMock]);

        await waitFor(() => {
            expect(screen.getByText('Monday')).toBeDefined();
            expect(screen.getByText('Wednesday')).toBeDefined();
            expect(screen.getByText('Friday')).toBeDefined();
        });
    });

    it('should show time ranges for each slot', async () => {
        renderWithProvider([availabilityMock]);

        await waitFor(() => {
            expect(screen.getByText('09:00 — 12:00')).toBeDefined();
            expect(screen.getByText('14:00 — 17:00')).toBeDefined();
            expect(screen.getByText('18:00 — 20:00')).toBeDefined();
        });
    });

    it('should render empty state when no availability set', async () => {
        renderWithProvider([emptyAvailabilityMock]);

        await waitFor(() => {
            expect(screen.getByText(/no availability/i)).toBeDefined();
        });
    });

    it('should show all 7 days of the week in the add slot form', async () => {
        renderWithProvider([availabilityMock]);

        await waitFor(() => {
            expect(screen.getByText('Monday')).toBeDefined();
        });

        // Open the add slot form
        const addButton = screen.getByTestId('add-slot-button');
        fireEvent.click(addButton);

        // All day options should be visible
        expect(screen.getByText('Tuesday')).toBeDefined();
        expect(screen.getByText('Thursday')).toBeDefined();
        expect(screen.getByText('Saturday')).toBeDefined();
        expect(screen.getByText('Sunday')).toBeDefined();
    });

    it('should have start time and end time selectors', async () => {
        renderWithProvider([availabilityMock]);

        await waitFor(() => {
            expect(screen.getByText('Monday')).toBeDefined();
        });

        const addButton = screen.getByTestId('add-slot-button');
        fireEvent.click(addButton);

        expect(screen.getByTestId('start-time-select')).toBeDefined();
        expect(screen.getByTestId('end-time-select')).toBeDefined();
    });

    it('should have a save button for submitting availability', async () => {
        renderWithProvider([availabilityMock]);

        await waitFor(() => {
            expect(screen.getByText('Monday')).toBeDefined();
        });

        const addButton = screen.getByTestId('add-slot-button');
        fireEvent.click(addButton);

        expect(screen.getByTestId('save-availability-button')).toBeDefined();
    });
});
