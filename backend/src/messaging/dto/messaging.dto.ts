import { ObjectType, Field, InputType, Int } from '@nestjs/graphql';

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
