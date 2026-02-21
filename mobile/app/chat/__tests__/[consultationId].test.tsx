/**
 * Chat Screen Tests
 * PR 29 Task 1: Chat detail screen tests
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { useQuery, useMutation } from '@apollo/client';

const mockBack = jest.fn();

jest.mock('expo-router', () => ({
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn(),
        back: mockBack,
    }),
    useSegments: () => [],
    useLocalSearchParams: () => ({ consultationId: 'consultation-123' }),
    Slot: ({ children }: { children: React.ReactNode }) => children,
    Stack: { Screen: () => null },
    Link: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('expo-image-picker', () => ({
    launchImageLibraryAsync: jest.fn(),
    MediaTypeOptions: { Images: 'images' },
}));

const mockMessages = [
    {
        id: 'msg-1',
        consultationId: 'consultation-123',
        senderId: 'doctor-1',
        senderType: 'DOCTOR',
        senderName: 'Dr. Priya Singh',
        type: 'TEXT',
        content: 'Hello! How are you feeling today?',
        attachmentUrl: null,
        attachmentName: null,
        readAt: null,
        createdAt: '2026-02-21T10:00:00Z',
    },
    {
        id: 'msg-2',
        consultationId: 'consultation-123',
        senderId: 'patient-1',
        senderType: 'PATIENT',
        senderName: 'Rahul',
        type: 'TEXT',
        content: 'Doing much better, thank you!',
        attachmentUrl: null,
        attachmentName: null,
        readAt: '2026-02-21T10:05:00Z',
        createdAt: '2026-02-21T10:03:00Z',
    },
    {
        id: 'msg-3',
        consultationId: 'consultation-123',
        senderId: 'system',
        senderType: 'SYSTEM',
        senderName: 'System',
        type: 'SYSTEM',
        content: 'Status updated to CONSULTATION_IN_PROGRESS',
        attachmentUrl: null,
        attachmentName: null,
        readAt: null,
        createdAt: '2026-02-21T09:55:00Z',
    },
    {
        id: 'msg-4',
        consultationId: 'consultation-123',
        senderId: 'patient-1',
        senderType: 'PATIENT',
        senderName: 'Rahul',
        type: 'IMAGE',
        content: 'Sent an image',
        attachmentUrl: 'https://s3.amazonaws.com/image.jpg',
        attachmentName: 'prescription.jpg',
        readAt: null,
        createdAt: '2026-02-21T10:10:00Z',
    },
];

const mockSendMessage = jest.fn().mockResolvedValue({ data: {} });
const mockMarkRead = jest.fn().mockResolvedValue({ data: {} });
const mockGetPresignedUrl = jest.fn();

import ChatScreen from '../[consultationId]';

beforeEach(() => {
    jest.clearAllMocks();
    (useMutation as jest.Mock)
        .mockReturnValueOnce([mockSendMessage, { loading: false }])
        .mockReturnValueOnce([mockMarkRead, { loading: false }])
        .mockReturnValueOnce([mockGetPresignedUrl, { loading: false }]);
});

describe('ChatScreen', () => {
    describe('Loading state', () => {
        it('renders loading indicator while fetching', () => {
            (useQuery as jest.Mock).mockReturnValue({
                data: undefined,
                loading: true,
                error: undefined,
                refetch: jest.fn(),
            });

            const { getByText } = render(<ChatScreen />);
            expect(getByText('Loading messages...')).toBeTruthy();
        });
    });

    describe('Chat display', () => {
        beforeEach(() => {
            (useQuery as jest.Mock).mockReturnValue({
                data: { messages: mockMessages },
                loading: false,
                error: undefined,
                refetch: jest.fn(),
            });
        });

        it('renders header with doctor info', () => {
            const { getByText } = render(<ChatScreen />);
            expect(getByText('Your Doctor')).toBeTruthy();
            expect(getByText('Usually replies within 24 hours')).toBeTruthy();
        });

        it('displays doctor messages with sender name', () => {
            const { getByText } = render(<ChatScreen />);
            expect(getByText('Dr. Priya Singh')).toBeTruthy();
            expect(getByText('Hello! How are you feeling today?')).toBeTruthy();
        });

        it('displays patient messages', () => {
            const { getByText } = render(<ChatScreen />);
            expect(getByText('Doing much better, thank you!')).toBeTruthy();
        });

        it('displays system messages', () => {
            const { getByText } = render(<ChatScreen />);
            expect(getByText('Status updated to CONSULTATION_IN_PROGRESS')).toBeTruthy();
        });

        it('shows read receipt for patient messages with readAt', () => {
            const { getAllByText } = render(<ChatScreen />);
            // msg-2 has readAt set, so it shows ✓✓
            const readReceipts = getAllByText('✓✓');
            expect(readReceipts.length).toBeGreaterThanOrEqual(1);
        });

        it('shows image attachment indicator', () => {
            const { getByText } = render(<ChatScreen />);
            expect(getByText('prescription.jpg')).toBeTruthy();
        });
    });

    describe('Empty chat', () => {
        it('shows empty state when no messages', () => {
            (useQuery as jest.Mock).mockReturnValue({
                data: { messages: [] },
                loading: false,
                error: undefined,
                refetch: jest.fn(),
            });

            const { getByText } = render(<ChatScreen />);
            expect(getByText('Send a message to start the conversation')).toBeTruthy();
        });
    });
});
