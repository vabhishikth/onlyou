import { Field, ObjectType, InputType, Int, registerEnumType } from '@nestjs/graphql';
import {
    NotificationChannel,
    NotificationStatus,
    NotificationEventType,
} from '@prisma/client';
import { IsOptional, IsBoolean } from 'class-validator';
import GraphQLJSON from 'graphql-type-json';

// Spec: master spec Section 11 (Notification System)

// Register Prisma enums for GraphQL
registerEnumType(NotificationChannel, {
    name: 'NotificationChannel',
    description: 'Notification delivery channel',
});

registerEnumType(NotificationStatus, {
    name: 'NotificationStatus',
    description: 'Notification delivery status',
});

registerEnumType(NotificationEventType, {
    name: 'NotificationEventType',
    description: 'Notification event type',
});

// --- ObjectTypes ---

@ObjectType()
export class NotificationType {
    @Field(() => String)
    id: string;

    @Field(() => String)
    recipientId: string;

    @Field(() => String)
    recipientRole: string;

    @Field(() => NotificationChannel)
    channel: NotificationChannel;

    @Field(() => NotificationEventType)
    eventType: NotificationEventType;

    @Field(() => String)
    title: string;

    @Field(() => String)
    body: string;

    @Field(() => GraphQLJSON, { nullable: true })
    data?: any;

    @Field(() => NotificationStatus)
    status: NotificationStatus;

    @Field(() => Boolean)
    isDiscreet: boolean;

    @Field(() => String, { nullable: true })
    labOrderId?: string | undefined;

    @Field(() => String, { nullable: true })
    orderId?: string | undefined;

    @Field(() => String, { nullable: true })
    consultationId?: string | undefined;

    @Field(() => String, { nullable: true })
    subscriptionId?: string | undefined;

    @Field(() => Date, { nullable: true })
    sentAt?: Date | undefined;

    @Field(() => Date, { nullable: true })
    deliveredAt?: Date | undefined;

    @Field(() => Date, { nullable: true })
    readAt?: Date | undefined;

    @Field(() => Date, { nullable: true })
    failedAt?: Date | undefined;

    @Field(() => String, { nullable: true })
    failureReason?: string | undefined;

    @Field(() => Date)
    createdAt: Date;

    @Field(() => Date)
    updatedAt: Date;
}

@ObjectType()
export class NotificationHistoryResponse {
    @Field(() => [NotificationType])
    notifications: NotificationType[];

    @Field(() => Int)
    total: number;

    @Field(() => Int)
    page: number;

    @Field(() => Int)
    limit: number;
}

@ObjectType()
export class MarkAllNotificationsReadResponse {
    @Field(() => Int)
    count: number;
}

@ObjectType()
export class NotificationPreferenceType {
    @Field(() => String)
    id: string;

    @Field(() => String)
    userId: string;

    @Field(() => Boolean)
    pushEnabled: boolean;

    @Field(() => Boolean)
    whatsappEnabled: boolean;

    @Field(() => Boolean)
    smsEnabled: boolean;

    @Field(() => Boolean)
    emailEnabled: boolean;

    @Field(() => Boolean)
    discreetMode: boolean;

    @Field(() => Date)
    createdAt: Date;

    @Field(() => Date)
    updatedAt: Date;
}

// --- InputTypes ---

@InputType()
export class UpdateNotificationPreferencesInput {
    @Field(() => Boolean, { nullable: true })
    @IsOptional()
    @IsBoolean()
    pushEnabled?: boolean | undefined;

    @Field(() => Boolean, { nullable: true })
    @IsOptional()
    @IsBoolean()
    whatsappEnabled?: boolean | undefined;

    @Field(() => Boolean, { nullable: true })
    @IsOptional()
    @IsBoolean()
    smsEnabled?: boolean | undefined;

    @Field(() => Boolean, { nullable: true })
    @IsOptional()
    @IsBoolean()
    emailEnabled?: boolean | undefined;

    @Field(() => Boolean, { nullable: true })
    @IsOptional()
    @IsBoolean()
    discreetMode?: boolean | undefined;
}
