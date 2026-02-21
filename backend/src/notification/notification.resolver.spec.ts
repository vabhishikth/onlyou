import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { NotificationResolver } from './notification.resolver';
import { NotificationService } from './notification.service';
import { NotificationPreferenceService } from './notification-preference.service';

// Spec: master spec Section 11 (Notification System)

describe('NotificationResolver', () => {
    let resolver: NotificationResolver;
    let notificationService: jest.Mocked<NotificationService>;
    let preferenceService: jest.Mocked<NotificationPreferenceService>;

    const mockUser = { id: 'user-123' };

    const mockNotification = {
        id: 'notif-1',
        recipientId: 'user-123',
        recipientRole: 'PATIENT',
        channel: 'IN_APP',
        eventType: 'LAB_RESULTS_READY',
        title: 'Lab Results Ready',
        body: 'Your lab results are ready!',
        data: null,
        status: 'SENT',
        isDiscreet: false,
        labOrderId: 'lab-1',
        orderId: null,
        consultationId: null,
        subscriptionId: null,
        sentAt: new Date('2026-02-20T10:00:00Z'),
        deliveredAt: null,
        readAt: null,
        failedAt: null,
        failureReason: null,
        createdAt: new Date('2026-02-20T10:00:00Z'),
        updatedAt: new Date('2026-02-20T10:00:00Z'),
    };

    const mockNotification2 = {
        ...mockNotification,
        id: 'notif-2',
        eventType: 'DELIVERY_DELIVERED',
        title: 'Order Delivered',
        body: 'Your order has been delivered!',
        labOrderId: null,
        orderId: 'order-1',
    };

    const mockPreference = {
        id: 'pref-1',
        userId: 'user-123',
        pushEnabled: true,
        whatsappEnabled: true,
        smsEnabled: true,
        emailEnabled: true,
        discreetMode: false,
        createdAt: new Date('2026-02-20'),
        updatedAt: new Date('2026-02-20'),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NotificationResolver,
                {
                    provide: NotificationService,
                    useValue: {
                        getUnreadNotifications: jest.fn(),
                        getUnreadCount: jest.fn(),
                        markAsRead: jest.fn(),
                        markAllAsRead: jest.fn(),
                        getNotificationHistory: jest.fn(),
                    },
                },
                {
                    provide: NotificationPreferenceService,
                    useValue: {
                        getPreferences: jest.fn(),
                        updatePreferences: jest.fn(),
                    },
                },
            ],
        }).compile();

        resolver = module.get<NotificationResolver>(NotificationResolver);
        notificationService = module.get(NotificationService);
        preferenceService = module.get(NotificationPreferenceService);
    });

    // ============================================
    // QUERIES
    // ============================================

    describe('notifications', () => {
        it('should return paginated notification history with defaults', async () => {
            const historyResponse = {
                notifications: [mockNotification, mockNotification2],
                total: 2,
                page: 1,
                limit: 20,
            };
            notificationService.getNotificationHistory.mockResolvedValue(historyResponse);

            const result = await resolver.notifications(mockUser, 1, 20);

            expect(result).toEqual(historyResponse);
            expect(notificationService.getNotificationHistory).toHaveBeenCalledWith(
                'user-123',
                { page: 1, limit: 20, channel: undefined, eventType: undefined },
            );
        });

        it('should pass channel filter when provided', async () => {
            const historyResponse = {
                notifications: [mockNotification],
                total: 1,
                page: 1,
                limit: 20,
            };
            notificationService.getNotificationHistory.mockResolvedValue(historyResponse);

            const result = await resolver.notifications(mockUser, 1, 20, 'IN_APP' as any);

            expect(result).toEqual(historyResponse);
            expect(notificationService.getNotificationHistory).toHaveBeenCalledWith(
                'user-123',
                { page: 1, limit: 20, channel: 'IN_APP', eventType: undefined },
            );
        });

        it('should pass eventType filter when provided', async () => {
            const historyResponse = {
                notifications: [mockNotification],
                total: 1,
                page: 1,
                limit: 20,
            };
            notificationService.getNotificationHistory.mockResolvedValue(historyResponse);

            const result = await resolver.notifications(
                mockUser, 1, 20, undefined, 'LAB_RESULTS_READY' as any,
            );

            expect(result).toEqual(historyResponse);
            expect(notificationService.getNotificationHistory).toHaveBeenCalledWith(
                'user-123',
                { page: 1, limit: 20, channel: undefined, eventType: 'LAB_RESULTS_READY' },
            );
        });

        it('should return empty list when no notifications exist', async () => {
            const emptyResponse = {
                notifications: [],
                total: 0,
                page: 1,
                limit: 20,
            };
            notificationService.getNotificationHistory.mockResolvedValue(emptyResponse);

            const result = await resolver.notifications(mockUser, 1, 20);

            expect(result.notifications).toEqual([]);
            expect(result.total).toBe(0);
        });
    });

    describe('unreadNotifications', () => {
        it('should return unread notifications for the user', async () => {
            notificationService.getUnreadNotifications.mockResolvedValue([
                mockNotification,
                mockNotification2,
            ]);

            const result = await resolver.unreadNotifications(mockUser);

            expect(result).toHaveLength(2);
            expect(notificationService.getUnreadNotifications).toHaveBeenCalledWith('user-123');
        });

        it('should return empty array when no unread notifications', async () => {
            notificationService.getUnreadNotifications.mockResolvedValue([]);

            const result = await resolver.unreadNotifications(mockUser);

            expect(result).toEqual([]);
        });
    });

    describe('unreadNotificationCount', () => {
        it('should return the correct unread count', async () => {
            notificationService.getUnreadCount.mockResolvedValue(5);

            const result = await resolver.unreadNotificationCount(mockUser);

            expect(result).toBe(5);
            expect(notificationService.getUnreadCount).toHaveBeenCalledWith('user-123');
        });

        it('should return 0 when no unread notifications', async () => {
            notificationService.getUnreadCount.mockResolvedValue(0);

            const result = await resolver.unreadNotificationCount(mockUser);

            expect(result).toBe(0);
        });
    });

    describe('notificationPreferences', () => {
        it('should return notification preferences for the user', async () => {
            preferenceService.getPreferences.mockResolvedValue(mockPreference);

            const result = await resolver.notificationPreferences(mockUser);

            expect(result).toEqual(mockPreference);
            expect(preferenceService.getPreferences).toHaveBeenCalledWith('user-123');
        });
    });

    // ============================================
    // MUTATIONS
    // ============================================

    describe('markNotificationAsRead', () => {
        it('should mark a notification as read and return it', async () => {
            const readNotification = {
                ...mockNotification,
                status: 'READ',
                readAt: new Date('2026-02-20T12:00:00Z'),
            };
            notificationService.markAsRead.mockResolvedValue(readNotification);

            const result = await resolver.markNotificationAsRead('notif-1', mockUser);

            expect(result.status).toBe('READ');
            expect(result.readAt).toBeDefined();
            expect(notificationService.markAsRead).toHaveBeenCalledWith('user-123', 'notif-1');
        });

        it('should throw NotFoundException when notification does not exist', async () => {
            notificationService.markAsRead.mockRejectedValue(
                new NotFoundException('Notification not found'),
            );

            await expect(
                resolver.markNotificationAsRead('nonexistent', mockUser),
            ).rejects.toThrow(NotFoundException);
        });

        it('should throw BadRequestException when user does not own notification', async () => {
            notificationService.markAsRead.mockRejectedValue(
                new BadRequestException('Not authorized to mark this notification'),
            );

            await expect(
                resolver.markNotificationAsRead('notif-1', { id: 'other-user' }),
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('markAllNotificationsAsRead', () => {
        it('should mark all notifications as read and return count', async () => {
            notificationService.markAllAsRead.mockResolvedValue({ count: 5 });

            const result = await resolver.markAllNotificationsAsRead(mockUser);

            expect(result.count).toBe(5);
            expect(notificationService.markAllAsRead).toHaveBeenCalledWith('user-123');
        });

        it('should return count 0 when no unread notifications', async () => {
            notificationService.markAllAsRead.mockResolvedValue({ count: 0 });

            const result = await resolver.markAllNotificationsAsRead(mockUser);

            expect(result.count).toBe(0);
        });
    });

    describe('updateNotificationPreferences', () => {
        it('should update a single preference and return updated record', async () => {
            const updatedPref = { ...mockPreference, pushEnabled: false };
            preferenceService.updatePreferences.mockResolvedValue(updatedPref);

            const result = await resolver.updateNotificationPreferences(
                mockUser,
                { pushEnabled: false },
            );

            expect(result.pushEnabled).toBe(false);
            expect(preferenceService.updatePreferences).toHaveBeenCalledWith(
                'user-123',
                { pushEnabled: false },
            );
        });

        it('should update discreet mode', async () => {
            const updatedPref = { ...mockPreference, discreetMode: true };
            preferenceService.updatePreferences.mockResolvedValue(updatedPref);

            const result = await resolver.updateNotificationPreferences(
                mockUser,
                { discreetMode: true },
            );

            expect(result.discreetMode).toBe(true);
            expect(preferenceService.updatePreferences).toHaveBeenCalledWith(
                'user-123',
                { discreetMode: true },
            );
        });

        it('should update multiple preferences at once', async () => {
            const updatedPref = {
                ...mockPreference,
                pushEnabled: false,
                smsEnabled: false,
                discreetMode: true,
            };
            preferenceService.updatePreferences.mockResolvedValue(updatedPref);

            const result = await resolver.updateNotificationPreferences(
                mockUser,
                { pushEnabled: false, smsEnabled: false, discreetMode: true },
            );

            expect(result.pushEnabled).toBe(false);
            expect(result.smsEnabled).toBe(false);
            expect(result.discreetMode).toBe(true);
            expect(preferenceService.updatePreferences).toHaveBeenCalledWith(
                'user-123',
                { pushEnabled: false, smsEnabled: false, discreetMode: true },
            );
        });

        it('should handle empty input', async () => {
            preferenceService.updatePreferences.mockResolvedValue(mockPreference);

            const result = await resolver.updateNotificationPreferences(mockUser, {});

            expect(result).toEqual(mockPreference);
            expect(preferenceService.updatePreferences).toHaveBeenCalledWith('user-123', {});
        });
    });
});
