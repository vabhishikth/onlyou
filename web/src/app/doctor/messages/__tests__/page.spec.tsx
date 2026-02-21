import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import MessagesPage from '../page';
import { DOCTOR_CONVERSATIONS } from '@/graphql/messaging';

// Spec: master spec Section 5.5 — Doctor Messaging

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

const mockConversations = [
    {
        consultationId: 'consult-1',
        patientName: 'Rahul Sharma',
        vertical: 'HAIR_LOSS',
        consultationStatus: 'DOCTOR_REVIEWING',
        lastMessageContent: 'Thank you doctor, I will follow the treatment plan you recommended',
        lastMessageAt: '2026-02-21T10:00:00Z',
        lastMessageIsFromDoctor: false,
        unreadCount: 2,
        totalMessages: 5,
    },
    {
        consultationId: 'consult-2',
        patientName: 'Priya Patel',
        vertical: 'PCOS',
        consultationStatus: 'NEEDS_INFO',
        lastMessageContent: 'Here are my updated reports',
        lastMessageAt: '2026-02-20T10:00:00Z',
        lastMessageIsFromDoctor: false,
        unreadCount: 1,
        totalMessages: 3,
    },
    {
        consultationId: 'consult-3',
        patientName: 'Amit Kumar',
        vertical: 'SEXUAL_HEALTH',
        consultationStatus: 'TREATMENT_ACTIVE',
        lastMessageContent: 'I have prescribed Tadalafil for you',
        lastMessageAt: '2026-02-19T10:00:00Z',
        lastMessageIsFromDoctor: true,
        unreadCount: 0,
        totalMessages: 8,
    },
];

const conversationsMock: MockedResponse = {
    request: {
        query: DOCTOR_CONVERSATIONS,
    },
    result: {
        data: { doctorConversations: mockConversations },
    },
};

const emptyMock: MockedResponse = {
    request: {
        query: DOCTOR_CONVERSATIONS,
    },
    result: {
        data: { doctorConversations: [] },
    },
};

function renderWithProvider(mocks: MockedResponse[] = []) {
    return render(
        <MockedProvider mocks={mocks} addTypename={false}>
            <MessagesPage />
        </MockedProvider>
    );
}

describe('MessagesPage', () => {
    it('should render loading skeleton', () => {
        renderWithProvider([conversationsMock]);
        expect(screen.getByTestId('messages-loading')).toBeDefined();
    });

    it('should render conversation list', async () => {
        renderWithProvider([conversationsMock]);

        await waitFor(() => {
            expect(screen.getByText('Rahul Sharma')).toBeDefined();
            expect(screen.getByText('Priya Patel')).toBeDefined();
            expect(screen.getByText('Amit Kumar')).toBeDefined();
        });
    });

    it('should render empty state when no conversations', async () => {
        renderWithProvider([emptyMock]);

        await waitFor(() => {
            expect(screen.getByText(/no messages/i)).toBeDefined();
        });
    });

    it('should show unread count badge on conversations', async () => {
        renderWithProvider([conversationsMock]);

        await waitFor(() => {
            expect(screen.getByText('Rahul Sharma')).toBeDefined();
        });

        // Rahul has 2 unread, Priya has 1 unread, Amit has 0
        const unreadBadges = screen.getAllByTestId('unread-badge');
        expect(unreadBadges.length).toBe(2); // Only 2 conversations have unread
    });

    it('should filter to show only unread conversations', async () => {
        renderWithProvider([conversationsMock]);

        await waitFor(() => {
            expect(screen.getByText('Rahul Sharma')).toBeDefined();
        });

        // Click "Unread" filter
        fireEvent.click(screen.getByText('Unread'));

        // Amit has 0 unread, should be hidden
        expect(screen.queryByText('Amit Kumar')).toBeNull();
        expect(screen.getByText('Rahul Sharma')).toBeDefined();
        expect(screen.getByText('Priya Patel')).toBeDefined();
    });

    it('should filter by patient name search', async () => {
        renderWithProvider([conversationsMock]);

        await waitFor(() => {
            expect(screen.getByText('Rahul Sharma')).toBeDefined();
        });

        const searchInput = screen.getByPlaceholderText(/search/i);
        fireEvent.change(searchInput, { target: { value: 'Priya' } });

        expect(screen.queryByText('Rahul Sharma')).toBeNull();
        expect(screen.getByText('Priya Patel')).toBeDefined();
    });

    it('should show last message preview truncated', async () => {
        renderWithProvider([conversationsMock]);

        await waitFor(() => {
            expect(screen.getByText('Rahul Sharma')).toBeDefined();
        });

        // The long message should be truncated in the preview
        // "Thank you doctor, I will follow the treatment plan you recommended" is 67 chars
        // Should show truncated version
        const previewElement = screen.getByTestId('message-preview-consult-1');
        expect(previewElement.textContent!.length).toBeLessThanOrEqual(65);
    });

    it('should show time ago display', async () => {
        renderWithProvider([conversationsMock]);

        await waitFor(() => {
            expect(screen.getByText('Rahul Sharma')).toBeDefined();
        });

        // Should show some time-based display
        const timeElements = screen.getAllByTestId('message-time');
        expect(timeElements.length).toBeGreaterThan(0);
    });

    it('should link cards to case detail', async () => {
        renderWithProvider([conversationsMock]);

        await waitFor(() => {
            expect(screen.getByText('Rahul Sharma')).toBeDefined();
        });

        const links = screen.getAllByRole('link');
        const caseLink = links.find((l) => l.getAttribute('href')?.includes('/doctor/case/consult-1'));
        expect(caseLink).toBeDefined();
    });
});
