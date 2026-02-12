import { gql } from '@apollo/client';

// Message sender type
export type MessageSender = 'PATIENT' | 'DOCTOR' | 'SYSTEM';

// Message type
export type MessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';

// Message interface
export interface Message {
    id: string;
    consultationId: string;
    senderId: string;
    senderType: MessageSender;
    senderName: string;
    type: MessageType;
    content: string;
    attachmentUrl?: string;
    attachmentName?: string;
    readAt?: string;
    createdAt: string;
}

// Conversation (consultation with messages)
export interface Conversation {
    id: string;
    consultationId: string;
    vertical: string;
    doctorId: string;
    doctorName: string;
    doctorAvatar?: string;
    lastMessage?: Message;
    unreadCount: number;
    updatedAt: string;
}

// Response types
export interface GetConversationsResponse {
    myConversations: Conversation[];
}

export interface GetMessagesResponse {
    messages: Message[];
}

export interface SendMessageResponse {
    sendMessage: Message;
}

export interface MarkMessagesReadResponse {
    markMessagesRead: boolean;
}

// Queries
export const GET_MY_CONVERSATIONS = gql`
    query GetMyConversations {
        myConversations {
            id
            consultationId
            vertical
            doctorId
            doctorName
            doctorAvatar
            lastMessage {
                id
                content
                type
                senderType
                createdAt
                readAt
            }
            unreadCount
            updatedAt
        }
    }
`;

export const GET_MESSAGES = gql`
    query GetMessages($consultationId: ID!, $limit: Int, $before: DateTime) {
        messages(consultationId: $consultationId, limit: $limit, before: $before) {
            id
            consultationId
            senderId
            senderType
            senderName
            type
            content
            attachmentUrl
            attachmentName
            readAt
            createdAt
        }
    }
`;

// Mutations
export const SEND_MESSAGE = gql`
    mutation SendMessage($input: SendMessageInput!) {
        sendMessage(input: $input) {
            id
            consultationId
            senderId
            senderType
            senderName
            type
            content
            attachmentUrl
            attachmentName
            createdAt
        }
    }
`;

export const MARK_MESSAGES_READ = gql`
    mutation MarkMessagesRead($consultationId: ID!) {
        markMessagesRead(consultationId: $consultationId)
    }
`;

// Subscriptions (for real-time updates)
export const MESSAGE_RECEIVED = gql`
    subscription OnMessageReceived($consultationId: ID!) {
        messageReceived(consultationId: $consultationId) {
            id
            consultationId
            senderId
            senderType
            senderName
            type
            content
            attachmentUrl
            attachmentName
            createdAt
        }
    }
`;

// Helper: Format message time
export function formatMessageTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
        return date.toLocaleTimeString('en-IN', {
            hour: 'numeric',
            minute: '2-digit',
        });
    } else if (days === 1) {
        return 'Yesterday';
    } else if (days < 7) {
        return date.toLocaleDateString('en-IN', { weekday: 'short' });
    } else {
        return date.toLocaleDateString('en-IN', {
            month: 'short',
            day: 'numeric',
        });
    }
}

// Helper: Format conversation preview
export function formatConversationPreview(message?: Message): string {
    if (!message) return 'No messages yet';

    switch (message.type) {
        case 'IMAGE':
            return '📷 Photo';
        case 'FILE':
            return '📎 Attachment';
        case 'SYSTEM':
            return message.content;
        default:
            return message.content.length > 50
                ? message.content.substring(0, 50) + '...'
                : message.content;
    }
}

// Vertical display names
export const VERTICAL_NAMES: Record<string, string> = {
    HAIR_LOSS: 'Hair Loss',
    SEXUAL_HEALTH: 'Sexual Health',
    PCOS: 'PCOS',
    WEIGHT_MANAGEMENT: 'Weight Management',
};
