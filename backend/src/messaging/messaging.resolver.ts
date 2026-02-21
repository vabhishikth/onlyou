import { Resolver, Query, Mutation, Args, Int, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import {
    MessageType,
    MarkAllReadResponse,
    RequestMoreInfoResponse,
    ConversationSummaryType,
} from './dto/messaging.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

// Spec: master spec Section 5.5 (Messaging)
// Frontend mutation shapes: web/src/app/doctor/case/[id]/page.tsx lines 64-73

@Resolver()
export class MessagingResolver {
    constructor(
        private readonly messagingService: MessagingService,
    ) {}

    /**
     * Get all conversations for the logged-in doctor
     * Spec: master spec Section 5.5 — Doctor conversations list
     */
    @Query(() => [ConversationSummaryType])
    @UseGuards(JwtAuthGuard)
    async doctorConversations(
        @Context() context: any,
    ): Promise<ConversationSummaryType[]> {
        const doctorId = context.req.user.id;
        return this.messagingService.getDoctorConversations(doctorId);
    }

    /**
     * Send a message in a consultation
     * Frontend: sendMessage($consultationId, $content)
     */
    @Mutation(() => MessageType)
    @UseGuards(JwtAuthGuard)
    async sendMessage(
        @Args('consultationId') consultationId: string,
        @Args('content') content: string,
        @CurrentUser() user: any,
    ): Promise<MessageType> {
        const message = await this.messagingService.sendMessage({
            consultationId,
            senderId: user.id,
            content,
        });

        return {
            id: message.id,
            consultationId: message.consultationId,
            senderId: message.senderId,
            content: message.content,
            attachmentUrl: message.attachmentUrl,
            attachmentType: message.attachmentType,
            isFromAI: message.isFromAI,
            createdAt: message.createdAt,
            readAt: message.readAt,
        };
    }

    /**
     * Mark a single message as read
     */
    @Mutation(() => MessageType)
    @UseGuards(JwtAuthGuard)
    async markMessageAsRead(
        @Args('messageId') messageId: string,
        @CurrentUser() user: any,
    ): Promise<MessageType> {
        const message = await this.messagingService.markAsRead(messageId, user.id);

        return {
            id: message.id,
            consultationId: message.consultationId,
            senderId: message.senderId,
            content: message.content,
            attachmentUrl: message.attachmentUrl,
            attachmentType: message.attachmentType,
            isFromAI: message.isFromAI,
            createdAt: message.createdAt,
            readAt: message.readAt,
        };
    }

    /**
     * Mark all unread messages in a consultation as read
     */
    @Mutation(() => MarkAllReadResponse)
    @UseGuards(JwtAuthGuard)
    async markAllMessagesAsRead(
        @Args('consultationId') consultationId: string,
        @CurrentUser() user: any,
    ): Promise<MarkAllReadResponse> {
        return this.messagingService.markAllAsRead(consultationId, user.id);
    }

    /**
     * Request more info from patient (doctor action)
     * Changes consultation status to NEEDS_INFO + creates message
     */
    @Mutation(() => RequestMoreInfoResponse)
    @UseGuards(JwtAuthGuard)
    async requestMoreInfo(
        @Args('consultationId') consultationId: string,
        @Args('message') message: string,
        @CurrentUser() user: any,
    ): Promise<RequestMoreInfoResponse> {
        const result = await this.messagingService.requestMoreInfo(
            consultationId,
            user.id,
            message,
        );

        return {
            message: {
                id: result.message.id,
                consultationId: result.message.consultationId,
                senderId: result.message.senderId,
                content: result.message.content,
                attachmentUrl: result.message.attachmentUrl,
                attachmentType: result.message.attachmentType,
                isFromAI: result.message.isFromAI,
                createdAt: result.message.createdAt,
                readAt: result.message.readAt,
            },
            consultationStatus: result.consultation.status,
        };
    }

    /**
     * Get messages for a consultation
     */
    @Query(() => [MessageType])
    @UseGuards(JwtAuthGuard)
    async consultationMessages(
        @Args('consultationId') consultationId: string,
        @CurrentUser() user: any,
    ): Promise<MessageType[]> {
        const messages = await this.messagingService.getMessages(
            consultationId,
            user.id,
        );

        return messages.map((m) => ({
            id: m.id,
            consultationId: m.consultationId,
            senderId: m.senderId,
            content: m.content,
            attachmentUrl: m.attachmentUrl,
            attachmentType: m.attachmentType,
            isFromAI: m.isFromAI,
            createdAt: m.createdAt,
            readAt: m.readAt,
        }));
    }

    /**
     * Get unread message count for a consultation
     */
    @Query(() => Int)
    @UseGuards(JwtAuthGuard)
    async unreadMessageCount(
        @Args('consultationId') consultationId: string,
        @CurrentUser() user: any,
    ): Promise<number> {
        return this.messagingService.getUnreadCount(consultationId, user.id);
    }
}
