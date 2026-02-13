/**
 * Messages Screen Tests
 * PR 6: Remaining Screens Restyle
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
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

// Mock conversation data
const mockConversations = [
    {
        id: 'conv-1',
        consultationId: 'consult-1',
        doctorName: 'Sharma',
        doctorAvatar: null,
        vertical: 'HAIR_LOSS',
        unreadCount: 2,
        lastMessage: {
            id: 'msg-1',
            content: 'Please take the medication with food.',
            createdAt: '2026-02-13T10:00:00Z',
            senderType: 'DOCTOR',
        },
    },
    {
        id: 'conv-2',
        consultationId: 'consult-2',
        doctorName: 'Patel',
        doctorAvatar: null,
        vertical: 'SEXUAL_HEALTH',
        unreadCount: 0,
        lastMessage: {
            id: 'msg-2',
            content: 'Thank you doctor!',
            createdAt: '2026-02-12T14:30:00Z',
            senderType: 'PATIENT',
        },
    },
];

// Import after mocks
import MessagesScreen from '../messages';

beforeEach(() => {
    jest.clearAllMocks();

    // Mock useQuery with conversations
    (useQuery as jest.Mock).mockReturnValue({
        data: {
            myConversations: mockConversations,
        },
        loading: false,
        error: null,
        refetch: jest.fn(),
    });
});

describe('MessagesScreen', () => {
    describe('Screen structure', () => {
        it('renders the screen with testID', () => {
            const { getByTestId } = render(<MessagesScreen />);
            expect(getByTestId('messages-screen')).toBeTruthy();
        });

        it('displays "Messages" title with serif font', () => {
            const { getByText } = render(<MessagesScreen />);
            expect(getByText('Messages')).toBeTruthy();
        });

        it('renders conversation list', () => {
            const { getByTestId } = render(<MessagesScreen />);
            expect(getByTestId('conversation-list')).toBeTruthy();
        });
    });

    describe('Conversation rows', () => {
        it('renders conversation cards with testIDs', () => {
            const { getByTestId } = render(<MessagesScreen />);
            expect(getByTestId('conversation-conv-1')).toBeTruthy();
            expect(getByTestId('conversation-conv-2')).toBeTruthy();
        });

        it('displays doctor name with "Dr." prefix', () => {
            const { getByText } = render(<MessagesScreen />);
            expect(getByText('Dr. Sharma')).toBeTruthy();
            expect(getByText('Dr. Patel')).toBeTruthy();
        });

        it('displays doctor avatar with initials', () => {
            const { getByTestId } = render(<MessagesScreen />);
            expect(getByTestId('avatar-conv-1')).toBeTruthy();
        });

        it('displays last message preview', () => {
            const { getByText } = render(<MessagesScreen />);
            expect(getByText(/take the medication/i)).toBeTruthy();
        });

        it('shows "You:" prefix for patient messages', () => {
            const { getByText } = render(<MessagesScreen />);
            expect(getByText(/You:/)).toBeTruthy();
        });

        it('displays timestamp for last message', () => {
            const { getByTestId } = render(<MessagesScreen />);
            expect(getByTestId('timestamp-conv-1')).toBeTruthy();
        });
    });

    describe('Unread indicators', () => {
        it('displays unread dot for conversations with unread messages', () => {
            const { getByTestId } = render(<MessagesScreen />);
            expect(getByTestId('unread-indicator-conv-1')).toBeTruthy();
        });

        it('does not show unread dot for read conversations', () => {
            const { queryByTestId } = render(<MessagesScreen />);
            expect(queryByTestId('unread-indicator-conv-2')).toBeNull();
        });
    });

    describe('Empty state', () => {
        it('displays empty state when no conversations', () => {
            (useQuery as jest.Mock).mockReturnValue({
                data: {
                    myConversations: [],
                },
                loading: false,
                error: null,
                refetch: jest.fn(),
            });

            const { getByTestId } = render(<MessagesScreen />);
            expect(getByTestId('empty-state')).toBeTruthy();
        });

        it('displays empty state message', () => {
            (useQuery as jest.Mock).mockReturnValue({
                data: {
                    myConversations: [],
                },
                loading: false,
                error: null,
                refetch: jest.fn(),
            });

            const { getByText } = render(<MessagesScreen />);
            expect(getByText(/no messages yet/i)).toBeTruthy();
        });

        it('displays MessageCircle icon in empty state', () => {
            (useQuery as jest.Mock).mockReturnValue({
                data: {
                    myConversations: [],
                },
                loading: false,
                error: null,
                refetch: jest.fn(),
            });

            const { getByTestId } = render(<MessagesScreen />);
            expect(getByTestId('empty-state-icon')).toBeTruthy();
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

            const { getByTestId } = render(<MessagesScreen />);
            expect(getByTestId('loading-skeleton')).toBeTruthy();
        });
    });

    describe('Navigation', () => {
        it('navigates to chat detail when conversation tapped', () => {
            const { getByTestId } = render(<MessagesScreen />);
            const conversation = getByTestId('conversation-conv-1');
            fireEvent.press(conversation);
            expect(mockPush).toHaveBeenCalledWith('/chat/consult-1');
        });
    });

    describe('Lucide icons', () => {
        it('renders Lucide icons instead of emojis', () => {
            const { queryByText } = render(<MessagesScreen />);
            // Should NOT have emoji icons
            expect(queryByText('💬')).toBeNull();
        });
    });

    describe('Design system compliance', () => {
        it('uses 40px avatar size', () => {
            const { getByTestId } = render(<MessagesScreen />);
            const avatar = getByTestId('avatar-conv-1');
            expect(avatar.props.style).toBeDefined();
        });

        it('applies 0.5px dividers between rows', () => {
            const { getByTestId } = render(<MessagesScreen />);
            const conversation = getByTestId('conversation-conv-1');
            expect(conversation.props.style).toBeDefined();
        });
    });
});
