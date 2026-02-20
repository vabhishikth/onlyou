import { Test, TestingModule } from '@nestjs/testing';
import { MessagingResolver } from './messaging.resolver';
import { MessagingService } from './messaging.service';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { UserRole, ConsultationStatus } from '@prisma/client';

// Spec: master spec Section 5.5 (Messaging)

describe('MessagingResolver', () => {
    let resolver: MessagingResolver;
    let messagingService: jest.Mocked<MessagingService>;

    const mockDoctor = {
        id: 'doctor-123',
        name: 'Dr. Smith',
        role: UserRole.DOCTOR,
    };

    const mockPatient = {
        id: 'patient-123',
        name: 'John Doe',
        role: UserRole.PATIENT,
    };

    const mockMessage = {
        id: 'msg-1',
        consultationId: 'consultation-123',
        senderId: 'doctor-123',
        content: 'Your treatment plan is ready',
        attachmentUrl: null,
        attachmentType: null,
        isFromAI: false,
        createdAt: new Date('2026-02-20T10:00:00Z'),
        readAt: null,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MessagingResolver,
                {
                    provide: MessagingService,
                    useValue: {
                        sendMessage: jest.fn(),
                        markAsRead: jest.fn(),
                        markAllAsRead: jest.fn(),
                        requestMoreInfo: jest.fn(),
                        getMessages: jest.fn(),
                        getUnreadCount: jest.fn(),
                    },
                },
            ],
        }).compile();

        resolver = module.get<MessagingResolver>(MessagingResolver);
        messagingService = module.get(MessagingService);
    });

    describe('sendMessage', () => {
        it('should send a message from doctor', async () => {
            messagingService.sendMessage.mockResolvedValue(mockMessage);

            const result = await resolver.sendMessage(
                'consultation-123',
                'Your treatment plan is ready',
                mockDoctor,
            );

            expect(result.id).toBe('msg-1');
            expect(result.content).toBe('Your treatment plan is ready');
            expect(result.senderId).toBe('doctor-123');
            expect(messagingService.sendMessage).toHaveBeenCalledWith({
                consultationId: 'consultation-123',
                senderId: 'doctor-123',
                content: 'Your treatment plan is ready',
            });
        });

        it('should throw when consultation not found', async () => {
            messagingService.sendMessage.mockRejectedValue(
                new NotFoundException('Consultation not found'),
            );

            await expect(
                resolver.sendMessage('nonexistent', 'Hello', mockDoctor),
            ).rejects.toThrow(NotFoundException);
        });

        it('should throw when user has no access to consultation', async () => {
            messagingService.sendMessage.mockRejectedValue(
                new ForbiddenException('You do not have access to this consultation'),
            );

            await expect(
                resolver.sendMessage('consultation-123', 'Hello', {
                    id: 'stranger-123',
                    role: UserRole.PATIENT,
                }),
            ).rejects.toThrow(ForbiddenException);
        });
    });

    describe('markMessageAsRead', () => {
        it('should mark a message as read', async () => {
            const readMessage = {
                ...mockMessage,
                readAt: new Date('2026-02-20T10:05:00Z'),
            };
            messagingService.markAsRead.mockResolvedValue(readMessage);

            const result = await resolver.markMessageAsRead('msg-1', mockPatient);

            expect(result.id).toBe('msg-1');
            expect(result.readAt).toBeTruthy();
            expect(messagingService.markAsRead).toHaveBeenCalledWith('msg-1', 'patient-123');
        });

        it('should throw when marking own message as read', async () => {
            messagingService.markAsRead.mockRejectedValue(
                new BadRequestException('Cannot mark your own message as read'),
            );

            await expect(
                resolver.markMessageAsRead('msg-1', mockDoctor),
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('markAllMessagesAsRead', () => {
        it('should mark all messages as read and return count', async () => {
            messagingService.markAllAsRead.mockResolvedValue({ count: 3 });

            const result = await resolver.markAllMessagesAsRead(
                'consultation-123',
                mockPatient,
            );

            expect(result.count).toBe(3);
            expect(messagingService.markAllAsRead).toHaveBeenCalledWith(
                'consultation-123',
                'patient-123',
            );
        });
    });

    describe('requestMoreInfo', () => {
        it('should request more info and change status', async () => {
            const mockResult = {
                message: {
                    ...mockMessage,
                    content: 'Please upload clearer photos',
                },
                consultation: {
                    id: 'consultation-123',
                    status: ConsultationStatus.NEEDS_INFO,
                },
            };
            messagingService.requestMoreInfo.mockResolvedValue(mockResult);

            const result = await resolver.requestMoreInfo(
                'consultation-123',
                'Please upload clearer photos',
                mockDoctor,
            );

            expect(result.message.content).toBe('Please upload clearer photos');
            expect(result.consultationStatus).toBe('NEEDS_INFO');
            expect(messagingService.requestMoreInfo).toHaveBeenCalledWith(
                'consultation-123',
                'doctor-123',
                'Please upload clearer photos',
            );
        });

        it('should throw when non-doctor requests info', async () => {
            messagingService.requestMoreInfo.mockRejectedValue(
                new ForbiddenException('Only doctors can request more information'),
            );

            await expect(
                resolver.requestMoreInfo('consultation-123', 'Need more info', mockPatient),
            ).rejects.toThrow(ForbiddenException);
        });
    });

    describe('consultationMessages', () => {
        it('should return messages in chronological order', async () => {
            const messages = [
                { ...mockMessage, id: 'msg-1', createdAt: new Date('2026-02-20T10:00:00Z') },
                { ...mockMessage, id: 'msg-2', content: 'Thanks doctor', senderId: 'patient-123', createdAt: new Date('2026-02-20T10:05:00Z') },
            ];
            messagingService.getMessages.mockResolvedValue(messages);

            const result = await resolver.consultationMessages(
                'consultation-123',
                mockDoctor,
            );

            expect(result).toHaveLength(2);
            expect(result[0].id).toBe('msg-1');
            expect(result[1].id).toBe('msg-2');
            expect(messagingService.getMessages).toHaveBeenCalledWith(
                'consultation-123',
                'doctor-123',
            );
        });
    });

    describe('unreadMessageCount', () => {
        it('should return the correct unread count', async () => {
            messagingService.getUnreadCount.mockResolvedValue(5);

            const result = await resolver.unreadMessageCount(
                'consultation-123',
                mockDoctor,
            );

            expect(result).toBe(5);
            expect(messagingService.getUnreadCount).toHaveBeenCalledWith(
                'consultation-123',
                'doctor-123',
            );
        });
    });
});
