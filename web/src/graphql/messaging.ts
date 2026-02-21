import { gql } from '@apollo/client';

// Spec: master spec Section 5.5 (Messaging)

// Get all conversations for the logged-in doctor
export const DOCTOR_CONVERSATIONS = gql`
    query DoctorConversations {
        doctorConversations {
            consultationId
            patientName
            vertical
            consultationStatus
            lastMessageContent
            lastMessageAt
            lastMessageIsFromDoctor
            unreadCount
            totalMessages
        }
    }
`;

// Types
export interface ConversationSummary {
    consultationId: string;
    patientName?: string;
    vertical: string;
    consultationStatus: string;
    lastMessageContent?: string;
    lastMessageAt?: string;
    lastMessageIsFromDoctor: boolean;
    unreadCount: number;
    totalMessages: number;
}

export interface DoctorConversationsResponse {
    doctorConversations: ConversationSummary[];
}
