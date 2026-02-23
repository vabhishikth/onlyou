import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationPreferenceService } from './notification-preference.service';
import { DeviceTokenService } from './device-token.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GraphQLJSON } from 'graphql-type-json';
import {
    NotificationType,
    NotificationHistoryResponse,
    MarkAllNotificationsReadResponse,
    NotificationPreferenceType,
    UpdateNotificationPreferencesInput,
} from './dto/notification.dto';
import { NotificationChannel, NotificationEventType } from '@prisma/client';

// Spec: master spec Section 11 (Notification System)

@Resolver()
export class NotificationResolver {
    constructor(
        private readonly notificationService: NotificationService,
        private readonly notificationPreferenceService: NotificationPreferenceService,
        private readonly deviceTokenService: DeviceTokenService,
    ) {}

    // ============================================
    // QUERIES
    // ============================================

    @Query(() => NotificationHistoryResponse)
    @UseGuards(JwtAuthGuard)
    async notifications(
        @CurrentUser() user: any,
        @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
        @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
        @Args('channel', { type: () => NotificationChannel, nullable: true }) channel?: NotificationChannel,
        @Args('eventType', { type: () => NotificationEventType, nullable: true }) eventType?: NotificationEventType,
    ): Promise<NotificationHistoryResponse> {
        return this.notificationService.getNotificationHistory(user.id, {
            page,
            limit,
            channel,
            eventType,
        });
    }

    @Query(() => [NotificationType])
    @UseGuards(JwtAuthGuard)
    async unreadNotifications(
        @CurrentUser() user: any,
    ): Promise<NotificationType[]> {
        return this.notificationService.getUnreadNotifications(user.id);
    }

    @Query(() => Int)
    @UseGuards(JwtAuthGuard)
    async unreadNotificationCount(
        @CurrentUser() user: any,
    ): Promise<number> {
        return this.notificationService.getUnreadCount(user.id);
    }

    @Query(() => NotificationPreferenceType)
    @UseGuards(JwtAuthGuard)
    async notificationPreferences(
        @CurrentUser() user: any,
    ): Promise<NotificationPreferenceType> {
        return this.notificationPreferenceService.getPreferences(user.id);
    }

    // ============================================
    // MUTATIONS
    // ============================================

    @Mutation(() => NotificationType)
    @UseGuards(JwtAuthGuard)
    async markNotificationAsRead(
        @Args('notificationId') notificationId: string,
        @CurrentUser() user: any,
    ): Promise<NotificationType> {
        return this.notificationService.markAsRead(user.id, notificationId);
    }

    @Mutation(() => MarkAllNotificationsReadResponse)
    @UseGuards(JwtAuthGuard)
    async markAllNotificationsAsRead(
        @CurrentUser() user: any,
    ): Promise<MarkAllNotificationsReadResponse> {
        return this.notificationService.markAllAsRead(user.id);
    }

    @Mutation(() => NotificationPreferenceType)
    @UseGuards(JwtAuthGuard)
    async updateNotificationPreferences(
        @CurrentUser() user: any,
        @Args('input') input: UpdateNotificationPreferencesInput,
    ): Promise<NotificationPreferenceType> {
        return this.notificationPreferenceService.updatePreferences(user.id, input);
    }

    // ============================================
    // DEVICE TOKEN MANAGEMENT
    // ============================================

    @Mutation(() => GraphQLJSON)
    @UseGuards(JwtAuthGuard)
    async registerDeviceToken(
        @CurrentUser() user: any,
        @Args('token') token: string,
        @Args('platform') platform: string,
    ) {
        return this.deviceTokenService.registerToken(user.id, token, platform);
    }

    @Mutation(() => GraphQLJSON)
    @UseGuards(JwtAuthGuard)
    async removeDeviceToken(
        @CurrentUser() user: any,
        @Args('token') token: string,
    ) {
        return this.deviceTokenService.removeToken(user.id, token);
    }
}
