import { ObjectType, Field, Int } from '@nestjs/graphql';
import { HealthVertical, ConsultationStatus } from '@prisma/client';

// Spec: master spec Section 5.5 (Messaging)
// These DTOs match the frontend mutation shapes in web/src/app/doctor/case/[id]/page.tsx

@ObjectType()
export class MessageType {
    @Field(() => String)
    id: string;

    @Field(() => String)
    consultationId: string;

    @Field(() => String)
    senderId: string;

    @Field(() => String)
    content: string;

    @Field(() => String, { nullable: true })
    attachmentUrl?: string | null;

    @Field(() => String, { nullable: true })
    attachmentType?: string | null;

    @Field(() => Boolean)
    isFromAI: boolean;

    @Field(() => Date)
    createdAt: Date;

    @Field(() => Date, { nullable: true })
    readAt?: Date | null;
}

@ObjectType()
export class MarkAllReadResponse {
    @Field(() => Int)
    count: number;
}

@ObjectType()
export class RequestMoreInfoResponse {
    @Field(() => MessageType)
    message: MessageType;

    @Field(() => String)
    consultationStatus: string;
}

// Spec: master spec Section 5.5 — Doctor conversations list
@ObjectType()
export class ConversationSummaryType {
    @Field(() => String)
    consultationId: string;

    @Field(() => String, { nullable: true })
    patientName?: string;

    @Field(() => HealthVertical)
    vertical: HealthVertical;

    @Field(() => ConsultationStatus)
    consultationStatus: ConsultationStatus;

    @Field(() => String, { nullable: true })
    lastMessageContent?: string;

    @Field(() => Date, { nullable: true })
    lastMessageAt?: Date;

    @Field(() => Boolean)
    lastMessageIsFromDoctor: boolean;

    @Field(() => Int)
    unreadCount: number;

    @Field(() => Int)
    totalMessages: number;
}
